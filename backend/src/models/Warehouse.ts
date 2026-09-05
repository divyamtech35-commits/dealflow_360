import mongoose, { Document, Schema } from 'mongoose';

export interface IWarehouse extends Document {
    name: string;
    code: string;
    address?: string;
    shippingCostWeight: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const WarehouseSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        code: { type: String, required: true, unique: true },
        address: { type: String },
        shippingCostWeight: { type: Number, required: true, default: 1 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const Warehouse = mongoose.model<IWarehouse>('Warehouse', WarehouseSchema);
