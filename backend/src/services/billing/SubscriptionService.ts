import mongoose from 'mongoose';
import { Subscription } from '../../models/Subscription';
import { BillingSchedule } from '../../models/BillingSchedule';
import { CreditNote } from '../../models/CreditNote';
import { ProrationService } from './ProrationService';
import { InvoiceService } from './InvoiceService';

export class SubscriptionService {
    static async generateSchedules(subscriptionId: mongoose.Types.ObjectId, startDate: Date, periods: number = 12) {
        const sub = await Subscription.findById(subscriptionId);
        if (!sub) return;

        let currentStart = new Date(startDate);
        for (let i = 0; i < periods; i++) {
            let nextStart = new Date(currentStart);
            if (sub.billingCycle === 'MONTHLY') nextStart.setMonth(nextStart.getMonth() + 1);
            else if (sub.billingCycle === 'QUARTERLY') nextStart.setMonth(nextStart.getMonth() + 3);
            else if (sub.billingCycle === 'YEARLY') nextStart.setFullYear(nextStart.getFullYear() + 1);

            const subtotal = sub.unitPrice * sub.quantity;
            const tax = Number((subtotal * 0.1).toFixed(2));

            await BillingSchedule.create({
                subscriptionId: sub._id,
                billingDate: currentStart,
                periodStart: currentStart,
                periodEnd: nextStart,
                quantity: sub.quantity,
                unitPrice: sub.unitPrice,
                subtotal: subtotal,
                tax: tax,
                total: subtotal + tax,
                status: 'UPCOMING'
            });

            currentStart = nextStart;
        }
        
        sub.nextBillingDate = currentStart;
        await sub.save();
    }

    static async changeQuantity(subscriptionId: mongoose.Types.ObjectId, newQuantity: number) {
        const sub = await Subscription.findById(subscriptionId);
        if (!sub) throw new Error('Subscription not found');

        const oldQuantity = sub.quantity;
        if (oldQuantity === newQuantity) return sub;

        const now = new Date();
        
        // Find current active schedule
        const currentSchedule = await BillingSchedule.findOne({
            subscriptionId: sub._id,
            periodStart: { $lte: now },
            periodEnd: { $gt: now },
            status: { $in: ['UPCOMING', 'INVOICED', 'PAID'] }
        });

        if (currentSchedule) {
            const adj = ProrationService.calculateAdjustment({
                oldQuantity,
                newQuantity,
                oldUnitPrice: sub.unitPrice,
                newUnitPrice: sub.unitPrice,
                billingPeriodStart: currentSchedule.periodStart,
                billingPeriodEnd: currentSchedule.periodEnd,
                changeDate: now
            });

            if (adj.adjustmentAmount > 0) {
                // Create an invoice for the difference
                await InvoiceService.generateAdjustmentInvoice(
                    sub.customerId, 
                    sub.orderId, 
                    sub._id as mongoose.Types.ObjectId, 
                    adj.adjustmentAmount, 
                    `Prorated upgrade to ${newQuantity} qty`
                );
            } else if (adj.adjustmentAmount < 0) {
                // Create a credit note
                await CreditNote.create({
                    creditNoteNumber: `CN-${Math.floor(Math.random() * 900000).toString()}`,
                    customerId: sub.customerId,
                    subscriptionId: sub._id,
                    amount: Math.abs(adj.adjustmentAmount),
                    taxAdjustment: Math.abs(adj.adjustmentAmount) * 0.1,
                    reason: `Prorated downgrade to ${newQuantity} qty`,
                    status: 'ISSUED'
                });
            }
        }

        // Update future schedules
        sub.quantity = newQuantity;
        sub.totalRecurringAmount = sub.unitPrice * newQuantity;
        await sub.save();

        const futureSchedules = await BillingSchedule.find({
            subscriptionId: sub._id,
            periodStart: { $gt: now },
            status: 'UPCOMING'
        });

        for (const sch of futureSchedules) {
            sch.quantity = newQuantity;
            const subtotal = newQuantity * sch.unitPrice;
            sch.subtotal = subtotal;
            sch.tax = Number((subtotal * 0.1).toFixed(2));
            sch.total = sch.subtotal + sch.tax;
            await sch.save();
        }

        return sub;
    }

    static async cancelSubscription(subscriptionId: mongoose.Types.ObjectId, reason: string) {
        const sub = await Subscription.findById(subscriptionId);
        if (!sub) throw new Error('Subscription not found');

        const now = new Date();
        sub.status = 'CANCELLED';
        sub.cancellationDate = now;
        sub.cancellationReason = reason;
        await sub.save();

        // Void future schedules
        await BillingSchedule.updateMany(
            { subscriptionId: sub._id, periodStart: { $gt: now }, status: 'UPCOMING' },
            { $set: { status: 'VOID' } }
        );

        // Find current schedule to issue refund/credit note
        const currentSchedule = await BillingSchedule.findOne({
            subscriptionId: sub._id,
            periodStart: { $lte: now },
            periodEnd: { $gt: now },
            status: { $in: ['INVOICED', 'PAID'] }
        });

        if (currentSchedule) {
             const adj = ProrationService.calculateAdjustment({
                oldQuantity: sub.quantity,
                newQuantity: 0,
                oldUnitPrice: sub.unitPrice,
                newUnitPrice: sub.unitPrice,
                billingPeriodStart: currentSchedule.periodStart,
                billingPeriodEnd: currentSchedule.periodEnd,
                changeDate: now
            });

            if (adj.adjustmentAmount < 0) {
                 await CreditNote.create({
                    creditNoteNumber: `CN-${Math.floor(Math.random() * 900000).toString()}`,
                    customerId: sub.customerId,
                    subscriptionId: sub._id,
                    amount: Math.abs(adj.adjustmentAmount),
                    taxAdjustment: Math.abs(adj.adjustmentAmount) * 0.1,
                    reason: `Cancellation unused period refund`,
                    status: 'ISSUED'
                });
            }
        }

        return sub;
    }
}
