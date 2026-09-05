import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
    name: string;
    description?: string;
    defaultDiscountLimit: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema: Schema = new Schema(
    {
        name: { type: String, required: true, unique: true },
        description: { type: String },
        defaultDiscountLimit: { type: Number, required: true, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const Category = mongoose.model<ICategory>('Category', CategorySchema);
