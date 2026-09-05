import { Request, Response } from 'express';
import { CustomerTier } from '../models/CustomerTier';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Warehouse } from '../models/Warehouse';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { DiscountRule } from '../models/DiscountRule';

export const getTiers = async (req: Request, res: Response) => {
    const tiers = await CustomerTier.find();
    res.json(tiers);
};

export const getCategories = async (req: Request, res: Response) => {
    const categories = await Category.find();
    res.json(categories);
};

export const getProducts = async (req: Request, res: Response) => {
    const products = await Product.find().populate('categoryId');
    res.json(products);
};

export const getWarehouses = async (req: Request, res: Response) => {
    const warehouses = await Warehouse.find();
    res.json(warehouses);
};

export const getPlans = async (req: Request, res: Response) => {
    const plans = await SubscriptionPlan.find();
    res.json(plans);
};

export const getDiscountRules = async (req: Request, res: Response) => {
    const rules = await DiscountRule.find().populate('customerTierId').populate('categoryId');
    res.json(rules);
};

// Generic create endpoint logic
export const createTier = async (req: Request, res: Response) => {
    const tier = await CustomerTier.create(req.body);
    res.json(tier);
};

export const createProduct = async (req: Request, res: Response) => {
    const product = await Product.create(req.body);
    res.json(product);
};

//... Similarly for others as needed in the UI. For hackathon speed, we focus on the GETs to populate the quotation builder heavily.
