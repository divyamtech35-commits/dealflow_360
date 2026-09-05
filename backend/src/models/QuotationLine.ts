import mongoose, { Schema, Document } from 'mongoose';

export interface IQuotationLine extends Document {
    quotationId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    variantId?: string;
    quantity: number;
    discountPercent: number;

    // Snapshots
    productName: string;
    sku: string;
    category: string;
    unitPrice: number;
    costPrice: number;
    taxPercent: number;

    // Risk Evaluated Fields
    overagePercent: number;
    isViolation: boolean;
}

const QuotationLineSchema: Schema = new Schema({
    quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: String },
    quantity: { type: Number, required: true, default: 1 },
    discountPercent: { type: Number, default: 0 },

    // Snapshots
    productName: { type: String, required: true },
    sku: { type: String },
    category: { type: String },
    unitPrice: { type: Number, required: true },
    costPrice: { type: Number, required: true },
    taxPercent: { type: Number, default: 0 },

    // Risk Evaluated Fields
    overagePercent: { type: Number, default: 0 },
    isViolation: { type: Boolean, default: false }
});

export const QuotationLine = mongoose.model<IQuotationLine>('QuotationLine', QuotationLineSchema);
