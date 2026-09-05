import { Request, Response, NextFunction } from 'express';
import { Quotation } from '../models/Quotation';
import { resolveApprovalSteps, initApprovalSteps, advance } from '../services/approvalEngine';
import { logAudit } from '../services/auditService';
import { serializeQuotation } from '../views/serializers/quotationSerializer';
import { QuotationLine } from '../models/QuotationLine';

const getQuoteAndLines = async (id: string) => {
    const q = await Quotation.findById(id).populate('customerId', 'name tier _id');
    const lines = await QuotationLine.find({ quotationId: q?._id });
    return { q, lines };
};

export const submitQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { q, lines } = await getQuoteAndLines(req.params.id);
        if (!q) return res.status(404).json({ error: 'Not found' });

        // In actual recalculate we stored string[] in requiredApprovalSteps, we need to map via initApprovalSteps 
        // Wait, recalculateQuotation mapped strings. Let's just convert whatever is there to objects if strings.
        let stepsArray = q.requiredApprovalSteps;
        if (stepsArray.length > 0 && typeof stepsArray[0] === 'string') {
            stepsArray = initApprovalSteps(q.riskScore, stepsArray as any);
        }

        let nextStatus = 'PENDING_APPROVAL';

        if (stepsArray.length === 0 || q.riskScore === 0) {
            nextStatus = 'APPROVED';
            await logAudit({
                entityType: 'quotation', entityId: q._id as string, entityRef: q.quotationNumber,
                action: 'auto_approved', fromStatus: q.status, toStatus: nextStatus,
                actor: { id: 'SYSTEM', name: 'System', role: 'SYSTEM', type: 'system' }
            });
        } else {
            await logAudit({
                entityType: 'quotation', entityId: q._id as string, entityRef: q.quotationNumber,
                action: 'submit', fromStatus: q.status, toStatus: nextStatus,
                actor: { id: req.user._id, name: req.user.name, role: req.user.role, type: 'internal' }
            });
        }

        q.requiredApprovalSteps = stepsArray;
        q.markModified('requiredApprovalSteps');
        q.status = nextStatus;
        await q.save();

        res.json(serializeQuotation(q, lines));
    } catch (e) { next(e); }
};

export const handleApprovalAction = (action: 'APPROVE' | 'REJECT' | 'RETURN') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { reason } = req.body;
            const { q, lines } = await getQuoteAndLines(req.params.id);
            if (!q) return res.status(404).json({ error: 'Not found' });

            const { steps, nextStatus } = advance(q, action, req.user, reason);

            await logAudit({
                entityType: 'quotation', entityId: q._id as string, entityRef: q.quotationNumber,
                action: action.toLowerCase(), fromStatus: q.status, toStatus: nextStatus, reason,
                actor: { id: req.user._id, name: req.user.name, role: req.user.role, type: 'internal' }
            });

            q.requiredApprovalSteps = steps;
            q.markModified('requiredApprovalSteps');
            q.status = nextStatus;
            await q.save();

            res.json(serializeQuotation(q, lines));
        } catch (e: any) {
            res.status(403).json({ error: e.message }); // 403 maps seamlessly for advance failures
        }
    };
};

export const approveQuotation = handleApprovalAction('APPROVE');
export const rejectQuotation = handleApprovalAction('REJECT');
export const returnQuotation = handleApprovalAction('RETURN');

export const getAuditLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { AuditLog } = await import('../models/AuditLog');
        const logs = await AuditLog.find({ entityId: req.params.id }).sort({ createdAt: -1 });
        res.json(logs);
    } catch (e) { next(e); }
};

export const getApprovalQueue = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quotes = await Quotation.find({ status: 'PENDING_APPROVAL' }).populate('customerId', 'name').sort({ lastActivityAt: 1 });
        // Filter quotes where the CURRENT pending step matches req.user.role
        const filtered = quotes.filter(q => {
            const step = (q.requiredApprovalSteps || []).find((s: any) => s.status === 'PENDING');
            return step && step.role === req.user.role;
        });
        // Serialize
        res.json(filtered.map(q => serializeQuotation(q)));
    } catch (e) { next(e); }
};
