import { Router } from 'express';
import {
    getTiers,
    getCategories,
    getProducts,
    getWarehouses,
    getPlans,
    getDiscountRules,
    createTier,
    createProduct
} from '../controllers/config.controller';

const router = Router();

router.get('/tiers', getTiers);
router.post('/tiers', createTier);

router.get('/categories', getCategories);

router.get('/products', getProducts);
router.post('/products', createProduct);

router.get('/warehouses', getWarehouses);
router.get('/plans', getPlans);
router.get('/rules', getDiscountRules);

export default router;
