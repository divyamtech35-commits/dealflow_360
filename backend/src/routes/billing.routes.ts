import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { activateOrderBilling, runBillingCronTick } from '../controllers/billing.controller';

const router = Router();

// Used when an order moves from fulfillment -> billing
// Alternatively could be triggered manually by finance
router.post('/activate/:id', authenticate, activateOrderBilling);

// In a real system, this is locked down to a CRON token or internal network only.
router.post('/webhook-tick', runBillingCronTick);

export default router;
