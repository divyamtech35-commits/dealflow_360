import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getProducts,
    getProductById,
    getCustomers,
    getDiscountRules,
    getApprovalChain,
    getWarehouses,
    getPlans
} from '../controllers/config.controller';

const router = Router();

// Protect ALL config routes with internal JWT auth
router.use(authenticate);

router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.get('/customers', getCustomers);
router.get('/discount-rules', getDiscountRules);
router.get('/approval-chain', getApprovalChain);
router.get('/warehouses', getWarehouses);
router.get('/plans', getPlans);

export default router;
