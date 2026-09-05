import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/db';

import { User } from '../models/User';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { Subscription } from '../models/Subscription';
import { BillingSchedule } from '../models/BillingSchedule';
import { Invoice } from '../models/Invoice';
import { Payment } from '../models/Payment';
import { CreditNote } from '../models/CreditNote';

import { SubscriptionService } from '../services/billing/SubscriptionService';

dotenv.config();

const clearBillingDB = async () => {
    console.log('Clearing Billing database collections...');
    await Subscription.deleteMany({});
    await BillingSchedule.deleteMany({});
    await Invoice.deleteMany({});
    await Payment.deleteMany({});
    await CreditNote.deleteMany({});
    // We keep Orders, Products, and Users.
};

const runBillingSeed = async () => {
    try {
        await connectDB();
        await clearBillingDB();

        console.log('Fetching Customers and Subscription Products...');
        const customers = await User.find({ role: 'CUSTOMER' }).limit(3);
        const subProduct = await Product.findOne({ isSubscription: true });

        if (!customers.length || !subProduct) {
            console.error('Please run the main seed.ts first to create customers and subscription products.');
            process.exit(1);
        }

        console.log('Seeding Billing Data...');

        // 1. Create a basic ACTIVE subscription (simulating a recent order)
        const sub1Start = new Date();
        sub1Start.setDate(sub1Start.getDate() - 5); // Started 5 days ago
        
        const sub1 = await Subscription.create({
            customerId: customers[0]._id,
            orderId: new mongoose.Types.ObjectId(), // Mock order
            productId: subProduct._id,
            productName: subProduct.name,
            billingCycle: 'MONTHLY',
            status: 'ACTIVE',
            startDate: sub1Start,
            nextBillingDate: new Date(), // Will be overwritten by service
            unitPrice: subProduct.basePrice,
            quantity: 10,
            totalRecurringAmount: subProduct.basePrice * 10
        });
        await SubscriptionService.generateSchedules(sub1._id as any, sub1Start, 12);
        console.log(`Created Active Subscription for ${customers[0].name}`);

        // 2. Create another subscription and simulate it being INVOICED and PAID for the first month
        const sub2Start = new Date();
        sub2Start.setMonth(sub2Start.getMonth() - 1); // Started 1 month ago

        const sub2 = await Subscription.create({
            customerId: customers[1]._id,
            orderId: new mongoose.Types.ObjectId(),
            productId: subProduct._id,
            productName: subProduct.name,
            billingCycle: 'MONTHLY',
            status: 'ACTIVE',
            startDate: sub2Start,
            nextBillingDate: new Date(),
            unitPrice: subProduct.basePrice,
            quantity: 5,
            totalRecurringAmount: subProduct.basePrice * 5
        });
        await SubscriptionService.generateSchedules(sub2._id as any, sub2Start, 12);

        // Find the first schedule and create an invoice for it
        const firstSchedule = await BillingSchedule.findOne({ subscriptionId: sub2._id }).sort({ periodStart: 1 });
        if (firstSchedule) {
            const invoice = await Invoice.create({
                invoiceNumber: `INV-${Math.floor(Math.random() * 900000)}`,
                orderId: sub2.orderId,
                subscriptionId: sub2._id,
                billingScheduleId: firstSchedule._id,
                customerId: sub2.customerId,
                invoiceType: 'RECURRING',
                lines: [{
                    productId: subProduct._id,
                    productName: subProduct.name,
                    description: 'Initial Monthly Subscription',
                    quantity: 5,
                    unitPrice: subProduct.basePrice,
                    lineTotal: firstSchedule.subtotal,
                    isRecurring: true,
                    periodStart: firstSchedule.periodStart,
                    periodEnd: firstSchedule.periodEnd
                }],
                subtotal: firstSchedule.subtotal,
                taxTotal: firstSchedule.tax,
                grandTotal: firstSchedule.total,
                amountDue: 0,
                amountPaid: firstSchedule.total,
                status: 'PAID',
                dueDate: new Date(sub2Start.getTime() + 15 * 24 * 60 * 60 * 1000)
            });

            firstSchedule.status = 'PAID';
            firstSchedule.invoiceId = invoice._id as mongoose.Types.ObjectId;
            await firstSchedule.save();

            // Record a payment
            await Payment.create({
                invoiceId: invoice._id,
                customerId: sub2.customerId,
                amount: invoice.grandTotal,
                currency: 'USD',
                paymentMethod: 'Credit Card',
                paymentReference: `TXN-${Math.floor(Math.random() * 900000)}`,
                status: 'SUCCESS',
                paidAt: new Date(sub2Start.getTime() + 2 * 24 * 60 * 60 * 1000)
            });
        }
        console.log(`Created Paid Subscription for ${customers[1].name}`);

        // 3. Create a CANCELLED subscription with a Credit Note
        const sub3Start = new Date();
        sub3Start.setMonth(sub3Start.getMonth() - 2);

        const sub3 = await Subscription.create({
            customerId: customers[2]._id,
            orderId: new mongoose.Types.ObjectId(),
            productId: subProduct._id,
            productName: subProduct.name,
            billingCycle: 'YEARLY',
            status: 'ACTIVE',
            startDate: sub3Start,
            nextBillingDate: new Date(),
            unitPrice: subProduct.basePrice,
            quantity: 2,
            totalRecurringAmount: subProduct.basePrice * 2
        });
        await SubscriptionService.generateSchedules(sub3._id as any, sub3Start, 1);
        
        // Cancel it to trigger credit notes
        await SubscriptionService.cancelSubscription(sub3._id as any, "Company pivot, no longer needed.");
        
        // Also let's mock an unpaid invoice for a random old order to show up in reconciliation
        await Invoice.create({
            invoiceNumber: `INV-${Math.floor(Math.random() * 900000)}`,
            orderId: new mongoose.Types.ObjectId(),
            customerId: customers[2]._id,
            invoiceType: 'ONE_TIME',
            lines: [],
            subtotal: 5000,
            taxTotal: 500,
            grandTotal: 5500,
            amountDue: 5500,
            amountPaid: 0,
            status: 'OVERDUE',
            dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        });

        console.log(`Created Cancelled Subscription & Overdue Invoice for ${customers[2].name}`);

        console.log('Billing Seeding Completed Successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Error during billing seeding:', error);
        process.exit(1);
    }
};

runBillingSeed();
