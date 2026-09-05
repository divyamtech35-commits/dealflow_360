import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    entityType: string;
    entityId: mongoose.Types.ObjectId | string;
    entityRef: string;
    action: string;
    actorId?: mongoose.Types.ObjectId | string;
    actorName?: string;
    actorRole?: string;
    actorType: 'internal' | 'customer' | 'system';
    fromStatus?: string;
    toStatus?: string;
    reason?: string;
    metadata?: any;
    createdAt: Date;
}

const AuditLogSchema: Schema = new Schema({
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.Mixed, required: true },
    entityRef: { type: String, required: true }, // e.g. "QT-0042"
    action: { type: String, required: true },
    actorId: { type: Schema.Types.Mixed },
    actorName: { type: String },
    actorRole: { type: String },
    actorType: { type: String, enum: ['internal', 'customer', 'system'], required: true },
    fromStatus: { type: String },
    toStatus: { type: String },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
