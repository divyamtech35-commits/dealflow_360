import { Request, Response, NextFunction } from 'express';
import { Order, IFulfillmentPlan } from '../models/Order';
import { QuotationLine } from '../models/QuotationLine';
import { Product } from '../models/Product';
import { Subscription } from '../models/Subscription';
import { Invoice } from '../models/Invoice';
import { calculateProration, generateInvoice, InvoiceInputLine } from '../services/billingEngine';

// Mock generic invoice number
const generateInvNumber = () => `INV-${Math.floor(Math.random() * 900000).toString()}`;

export const activateOrderBilling = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Retrieve the quotient lines corresponding to this order
        const qLines = await QuotationLine.find({ quotationId: order.quotationId });
        const productIds = qLines.map(l => l.productId);
        const products = await Product.find({ _id: { $in: productIds } });
        const pMap = new Map(products.map(p => [String(p._id), p]));

        const currentNow = new Date();
        const invoiceLines: InvoiceInputLine[] = [];

        for (const line of qLines) {
            const prod = pMap.get(String(line.productId));
            if (!prod) continue;

            if (prod.isSubscription) {
                // Subscription product -> Calculate Proration for first month and create Record
                const limitDate = new Date(currentNow);
                const planCycle = (prod as any).plan?.toUpperCase() || 'MONTHLY'; // Simplified cycle detection

                if (planCycle === 'MONTHLY') limitDate.setMonth(limitDate.getMonth() + 1);
                else if (planCycle === 'YEARLY') limitDate.setFullYear(limitDate.getFullYear() + 1);

                // Align to 1st of next month for unified billing (conceptual assumption)
                limitDate.setDate(1);
                if (limitDate <= currentNow) limitDate.setMonth(limitDate.getMonth() + 1);

                const subRes = calculateProration(
                    {
                        id: String(prod._id),
                        productName: prod.name,
                        unitPrice: prod.basePrice,
                        quantity: line.quantity,
                        billingCycle: planCycle as any
                    },
                    currentNow,
                    limitDate
                );

                // Create the active subscription record
                await Subscription.create({
                    customerId: order.customerId,
                    orderId: order._id,
                    productId: prod._id,
                    productName: prod.name,
                    billingCycle: planCycle,
                    status: 'ACTIVE',
                    startDate: currentNow,
                    nextBillingDate: limitDate, // Sets the next billing date for the cron
                    unitPrice: prod.basePrice,
                    quantity: line.quantity,
                    totalRecurringAmount: prod.basePrice * line.quantity
                });

                invoiceLines.push(...subRes.lines);

            } else {
                // One off Product (Hardware / Service)
                invoiceLines.push({
                    productName: prod.name,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice || prod.basePrice,
                    isRecurring: false,
                    description: `One-time purchase - ${prod.category}`
                });
            }
        }

        // Add any shipping cost from the order as a line
        if (order.totalShippingCost > 0) {
            invoiceLines.push({
                productName: 'Fulfillment & Shipping',
                quantity: order.shipmentCount,
                unitPrice: order.totalShippingCost / Math.max(1, order.shipmentCount),
                isRecurring: false,
                description: 'Calculated split fulfillment cost'
            });
        }

        const generated = generateInvoice(invoiceLines, 10); // 10% tax

        const invoice = await Invoice.create({
            invoiceNumber: generateInvNumber(),
            orderId: order._id,
            customerId: order.customerId,
            lines: generated.lines,
            subtotal: generated.subtotal,
            taxTotal: generated.taxTotal,
            grandTotal: generated.grandTotal,
            status: 'ISSUED',
            dueDate: new Date(currentNow.getTime() + 15 * 24 * 60 * 60 * 1000) // 15 net
        });

        res.status(201).json(invoice);
    } catch (e) {
        next(e);
    }
};

/**
 * Endpoint for a cron job to call daily to process any subscriptions
 * whose nextBillingDate is <= today.
 */
export const runBillingCronTick = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const today = new Date();
        const pendingSubs = await Subscription.find({
            status: 'ACTIVE',
            nextBillingDate: { $lte: today }
        });

        const invoices = [];
        for (const sub of pendingSubs) {
            // Generate full cycle invoice
            const generated = generateInvoice([{
                productName: sub.productName,
                quantity: sub.quantity,
                unitPrice: sub.unitPrice,
                isRecurring: true,
                description: `Recurring charge for ${sub.billingCycle}`
            }], 10);

            const inv = await Invoice.create({
                invoiceNumber: generateInvNumber(),
                orderId: sub.orderId,
                subscriptionId: sub._id,
                customerId: sub.customerId,
                lines: generated.lines,
                subtotal: generated.subtotal,
                taxTotal: generated.taxTotal,
                grandTotal: generated.grandTotal,
                status: 'ISSUED',
                dueDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000)
            });
            invoices.push(inv);

            // Roll forward the billing date
            const newDate = new Date(sub.nextBillingDate);
            if (sub.billingCycle === 'MONTHLY') newDate.setMonth(newDate.getMonth() + 1);
            else if (sub.billingCycle === 'QUARTERLY') newDate.setMonth(newDate.getMonth() + 3);
            else if (sub.billingCycle === 'YEARLY') newDate.setFullYear(newDate.getFullYear() + 1);

            sub.nextBillingDate = newDate;
            await sub.save();
        }

        res.json({ processed: pendingSubs.length, generatedInvoices: invoices.length });
    } catch (e) {
        next(e);
    }
};
