import mongoose, { Document, Schema } from 'mongoose';

export interface INegotiation extends Document {
    quotationId: mongoose.Types.ObjectId;
    lineId?: mongoose.Types.ObjectId;
    type: 'COMMENT' | 'COUNTER_DISCOUNT' | 'CHANGE_REQUEST';
    actorType: 'CUSTOMER' | 'REP';
    actorId?: mongoose.Types.ObjectId; // null if customer and strictly using portal token, but useful if auth'd
    message: string;
    requestedDiscountPercent?: number;
    requestedQuantity?: number;
    status: 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED' | 'RESOLVED';
    resolvedAt?: Date;
    createdAt: Date;
}

const NegotiationSchema = new Schema({
    quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation', required: true, index: true },
    lineId: { type: Schema.Types.ObjectId, ref: 'QuotationLine', sparse: true },
    type: { type: String, enum: ['COMMENT', 'COUNTER_DISCOUNT', 'CHANGE_REQUEST'], required: true },
    actorType: { type: String, enum: ['CUSTOMER', 'REP'], required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true },
    requestedDiscountPercent: { type: Number },
    requestedQuantity: { type: Number },
    status: { type: String, enum: ['OPEN', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'RESOLVED'], required: true, default: 'OPEN' },
    resolvedAt: { type: Date }
}, { timestamps: true });

export const Negotiation = mongoose.model<INegotiation>('Negotiation', NegotiationSchema);
