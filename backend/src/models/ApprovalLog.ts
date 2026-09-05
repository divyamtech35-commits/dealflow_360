import mongoose, { Document, Schema } from 'mongoose';

export enum ApprovalAction {
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    RETURNED = 'RETURNED',
}

export enum ApprovalLevel {
    SALES_MANAGER = 'SALES_MANAGER',
    FINANCE = 'FINANCE',
}

export interface IApprovalLog extends Document {
    quotationId: mongoose.Types.ObjectId;
    approverId: mongoose.Types.ObjectId;
    level: ApprovalLevel;
    action: ApprovalAction;
    previousStatus: string;
    newStatus: string;
    reason?: string;
    discountPercent: number;
    riskScore: number;
    timestamp: Date;
}

const ApprovalLogSchema: Schema = new Schema(
    {
        quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation', required: true },
        approverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        level: { type: String, enum: Object.values(ApprovalLevel), required: true },
        action: { type: String, enum: Object.values(ApprovalAction), required: true },
        previousStatus: { type: String, required: true },
        newStatus: { type: String, required: true },
        reason: { type: String },
        discountPercent: { type: Number, required: true },
        riskScore: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
    },
    // Ensure we don't duplicate timestamps when utilizing the custom timestamp field
    { timestamps: false }
);

export const ApprovalLog = mongoose.model<IApprovalLog>('ApprovalLog', ApprovalLogSchema);
