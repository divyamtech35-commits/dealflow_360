import { AuditLog } from '../models/AuditLog';

interface LogParams {
    entityType: string;
    entityId: string;
    entityRef: string;
    action: string;
    actor?: {
        id: string;
        name: string;
        role: string;
        type: 'internal' | 'customer' | 'system';
    };
    fromStatus?: string;
    toStatus?: string;
    reason?: string;
    metadata?: any;
}

export const logAudit = async (params: LogParams) => {
    const doc = {
        entityType: params.entityType,
        entityId: params.entityId,
        entityRef: params.entityRef,
        action: params.action,
        actorId: params.actor?.id,
        actorName: params.actor?.name,
        actorRole: params.actor?.role,
        actorType: params.actor?.type || 'system',
        fromStatus: params.fromStatus,
        toStatus: params.toStatus,
        reason: params.reason,
        metadata: params.metadata
    };

    await AuditLog.create(doc);
};
