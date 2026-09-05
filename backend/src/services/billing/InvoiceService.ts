import mongoose from 'mongoose';
import { Invoice, IInvoiceLine } from '../../models/Invoice';
import { BillingSchedule } from '../../models/BillingSchedule';

const generateInvNumber = () => `INV-${Math.floor(Math.random() * 900000).toString()}`;

export class InvoiceService {
    static async generateInvoiceFromSchedule(scheduleId: mongoose.Types.ObjectId, customerId: mongoose.Types.ObjectId, orderId: mongoose.Types.ObjectId): Promise<any> {
        const schedule = await BillingSchedule.findById(scheduleId).populate('subscriptionId');
        if (!schedule) throw new Error('Billing schedule not found');
        
        if (schedule.status === 'INVOICED' || schedule.status === 'PAID') {
            return await Invoice.findOne({ billingScheduleId: schedule._id });
        }

        // Duplicate protection
        const existing = await Invoice.findOne({
            subscriptionId: schedule.subscriptionId,
            billingScheduleId: schedule._id
        });

        if (existing) {
            schedule.status = 'INVOICED';
            schedule.invoiceId = existing._id as mongoose.Types.ObjectId;
            await schedule.save();
            return existing;
        }

        const sub = schedule.subscriptionId as any;

        const line: IInvoiceLine = {
            productId: sub.productId,
            productName: sub.productName,
            description: `Recurring charge for ${sub.billingCycle}`,
            quantity: schedule.quantity,
            unitPrice: schedule.unitPrice,
            lineTotal: schedule.subtotal,
            isRecurring: true,
            periodStart: schedule.periodStart,
            periodEnd: schedule.periodEnd
        };

        const invoice = await Invoice.create({
            invoiceNumber: generateInvNumber(),
            orderId: orderId,
            subscriptionId: sub._id,
            billingScheduleId: schedule._id,
            customerId: customerId,
            invoiceType: 'RECURRING',
            lines: [line],
            subtotal: schedule.subtotal,
            taxTotal: schedule.tax,
            grandTotal: schedule.total,
            amountDue: schedule.total,
            amountPaid: 0,
            status: 'UNPAID',
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // net 15
        });

        schedule.status = 'INVOICED';
        schedule.invoiceId = invoice._id as mongoose.Types.ObjectId;
        await schedule.save();

        return invoice;
    }

    static async generateAdjustmentInvoice(customerId: mongoose.Types.ObjectId, orderId: mongoose.Types.ObjectId, subscriptionId: mongoose.Types.ObjectId, amount: number, description: string): Promise<any> {
        const subtotal = Number(amount.toFixed(2));
        const taxTotal = Number((subtotal * 0.1).toFixed(2));
        const grandTotal = subtotal + taxTotal;

        const line: IInvoiceLine = {
            productId: new mongoose.Types.ObjectId(), // Placeholder or find actual
            productName: 'Proration Adjustment',
            description,
            quantity: 1,
            unitPrice: subtotal,
            lineTotal: subtotal,
            isRecurring: false
        };

        const invoice = await Invoice.create({
            invoiceNumber: generateInvNumber(),
            orderId: orderId,
            subscriptionId: subscriptionId,
            customerId: customerId,
            invoiceType: 'ADJUSTMENT',
            lines: [line],
            subtotal,
            taxTotal,
            grandTotal,
            amountDue: grandTotal,
            amountPaid: 0,
            status: 'UNPAID',
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        });

        return invoice;
    }
}
