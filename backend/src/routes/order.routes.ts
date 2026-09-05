import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { activateOrderBilling, getOrderBillingSummary } from '../controllers/billing.controller';
import {
    listOrders,
    getStocks,
    createOrderFromQuotation,
    getSplitPlan,
    acceptSplit,
    manualSplit,
    consolidateBackorder,
    cancelFulfillment
} from '../controllers/order.controller';

const router = Router();
router.use(authenticate);

router.get('/', listOrders);
router.get('/stocks', getStocks);
router.post('/from-quotation/:id', createOrderFromQuotation);
router.get('/:id/split-plan', getSplitPlan);
router.post('/:id/accept-split', acceptSplit);
router.post('/:id/manual-split', manualSplit);
router.post('/:id/consolidate', consolidateBackorder);
router.post('/:id/cancel-fulfillment', cancelFulfillment);
router.get('/:id/billing-summary', getOrderBillingSummary);
router.post('/:id/activate-billing', activateOrderBilling);

export default router;
