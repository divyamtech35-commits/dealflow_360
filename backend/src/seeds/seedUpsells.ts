import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { UpsellRule } from '../models/UpsellRule';
import { connectDB } from '../config/db';

async function run() {
    await connectDB();

    // Ensure we have basic categories
    let hwCat = await Category.findOne({ name: 'Hardware' });
    let srvCat = await Category.findOne({ name: 'Services' });

    // Add additional products for upsell demo
    const newProds = [
        { name: 'Docking Station Pro', sku: 'HW-DOCK-1', categoryId: hwCat?._id, basePrice: 200, unit: 'pcs', taxPercent: 10, costPrice: 90, isPromoted: true },
        { name: 'Extended Warranty 3Yr', sku: 'SRV-WAR-3', categoryId: srvCat?._id, basePrice: 150, unit: 'pcs', taxPercent: 5, costPrice: 30, isPromoted: false },
        { name: 'Enterprise Server 2U', sku: 'HW-SRV-2U', categoryId: hwCat?._id, basePrice: 4000, unit: 'pcs', taxPercent: 10, costPrice: 2800 },
        { name: 'HDMI Pro Cable 2m', sku: 'HW-CBL-HD', categoryId: hwCat?._id, basePrice: 25, unit: 'pcs', taxPercent: 10, costPrice: 8, isPromoted: false },
        { name: 'Cloud Onboarding Session', sku: 'SRV-CLD-ONB', categoryId: srvCat?._id, basePrice: 500, unit: 'hours', taxPercent: 0, costPrice: 150, isPromoted: true }
    ];

    for (const p of newProds) {
        if (!p.categoryId) continue;
        await Product.findOneAndUpdate({ sku: p.sku }, p, { upsert: true, new: true });
    }

    // Retrieve references
    const laptop = await Product.findOne({ sku: 'HW-LAP-14' });
    const monitor = await Product.findOne({ sku: 'HW-MON-27' });
    const cloud = await Product.findOne({ sku: 'SUB-CLD-1' });
    const installation = await Product.findOne({ sku: 'SRV-INST' });
    const premiumSupport = await Product.findOne({ sku: 'SRV-SUPP' });

    const dock = await Product.findOne({ sku: 'HW-DOCK-1' });
    const warranty = await Product.findOne({ sku: 'SRV-WAR-3' });
    const server = await Product.findOne({ sku: 'HW-SRV-2U' });
    const cable = await Product.findOne({ sku: 'HW-CBL-HD' });
    const onboarding = await Product.findOne({ sku: 'SRV-CLD-ONB' });

    // Seed 10 realistic rules
    const rules = [
        { trigger: laptop, suggested: dock, type: 'CROSS_SELL', score: 0.9, minMargin: 10, reason: 'Essential connectivity expansion' },
        { trigger: laptop, suggested: warranty, type: 'UPSELL', score: 0.85, minMargin: 15, reason: 'Peace of mind protection' },
        { trigger: laptop, suggested: premiumSupport, type: 'CROSS_SELL', score: 0.7, minMargin: 20, reason: '24/7 technical assistance' },
        { trigger: server, suggested: installation, type: 'CROSS_SELL', score: 0.95, minMargin: 10, reason: 'Required professional setup' },
        { trigger: server, suggested: premiumSupport, type: 'CROSS_SELL', score: 0.8, minMargin: 15, reason: 'Critical uptime guarantee' },
        { trigger: server, suggested: warranty, type: 'UPSELL', score: 0.75, minMargin: 15, reason: 'Enterprise-grade protection' },
        { trigger: monitor, suggested: cable, type: 'CROSS_SELL', score: 0.9, minMargin: 30, reason: 'Premium display connection' },
        { trigger: monitor, suggested: warranty, type: 'UPSELL', score: 0.6, minMargin: 20, reason: 'Screen damage protection' },
        { trigger: cloud, suggested: onboarding, type: 'CROSS_SELL', score: 0.9, minMargin: 15, reason: 'Expert guided setup' },
        { trigger: cloud, suggested: premiumSupport, type: 'UPSELL', score: 0.85, minMargin: 20, reason: 'Priority cloud assistance' },
    ];

    await UpsellRule.deleteMany({});

    for (const r of rules) {
        if (!r.trigger || !r.suggested) continue;
        await UpsellRule.create({
            triggerProductId: r.trigger._id,
            suggestedProductId: r.suggested._id,
            relationType: r.type,
            coPurchaseScore: r.score,
            minMarginPercent: r.minMargin,
            reason: r.reason,
            isActive: true
        });
    }

    console.log(`Successfully seeded ${rules.length} upsell rules.`);
    process.exit(0);
}

run().catch(console.error);
