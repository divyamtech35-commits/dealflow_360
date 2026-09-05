import mongoose, { Document, Schema } from 'mongoose';

export interface IBillingSchedule extends Document {
    subscriptionId: mongoose.Types.ObjectId;
    invoiceId?: mongoose.Types.ObjectId;
    billingDate: Date;
    periodStart: Date;
    periodEnd: Date;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    tax: number;
    total: number;
    status: 'UPCOMING' | 'INVOICED' | 'PAID' | 'FAILED' | 'VOID';
    createdAt: Date;
    updatedAt: Date;
}

const BillingScheduleSchema = new Schema({
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    billingDate: { type: Date, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { type: String, enum: ['UPCOMING', 'INVOICED', 'PAID', 'FAILED', 'VOID'], required: true, default: 'UPCOMING' }
}, { timestamps: true });

export const BillingSchedule = mongoose.model<IBillingSchedule>('BillingSchedule', BillingScheduleSchema);
