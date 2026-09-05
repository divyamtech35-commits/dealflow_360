import mongoose, { Schema, Document } from 'mongoose';
import { getNextSequence } from '../utils/sequence';

export interface IQuotation extends Document {
    quotationNumber: string;
    customerId: mongoose.Types.ObjectId;
    customerTierSnapshot: object;
    salesRepId: mongoose.Types.ObjectId;
    status: string;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    marginAmount: number;
    marginPct: number;
    orderDiscountPercent: number;
    riskScore: number;
    requiredApprovalSteps: any[];
    portalToken?: string;
    lastActivityAt: Date;
    validUntil?: Date;
    currency: string;
    notes?: string;
}

const QuotationSchema: Schema = new Schema({
    quotationNumber: { type: String, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User' },
    customerTierSnapshot: { type: Schema.Types.Mixed },
    salesRepId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, default: 'DRAFT' },
    subtotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    marginAmount: { type: Number, default: 0 },
    marginPct: { type: Number, default: 0 },
    orderDiscountPercent: { type: Number, default: 0 },
    riskScore: { type: Number, default: 0 },
    requiredApprovalSteps: { type: Array, default: [] },
    portalToken: { type: String, unique: true, sparse: true },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    validUntil: { type: Date },
    currency: { type: String, default: 'INR' },
    notes: { type: String }
}, { timestamps: true });

QuotationSchema.pre('save', async function (next) {
    if (this.isNew && !this.quotationNumber) {
        try {
            this.quotationNumber = await getNextSequence('quotation', 'QT');
        } catch (err: any) { return next(err); }
    }
    next();
});

export const Quotation = mongoose.model<IQuotation>('Quotation', QuotationSchema);
