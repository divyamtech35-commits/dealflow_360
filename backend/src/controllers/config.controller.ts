import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { User } from '../models/User';
import { DiscountRule } from '../models/DiscountRule';
import { Warehouse } from '../models/Warehouse';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { ApprovalLog } from '../models/ApprovalLog'; // Placeholder for approval chain
import { resolveUnitPrice } from '../services/pricingEngine';

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

        // Demoing the resolved price logic (requires customer tier/rules fetch)
        let finalPrice = product.basePrice;
        if (customerId) {
            const rules = await DiscountRule.find({}); // simplified
            finalPrice = resolveUnitPrice(product, rules);
        }

        res.json({ ...product, resolvedPrice: finalPrice });
    } catch (error) { next(error); }
};

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customers = await User.find({ role: 'CUSTOMER' }).select('-passwordHash').populate('tier');
        res.json(customers);
    } catch (error) { next(error); }
};

export const getDiscountRules = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rules = await DiscountRule.find();
        res.json(rules);
    } catch (error) { next(error); }
};

export const getApprovalChain = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Return static config for now
        res.json([
            { role: 'SALES_MANAGER', threshold: 15 },
            { role: 'FINANCE', threshold: 25 },
        ]);
    } catch (error) { next(error); }
};

export const getWarehouses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const w = await Warehouse.find();
        res.json(w);
    } catch (error) { next(error); }
};

export const getPlans = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const p = await SubscriptionPlan.find();
        res.json(p);
    } catch (error) { next(error); }
};
