import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
    invoiceId: mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    amount: number;
    currency: string;
    paymentMethod: string;
    paymentReference: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
    paidAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const PaymentSchema = new Schema({
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'INR' },
    paymentMethod: { type: String, required: true },
    paymentReference: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'], required: true, default: 'PENDING' },
    paidAt: { type: Date }
}, { timestamps: true });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
