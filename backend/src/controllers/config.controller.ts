import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { User } from '../models/User';
import { CustomerTier } from '../models/CustomerTier';
import { DiscountRule } from '../models/DiscountRule';
import { Warehouse } from '../models/Warehouse';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { resolveUnitPrice } from '../services/pricingEngine';

// --- PRODUCTS CRUD ---
export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { category, search } = req.query;
        let filter: any = {};
        if (category) filter.categoryId = category;
        if (search) filter.name = { $regex: search, $options: 'i' };

        const products = await Product.find(filter).populate('categoryId');
        res.json(products);
    } catch (error) { next(error); }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { customerId } = req.query;

        const product = await Product.findById(id).lean();
        if (!product) { res.status(404).json({ error: 'Not found' }); return; }

        let finalPrice = product.basePrice;
        if (customerId) {
            const rules = await DiscountRule.find({});
            finalPrice = resolveUnitPrice(product, rules);
        }

        res.json({ ...product, resolvedPrice: finalPrice });
    } catch (error) { next(error); }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let categoryId = req.body.categoryId;
        if (!categoryId) {
            let cat = await Category.findOne();
            if (!cat) {
                cat = await Category.create({ name: 'Hardware', defaultDiscountLimit: 15 });
            }
            categoryId = cat._id;
        }
        const product = await Product.create({ ...req.body, categoryId });
        res.status(201).json(product);
    } catch (error) { next(error); }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
        res.json(product);
    } catch (error) { next(error); }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) { next(error); }
};


// --- CUSTOMERS CRUD ---
export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customers = await User.find({ role: 'CUSTOMER' }).select('-passwordHash').populate('tier');
        res.json(customers);
    } catch (error) { next(error); }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, tierId } = req.body;
        let tier = tierId;
        if (!tier) {
            const defaultTier = await CustomerTier.findOne({ name: 'Gold' }) || await CustomerTier.findOne();
            if (defaultTier) tier = defaultTier._id;
        }
        const user = await User.create({
            name,
            email,
            passwordHash: 'dummyhash',
            role: 'CUSTOMER',
            tier
        });
        res.status(201).json(user);
    } catch (error) { next(error); }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customer = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-passwordHash').populate('tier');
        if (!customer) { res.status(404).json({ error: 'Customer not found' }); return; }
        res.json(customer);
    } catch (error) { next(error); }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Customer deleted successfully' });
    } catch (error) { next(error); }
};


// --- DISCOUNT RULES CRUD ---
export const getDiscountRules = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rules = await DiscountRule.find().populate('customerTierId');
        res.json(rules);
    } catch (error) { next(error); }
};

export const createDiscountRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let customerTierId = req.body.customerTierId;
        if (!customerTierId) {
            const tier = await CustomerTier.findOne({ name: req.body.tierName || 'Gold' }) || await CustomerTier.findOne();
            if (tier) customerTierId = tier._id;
        }
        const rule = await DiscountRule.create({ ...req.body, customerTierId });
        res.status(201).json(rule);
    } catch (error) { next(error); }
};

export const updateDiscountRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rule = await DiscountRule.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('customerTierId');
        if (!rule) { res.status(404).json({ error: 'Rule not found' }); return; }
        res.json(rule);
    } catch (error) { next(error); }
};

export const deleteDiscountRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await DiscountRule.findByIdAndDelete(req.params.id);
        res.json({ message: 'Discount rule deleted successfully' });
    } catch (error) { next(error); }
};


// --- APPROVAL CHAIN CONFIG ---
export const getApprovalChain = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.json([
            { role: 'SALES_MANAGER', threshold: 15 },
            { role: 'FINANCE', threshold: 25 },
        ]);
    } catch (error) { next(error); }
};


// --- WAREHOUSES CRUD ---
export const getWarehouses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const w = await Warehouse.find();
        res.json(w);
    } catch (error) { next(error); }
};

export const createWarehouse = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const warehouse = await Warehouse.create(req.body);
        res.status(201).json(warehouse);
    } catch (error) { next(error); }
};

export const updateWarehouse = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!warehouse) { res.status(404).json({ error: 'Warehouse not found' }); return; }
        res.json(warehouse);
    } catch (error) { next(error); }
};

export const deleteWarehouse = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await Warehouse.findByIdAndDelete(req.params.id);
        res.json({ message: 'Warehouse deleted successfully' });
    } catch (error) { next(error); }
};


// --- SUBSCRIPTION PLANS CRUD ---
export const getPlans = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const p = await SubscriptionPlan.find();
        res.json(p);
    } catch (error) { next(error); }
};

export const createPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const plan = await SubscriptionPlan.create(req.body);
        res.status(201).json(plan);
    } catch (error) { next(error); }
};

export const updatePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!plan) { res.status(404).json({ error: 'Plan not found' }); return; }
        res.json(plan);
    } catch (error) { next(error); }
};

export const deletePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await SubscriptionPlan.findByIdAndDelete(req.params.id);
        res.json({ message: 'Subscription plan deleted successfully' });
    } catch (error) { next(error); }
};
