import mongoose, { Document, Schema } from 'mongoose';

export enum BillingCycle {
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
    YEARLY = 'YEARLY',
}

export interface ISubscriptionPlan extends Document {
    name: string;
    billingCycle: BillingCycle;
    price: number;
    prorationEnabled: boolean;
    cancellationRefundEnabled: boolean;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionPlanSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        billingCycle: {
            type: String,
            enum: Object.values(BillingCycle),
            required: true,
        },
        price: { type: Number, required: true },
        prorationEnabled: { type: Boolean, default: true },
        cancellationRefundEnabled: { type: Boolean, default: true },
        description: { type: String },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
