import mongoose, { Document, Schema } from 'mongoose';

export interface IQuotationLine extends Document {
    quotationId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    productNameSnapshot: string;
    skuSnapshot: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    taxPercent: number;
    lineTotal: number;
    costPriceSnapshot: number;
    marginAmount: number;
    subscriptionPlanId?: mongoose.Types.ObjectId;
    isRecurring: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const QuotationLineSchema: Schema = new Schema(
    {
        quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation', required: true },
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        productNameSnapshot: { type: String, required: true },
        skuSnapshot: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true },
        discountPercent: { type: Number, required: true, default: 0 },
        discountAmount: { type: Number, required: true, default: 0 },
        taxPercent: { type: Number, required: true, default: 0 },
        lineTotal: { type: Number, required: true },
        costPriceSnapshot: { type: Number, required: true },
        marginAmount: { type: Number, required: true },
        subscriptionPlanId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
        isRecurring: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const QuotationLine = mongoose.model<IQuotationLine>('QuotationLine', QuotationLineSchema);
