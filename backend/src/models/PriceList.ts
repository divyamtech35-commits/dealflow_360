import mongoose, { Document, Schema } from 'mongoose';

export interface IPriceList extends Document {
    productId: mongoose.Types.ObjectId;
    customerTierId: mongoose.Types.ObjectId;
    currency: string;
    price: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const PriceListSchema: Schema = new Schema(
    {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        customerTierId: { type: Schema.Types.ObjectId, ref: 'CustomerTier', required: true },
        currency: { type: String, required: true, default: 'USD' },
        price: { type: Number, required: true },
        effectiveFrom: { type: Date, required: true, default: Date.now },
        effectiveTo: { type: Date },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

PriceListSchema.index({ productId: 1, customerTierId: 1, currency: 1 });

export const PriceList = mongoose.model<IPriceList>('PriceList', PriceListSchema);
