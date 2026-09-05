import mongoose from 'mongoose';
import { Payment } from '../../models/Payment';
import { Invoice } from '../../models/Invoice';
import { BillingSchedule } from '../../models/BillingSchedule';

export class PaymentService {
    static async recordPayment(invoiceId: mongoose.Types.ObjectId, amount: number, paymentMethod: string, reference: string) {
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) throw new Error('Invoice not found');
        
        if (invoice.status === 'PAID') throw new Error('Invoice already fully paid');

        const payment = await Payment.create({
            invoiceId: invoice._id,
            customerId: invoice.customerId,
            amount: amount,
            currency: invoice.currency,
            paymentMethod: paymentMethod,
            paymentReference: reference,
            status: 'SUCCESS',
            paidAt: new Date()
        });

        invoice.amountPaid += amount;
        invoice.amountDue = invoice.grandTotal - invoice.amountPaid;

        if (invoice.amountDue <= 0) {
            invoice.amountDue = 0;
            invoice.status = 'PAID';
            invoice.paidAt = new Date();
        } else {
            invoice.status = 'PARTIALLY_PAID';
        }

        await invoice.save();

        if (invoice.billingScheduleId && invoice.status === 'PAID') {
            await BillingSchedule.findByIdAndUpdate(invoice.billingScheduleId, { status: 'PAID' });
        }

        return payment;
    }
}
