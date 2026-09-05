import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getDiscountRules,
    createDiscountRule,
    updateDiscountRule,
    deleteDiscountRule,
    getApprovalChain,
    getWarehouses,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    getPlans,
    createPlan,
    updatePlan,
    deletePlan,
    getInventory,
    createOrUpdateStock,
    updateStockById,
    deleteStock
} from '../controllers/config.controller';

const router = Router();

// Protect ALL config routes with internal JWT auth
router.use(authenticate);

// Products
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Customers
router.get('/customers', getCustomers);
router.post('/customers', createCustomer);
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);

// Discount Rules
router.get('/discount-rules', getDiscountRules);
router.post('/discount-rules', createDiscountRule);
router.put('/discount-rules/:id', updateDiscountRule);
router.delete('/discount-rules/:id', deleteDiscountRule);

// Approval Chain
router.get('/approval-chain', getApprovalChain);

// Warehouses
router.get('/warehouses', getWarehouses);
router.post('/warehouses', createWarehouse);
router.put('/warehouses/:id', updateWarehouse);
router.delete('/warehouses/:id', deleteWarehouse);

// Plans
router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

// Inventory & Stock
router.get('/inventory', getInventory);
router.post('/inventory', createOrUpdateStock);
router.put('/inventory/:id', updateStockById);
router.delete('/inventory/:id', deleteStock);

export default router;
