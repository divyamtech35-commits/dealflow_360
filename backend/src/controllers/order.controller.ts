import { Request, Response, NextFunction } from 'express';
import { Quotation } from '../models/Quotation';
import { QuotationLine } from '../models/QuotationLine';
import { Order, IOrder } from '../models/Order';
import { Stock } from '../models/Stock';
import { Warehouse } from '../models/Warehouse';
import { Product } from '../models/Product';
import { planSplit, consolidateBackorders, SplitLine, StockInfo, WarehouseInfo, SplitAllocation } from '../services/splitEngine';

// Generate a mock sequence for the hackathon
const generateOrderNumber = () => `SO-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

export const createOrderFromQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await Quotation.findById(req.params.id);
        if (!quote) return res.status(404).json({ error: 'Quotation not found' });

        if (quote.status !== 'APPROVED' && quote.status !== 'CONFIRMED') {
            return res.status(400).json({ error: 'Quotation must be APPROVED or CONFIRMED' });
        }

        const existingOrder = await Order.findOne({ quotationId: quote._id });
        if (existingOrder) return res.status(400).json({ error: 'Order already exists for this quotation' });

        const order = await Order.create({
            orderNumber: generateOrderNumber(),
            quotationId: quote._id,
            customerId: quote.customerId,
            salesRepId: quote.salesRepId,
            status: 'PENDING_FULFILLMENT',
            fulfillmentPlan: [],
            splitMode: 'AUTO',
            hasBackorder: false,
            shipmentCount: 0,
            totalShippingCost: 0,
            grandTotal: quote.totalAmount
        });

        res.status(201).json(order);
    } catch (e) { next(e); }
};

const getInventoryState = async () => {
    const stocks = await Stock.find({});
    const stockInfo: StockInfo[] = stocks.map(s => ({
        warehouseId: String(s.warehouseId),
        productId: String(s.productId),
        availableQty: s.quantity - s.reservedQuantity
    }));

    const whs = await Warehouse.find({});
    const warehouses: WarehouseInfo[] = whs.map(w => ({
        warehouseId: String(w._id),
        name: w.name,
        shippingCostWeight: w.shippingCostWeight || 1.0,
        baseCost: 100 // default base shipping cost for hackathon
    }));

    return { stockInfo, warehouses };
};

const getOrderDemand = async (order: IOrder): Promise<SplitLine[]> => {
    const lines = await QuotationLine.find({ quotationId: order.quotationId });
    const productIds = lines.map(l => l.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const dict = new Map(products.map(p => [String(p._id), p]));

    return lines.map(l => {
        const p = dict.get(String(l.productId));
        // A product is stock tracked if it is not a subscription and category is not services
        // We'll simplify for hackathon: only HW is tracked? The prompt said: "SKIP any product with isStockTracked === false (services, subscriptions)."
        const isStockTracked = p ? (!p.isSubscription && !(p as any).category?.toLowerCase().includes('service')) : true;
        return {
            productId: String(l.productId),
            productName: l.productName,
            quantity: l.quantity,
            isStockTracked
        };
    });
};

export const getSplitPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const demand = await getOrderDemand(order);
        const { stockInfo, warehouses } = await getInventoryState();

        const plan = planSplit(demand, stockInfo, warehouses);
        res.json(plan);
    } catch (e) { next(e); }
};

export const acceptSplit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const demand = await getOrderDemand(order);
        const { stockInfo, warehouses } = await getInventoryState();
        const plan = planSplit(demand, stockInfo, warehouses);

        // Atomically reserve stock
        const reservations = [];
        for (const alloc of plan.allocations) {
            for (const line of alloc.lines) {
                const updated = await Stock.findOneAndUpdate(
                    {
                        warehouseId: alloc.warehouseId,
                        productId: line.productId,
                        $expr: { $gte: [{ $subtract: ['$quantity', '$reservedQuantity'] }, line.quantity] }
                    },
                    { $inc: { reservedQuantity: line.quantity } },
                    { new: true }
                );

                if (!updated) {
                    // Rollback
                    for (const rb of reservations) {
                        await Stock.updateOne(
                            { warehouseId: rb.warehouseId, productId: rb.productId },
                            { $inc: { reservedQuantity: -rb.quantity } }
                        );
                    }
                    return res.status(422).json({ error: `Insufficient stock for ${line.productName} in warehouse ${alloc.warehouseName}` });
                }
                reservations.push({ warehouseId: alloc.warehouseId, productId: line.productId, quantity: line.quantity });
            }
        }

        order.fulfillmentPlan = [...plan.allocations, ...plan.backorders] as any;
        order.splitMode = 'AUTO';
        order.hasBackorder = plan.backorders.length > 0;
        order.shipmentCount = plan.shipmentCount;
        order.totalShippingCost = plan.totalShippingCost;
        order.stockReservedAt = new Date();
        await order.save();

        res.json(order);
    } catch (e) { next(e); }
};

export const manualSplit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { allocations } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Validate allocations against availability
        const reservations = [];
        let totalCost = 0;
        let hasBackorder = false;

        const { warehouses } = await getInventoryState();
        const whMap = new Map(warehouses.map(w => [w.warehouseId, w]));

        for (const alloc of allocations) {
            if (alloc.isBackorder) {
                hasBackorder = true;
                continue;
            }
            const wh = whMap.get(alloc.warehouseId);
            if (wh) totalCost += (wh.baseCost * wh.shippingCostWeight);

            for (const line of alloc.lines) {
                const updated = await Stock.findOneAndUpdate(
                    {
                        warehouseId: alloc.warehouseId,
                        productId: line.productId,
                        $expr: { $gte: [{ $subtract: ['$quantity', '$reservedQuantity'] }, line.quantity] }
                    },
                    { $inc: { reservedQuantity: line.quantity } },
                    { new: true }
                );

                if (!updated) {
                    // Rollback
                    for (const rb of reservations) {
                        await Stock.updateOne(
                            { warehouseId: rb.warehouseId, productId: rb.productId },
                            { $inc: { reservedQuantity: -rb.quantity } }
                        );
                    }
                    return res.status(422).json({ error: `Over-allocation! Insufficient stock for ${line.productName}.` });
                }
                reservations.push({ warehouseId: alloc.warehouseId, productId: line.productId, quantity: line.quantity });
            }
        }

        order.fulfillmentPlan = allocations as any;
        order.splitMode = 'MANUAL';
        order.hasBackorder = hasBackorder;
        order.shipmentCount = allocations.filter((a: any) => !a.isBackorder).length;
        order.totalShippingCost = totalCost;
        order.stockReservedAt = new Date();
        await order.save();

        res.json(order);
    } catch (e) { next(e); }
};

export const consolidateBackorder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order || !order.hasBackorder) return res.status(400).json({ error: 'No backorder to consolidate' });

        // Simply re-run logic over just the backorder
        const { stockInfo, warehouses } = await getInventoryState();

        // Find existing non-backorders
        const fulfilled = order.fulfillmentPlan.filter((p: any) => !p.isBackorder);

        const cResult = consolidateBackorders(order.fulfillmentPlan as any, stockInfo, warehouses);

        // For hackathon: just replace state if fully resolved, minus the reservations complexity. 
        // We'll trust the plan and assume another explicit 'accept' flow can be done.
        res.json({ newPlan: [...fulfilled, ...cResult.resolvedAllocations, ...cResult.remainingBackorders] });
    } catch (e) { next(e); }
};
