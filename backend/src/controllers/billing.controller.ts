import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Subscription } from '../models/Subscription';
import { Invoice, IInvoiceLine } from '../models/Invoice';
import { SubscriptionService } from '../services/billing/SubscriptionService';

const generateInvNumber = () => `INV-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;

/**
 * activateOrderBilling
 *
 * Called automatically when all shipments for an order are DELIVERED (via shipment.controller).
 * Handles hybrid orders containing BOTH one-time products and recurring subscription products.
 *
 * Strategy:
 *  - One-time lines  → appear on a single ONE_TIME invoice for the order
 *  - Recurring lines → each creates a Subscription + BillingSchedules + a separate RECURRING invoice
 *                      for the prorated first period
 *  - A shipping line is appended to the ONE_TIME invoice if shipping costs exist
 */
export const activateOrderBilling = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Idempotency guard – don't re-invoice an already-billed order
        const existingInvoice = await Invoice.findOne({ orderId: order._id });
        if (existingInvoice) {
            console.log(`[Billing] Order ${order._id} already billed, skipping.`);
            return res.json(existingInvoice);
        }

        // Use Order.orderLines (already snapshotted from quotation at order creation)
        // and enrich with the Product record to get isSubscription flag
        const productIds = order.orderLines.map(l => l.productId);
        const products = await Product.find({ _id: { $in: productIds } });
        const pMap = new Map(products.map(p => [String(p._id), p]));

        const now = new Date();
        const oneTimeLines: IInvoiceLine[] = [];
        const createdSubscriptionIds: mongoose.Types.ObjectId[] = [];

        for (const line of order.orderLines) {
            const prod = pMap.get(String(line.productId));
            // Fall back to isSubscription on the order line itself if product is missing
            const isSubscription = prod ? prod.isSubscription : line.isSubscription;

            if (isSubscription && prod) {
                // ── RECURRING PRODUCT ──────────────────────────────────────────
                // Detect billing cycle from the SubscriptionPlan linked to the product
                const planCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' =
                    ((prod as any).billingCycle?.toUpperCase() as any) || 'MONTHLY';

                // Calculate the prorated window: activation → 1st of next cycle
                const cycleEnd = new Date(now);
                if (planCycle === 'MONTHLY') cycleEnd.setMonth(cycleEnd.getMonth() + 1);
                else if (planCycle === 'QUARTERLY') cycleEnd.setMonth(cycleEnd.getMonth() + 3);
                else cycleEnd.setFullYear(cycleEnd.getFullYear() + 1);
                cycleEnd.setDate(1);
                cycleEnd.setHours(0, 0, 0, 0);
                // If cycleEnd somehow ended up ≤ now (e.g. activated on the 1st), push one period forward
                if (cycleEnd <= now) {
                    if (planCycle === 'MONTHLY') cycleEnd.setMonth(cycleEnd.getMonth() + 1);
                    else if (planCycle === 'QUARTERLY') cycleEnd.setMonth(cycleEnd.getMonth() + 3);
                    else cycleEnd.setFullYear(cycleEnd.getFullYear() + 1);
                }

                // Proration maths
                const msInDay = 1000 * 60 * 60 * 24;
                const cycleDays = Math.max(1, Math.round((cycleEnd.getTime() - new Date(now.getFullYear(), now.getMonth(), 1).getTime()) / msInDay));
                const activeDays = Math.max(1, Math.round((cycleEnd.getTime() - now.getTime()) / msInDay));
                const prorationRatio = Math.min(1, activeDays / cycleDays);
                const proratedUnitPrice = Number((line.unitPrice * prorationRatio).toFixed(2));
                const proratedLineTotal = Number((proratedUnitPrice * line.quantity).toFixed(2));

                // Create Subscription record
                const sub = await Subscription.create({
                    customerId: order.customerId,
                    orderId: order._id,
                    productId: prod._id,
                    productName: prod.name,
                    billingCycle: planCycle,
                    status: 'ACTIVE',
                    startDate: now,
                    nextBillingDate: cycleEnd,
                    unitPrice: line.unitPrice,  // full cycle price
                    quantity: line.quantity,
                    totalRecurringAmount: line.unitPrice * line.quantity,
                });

                // Generate 12 forward-looking billing schedules (monthly) or equivalent
                const periods = planCycle === 'MONTHLY' ? 12 : planCycle === 'QUARTERLY' ? 4 : 1;
                await SubscriptionService.generateSchedules(sub._id as any, cycleEnd, periods);

                createdSubscriptionIds.push(sub._id as mongoose.Types.ObjectId);

                // Build a RECURRING invoice for just this subscription's prorated first period
                const subSubtotal = proratedLineTotal;
                const subTax = Number((subSubtotal * 0.1).toFixed(2));
                const subGrandTotal = subSubtotal + subTax;

                await Invoice.create({
                    invoiceNumber: generateInvNumber(),
                    orderId: order._id,
                    subscriptionId: sub._id,
                    customerId: order.customerId,
                    invoiceType: 'RECURRING',
                    lines: [{
                        productId: prod._id,
                        productName: prod.name,
                        description: `Prorated charge – ${activeDays} of ${cycleDays} days`,
                        quantity: line.quantity,
                        unitPrice: proratedUnitPrice,
                        lineTotal: proratedLineTotal,
                        isRecurring: true,
                        periodStart: now,
                        periodEnd: cycleEnd,
                    }],
                    subtotal: subSubtotal,
                    taxTotal: subTax,
                    grandTotal: subGrandTotal,
                    amountDue: subGrandTotal,
                    amountPaid: 0,
                    status: 'UNPAID',
                    dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
                });

            } else {
                // ── ONE-TIME PRODUCT ───────────────────────────────────────────
                oneTimeLines.push({
                    productId: line.productId,
                    productName: line.productName,
                    description: `One-time purchase`,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    lineTotal: Number((line.unitPrice * line.quantity).toFixed(2)),
                    isRecurring: false,
                });
            }
        }

        // Append shipping line to one-time invoice if applicable
        if (order.totalShippingCost > 0) {
            oneTimeLines.push({
                productId: new mongoose.Types.ObjectId(),
                productName: 'Shipping & Handling',
                description: `${order.shipmentCount} shipment(s)`,
                quantity: 1,
                unitPrice: order.totalShippingCost,
                lineTotal: order.totalShippingCost,
                isRecurring: false,
            });
        }

        // Create ONE_TIME invoice if there are any one-time lines
        let oneTimeInvoice = null;
        if (oneTimeLines.length > 0) {
            const subtotal = Number(oneTimeLines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2));
            const taxTotal = Number((subtotal * 0.1).toFixed(2));
            const grandTotal = subtotal + taxTotal;

            oneTimeInvoice = await Invoice.create({
                invoiceNumber: generateInvNumber(),
                orderId: order._id,
                customerId: order.customerId,
                invoiceType: 'ONE_TIME',
                lines: oneTimeLines,
                subtotal,
                taxTotal,
                grandTotal,
                amountDue: grandTotal,
                amountPaid: 0,
                status: 'UNPAID',
                dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
            });
        }

        console.log(`[Billing] Order ${order._id} billed. One-time invoice: ${oneTimeInvoice?._id || 'none'}. Subscriptions created: ${createdSubscriptionIds.length}`);

        // Return summary
        res.status(201).json({
            message: 'Billing activated successfully',
            oneTimeInvoice,
            subscriptionsCreated: createdSubscriptionIds.length,
        });

    } catch (e) {
        next(e);
    }
};

/**
 * GET /orders/:id/billing-summary
 * Returns the full billing breakdown for one order:
 * - all invoices (one-time, recurring, adjustments)
 * - all subscriptions linked to this order
 */
export const getOrderBillingSummary = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id).populate('customerId', 'name email');
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const [invoices, subscriptions] = await Promise.all([
            Invoice.find({ orderId: id }).sort({ invoiceType: 1, createdAt: 1 }),
            Subscription.find({ orderId: id }),
        ]);

        // Separate invoice types
        const oneTimeInvoices = invoices.filter(i => i.invoiceType === 'ONE_TIME');
        const recurringInvoices = invoices.filter(i => i.invoiceType === 'RECURRING');
        const adjustmentInvoices = invoices.filter(i => i.invoiceType === 'ADJUSTMENT');

        // Summarise one-time lines from order itself
        const oneTimeOrderLines = order.orderLines.filter(l => !l.isSubscription);
        const recurringOrderLines = order.orderLines.filter(l => l.isSubscription);

        res.json({
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                customerId: order.customerId,
                grandTotal: order.grandTotal,
                createdAt: order.createdAt,
            },
            lines: {
                oneTime: oneTimeOrderLines,
                recurring: recurringOrderLines,
            },
            invoices: {
                oneTime: oneTimeInvoices,
                recurring: recurringInvoices,
                adjustments: adjustmentInvoices,
            },
            subscriptions,
        });
    } catch (e) {
        next(e);
    }
};

/**
 * Billing cron tick – runs daily, invoices any ACTIVE subscription whose
 * nextBillingDate has passed, using the BillingSchedule for that period.
 */
export const runBillingCronTick = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const today = new Date();
        const { InvoiceService } = require('../services/billing/InvoiceService');
        const { BillingSchedule } = require('../models/BillingSchedule');

        // Find all UPCOMING schedules whose billingDate is today or earlier
        const dueSchedules = await BillingSchedule.find({
            status: 'UPCOMING',
            billingDate: { $lte: today },
        }).populate('subscriptionId');

        const generated = [];
        for (const sch of dueSchedules) {
            const sub = sch.subscriptionId as any;
            if (!sub || sub.status !== 'ACTIVE') {
                sch.status = 'VOID';
                await sch.save();
                continue;
            }
            try {
                const inv = await InvoiceService.generateInvoiceFromSchedule(
                    sch._id,
                    sub.customerId,
                    sub.orderId
                );
                generated.push(inv._id);
            } catch (err) {
                console.error(`[Cron] Failed to invoice schedule ${sch._id}:`, err);
            }
        }

        res.json({ processed: dueSchedules.length, generated: generated.length });
    } catch (e) {
        next(e);
    }
};
