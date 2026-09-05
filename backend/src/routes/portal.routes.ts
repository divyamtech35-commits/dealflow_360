import { Router } from 'express';
import { portalAuthenticate } from '../middleware/portalAuth';
import { getPortalQuotation, postComment, postCounter, confirmQuotation } from '../controllers/portal.controller';

const router = Router();

router.get('/quotations/:token', portalAuthenticate, getPortalQuotation as any);
router.post('/quotations/:token/comment', portalAuthenticate, postComment as any);
router.post('/quotations/:token/counter', portalAuthenticate, postCounter as any);
router.post('/quotations/:token/confirm', portalAuthenticate, confirmQuotation as any);

export default router;
