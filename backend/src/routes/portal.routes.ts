import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getPortalQuotation,
    postComment,
    postCounter,
    postNegotiationRequest,
    confirmQuotation,
    getPortalDashboard
} from '../controllers/portal.controller';

const router = Router();

router.get('/dashboard', authenticate, getPortalDashboard as any);
router.get('/quotations/:id', authenticate, getPortalQuotation as any);
router.post('/quotations/:id/request', authenticate, postNegotiationRequest as any);
router.post('/quotations/:id/change-request', authenticate, postNegotiationRequest as any);
router.post('/quotations/:id/comment', authenticate, postComment as any);
router.post('/quotations/:id/counter', authenticate, postCounter as any);
router.post('/quotations/:id/confirm', authenticate, confirmQuotation as any);

export default router;
