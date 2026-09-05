import mongoose, { Schema, Document } from 'mongoose';

export interface IQuotationLine extends Document {
    quotationId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    variantId?: string;
    quantity: number;
    discountPercent: number;

    // Snapshots at time of adding
    productName: string;
    sku: string;
    category: string;
    unitPrice: number; // resolved through customer price list
    costPrice: number;
    taxPercent: number;
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
    taxPercent: { type: Number, default: 0 }
});

export const QuotationLine = mongoose.model<IQuotationLine>('QuotationLine', QuotationLineSchema);
