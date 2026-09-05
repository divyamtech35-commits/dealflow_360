import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { Subscription } from '../models/Subscription';
import { Invoice } from '../models/Invoice';
import { Payment } from '../models/Payment';
import { BillingSchedule } from '../models/BillingSchedule';
import { CreditNote } from '../models/CreditNote';
import { SubscriptionService } from '../services/billing/SubscriptionService';
import { PaymentService } from '../services/billing/PaymentService';
import { InvoiceService } from '../services/billing/InvoiceService';
import { ProrationService } from '../services/billing/ProrationService';

const router = Router();
router.use(authenticate);
router.use(authorizeRoles('finance', 'admin'));

router.get('/subscriptions', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const subs = await Subscription.find().populate('customerId', 'name email company');
        res.json(subs);
    } catch (e) { next(e); }
});

router.get('/subscriptions/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sub = await Subscription.findById(req.params.id).populate('customerId', 'name email company');
        if (!sub) return res.status(404).json({ error: 'Not found' });
        
        const schedules = await BillingSchedule.find({ subscriptionId: sub._id }).sort({ periodStart: 1 });
        const invoices = await Invoice.find({ subscriptionId: sub._id }).sort({ createdAt: -1 });
        
        res.json({ subscription: sub, schedules, invoices });
    } catch (e) { next(e); }
});

router.post('/subscriptions/:id/change-quantity', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { quantity } = req.body;
        const sub = await SubscriptionService.changeQuantity(req.params.id as any, quantity);
        res.json(sub);
    } catch (e) { next(e); }
});

router.post('/subscriptions/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { reason } = req.body;
        const sub = await SubscriptionService.cancelSubscription(req.params.id as any, reason);
        res.json(sub);
    } catch (e) { next(e); }
});

router.post('/invoices/generate', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Trigger manual cron tick or specific schedule
        const { scheduleId, customerId, orderId } = req.body;
        const inv = await InvoiceService.generateInvoiceFromSchedule(scheduleId, customerId, orderId);
        res.json(inv);
    } catch (e) { next(e); }
});

router.get('/invoices/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate('customerId', 'name email')
            .populate('orderId');
        if (!invoice) return res.status(404).json({ error: 'Not found' });
        const payments = await Payment.find({ invoiceId: invoice._id }).sort({ paidAt: -1 });
        res.json({ invoice, payments });
    } catch (e) { next(e); }
});

router.post('/invoices/:id/payment', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { amount, paymentMethod, reference } = req.body;
        const payment = await PaymentService.recordPayment(req.params.id as any, amount, paymentMethod, reference);
        res.json(payment);
    } catch (e) { next(e); }
});

router.post('/subscriptions/:id/proration-preview', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { newQuantity } = req.body;
        const sub = await Subscription.findById(req.params.id);
        if (!sub) return res.status(404).json({ error: 'Not found' });
        const now = new Date();
        const currentSchedule = await BillingSchedule.findOne({
            subscriptionId: sub._id,
            periodStart: { $lte: now },
            periodEnd: { $gt: now },
            status: { $in: ['UPCOMING', 'INVOICED', 'PAID'] }
        });
        if (!currentSchedule) return res.json({ adjustmentAmount: 0, remainingDays: 0, totalBillingDays: 0 });
        const adj = ProrationService.calculateAdjustment({
            oldQuantity: sub.quantity,
            newQuantity,
            oldUnitPrice: sub.unitPrice,
            newUnitPrice: sub.unitPrice,
            billingPeriodStart: currentSchedule.periodStart,
            billingPeriodEnd: currentSchedule.periodEnd,
            changeDate: now
        });
        res.json(adj);
    } catch (e) { next(e); }
});

router.get('/credit-notes', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const notes = await CreditNote.find()
            .populate('customerId', 'name email')
            .sort({ createdAt: -1 });
        res.json(notes);
    } catch (e) { next(e); }
});

router.post('/credit-notes', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { customerId, invoiceId, amount, reason } = req.body;
        const count = await CreditNote.countDocuments();
        const creditNoteNumber = `CN-${String(count + 1).padStart(4, '0')}`;

        const note = await CreditNote.create({
            creditNoteNumber,
            customerId,
            invoiceId: invoiceId || undefined,
            amount: Number(amount) || 0,
            reason: reason || 'Commercial Adjustment / Credit Issue',
            status: 'ISSUED'
        });
        const populated = await CreditNote.findById(note._id).populate('customerId', 'name email');
        res.status(201).json(populated);
    } catch (e) { next(e); }
});

router.delete('/credit-notes/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await CreditNote.findByIdAndDelete(req.params.id);
        res.json({ message: 'Credit note deleted successfully' });
    } catch (e) { next(e); }
});

router.get('/reconciliation', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const invoices = await Invoice.find()
            .populate('customerId', 'name email')
            .populate('orderId', 'orderNumber status')
            .sort({ createdAt: -1 });
        res.json(invoices);
    } catch (e) { next(e); }
});

router.post('/invoices', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { customerId, orderId, invoiceType, lines, subtotal, taxTotal, grandTotal, dueDate, status } = req.body;
        const count = await Invoice.countDocuments();
        const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;

        const sub = Number(subtotal) || (lines || []).reduce((acc: number, l: any) => acc + (Number(l.lineTotal) || 0), 0);
        const tax = taxTotal !== undefined ? Number(taxTotal) : Math.round(sub * 0.1);
        const grand = grandTotal !== undefined ? Number(grandTotal) : (sub + tax);
        const invStatus = status || 'UNPAID';
        const isPaid = invStatus === 'PAID';

        const processedLines = (lines && lines.length > 0)
            ? lines.map((l: any) => ({
                productId: (l.productId && require('mongoose').Types.ObjectId.isValid(l.productId)) ? l.productId : new (require('mongoose').Types.ObjectId)(),
                productName: l.productName || 'Professional Services',
                description: l.description || '',
                quantity: Number(l.quantity) || 1,
                unitPrice: Number(l.unitPrice) || 0,
                lineTotal: (Number(l.quantity) || 1) * (Number(l.unitPrice) || 0),
                isRecurring: Boolean(l.isRecurring)
            }))
            : [{
                productId: new (require('mongoose').Types.ObjectId)(),
                productName: 'Professional Services / Cloud Sub',
                description: 'Direct Billing Invoice',
                quantity: 1,
                unitPrice: sub,
                lineTotal: sub,
                isRecurring: invoiceType === 'RECURRING'
            }];

        const inv = await Invoice.create({
            invoiceNumber,
            customerId,
            orderId: orderId || undefined,
            invoiceType: invoiceType || 'ONE_TIME',
            lines: processedLines,
            subtotal: sub,
            taxTotal: tax,
            grandTotal: grand,
            amountPaid: isPaid ? grand : 0,
            amountDue: isPaid ? 0 : grand,
            status: invStatus,
            dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        });

        const populated = await Invoice.findById(inv._id).populate('customerId', 'name email').populate('orderId', 'orderNumber');
        res.status(201).json(populated);
    } catch (e) { next(e); }
});

router.put('/invoices/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, amountPaid, dueDate } = req.body;
        const inv: any = await Invoice.findById(req.params.id);
        if (!inv) return res.status(404).json({ error: 'Invoice not found' });

        if (status) inv.status = status;
        if (amountPaid !== undefined) {
            inv.amountPaid = Number(amountPaid);
            inv.amountDue = Math.max(0, inv.grandTotal - inv.amountPaid);
            if (inv.amountDue === 0) inv.status = 'PAID';
            else if (inv.amountPaid > 0) inv.status = 'PARTIALLY_PAID';
        }
        if (dueDate) inv.dueDate = new Date(dueDate);

        await inv.save();
        const populated = await Invoice.findById(inv._id).populate('customerId', 'name email').populate('orderId', 'orderNumber');
        res.json(populated);
    } catch (e) { next(e); }
});

router.delete('/invoices/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await Invoice.findByIdAndDelete(req.params.id);
        res.json({ message: 'Invoice deleted successfully' });
    } catch (e) { next(e); }
});

// Dynamic summary calculation from real MongoDB collections
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const activeSubs = await Subscription.find({ status: 'ACTIVE' });
        
        // Calculate dynamic MRR: Monthly Recurring Revenue across all ACTIVE subscriptions
        const dynamicMRR = activeSubs.reduce((acc, s) => {
            const qty = s.quantity || 1;
            const price = s.unitPrice || 0;
            const total = s.totalRecurringAmount || (qty * price);
            if (s.billingCycle === 'YEARLY') return acc + Math.round(total / 12);
            if (s.billingCycle === 'QUARTERLY') return acc + Math.round(total / 3);
            return acc + total;
        }, 0);

        const now = new Date();
        const pendingInvoices = await Invoice.countDocuments({ status: { $in: ['UNPAID', 'DRAFT', 'PARTIALLY_PAID'] } });
        const overdueInvoices = await Invoice.countDocuments({
            $or: [
                { status: 'OVERDUE' },
                { status: { $in: ['UNPAID', 'PARTIALLY_PAID'] }, dueDate: { $lt: now } }
            ]
        });

        const credits = await CreditNote.find({ status: 'ISSUED' });
        const totalCredits = credits.reduce((acc, c) => acc + (c.amount || 0), 0);

        res.json({
            activeSubscriptions: activeSubs.length,
            billingThisMonth: dynamicMRR,
            pendingInvoices,
            overdueInvoices,
            totalCredits
        });
    } catch (e) { next(e); }
});

// CREATE Subscription directly
router.post('/subscriptions', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { customerId, productId, productName, billingCycle, unitPrice, quantity, startDate, status } = req.body;
        const start = startDate ? new Date(startDate) : new Date();
        const cycle = (billingCycle || 'MONTHLY').toUpperCase() as 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
        const nextBilling = new Date(start);
        if (cycle === 'MONTHLY') nextBilling.setMonth(nextBilling.getMonth() + 1);
        else if (cycle === 'QUARTERLY') nextBilling.setMonth(nextBilling.getMonth() + 3);
        else nextBilling.setFullYear(nextBilling.getFullYear() + 1);

        const qty = Number(quantity) || 1;
        const price = Number(unitPrice) || 50;

        const sub = await Subscription.create({
            customerId,
            productId: productId || new (require('mongoose').Types.ObjectId)(),
            productName: productName || 'Cloud Storage 1TB',
            billingCycle: cycle,
            status: status || 'ACTIVE',
            startDate: start,
            nextBillingDate: nextBilling,
            unitPrice: price,
            quantity: qty,
            totalRecurringAmount: qty * price
        });

        const periods = cycle === 'MONTHLY' ? 12 : cycle === 'QUARTERLY' ? 4 : 1;
        await SubscriptionService.generateSchedules(sub._id as any, nextBilling, periods);

        const populated = await Subscription.findById(sub._id).populate('customerId', 'name email company');
        res.status(201).json(populated);
    } catch (e) { next(e); }
});

// UPDATE Subscription
router.put('/subscriptions/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, unitPrice, quantity, billingCycle, nextBillingDate, productName } = req.body;
        const sub: any = await Subscription.findById(req.params.id);
        if (!sub) return res.status(404).json({ error: 'Subscription not found' });

        if (status) sub.status = status;
        if (productName) sub.productName = productName;
        if (billingCycle) sub.billingCycle = billingCycle.toUpperCase();
        if (unitPrice !== undefined) sub.unitPrice = Number(unitPrice);
        if (quantity !== undefined) sub.quantity = Number(quantity);
        sub.totalRecurringAmount = sub.unitPrice * sub.quantity;
        if (nextBillingDate) sub.nextBillingDate = new Date(nextBillingDate);

        await sub.save();
        const populated = await Subscription.findById(sub._id).populate('customerId', 'name email company');
        res.json(populated);
    } catch (e) { next(e); }
});

// DELETE Subscription
router.delete('/subscriptions/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await Subscription.findByIdAndDelete(req.params.id);
        await BillingSchedule.deleteMany({ subscriptionId: req.params.id });
        res.json({ message: 'Subscription and related schedules deleted' });
    } catch (e) { next(e); }
});

export default router;
