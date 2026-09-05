import mongoose, { Document, Schema } from 'mongoose';

export interface IStock extends Document {
    warehouseId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    quantity: number;
    reservedQuantity: number;
    reorderLevel: number;
    createdAt: Date;
    updatedAt: Date;
}

const StockSchema: Schema = new Schema(
    {
        warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, default: 0 },
        reservedQuantity: { type: Number, required: true, default: 0 },
        reorderLevel: { type: Number, required: true, default: 0 },
    },
    { timestamps: true }
);

StockSchema.index({ warehouseId: 1, productId: 1 }, { unique: true });

export const Stock = mongoose.model<IStock>('Stock', StockSchema);
