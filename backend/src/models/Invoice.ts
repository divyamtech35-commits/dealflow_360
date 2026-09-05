import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoiceLine {
    productId: mongoose.Types.ObjectId;
    productName: string;
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    isRecurring: boolean;
    periodStart?: Date;
    periodEnd?: Date;
}

export interface IInvoice extends Document {
    invoiceNumber: string;
    orderId: mongoose.Types.ObjectId;
    subscriptionId?: mongoose.Types.ObjectId;
    billingScheduleId?: mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    invoiceType: 'ONE_TIME' | 'RECURRING' | 'ADJUSTMENT';
    lines: IInvoiceLine[];
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    amountPaid: number;
    amountDue: number;
    currency: string;
    status: 'DRAFT' | 'ISSUED' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';
    dueDate: Date;
    paidAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const InvoiceLineSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: false },
    productName: { type: String, required: true },
    description: { type: String, default: '' },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
    isRecurring: { type: Boolean, required: true, default: false },
    periodStart: { type: Date },
    periodEnd: { type: Date }
});

const InvoiceSchema = new Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: false },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
    billingScheduleId: { type: Schema.Types.ObjectId, ref: 'BillingSchedule' },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invoiceType: { type: String, enum: ['ONE_TIME', 'RECURRING', 'ADJUSTMENT'], required: true, default: 'ONE_TIME' },
    lines: [InvoiceLineSchema],
    subtotal: { type: Number, required: true },
    taxTotal: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
    amountPaid: { type: Number, required: true, default: 0 },
    amountDue: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' },
    status: { type: String, enum: ['DRAFT', 'ISSUED', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'], required: true, default: 'DRAFT' },
    dueDate: { type: Date, required: true },
    paidAt: { type: Date }
}, { timestamps: true });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
