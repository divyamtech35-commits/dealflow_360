import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    listQuotations, getQuotation, createQuotation,
    updateQuotation, addLine, updateLine, removeLine
} from '../controllers/quotation.controller';

import {
    submitQuotation, approveQuotation, rejectQuotation, returnQuotation, getAuditLog
} from '../controllers/approval.controller';

const router = Router();
router.use(authenticate);

router.get('/', listQuotations);
router.post('/', createQuotation);
router.get('/:id', getQuotation);
router.patch('/:id', updateQuotation);

router.post('/:id/lines', addLine);
router.patch('/:id/lines/:lineId', updateLine);
router.delete('/:id/lines/:lineId', removeLine);

// Phase 3D Approval Routing
router.post('/:id/submit', submitQuotation);
router.post('/:id/approve', approveQuotation);
router.post('/:id/reject', rejectQuotation);
router.post('/:id/return', returnQuotation);
router.get('/:id/audit-log', getAuditLog);

export default router;
