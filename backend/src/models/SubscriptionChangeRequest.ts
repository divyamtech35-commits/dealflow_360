import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscriptionChangeRequest extends Document {
    subscriptionId: mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    requestedQuantity?: number;
    requestedPlanId?: mongoose.Types.ObjectId;
    notes: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionChangeRequestSchema = new Schema({
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedQuantity: { type: Number },
    requestedPlanId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], required: true, default: 'PENDING' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date }
}, { timestamps: true });

export const SubscriptionChangeRequest = mongoose.model<ISubscriptionChangeRequest>('SubscriptionChangeRequest', SubscriptionChangeRequestSchema);
