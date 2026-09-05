import mongoose, { Document, Schema } from 'mongoose';

export enum QuotationStatus {
    DRAFT = 'DRAFT',
    PENDING_APPROVAL = 'PENDING_APPROVAL',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    SENT = 'SENT',
    UNDER_NEGOTIATION = 'UNDER_NEGOTIATION',
    CONFIRMED = 'CONFIRMED',
    FULFILLMENT = 'FULFILLMENT',
    BILLED = 'BILLED',
    CANCELLED = 'CANCELLED',
}

export interface IQuotation extends Document {
    quotationNumber: string;
    customerId: mongoose.Types.ObjectId;
    salesRepId: mongoose.Types.ObjectId;
    status: QuotationStatus;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    riskScore: number;
    approvalStatus?: string;
    validUntil: Date;
    currency: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const QuotationSchema: Schema = new Schema(
    {
        quotationNumber: { type: String, required: true, unique: true },
        customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        salesRepId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        status: {
            type: String,
            enum: Object.values(QuotationStatus),
            default: QuotationStatus.DRAFT,
            required: true,
        },
        subtotal: { type: Number, required: true, default: 0 },
        discountAmount: { type: Number, required: true, default: 0 },
        taxAmount: { type: Number, required: true, default: 0 },
        totalAmount: { type: Number, required: true, default: 0 },
        riskScore: { type: Number, required: true, default: 0 },
        approvalStatus: { type: String },
        validUntil: { type: Date, required: true },
        currency: { type: String, required: true, default: 'USD' },
        notes: { type: String },
    },
    { timestamps: true }
);

export const Quotation = mongoose.model<IQuotation>('Quotation', QuotationSchema);
