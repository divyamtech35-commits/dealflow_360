import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { connectDB } from '../config/db';

// Import Models
import { User, UserRole } from '../models/User';
import { CustomerTier } from '../models/CustomerTier';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Warehouse } from '../models/Warehouse';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { DiscountRule } from '../models/DiscountRule';
import { PriceList } from '../models/PriceList';
import { Stock } from '../models/Stock';

import { seedData } from './seedData';

dotenv.config();

const clearDB = async () => {
    console.log('Clearing database...');
    await User.deleteMany({});
    await CustomerTier.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Warehouse.deleteMany({});
    await SubscriptionPlan.deleteMany({});
    await DiscountRule.deleteMany({});
    await PriceList.deleteMany({});
    await Stock.deleteMany({});
};

const runSeed = async () => {
    try {
        await connectDB();
        await clearDB();

        console.log('Seeding Customer Tiers...');
        const createdTiers = await CustomerTier.insertMany(seedData.tiers);

        console.log('Seeding Categories...');
        const createdCategories = await Category.insertMany(seedData.categories);

        console.log('Seeding Subscription Plans...');
        const createdPlans = await SubscriptionPlan.insertMany(seedData.plans);

        console.log('Seeding Warehouses...');
        const createdWarehouses = await Warehouse.insertMany(seedData.warehouses);

        console.log('Seeding Products...');
        const productsToInsert = seedData.products.map(p => {
            const category = createdCategories.find(c => c.name === p.category);
            const plan = p.plan ? createdPlans.find(plan => plan.name === p.plan) : null;
            return {
                name: p.name,
                sku: p.sku,
                categoryId: category!._id,
                basePrice: p.basePrice,
                unit: p.unit,
                taxPercent: p.taxPercent,
                costPrice: p.costPrice,
                isSubscription: p.isSubscription || false,
                subscriptionPlanId: plan ? plan._id : undefined,
            };
        });
        const createdProducts = await Product.insertMany(productsToInsert);

        console.log('Seeding Discount Rules...');
        const rulesToInsert = seedData.discountRules.map(r => {
            const tier = createdTiers.find(t => t.name === r.tier);
            return {
                customerTierId: tier!._id,
                maxDiscountPercent: r.maxDiscountPercent,
                approvalRequiredAbove: r.approvalRequiredAbove,
                financeApprovalRequiredAbove: r.financeApprovalRequiredAbove,
            };
        });
        await DiscountRule.insertMany(rulesToInsert);

        console.log('Seeding Users...');
        const defaultPassword = process.env.SEED_USER_PASSWORD || 'password123';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        // Create internal users
        const internalUsers = [
            { name: 'Alice Admin', email: 'admin@dealflow.com', passwordHash, role: UserRole.ADMIN },
            { name: 'Bob Rep', email: 'bob@dealflow.com', passwordHash, role: UserRole.SALES_REP },
            { name: 'Charlie Rep', email: 'charlie@dealflow.com', passwordHash, role: UserRole.SALES_REP },
            { name: 'Dave Manager', email: 'manager@dealflow.com', passwordHash, role: UserRole.SALES_MANAGER },
            { name: 'Eve Finance', email: 'finance@dealflow.com', passwordHash, role: UserRole.FINANCE },
        ];
        await User.insertMany(internalUsers);

        // Create a customer user
        const customer = new User({
            name: 'Acme Corp Customer',
            email: 'buyer@acmecorp.com',
            passwordHash,
            role: UserRole.CUSTOMER,
        });
        // For customers, the customerId maps to themselves (or a Company entity in the future)
        customer.customerId = customer._id as mongoose.Types.ObjectId;
        await customer.save();

        console.log('Seeding Stocks...');
        // Seed some stock for the Main Warehouse
        const mainWarehouse = createdWarehouses.find(w => w.code === 'MAIN');
        const eastWarehouse = createdWarehouses.find(w => w.code === 'EAST');

        if (mainWarehouse && eastWarehouse) {
            const stocksToInsert = [];
            for (const p of createdProducts) {
                if (!p.isSubscription) {
                    stocksToInsert.push({
                        warehouseId: mainWarehouse._id,
                        productId: p._id,
                        quantity: 100,
                        reorderLevel: 20
                    });
                    stocksToInsert.push({
                        warehouseId: eastWarehouse._id,
                        productId: p._id,
                        quantity: 50,
                        reorderLevel: 10
                    });
                }
            }
            await Stock.insertMany(stocksToInsert);
        }

        console.log('Seeding Completed Successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
};

runSeed();
