import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
    customerId: mongoose.Types.ObjectId;
    orderId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    productName: string;
    billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'PAUSED' | 'EXPIRED';
    startDate: Date;
    nextBillingDate: Date;
    endDate?: Date;
    cancellationDate?: Date;
    cancellationReason?: string;
    unitPrice: number;
    quantity: number;
    totalRecurringAmount: number;
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionSchema = new Schema({
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    billingCycle: { type: String, enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'], required: true },
    status: { type: String, enum: ['ACTIVE', 'PAST_DUE', 'CANCELLED', 'PAUSED', 'EXPIRED'], required: true, default: 'ACTIVE' },
    startDate: { type: Date, required: true, default: Date.now },
    nextBillingDate: { type: Date, required: true },
    endDate: { type: Date },
    cancellationDate: { type: Date },
    cancellationReason: { type: String },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    totalRecurringAmount: { type: Number, required: true }
}, { timestamps: true });

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
