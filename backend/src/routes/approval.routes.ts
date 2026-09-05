import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getApprovalQueue } from '../controllers/approval.controller';

const router = Router();
router.use(authenticate);

router.get('/queue', getApprovalQueue);

export default router;
