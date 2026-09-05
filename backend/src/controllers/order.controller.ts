import { Request, Response, NextFunction } from 'express';
import { Quotation } from '../models/Quotation';
import { QuotationLine } from '../models/QuotationLine';
import { Order, IOrder } from '../models/Order';
import { Stock } from '../models/Stock';
import { Warehouse } from '../models/Warehouse';
import { Product } from '../models/Product';
import { Shipment } from '../models/Shipment';
import { planSplit, consolidateBackorders, SplitLine, StockInfo, WarehouseInfo, SplitAllocation } from '../services/splitEngine';
import { logAudit } from '../services/auditService';

// Generate a mock sequence for the hackathon
const generateOrderNumber = () => `SO-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
const generateShipmentNumber = () => `SH-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

export const listOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status } = req.query;
        let filter: any = {};
        if (status) {
            // Support comma separated statuses
            const statuses = (status as string).split(',');
            filter.status = { $in: statuses };
        }
        
        const orders = await Order.find(filter)
            .populate('customerId')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (e) { next(e); }
};

export const getStocks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stocks = await Stock.find({})
            .populate('warehouseId')
            .populate('productId');
        res.json(stocks);
    } catch (e) { next(e); }
};

export const createOrderFromQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await Quotation.findById(req.params.id);
        if (!quote) return res.status(404).json({ error: 'Quotation not found' });

        if (quote.status !== 'APPROVED' && quote.status !== 'CONFIRMED') {
            return res.status(400).json({ error: 'Quotation must be APPROVED or CONFIRMED' });
        }

        const existingOrder = await Order.findOne({ quotationId: quote._id });
        if (existingOrder) return res.status(400).json({ error: 'Order already exists for this quotation' });

        const quoteLines = await QuotationLine.find({ quotationId: quote._id });
        const pIds = quoteLines.map(l => l.productId);
        const prods = await Product.find({ _id: { $in: pIds } });
        const pMap = new Map(prods.map(p => [String(p._id), p]));

        const orderLines = quoteLines.map(l => {
            const p = pMap.get(String(l.productId));
            return {
                productId: l.productId,
                productName: l.productName,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                discountAmount: l.discountAmount || 0,
                taxAmount: l.taxAmount || 0,
                lineTotal: l.lineTotal,
                isSubscription: p ? p.isSubscription : false
            };
        });

        const order = await Order.create({
            orderNumber: generateOrderNumber(),
            quotationId: quote._id,
            customerId: quote.customerId,
            salesRepId: quote.salesRepId,
            status: 'PENDING_FULFILLMENT',
            orderLines,
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

        // Create Shipment Records
        const createdShipments = [];
        for (const alloc of plan.allocations) {
            const sh = await Shipment.create({
                shipmentNumber: generateShipmentNumber(),
                orderId: order._id,
                warehouseId: alloc.warehouseId,
                status: 'READY_TO_SHIP',
                items: alloc.lines
            });
            createdShipments.push(sh);
        }

        order.fulfillmentPlan = [...plan.allocations, ...plan.backorders].map((a: any) => ({
            ...a,
            status: a.isBackorder ? 'PLANNED' : 'RESERVED'
        })) as any;
        order.splitMode = 'AUTO';
        order.hasBackorder = plan.backorders.length > 0;
        order.shipmentCount = createdShipments.length;
        order.totalShippingCost = plan.totalShippingCost;
        order.stockReservedAt = new Date();
        
        // Advance status if we are reserving stock
        const fromStatus = order.status;
        order.status = 'PARTIALLY_FULFILLED';
        
        await order.save();

        await logAudit({
            entityType: 'order',
            entityId: order._id as any,
            entityRef: order.orderNumber,
            action: 'fulfillment_plan_accepted',
            fromStatus: fromStatus,
            toStatus: order.status,
            actor: {
                id: (req as any).user._id.toString(),
                name: (req as any).user.name || 'Finance / Ops',
                role: (req as any).user.role,
                type: 'internal'
            },
            metadata: {
                message: 'Customer notified that order fulfillment has begun.',
                shipmentCount: plan.shipmentCount,
                hasBackorder: order.hasBackorder
            }
        });

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

        const validAllocations = allocations.filter((a: any) => !a.isBackorder);
        const backorders = allocations.filter((a: any) => a.isBackorder);

        // Create Shipments
        const createdShipments = [];
        for (const alloc of validAllocations) {
            const sh = await Shipment.create({
                shipmentNumber: generateShipmentNumber(),
                orderId: order._id,
                warehouseId: alloc.warehouseId,
                status: 'READY_TO_SHIP',
                items: alloc.lines
            });
            createdShipments.push(sh);
        }

        order.fulfillmentPlan = allocations.map((a: any) => ({
            ...a,
            status: a.isBackorder ? 'PLANNED' : 'RESERVED'
        })) as any;
        order.splitMode = 'MANUAL';
        order.hasBackorder = hasBackorder;
        order.shipmentCount = validAllocations.length;
        order.totalShippingCost = totalCost;
        order.stockReservedAt = new Date();
        
        order.status = 'PARTIALLY_FULFILLED';

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

        // Reserve stock for resolved allocations
        const reservations = [];
        for (const alloc of cResult.resolvedAllocations) {
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
                    for (const rb of reservations) {
                        await Stock.updateOne(
                            { warehouseId: rb.warehouseId, productId: rb.productId },
                            { $inc: { reservedQuantity: -rb.quantity } }
                        );
                    }
                    return res.status(422).json({ error: `Insufficient stock to consolidate ${line.productName}.` });
                }
                reservations.push({ warehouseId: alloc.warehouseId, productId: line.productId, quantity: line.quantity });
            }
        }

        // Create shipments for resolved backorders
        const createdShipments = [];
        for (const alloc of cResult.resolvedAllocations) {
            const sh = await Shipment.create({
                shipmentNumber: generateShipmentNumber(),
                orderId: order._id,
                warehouseId: alloc.warehouseId,
                status: 'READY_TO_SHIP',
                items: alloc.lines
            });
            createdShipments.push(sh);
        }

        const newPlan = [...fulfilled, ...cResult.resolvedAllocations, ...cResult.remainingBackorders].map((a: any) => ({
            ...a,
            status: a.isBackorder ? 'PLANNED' : (a.status || 'RESERVED')
        }));

        order.fulfillmentPlan = newPlan as any;
        order.hasBackorder = cResult.remainingBackorders.length > 0;
        order.shipmentCount += createdShipments.length;
        
        if (!order.hasBackorder) {
            // Check if ALL shipments (including new ones) are delivered
            const allShipments = await Shipment.find({ orderId: order._id });
            const allDelivered = allShipments.every(s => s.status === 'DELIVERED');
            if (allDelivered) {
                order.status = 'FULFILLED';
                order.actualDeliveryDate = new Date();
                // Note: In real life, billing might be triggered here. 
                // But typically backorders are caught by `updateShipmentStatus` when the newly created shipment is finally delivered.
                // We'll leave it at PARTIALLY_FULFILLED if not delivered.
            } else {
                order.status = 'PARTIALLY_FULFILLED';
            }
        }

        await order.save();
        res.json(order);
    } catch (e) { next(e); }
};

export const cancelFulfillment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        // Restore stock reserved quantities
        if (order.fulfillmentPlan && order.fulfillmentPlan.length > 0) {
            for (const alloc of order.fulfillmentPlan) {
                if (alloc.warehouseId) {
                    for (const line of alloc.lines) {
                        await Stock.updateOne(
                            { warehouseId: alloc.warehouseId, productId: line.productId },
                            { $inc: { reservedQuantity: -line.quantity } }
                        );
                    }
                }
            }
        }

        // Delete all associated shipments
        await Shipment.deleteMany({ orderId: order._id });

        const fromStatus = order.status;

        // Reset order fields
        order.status = 'PENDING_FULFILLMENT';
        order.fulfillmentPlan = [];
        order.shipmentCount = 0;
        order.totalShippingCost = 0;
        order.hasBackorder = false;
        order.stockReservedAt = undefined;

        await order.save();

        await logAudit({
            entityType: 'order',
            entityId: order._id as any,
            entityRef: order.orderNumber,
            action: 'fulfillment_plan_cancelled',
            fromStatus: fromStatus,
            toStatus: order.status,
            actor: {
                id: (req as any).user._id.toString(),
                name: (req as any).user.name || 'Finance / Ops',
                role: (req as any).user.role,
                type: 'internal'
            },
            metadata: {
                message: 'Fulfillment plan was manually cancelled and stock reservations released.'
            }
        });

        res.json(order);
    } catch (e) { next(e); }
};
