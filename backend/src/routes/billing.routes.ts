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

router.get('/reconciliation', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const invoices = await Invoice.find().populate('customerId', 'name email').sort({ createdAt: -1 });
        res.json(invoices);
    } catch (e) { next(e); }
});

router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const activeSubs = await Subscription.countDocuments({ status: 'ACTIVE' });
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const schedulesThisMonth = await BillingSchedule.find({
            periodStart: { $gte: startOfMonth, $lte: endOfMonth }
        });
        const billingThisMonth = schedulesThisMonth.reduce((acc, sch) => acc + sch.total, 0);

        const pendingInvoices = await Invoice.countDocuments({ status: 'UNPAID' });
        const overdueInvoices = await Invoice.countDocuments({ status: 'OVERDUE' });

        const credits = await CreditNote.find({ status: 'ISSUED' });
        const totalCredits = credits.reduce((acc, c) => acc + c.amount, 0);

        res.json({
            activeSubscriptions: activeSubs,
            billingThisMonth,
            pendingInvoices,
            overdueInvoices,
            totalCredits
        });
    } catch (e) { next(e); }
});

export default router;
