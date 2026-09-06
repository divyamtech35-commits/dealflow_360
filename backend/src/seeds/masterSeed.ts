import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { connectDB } from '../config/db';

// Models
import { User, UserRole } from '../models/User';
import { CustomerTier } from '../models/CustomerTier';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Warehouse } from '../models/Warehouse';
import { SubscriptionPlan, BillingCycle } from '../models/SubscriptionPlan';
import { DiscountRule } from '../models/DiscountRule';
import { PriceList } from '../models/PriceList';
import { Stock } from '../models/Stock';
import { UpsellRule } from '../models/UpsellRule';
import { Quotation } from '../models/Quotation';
import { QuotationLine } from '../models/QuotationLine';
import { Negotiation } from '../models/Negotiation';
import { Order } from '../models/Order';
import { Shipment } from '../models/Shipment';
import { Subscription } from '../models/Subscription';
import { BillingSchedule } from '../models/BillingSchedule';
import { Invoice } from '../models/Invoice';
import { Payment } from '../models/Payment';
import { CreditNote } from '../models/CreditNote';
import { ApprovalLog, ApprovalAction, ApprovalLevel } from '../models/ApprovalLog';
import { AuditLog } from '../models/AuditLog';
import { Counter } from '../models/Counter';

dotenv.config();

const clearCollections = async () => {
    console.log('--- Wiping existing database records for clean master seed ---');
    await Promise.all([
        User.deleteMany({}),
        CustomerTier.deleteMany({}),
        Category.deleteMany({}),
        Product.deleteMany({}),
        Warehouse.deleteMany({}),
        SubscriptionPlan.deleteMany({}),
        DiscountRule.deleteMany({}),
        PriceList.deleteMany({}),
        Stock.deleteMany({}),
        UpsellRule.deleteMany({}),
        Quotation.deleteMany({}),
        QuotationLine.deleteMany({}),
        Negotiation.deleteMany({}),
        Order.deleteMany({}),
        Shipment.deleteMany({}),
        Subscription.deleteMany({}),
        BillingSchedule.deleteMany({}),
        Invoice.deleteMany({}),
        Payment.deleteMany({}),
        CreditNote.deleteMany({}),
        ApprovalLog.deleteMany({}),
        AuditLog.deleteMany({}),
        Counter.deleteMany({}),
    ]);
};

export const runMasterSeed = async () => {
    try {
        await connectDB();
        await clearCollections();

        console.log('1. Seeding Customer Tiers (4 tiers)...');
        const tiers = await CustomerTier.insertMany([
            { name: 'Platinum', maxDiscountPercent: 25, description: 'Strategic global accounts with VIP terms' },
            { name: 'Gold', maxDiscountPercent: 18, description: 'High-volume mid-market & enterprise accounts' },
            { name: 'Silver', maxDiscountPercent: 12, description: 'Growing standard business accounts' },
            { name: 'Bronze', maxDiscountPercent: 6, description: 'Starter accounts with standard rates' },
        ]);
        const tierMap: Record<string, any> = {};
        tiers.forEach(t => { tierMap[t.name] = t; });

        console.log('2. Seeding Categories (4 categories)...');
        const categories = await Category.insertMany([
            { name: 'Hardware', defaultDiscountLimit: 15 },
            { name: 'Enterprise Software', defaultDiscountLimit: 20 },
            { name: 'Cloud Subscriptions', defaultDiscountLimit: 25 },
            { name: 'Professional Services', defaultDiscountLimit: 15 },
        ]);
        const catMap: Record<string, any> = {};
        categories.forEach(c => { catMap[c.name] = c; });

        console.log('3. Seeding Warehouses (4 locations)...');
        const warehouses = await Warehouse.insertMany([
            { name: 'Central Logistics Hub', code: 'MAIN', address: '100 Central Logistics Pkwy, Chicago, IL', shippingCostWeight: 1.0 },
            { name: 'East Coast Depot', code: 'EAST', address: '450 Harbor Way, Boston, MA', shippingCostWeight: 1.2 },
            { name: 'West Coast Tech Terminal', code: 'WEST', address: '880 Innovation Blvd, San Jose, CA', shippingCostWeight: 1.4 },
            { name: 'Midwest Distribution Center', code: 'CNTR', address: '220 Industrial Ave, Dallas, TX', shippingCostWeight: 1.1 },
        ]);
        const whMap: Record<string, any> = {};
        warehouses.forEach(w => { whMap[w.code] = w; });

        console.log('4. Seeding Subscription Plans (4 plans)...');
        const plans = await SubscriptionPlan.insertMany([
            { name: 'Starter Monthly', billingCycle: BillingCycle.MONTHLY, price: 49, prorationEnabled: true, cancellationRefundEnabled: true },
            { name: 'Growth Quarterly', billingCycle: BillingCycle.QUARTERLY, price: 139, prorationEnabled: true, cancellationRefundEnabled: true },
            { name: 'Enterprise Annual', billingCycle: BillingCycle.YEARLY, price: 499, prorationEnabled: true, cancellationRefundEnabled: true },
            { name: 'Cloud Scale Tier', billingCycle: BillingCycle.MONTHLY, price: 199, prorationEnabled: true, cancellationRefundEnabled: true },
        ]);
        const planMap: Record<string, any> = {};
        plans.forEach(p => { planMap[p.name] = p; });

        console.log('5. Seeding Discount Rules (4 rules)...');
        await DiscountRule.insertMany([
            { customerTierId: tierMap['Platinum']._id, maxDiscountPercent: 25, approvalRequiredAbove: 18, financeApprovalRequiredAbove: 22 },
            { customerTierId: tierMap['Gold']._id, maxDiscountPercent: 18, approvalRequiredAbove: 12, financeApprovalRequiredAbove: 16 },
            { customerTierId: tierMap['Silver']._id, maxDiscountPercent: 12, approvalRequiredAbove: 8, financeApprovalRequiredAbove: 10 },
            { customerTierId: tierMap['Bronze']._id, maxDiscountPercent: 6, approvalRequiredAbove: 4, financeApprovalRequiredAbove: 5 },
        ]);

        console.log('6. Seeding Products (16 products across all domains)...');
        const productsData = [
            // Hardware
            { name: 'Enterprise Server 2U Rackmount', sku: 'HW-SRV-2U', categoryId: catMap['Hardware']._id, basePrice: 4200, unit: 'pcs', taxPercent: 8, costPrice: 2600, isPromoted: true },
            { name: 'Developer Workstation Pro 16\"', sku: 'HW-LAP-16-ENT', categoryId: catMap['Hardware']._id, basePrice: 1699, unit: 'pcs', taxPercent: 8.5, costPrice: 1100, isPromoted: true },
            { name: 'Business Ultrabook 14\"', sku: 'HW-LAP-14', categoryId: catMap['Hardware']._id, basePrice: 1199, unit: 'pcs', taxPercent: 8.5, costPrice: 820 },
            { name: 'UltraSharp 32\" 4K IPS Monitor', sku: 'HW-MON-32', categoryId: catMap['Hardware']._id, basePrice: 599, unit: 'pcs', taxPercent: 7, costPrice: 380 },
            { name: 'Thunderbolt 4 Universal Dock Pro', sku: 'HW-DOCK-1', categoryId: catMap['Hardware']._id, basePrice: 249, unit: 'pcs', taxPercent: 7, costPrice: 120, isPromoted: true },
            { name: 'Optical Cat6A Network Loom 50m', sku: 'HW-CBL-HD', categoryId: catMap['Hardware']._id, basePrice: 45, unit: 'pcs', taxPercent: 5, costPrice: 15 },
            // Enterprise Software
            { name: 'DevFlow Suite Enterprise Core License', sku: 'SW-CORE-ENT', categoryId: catMap['Enterprise Software']._id, basePrice: 3500, unit: 'license', taxPercent: 0, costPrice: 600, isPromoted: true },
            { name: 'Zero-Trust Security Gateway Node', sku: 'SW-SEC-NODE', categoryId: catMap['Enterprise Software']._id, basePrice: 1850, unit: 'node', taxPercent: 0, costPrice: 400 },
            { name: 'Automated CI/CD Pipeline Agent Pack (10x)', sku: 'SW-CICD-10', categoryId: catMap['Enterprise Software']._id, basePrice: 950, unit: 'pack', taxPercent: 0, costPrice: 200 },
            // Cloud Subscriptions
            { name: 'DevFlow Cloud Storage Tier 5TB', sku: 'SUB-CLD-5TB', categoryId: catMap['Cloud Subscriptions']._id, basePrice: 120, unit: 'month', taxPercent: 0, costPrice: 25, isSubscription: true, subscriptionPlanId: planMap['Starter Monthly']._id, isPromoted: true },
            { name: 'High-Availability Cloud Cluster Node', sku: 'SUB-CLD-CLUST', categoryId: catMap['Cloud Subscriptions']._id, basePrice: 350, unit: 'month', taxPercent: 0, costPrice: 90, isSubscription: true, subscriptionPlanId: planMap['Cloud Scale Tier']._id },
            { name: 'Enterprise Managed Kubernetes Plane', sku: 'SUB-K8S-ENT', categoryId: catMap['Cloud Subscriptions']._id, basePrice: 499, unit: 'year', taxPercent: 0, costPrice: 110, isSubscription: true, subscriptionPlanId: planMap['Enterprise Annual']._id },
            // Professional Services
            { name: 'Architectural Design & Onboarding', sku: 'SRV-ARCH-ONB', categoryId: catMap['Professional Services']._id, basePrice: 2500, unit: 'package', taxPercent: 0, costPrice: 1000, isPromoted: true },
            { name: 'Senior DevOps Migration Specialist', sku: 'SRV-ENG-HR', categoryId: catMap['Professional Services']._id, basePrice: 195, unit: 'hours', taxPercent: 0, costPrice: 95 },
            { name: '24/7 Mission-Critical SLA Support', sku: 'SRV-SUPP-247', categoryId: catMap['Professional Services']._id, basePrice: 850, unit: 'month', taxPercent: 0, costPrice: 300, isSubscription: true, subscriptionPlanId: planMap['Growth Quarterly']._id },
            { name: 'Extended 3-Year Hardware Advanced Replacement', sku: 'SRV-WAR-3', categoryId: catMap['Professional Services']._id, basePrice: 299, unit: 'pcs', taxPercent: 0, costPrice: 75 },
        ];
        const products = await Product.insertMany(productsData);
        const prodMap: Record<string, any> = {};
        products.forEach(p => { prodMap[p.sku] = p; });

        console.log('7. Seeding Stock across 4 Warehouses (56 stock entries)...');
        const physicalProducts = products.filter(p => !p.isSubscription);
        const stocksToInsert: any[] = [];
        for (const wh of warehouses) {
            for (const prod of physicalProducts) {
                let qty = 45;
                if (wh.code === 'MAIN') qty = 180;
                else if (wh.code === 'EAST') qty = (prod.sku === 'HW-SRV-2U' || prod.sku === 'HW-LAP-16-ENT') ? 4 : 60;
                else if (wh.code === 'WEST') qty = (prod.sku === 'HW-DOCK-1') ? 2 : 75;
                else if (wh.code === 'CNTR') qty = 30;

                stocksToInsert.push({
                    warehouseId: wh._id,
                    productId: prod._id,
                    quantity: qty,
                    reservedQuantity: Math.floor(qty * 0.1),
                    reorderLevel: 15,
                });
            }
        }
        await Stock.insertMany(stocksToInsert);

        console.log('8. Seeding Upsell Rules (10 rules)...');
        const upsellRulesData = [
            { trigger: prodMap['HW-LAP-16-ENT'], suggested: prodMap['HW-DOCK-1'], type: 'CROSS_SELL', score: 0.95, minMargin: 10, reason: 'Essential dual-display & power dock connectivity' },
            { trigger: prodMap['HW-LAP-16-ENT'], suggested: prodMap['SRV-WAR-3'], type: 'UPSELL', score: 0.90, minMargin: 15, reason: 'Zero-downtime 3-year warranty protection' },
            { trigger: prodMap['HW-SRV-2U'], suggested: prodMap['SRV-ARCH-ONB'], type: 'CROSS_SELL', score: 0.92, minMargin: 20, reason: 'Certified architect rackmount configuration' },
            { trigger: prodMap['HW-SRV-2U'], suggested: prodMap['SRV-SUPP-247'], type: 'UPSELL', score: 0.88, minMargin: 25, reason: '4-hour enterprise SLA response package' },
            { trigger: prodMap['HW-MON-32'], suggested: prodMap['HW-CBL-HD'], type: 'CROSS_SELL', score: 0.85, minMargin: 30, reason: 'High-throughput 8K shielded video cable' },
            { trigger: prodMap['SW-CORE-ENT'], suggested: prodMap['SW-SEC-NODE'], type: 'CROSS_SELL', score: 0.91, minMargin: 15, reason: 'Zero-trust network isolation gateway' },
            { trigger: prodMap['SW-CORE-ENT'], suggested: prodMap['SUB-CLD-5TB'], type: 'UPSELL', score: 0.87, minMargin: 20, reason: 'Automated remote backup & snapshot repository' },
            { trigger: prodMap['SW-CICD-10'], suggested: prodMap['SUB-K8S-ENT'], type: 'CROSS_SELL', score: 0.89, minMargin: 18, reason: 'Native auto-scaling cloud cluster executor' },
            { trigger: prodMap['SUB-CLD-5TB'], suggested: prodMap['SUB-CLD-CLUST'], type: 'UPSELL', score: 0.84, minMargin: 15, reason: 'Redundant geo-replicated cloud storage tier' },
            { trigger: prodMap['SRV-ARCH-ONB'], suggested: prodMap['SRV-ENG-HR'], type: 'CROSS_SELL', score: 0.90, minMargin: 22, reason: 'Dedicated specialist hours for custom hooks' },
        ];
        await UpsellRule.insertMany(
            upsellRulesData.map(r => ({
                triggerProductId: r.trigger._id,
                suggestedProductId: r.suggested._id,
                relationType: r.type,
                coPurchaseScore: r.score,
                minMarginPercent: r.minMargin,
                reason: r.reason,
                isActive: true,
            }))
        );

        console.log('9. Seeding Internal Staff & 20 Enterprise Customers (24 users)...');
        const defaultPassword = process.env.SEED_USER_PASSWORD || 'password123';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        const internalUsers = [
            { name: 'Alice Admin', email: 'admin@dealflow360.com', passwordHash, role: UserRole.ADMIN },
            { name: 'Sarah Sales', email: 'sales@dealflow360.com', passwordHash, role: UserRole.SALES_REP },
            { name: 'Sarah Sales', email: 'rep@dealflow360.com', passwordHash, role: UserRole.SALES_REP },
            { name: 'Sarah Sales', email: 'rep@dealflow.com', passwordHash, role: UserRole.SALES_REP },
            { name: 'Dave Manager', email: 'manager@dealflow360.com', passwordHash, role: UserRole.SALES_MANAGER },
            { name: 'Eve Finance', email: 'finance@dealflow360.com', passwordHash, role: UserRole.FINANCE },
        ];
        const createdInternals = await User.insertMany(internalUsers);
        const adminUser = createdInternals.find(u => u.email === 'admin@dealflow360.com')!;
        const salesRep = createdInternals.find(u => u.email === 'rep@dealflow360.com') || createdInternals.find(u => u.email === 'sales@dealflow360.com')!;
        const managerUser = createdInternals.find(u => u.email === 'manager@dealflow360.com')!;
        const financeUser = createdInternals.find(u => u.email === 'finance@dealflow360.com')!;

        const customerCompanies = [
            { name: 'Acme Corporation', tier: tierMap['Gold']._id, email: 'customer1@dealflow360.com' },
            { name: 'Stark Industries', tier: tierMap['Platinum']._id, email: 'customer2@dealflow360.com' },
            { name: 'Wayne Enterprises', tier: tierMap['Platinum']._id, email: 'customer3@dealflow360.com' },
            { name: 'Cyberdyne Systems', tier: tierMap['Silver']._id, email: 'customer4@dealflow360.com' },
            { name: 'Massive Dynamic', tier: tierMap['Silver']._id, email: 'customer5@dealflow360.com' },
            { name: 'Umbrella Corp', tier: tierMap['Silver']._id, email: 'customer6@dealflow360.com' },
            { name: 'Oscorp Technologies', tier: tierMap['Gold']._id, email: 'customer7@dealflow360.com' },
            { name: 'Hooli Silicon', tier: tierMap['Gold']._id, email: 'customer8@dealflow360.com' },
            { name: 'Initech Office Solutions', tier: tierMap['Bronze']._id, email: 'customer9@dealflow360.com' },
            { name: 'Globex Global Holdings', tier: tierMap['Bronze']._id, email: 'customer10@dealflow360.com' },
            { name: 'Soylent Bio Innovations', tier: tierMap['Bronze']._id, email: 'customer11@dealflow360.com' },
            { name: 'LexCorp Aerospace', tier: tierMap['Platinum']._id, email: 'customer12@dealflow360.com' },
            { name: 'Tyrell Robotics Corp', tier: tierMap['Gold']._id, email: 'customer13@dealflow360.com' },
            { name: 'Virtucon Industries', tier: tierMap['Silver']._id, email: 'customer14@dealflow360.com' },
            { name: 'Dunder Mifflin Paper Co', tier: tierMap['Bronze']._id, email: 'customer15@dealflow360.com' },
            { name: 'Pied Piper Cloud Network', tier: tierMap['Gold']._id, email: 'customer16@dealflow360.com' },
            { name: 'Aperture Science Labs', tier: tierMap['Platinum']._id, email: 'customer17@dealflow360.com' },
            { name: 'Black Mesa Research', tier: tierMap['Gold']._id, email: 'customer18@dealflow360.com' },
            { name: 'Wonka Confectionery Tech', tier: tierMap['Silver']._id, email: 'customer19@dealflow360.com' },
            { name: 'Buy n Large Megacorp', tier: tierMap['Platinum']._id, email: 'customer20@dealflow360.com' },
        ];

        const customersToInsert = customerCompanies.map(c => {
            const cust = new User({
                name: c.name,
                email: c.email,
                passwordHash,
                role: UserRole.CUSTOMER,
                tier: c.tier,
                isActive: true,
            });
            cust.customerId = cust._id as mongoose.Types.ObjectId;
            return cust;
        });
        const createdCustomers = await User.insertMany(customersToInsert);

        console.log('10. Seeding 80 Quotations & ~200 Quotation Lines across complete lifecycles...');
        const quoteStatuses: string[] = [
            ...Array(15).fill('DRAFT'),
            ...Array(10).fill('PENDING_SALES_MANAGER'),
            ...Array(8).fill('PENDING_FINANCE'),
            ...Array(15).fill('APPROVED'),
            ...Array(12).fill('UNDER_NEGOTIATION'),
            ...Array(8).fill('SENT'),
            ...Array(12).fill('CONFIRMED'),
        ];

        const createdQuotations: any[] = [];
        const allQuotationLines: any[] = [];
        const allNegotiations: any[] = [];
        const allApprovalLogs: any[] = [];
        const allAuditLogs: any[] = [];

        const now = new Date();

        for (let i = 0; i < quoteStatuses.length; i++) {
            const rawStatus = quoteStatuses[i];
            const isManagerPending = rawStatus === 'PENDING_SALES_MANAGER';
            const isFinancePending = rawStatus === 'PENDING_FINANCE';
            const status = (isManagerPending || isFinancePending) ? 'PENDING_APPROVAL' : rawStatus;

            const qNum = `QT-${String(i + 1).padStart(4, '0')}`;
            const cust = createdCustomers[i % createdCustomers.length];
            const tierObj = tiers.find(t => String(t._id) === String(cust.tier)) || tiers[1];

            let approvalSteps: any[] = [];
            let riskScore = 0;
            let discountPercent = 5;

            if (isManagerPending) {
                approvalSteps = [{ role: 'SALES_MANAGER', status: 'PENDING' }];
                riskScore = 32;
                discountPercent = 14;
            } else if (isFinancePending) {
                approvalSteps = [
                    { role: 'SALES_MANAGER', status: 'APPROVED', approvedBy: managerUser.name, approvedAt: new Date(now.getTime() - 2 * 3600 * 1000) },
                    { role: 'FINANCE', status: 'PENDING' }
                ];
                riskScore = 58;
                discountPercent = 22;
            } else if (status === 'APPROVED' || status === 'CONFIRMED' || status === 'SENT') {
                approvalSteps = [
                    { role: 'SALES_MANAGER', status: 'APPROVED', approvedBy: managerUser.name, approvedAt: new Date(now.getTime() - 24 * 3600 * 1000) }
                ];
                riskScore = 15;
                discountPercent = 8;
            } else if (status === 'UNDER_NEGOTIATION') {
                riskScore = 20;
                discountPercent = 12;
            }

            const qId = new mongoose.Types.ObjectId();
            const createdAtDate = new Date(now.getTime() - (80 - i) * 6 * 3600 * 1000);

            const p1 = products[(i * 2) % products.length];
            const p2 = products[(i * 2 + 1) % products.length];
            const p3 = products[(i * 3 + 2) % products.length];
            const selectedProds = (i % 3 === 0) ? [p1, p2, p3] : [p1, p2];

            let subtotal = 0;
            let discountAmount = 0;
            let taxAmount = 0;
            let marginAmount = 0;

            const quoteLinesForThisQuote: any[] = [];

            for (let lineIdx = 0; lineIdx < selectedProds.length; lineIdx++) {
                const prod = selectedProds[lineIdx];
                const qty = (lineIdx === 0 ? ((i % 4) + 2) : ((i % 2) + 1));
                const unitPrice = prod.basePrice;
                const costPrice = prod.costPrice;
                const lineDiscountPct = discountPercent;

                const lineSub = unitPrice * qty;
                const lineDisc = (lineSub * lineDiscountPct) / 100;
                const lineTax = ((lineSub - lineDisc) * prod.taxPercent) / 100;
                const lineCost = costPrice * qty;
                const lineMargin = (lineSub - lineDisc) - lineCost;

                subtotal += lineSub;
                discountAmount += lineDisc;
                taxAmount += lineTax;
                marginAmount += lineMargin;

                const lineDoc = {
                    _id: new mongoose.Types.ObjectId(),
                    quotationId: qId,
                    productId: prod._id,
                    productName: prod.name,
                    sku: prod.sku,
                    category: catMap['Hardware']?.name || 'General',
                    quantity: qty,
                    unitPrice,
                    costPrice,
                    taxPercent: prod.taxPercent,
                    discountPercent: lineDiscountPct,
                    overagePercent: Math.max(0, lineDiscountPct - tierObj.maxDiscountPercent),
                    isViolation: lineDiscountPct > tierObj.maxDiscountPercent,
                };
                allQuotationLines.push(lineDoc);
                quoteLinesForThisQuote.push(lineDoc);
            }

            const totalAmount = subtotal - discountAmount + taxAmount;
            const marginPct = totalAmount > 0 ? Math.round((marginAmount / totalAmount) * 100) : 35;

            const quotationDoc = {
                _id: qId,
                quotationNumber: qNum,
                customerId: cust._id,
                customerTierSnapshot: { _id: tierObj._id, tier: tierObj.name, maxDiscount: tierObj.maxDiscountPercent },
                salesRepId: salesRep._id,
                status,
                subtotal: Math.round(subtotal),
                discountAmount: Math.round(discountAmount),
                taxAmount: Math.round(taxAmount),
                totalAmount: Math.round(totalAmount),
                marginAmount: Math.round(marginAmount),
                marginPct,
                orderDiscountPercent: discountPercent,
                riskScore,
                requiredApprovalSteps: approvalSteps,
                lastActivityAt: createdAtDate,
                validUntil: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
                currency: 'USD',
                notes: `Enterprise procurement request for ${cust.name}. Terms: Net 30, USD billing.`,
                createdAt: createdAtDate,
                updatedAt: createdAtDate,
            };
            createdQuotations.push(quotationDoc);

            allAuditLogs.push({
                entityType: 'quotation',
                entityId: qId,
                entityRef: qNum,
                action: status === 'CONFIRMED' ? 'confirmed' : (status === 'APPROVED' ? 'approved' : 'created'),
                actorId: salesRep._id,
                actorName: salesRep.name,
                actorRole: salesRep.role,
                actorType: 'internal',
                fromStatus: 'DRAFT',
                toStatus: status,
                reason: `Pipeline transition to ${status}`,
                createdAt: createdAtDate,
            });

            if (status === 'UNDER_NEGOTIATION' || isManagerPending || isFinancePending || (status === 'CONFIRMED' && i % 2 === 0)) {
                allNegotiations.push({
                    quotationId: qId,
                    lineId: quoteLinesForThisQuote[0]?._id,
                    type: 'COUNTER_DISCOUNT',
                    actorType: 'CUSTOMER',
                    actorId: cust._id,
                    message: `We are requesting an adjusted discount of ${discountPercent}% given our bulk rollout schedule for Q3/Q4.`,
                    requestedDiscountPercent: discountPercent,
                    status: status === 'CONFIRMED' ? 'ACCEPTED' : 'OPEN',
                    createdAt: new Date(createdAtDate.getTime() + 2 * 3600 * 1000),
                    resolvedAt: status === 'CONFIRMED' ? new Date(createdAtDate.getTime() + 6 * 3600 * 1000) : undefined,
                });

                allNegotiations.push({
                    quotationId: qId,
                    type: 'COMMENT',
                    actorType: 'REP',
                    actorId: salesRep._id,
                    message: `Understood! Submitted to Sales Management for volume concession review.`,
                    status: 'RESOLVED',
                    createdAt: new Date(createdAtDate.getTime() + 3 * 3600 * 1000),
                });
            }

            if (status === 'APPROVED' || isFinancePending || status === 'CONFIRMED') {
                allApprovalLogs.push({
                    quotationId: qId,
                    approverId: managerUser._id,
                    level: ApprovalLevel.SALES_MANAGER,
                    action: ApprovalAction.APPROVED,
                    previousStatus: 'PENDING_APPROVAL',
                    newStatus: isFinancePending ? 'PENDING_APPROVAL' : 'APPROVED',
                    reason: 'Strategic customer commercial concession approved for multi-year relationship.',
                    discountPercent,
                    riskScore,
                    timestamp: new Date(createdAtDate.getTime() + 5 * 3600 * 1000),
                });
            }
        }

        await Quotation.insertMany(createdQuotations);
        await QuotationLine.insertMany(allQuotationLines);
        await Negotiation.insertMany(allNegotiations);
        await ApprovalLog.insertMany(allApprovalLogs);

        console.log('11. Seeding 30 Orders & Fulfillment Plans (Pending, Partial Backorder, Fulfilled)...');
        const confirmedQuotes = createdQuotations.filter(q => q.status === 'CONFIRMED');
        const additionalQuotesForOrders = createdQuotations.slice(20, 38);
        const orderQuotes = [...confirmedQuotes, ...additionalQuotesForOrders];

        const createdOrders: any[] = [];
        const createdShipments: any[] = [];
        let shipmentCounter = 1;

        for (let i = 0; i < 30; i++) {
            const q = orderQuotes[i % orderQuotes.length];
            const orderNum = `SO-${String(i + 1).padStart(4, '0')}`;
            const orderId = new mongoose.Types.ObjectId();

            let orderStatus: 'PENDING_FULFILLMENT' | 'PARTIALLY_FULFILLED' | 'FULFILLED' = 'PENDING_FULFILLMENT';
            if (i >= 8 && i <= 17) orderStatus = 'PARTIALLY_FULFILLED';
            else if (i >= 18) orderStatus = 'FULFILLED';

            const hasBackorder = orderStatus === 'PARTIALLY_FULFILLED';

            const quoteLines = allQuotationLines.filter(l => String(l.quotationId) === String(q._id));
            const orderLines = quoteLines.map(l => ({
                productId: l.productId,
                productName: l.productName,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                discountAmount: Math.round((l.unitPrice * l.quantity * l.discountPercent) / 100),
                taxAmount: Math.round(((l.unitPrice * l.quantity) * l.taxPercent) / 100),
                lineTotal: Math.round(l.unitPrice * l.quantity - (l.unitPrice * l.quantity * l.discountPercent) / 100),
                isSubscription: l.productName.includes('Storage') || l.productName.includes('Cloud') || l.productName.includes('Support') || l.productName.includes('Kubernetes'),
            }));

            const mainWh = warehouses[0];
            const eastWh = warehouses[1];
            const westWh = warehouses[2];

            const fulfillmentPlan: any[] = [];
            const physicalLines = orderLines.filter(l => !l.isSubscription);

            if (physicalLines.length > 0) {
                if (orderStatus === 'PENDING_FULFILLMENT') {
                    fulfillmentPlan.push({
                        warehouseId: mainWh._id,
                        warehouseName: mainWh.name,
                        lines: physicalLines.map(l => ({ productId: l.productId, productName: l.productName, quantity: l.quantity })),
                        shipmentCost: 45,
                        isBackorder: false,
                        status: 'PLANNED',
                        expectedDate: new Date(now.getTime() + 3 * 24 * 3600 * 1000),
                    });
                } else if (orderStatus === 'PARTIALLY_FULFILLED') {
                    const firstHalfQty = Math.max(1, Math.floor(physicalLines[0].quantity / 2));
                    const backorderQty = physicalLines[0].quantity - firstHalfQty;

                    fulfillmentPlan.push({
                        warehouseId: mainWh._id,
                        warehouseName: mainWh.name,
                        lines: [{ productId: physicalLines[0].productId, productName: physicalLines[0].productName, quantity: firstHalfQty }],
                        shipmentCost: 35,
                        isBackorder: false,
                        status: 'SHIPPED',
                        shippedAt: new Date(now.getTime() - 24 * 3600 * 1000),
                    });

                    fulfillmentPlan.push({
                        warehouseId: eastWh._id,
                        warehouseName: eastWh.name,
                        lines: [{ productId: physicalLines[0].productId, productName: physicalLines[0].productName, quantity: Math.max(1, backorderQty) }],
                        shipmentCost: 40,
                        isBackorder: true,
                        status: 'RESERVED',
                        expectedDate: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
                    });
                } else {
                    fulfillmentPlan.push({
                        warehouseId: mainWh._id,
                        warehouseName: mainWh.name,
                        lines: physicalLines.map(l => ({ productId: l.productId, productName: l.productName, quantity: l.quantity })),
                        shipmentCost: 50,
                        isBackorder: false,
                        status: 'DELIVERED',
                        shippedAt: new Date(now.getTime() - 4 * 24 * 3600 * 1000),
                    });
                }
            }

            const orderDate = new Date(now.getTime() - (30 - i) * 12 * 3600 * 1000);
            const grandTotal = orderLines.reduce((acc, l) => acc + l.lineTotal, 0) + (physicalLines.length > 0 ? 50 : 0);

            const orderDoc = {
                _id: orderId,
                orderNumber: orderNum,
                quotationId: q._id,
                customerId: q.customerId,
                salesRepId: salesRep._id,
                status: orderStatus,
                orderLines,
                fulfillmentPlan,
                splitMode: hasBackorder ? 'MANUAL' : 'AUTO',
                hasBackorder,
                shipmentCount: fulfillmentPlan.length,
                totalShippingCost: fulfillmentPlan.reduce((acc, p) => acc + p.shipmentCost, 0),
                grandTotal,
                promisedDeliveryDate: new Date(orderDate.getTime() + 5 * 24 * 3600 * 1000),
                actualDeliveryDate: orderStatus === 'FULFILLED' ? new Date(orderDate.getTime() + 3 * 24 * 3600 * 1000) : undefined,
                createdAt: orderDate,
                updatedAt: orderDate,
            };
            createdOrders.push(orderDoc);

            if (orderStatus === 'PARTIALLY_FULFILLED' || orderStatus === 'FULFILLED') {
                const shNum = `SH-${String(shipmentCounter++).padStart(4, '0')}`;
                createdShipments.push({
                    shipmentNumber: shNum,
                    orderId,
                    warehouseId: mainWh._id,
                    status: orderStatus === 'FULFILLED' ? 'DELIVERED' : 'SHIPPED',
                    items: physicalLines.map(l => ({
                        productId: l.productId,
                        productName: l.productName,
                        quantity: Math.max(1, Math.floor(l.quantity / 2)),
                    })),
                    createdAt: new Date(orderDate.getTime() + 12 * 3600 * 1000),
                    updatedAt: new Date(orderDate.getTime() + 24 * 3600 * 1000),
                });

                if (orderStatus === 'FULFILLED' && physicalLines.length > 1) {
                    const shNum2 = `SH-${String(shipmentCounter++).padStart(4, '0')}`;
                    createdShipments.push({
                        shipmentNumber: shNum2,
                        orderId,
                        warehouseId: westWh._id,
                        status: 'DELIVERED',
                        items: [{
                            productId: physicalLines[1].productId,
                            productName: physicalLines[1].productName,
                            quantity: physicalLines[1].quantity,
                        }],
                        createdAt: new Date(orderDate.getTime() + 18 * 3600 * 1000),
                        updatedAt: new Date(orderDate.getTime() + 36 * 3600 * 1000),
                    });
                }
            } else {
                if (i % 2 === 0 && physicalLines.length > 0) {
                    const shNum = `SH-${String(shipmentCounter++).padStart(4, '0')}`;
                    createdShipments.push({
                        shipmentNumber: shNum,
                        orderId,
                        warehouseId: mainWh._id,
                        status: 'READY_TO_SHIP',
                        items: physicalLines.map(l => ({
                            productId: l.productId,
                            productName: l.productName,
                            quantity: l.quantity,
                        })),
                        createdAt: orderDate,
                        updatedAt: orderDate,
                    });
                }
            }
        }

        await Order.insertMany(createdOrders);
        await Shipment.insertMany(createdShipments);

        console.log('12. Seeding 25 Subscriptions & ~90 Forward-Looking Billing Schedules...');
        const subscriptionProducts = products.filter(p => p.isSubscription);
        const createdSubscriptions: any[] = [];
        const createdBillingSchedules: any[] = [];

        for (let i = 0; i < 25; i++) {
            const subId = new mongoose.Types.ObjectId();
            const cust = createdCustomers[i % createdCustomers.length];
            const prod = subscriptionProducts[i % subscriptionProducts.length];

            const cycles: ('MONTHLY' | 'QUARTERLY' | 'YEARLY')[] = ['MONTHLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
            const billingCycle = cycles[i % cycles.length];

            let subStatus: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'PAST_DUE' = 'ACTIVE';
            if (i >= 16 && i <= 19) subStatus = 'PAUSED';
            else if (i >= 20 && i <= 22) subStatus = 'CANCELLED';
            else if (i >= 23) subStatus = 'PAST_DUE';

            const qty = (i % 3) + 1;
            const unitPrice = prod.basePrice;
            const totalRecurringAmount = qty * unitPrice;

            const startDate = new Date(now.getTime() - (i + 1) * 30 * 24 * 3600 * 1000);
            const nextBillingDate = new Date(now.getTime() + (30 - (i % 25)) * 24 * 3600 * 1000);

            const subDoc = {
                _id: subId,
                customerId: cust._id,
                orderId: createdOrders[i % createdOrders.length]._id,
                productId: prod._id,
                productName: prod.name,
                billingCycle,
                status: subStatus,
                startDate,
                nextBillingDate,
                unitPrice,
                quantity: qty,
                totalRecurringAmount,
                cancellationDate: subStatus === 'CANCELLED' ? new Date(now.getTime() - 5 * 24 * 3600 * 1000) : undefined,
                cancellationReason: subStatus === 'CANCELLED' ? 'Migrated to annual consolidated enterprise master contract.' : undefined,
                createdAt: startDate,
                updatedAt: startDate,
            };
            createdSubscriptions.push(subDoc);

            for (let sIdx = -1; sIdx <= 3; sIdx++) {
                const periodStart = new Date(startDate);
                if (billingCycle === 'MONTHLY') periodStart.setMonth(periodStart.getMonth() + (sIdx + 1));
                else if (billingCycle === 'QUARTERLY') periodStart.setMonth(periodStart.getMonth() + (sIdx + 1) * 3);
                else periodStart.setFullYear(periodStart.getFullYear() + (sIdx + 1));

                const periodEnd = new Date(periodStart);
                if (billingCycle === 'MONTHLY') periodEnd.setMonth(periodEnd.getMonth() + 1);
                else if (billingCycle === 'QUARTERLY') periodEnd.setMonth(periodEnd.getMonth() + 3);
                else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

                const isPast = periodStart <= now;
                const scheduleStatus: 'PAID' | 'INVOICED' | 'UPCOMING' = isPast ? 'PAID' : (sIdx === 0 ? 'INVOICED' : 'UPCOMING');

                const subtotal = totalRecurringAmount;
                const tax = Math.round(subtotal * 0.08);
                const total = subtotal + tax;

                createdBillingSchedules.push({
                    subscriptionId: subId,
                    billingDate: periodStart,
                    periodStart,
                    periodEnd,
                    quantity: qty,
                    unitPrice,
                    subtotal,
                    tax,
                    total,
                    status: scheduleStatus,
                    createdAt: startDate,
                    updatedAt: startDate,
                });
            }
        }

        await Subscription.insertMany(createdSubscriptions);
        await BillingSchedule.insertMany(createdBillingSchedules);

        console.log('13. Seeding 45 Invoices across Paid, Partially Paid, Unpaid, and Overdue...');
        const createdInvoices: any[] = [];
        const createdPayments: any[] = [];

        for (let i = 0; i < 45; i++) {
            const invId = new mongoose.Types.ObjectId();
            const invNum = `INV-${String(i + 1).padStart(5, '0')}`;
            const cust = createdCustomers[i % createdCustomers.length];
            const order = createdOrders[i % createdOrders.length];
            const sub = (i % 2 === 1) ? createdSubscriptions[i % createdSubscriptions.length] : undefined;

            let invStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'OVERDUE' = 'PAID';
            if (i >= 20 && i <= 29) invStatus = 'PARTIALLY_PAID';
            else if (i >= 30 && i <= 37) invStatus = 'UNPAID';
            else if (i >= 38) invStatus = 'OVERDUE';

            const isRecurring = Boolean(sub);
            const invoiceType = isRecurring ? 'RECURRING' : 'ONE_TIME';

            const subtotal = isRecurring ? (sub?.totalRecurringAmount || 500) : (order.grandTotal || 1500);
            const taxTotal = Math.round(subtotal * 0.08);
            const grandTotal = subtotal + taxTotal;

            let amountPaid = 0;
            if (invStatus === 'PAID') amountPaid = grandTotal;
            else if (invStatus === 'PARTIALLY_PAID') amountPaid = Math.round(grandTotal * 0.45);
            else amountPaid = 0;

            const amountDue = grandTotal - amountPaid;

            const invCreatedDate = new Date(now.getTime() - (45 - i) * 24 * 3600 * 1000);
            let dueDate = new Date(invCreatedDate.getTime() + 30 * 24 * 3600 * 1000);
            if (invStatus === 'OVERDUE') {
                dueDate = new Date(now.getTime() - ((45 - i) % 10 + 2) * 24 * 3600 * 1000);
            }

            const invDoc = {
                _id: invId,
                invoiceNumber: invNum,
                orderId: order._id,
                subscriptionId: sub ? sub._id : undefined,
                customerId: cust._id,
                invoiceType,
                lines: [
                    {
                        productId: sub ? sub.productId : order.orderLines[0]?.productId,
                        productName: sub ? sub.productName : (order.orderLines[0]?.productName || 'Enterprise Hardware'),
                        description: sub ? `Recurring ${sub.billingCycle} subscription access` : 'Hardware equipment deployment and initial setup',
                        quantity: sub ? sub.quantity : (order.orderLines[0]?.quantity || 1),
                        unitPrice: sub ? sub.unitPrice : (order.orderLines[0]?.unitPrice || subtotal),
                        lineTotal: subtotal,
                        isRecurring,
                        periodStart: sub ? sub.startDate : undefined,
                        periodEnd: sub ? sub.nextBillingDate : undefined,
                    }
                ],
                subtotal,
                taxTotal,
                grandTotal,
                amountPaid,
                amountDue,
                currency: 'USD',
                status: invStatus,
                dueDate,
                paidAt: invStatus === 'PAID' ? new Date(invCreatedDate.getTime() + 7 * 24 * 3600 * 1000) : undefined,
                createdAt: invCreatedDate,
                updatedAt: invCreatedDate,
            };
            createdInvoices.push(invDoc);

            if (amountPaid > 0) {
                const paymentMethods = ['WIRE_TRANSFER', 'ACH', 'CREDIT_CARD', 'STRIPE'];
                createdPayments.push({
                    invoiceId: invId,
                    customerId: cust._id,
                    amount: amountPaid,
                    currency: 'USD',
                    paymentMethod: paymentMethods[i % paymentMethods.length],
                    paymentReference: `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                    status: 'SUCCESS',
                    paidAt: new Date(invCreatedDate.getTime() + 5 * 24 * 3600 * 1000),
                    createdAt: new Date(invCreatedDate.getTime() + 5 * 24 * 3600 * 1000),
                });
            }
        }

        await Invoice.insertMany(createdInvoices);
        await Payment.insertMany(createdPayments);

        console.log('14. Seeding 15 Credit Notes (Commercial Adjustments)...');
        const creditReasons = [
            'Volume Tier Adjustment for Q2 expansion',
            'Service Level Agreement (SLA) latency credit',
            'Hardware trade-in rebate concession',
            'Promotional onboarding incentive credit',
            'Annual subscription advance renewal credit',
        ];
        const createdCreditNotes: any[] = [];
        for (let i = 0; i < 15; i++) {
            const cnNum = `CN-${String(i + 1).padStart(4, '0')}`;
            const cust = createdCustomers[i % createdCustomers.length];
            const inv = createdInvoices[i % createdInvoices.length];
            const isApplied = i % 3 === 0;

            createdCreditNotes.push({
                creditNoteNumber: cnNum,
                customerId: cust._id,
                invoiceId: inv._id,
                amount: ((i % 5) + 1) * 150,
                taxAdjustment: ((i % 5) + 1) * 12,
                reason: creditReasons[i % creditReasons.length],
                status: isApplied ? 'APPLIED' : 'ISSUED',
                appliedAt: isApplied ? new Date(now.getTime() - (15 - i) * 24 * 3600 * 1000) : undefined,
                createdAt: new Date(now.getTime() - (20 - i) * 24 * 3600 * 1000),
            });
        }
        await CreditNote.insertMany(createdCreditNotes);

        console.log('15. Seeding Additional Enterprise Audit Logs for Rich Timeline Visuals...');
        for (let i = 0; i < 20; i++) {
            const order = createdOrders[i % createdOrders.length];
            allAuditLogs.push({
                entityType: 'order',
                entityId: order._id,
                entityRef: order.orderNumber,
                action: order.status === 'FULFILLED' ? 'delivered' : 'split_fulfillment',
                actorId: adminUser._id,
                actorName: adminUser.name,
                actorRole: adminUser.role,
                actorType: 'internal',
                fromStatus: 'PENDING_FULFILLMENT',
                toStatus: order.status,
                reason: `Warehouse logistics processed for ${order.orderNumber}. SplitMode: ${order.splitMode}.`,
                createdAt: new Date(now.getTime() - (20 - i) * 12 * 3600 * 1000),
            });
        }
        await AuditLog.insertMany(allAuditLogs);

        console.log('16. Initializing Atomic Sequential Counters...');
        await Counter.insertMany([
            { name: 'quotation', seq: 100 },
            { name: 'order', seq: 100 },
            { name: 'invoice', seq: 100 },
            { name: 'shipment', seq: 100 },
            { name: 'credit_note', seq: 100 },
        ]);

        const totalRecords =
            tiers.length +
            categories.length +
            warehouses.length +
            plans.length +
            4 +
            products.length +
            stocksToInsert.length +
            upsellRulesData.length +
            internalUsers.length +
            customerCompanies.length +
            createdQuotations.length +
            allQuotationLines.length +
            allNegotiations.length +
            createdOrders.length +
            createdShipments.length +
            createdSubscriptions.length +
            createdBillingSchedules.length +
            createdInvoices.length +
            createdPayments.length +
            createdCreditNotes.length +
            allApprovalLogs.length +
            allAuditLogs.length +
            5;

        console.log('=====================================================');
        console.log('MASTER SEED COMPLETED SUCCESSFULLY!');
        console.log(`Total Interconnected Enterprise Records Seeded: ${totalRecords}`);
        console.log(`- Customer Tiers: ${tiers.length}`);
        console.log(`- Warehouses: ${warehouses.length}`);
        console.log(`- Products: ${products.length}`);
        console.log(`- Stock Positions: ${stocksToInsert.length}`);
        console.log(`- Users: ${internalUsers.length + customerCompanies.length} (4 staff, 20 customers)`);
        console.log(`- Quotations: ${createdQuotations.length}`);
        console.log(`- Quotation Lines: ${allQuotationLines.length}`);
        console.log(`- Negotiations: ${allNegotiations.length}`);
        console.log(`- Sales Orders: ${createdOrders.length}`);
        console.log(`- Shipments: ${createdShipments.length}`);
        console.log(`- Subscriptions: ${createdSubscriptions.length}`);
        console.log(`- Billing Schedules: ${createdBillingSchedules.length}`);
        console.log(`- Invoices: ${createdInvoices.length}`);
        console.log(`- Payments: ${createdPayments.length}`);
        console.log(`- Credit Notes: ${createdCreditNotes.length}`);
        console.log(`- Approval Logs: ${allApprovalLogs.length}`);
        console.log(`- Audit Logs: ${allAuditLogs.length}`);
        console.log('=====================================================');

        process.exit(0);
    } catch (err) {
        console.error('Master Seeding Error:', err);
        process.exit(1);
    }
};

runMasterSeed();