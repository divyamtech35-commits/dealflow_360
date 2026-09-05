import mongoose, { Document, Schema } from 'mongoose';

export interface IDiscountRule extends Document {
    customerTierId: mongoose.Types.ObjectId;
    categoryId?: mongoose.Types.ObjectId;
    maxDiscountPercent: number;
    approvalRequiredAbove: number;
    financeApprovalRequiredAbove: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const DiscountRuleSchema: Schema = new Schema(
    {
        customerTierId: { type: Schema.Types.ObjectId, ref: 'CustomerTier', required: true },
        categoryId: { type: Schema.Types.ObjectId, ref: 'Category' }, // Optional: if empty, applies baseline to tier
        maxDiscountPercent: { type: Number, required: true },
        approvalRequiredAbove: { type: Number, required: true },
        financeApprovalRequiredAbove: { type: Number, required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const DiscountRule = mongoose.model<IDiscountRule>('DiscountRule', DiscountRuleSchema);
