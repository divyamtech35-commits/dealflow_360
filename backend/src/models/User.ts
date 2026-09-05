import mongoose, { Document, Schema } from 'mongoose';

export enum UserRole {
    ADMIN = 'ADMIN',
    SALES_REP = 'SALES_REP',
    SALES_MANAGER = 'SALES_MANAGER',
    FINANCE = 'FINANCE',
    CUSTOMER = 'CUSTOMER',
}

export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    customerId?: mongoose.Types.ObjectId;
    tier?: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        role: {
            type: String,
            enum: Object.values(UserRole),
            required: true,
        },
        customerId: { type: Schema.Types.ObjectId, ref: 'User' },
        tier: { type: Schema.Types.ObjectId, ref: 'CustomerTier' },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
