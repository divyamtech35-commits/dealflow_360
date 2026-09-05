import mongoose, { Document, Schema } from 'mongoose';

export interface IUpsellRule extends Document {
    triggerProductId: mongoose.Types.ObjectId;
    suggestedProductId: mongoose.Types.ObjectId;
    relationType: 'CROSS_SELL' | 'UPSELL';
    coPurchaseScore: number;
    minMarginPercent: number;
    reason: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UpsellRuleSchema: Schema = new Schema(
    {
        triggerProductId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        suggestedProductId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        relationType: { type: String, enum: ['CROSS_SELL', 'UPSELL'], required: true },
        coPurchaseScore: { type: Number, required: true, min: 0, max: 1 },
        minMarginPercent: { type: Number, required: true, default: 15 },
        reason: { type: String, required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

UpsellRuleSchema.index({ triggerProductId: 1, suggestedProductId: 1 }, { unique: true });

export const UpsellRule = mongoose.model<IUpsellRule>('UpsellRule', UpsellRuleSchema);
