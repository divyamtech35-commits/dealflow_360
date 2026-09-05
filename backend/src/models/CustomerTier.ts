import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomerTier extends Document {
    name: string;
    maxDiscountPercent: number;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CustomerTierSchema: Schema = new Schema(
    {
        name: { type: String, required: true, unique: true }, // e.g. Bronze, Silver, Gold
        maxDiscountPercent: { type: Number, required: true },
        description: { type: String },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const CustomerTier = mongoose.model<ICustomerTier>('CustomerTier', CustomerTierSchema);
