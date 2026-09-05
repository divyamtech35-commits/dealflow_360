import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    sku: string;
    categoryId: mongoose.Types.ObjectId;
    description?: string;
    basePrice: number;
    unit: string;
    taxPercent: number;
    costPrice: number;
    isSubscription: boolean;
    isPromoted: boolean;
    subscriptionPlanId?: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        sku: { type: String, required: true, unique: true },
        categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
        description: { type: String },
        basePrice: { type: Number, required: true },
        unit: { type: String, required: true },
        taxPercent: { type: Number, required: true, default: 0 },
        costPrice: { type: Number, required: true },
        isSubscription: { type: Boolean, default: false },
        isPromoted: { type: Boolean, default: false, index: true },
        subscriptionPlanId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
