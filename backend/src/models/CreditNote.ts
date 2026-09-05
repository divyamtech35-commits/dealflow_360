import mongoose, { Document, Schema } from 'mongoose';

export interface ICreditNote extends Document {
    creditNoteNumber: string;
    customerId: mongoose.Types.ObjectId;
    subscriptionId?: mongoose.Types.ObjectId;
    invoiceId?: mongoose.Types.ObjectId;
    amount: number;
    taxAdjustment: number;
    reason: string;
    status: 'ISSUED' | 'APPLIED' | 'VOID';
    appliedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const CreditNoteSchema = new Schema({
    creditNoteNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    amount: { type: Number, required: true },
    taxAdjustment: { type: Number, required: true, default: 0 },
    reason: { type: String, required: true },
    status: { type: String, enum: ['ISSUED', 'APPLIED', 'VOID'], required: true, default: 'ISSUED' },
    appliedAt: { type: Date }
}, { timestamps: true });

export const CreditNote = mongoose.model<ICreditNote>('CreditNote', CreditNoteSchema);
