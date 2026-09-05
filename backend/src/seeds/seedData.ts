export const seedData = {
    tiers: [
        { name: 'Bronze', maxDiscountPercent: 5 },
        { name: 'Silver', maxDiscountPercent: 10 },
        { name: 'Gold', maxDiscountPercent: 15 },
    ],
    categories: [
        { name: 'Hardware', defaultDiscountLimit: 15 },
        { name: 'Services', defaultDiscountLimit: 10 },
        { name: 'Subscriptions', defaultDiscountLimit: 15 },
    ],
    products: [
        { name: 'Laptop Pro 16" Enterprise', sku: 'HW-LAP-16-ENT', category: 'Hardware', basePrice: 1499, unit: 'pcs', taxPercent: 8.5, costPrice: 950 },
        { name: 'Pro Laptop 14"', sku: 'HW-LAP-14', category: 'Hardware', basePrice: 1200, unit: 'pcs', taxPercent: 8.5, costPrice: 900 },
        { name: '27" 4K Monitor', sku: 'HW-MON-27', category: 'Hardware', basePrice: 400, unit: 'pcs', taxPercent: 8.5, costPrice: 280 },
        { name: 'Installation Service', sku: 'SRV-INST', category: 'Services', basePrice: 200, unit: 'hours', taxPercent: 0, costPrice: 100 },
        { name: 'Premium Support 24/7', sku: 'SRV-SUPP', category: 'Services', basePrice: 500, unit: 'month', taxPercent: 0, costPrice: 200 },
        { name: 'Cloud Storage 1TB', sku: 'SUB-CLD-1', category: 'Subscriptions', basePrice: 50, unit: 'month', taxPercent: 5, costPrice: 10, isSubscription: true, plan: 'Monthly' },
    ],
    warehouses: [
        { name: 'Main Warehouse', code: 'MAIN', shippingCostWeight: 1 },
        { name: 'East Depot', code: 'EAST', shippingCostWeight: 1.5 },
    ],
    plans: [
        { name: 'Monthly', billingCycle: 'MONTHLY', price: 50 },
        { name: 'Quarterly', billingCycle: 'QUARTERLY', price: 140 },
        { name: 'Yearly', billingCycle: 'YEARLY', price: 500 },
    ],
    discountRules: [
        { tier: 'Gold', maxDiscountPercent: 15, approvalRequiredAbove: 10, financeApprovalRequiredAbove: 15 },
        { tier: 'Silver', maxDiscountPercent: 15, approvalRequiredAbove: 10, financeApprovalRequiredAbove: 12 },
        { tier: 'Bronze', maxDiscountPercent: 8, approvalRequiredAbove: 5, financeApprovalRequiredAbove: 7 },
    ]
};
