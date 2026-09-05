import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    createOrderFromQuotation,
    getSplitPlan,
    acceptSplit,
    manualSplit,
    consolidateBackorder
} from '../controllers/order.controller';

const router = Router();
router.use(authenticate);

router.post('/from-quotation/:id', createOrderFromQuotation);
router.get('/:id/split-plan', getSplitPlan);
router.post('/:id/accept-split', acceptSplit);
router.post('/:id/manual-split', manualSplit);
router.post('/:id/consolidate', consolidateBackorder);

export default router;
