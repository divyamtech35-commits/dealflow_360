import { computeLineRisk, computeBlendedScore, resolveApprovalSteps } from '../src/services/riskEngine';

describe('riskEngine.ts', () => {
    const discountRules = [
        { tier: 'Gold', maxDiscountPercent: 25 },
        { tier: 'Silver', maxDiscountPercent: 15 },
        { category: 'Hardware', defaultDiscountLimit: 15 },
        { category: 'Services', defaultDiscountLimit: 10 }
    ];

    const customerTier = { tier: 'Gold' };
    const policy = { blendedWeight: 0.6, worstWeight: 0.4 };
    const approvalChain = [
        { role: 'SALES_MANAGER', threshold: 1 }, // Manager needs 1 point
        { role: 'FINANCE', threshold: 15 } // Finance needs 15 points
    ];

    test('1. All lines within ceilings -> riskScore 0, steps []', () => {
        const lines = [
            { category: 'Hardware', unitPrice: 1000, quantity: 1, discountPercent: 10, productName: 'Laptop' }
        ];
        const res = computeBlendedScore(lines, discountRules, customerTier, policy);
        expect(res.riskScore).toBe(0);
        const steps = resolveApprovalSteps(res.riskScore, approvalChain);
        expect(steps.length).toBe(0);
    });

    test('2. SPEC EXAMPLE: Gold customer, Laptop 12%, Setup Service 18% -> flagged', () => {
        const lines = [
            { category: 'Hardware', unitPrice: 2000, quantity: 1, discountPercent: 12, productName: 'Laptop' },
            { category: 'Services', unitPrice: 500, quantity: 1, discountPercent: 18, productName: 'Setup Service' }
        ];
        const res = computeBlendedScore(lines, discountRules, customerTier, policy);
        expect(res.violationCount).toBe(1);
        expect(res.explanation[0]).toBe('Setup Service: 18% given vs 10% allowed (+8.0)');
        expect(res.worstLineOverage).toBe(8); // 18 - 10 = 8
        expect(res.riskScore > 0).toBe(true);
    });

    test('3. DEATH BY A THOUSAND CUTS: 5 lines each 2.5 points over', () => {
        const lines = Array(5).fill({ category: 'Hardware', unitPrice: 100, quantity: 1, discountPercent: 17.5, productName: 'HW' });
        const res = computeBlendedScore(lines, discountRules, customerTier, policy);
        // overage: 2.5 on all -> worst is 2.5, weighted is 2.5 -> score is 2.5
        expect(res.riskScore).toBe(2.5);
        const steps = resolveApprovalSteps(res.riskScore, approvalChain);
        expect(steps.includes('SALES_MANAGER')).toBe(true); // Exceeds 1
    });

    test('4. Tiny line wildly over on a large order -> weighted term low but escalates', () => {
        const lines = [
            { category: 'Hardware', unitPrice: 10000, quantity: 1, discountPercent: 0, productName: 'Core' },     // Net 10000, overage 0
            { category: 'Hardware', unitPrice: 10, quantity: 1, discountPercent: 40, productName: 'Dongle' }     // Net 6, overage 25
        ];
        // Weighted overage: (25 * 6) / 10006 = ~0.015
        // Worst overage: 25
        // Score: 0.6*0.015 + 0.4*25 = ~10
        const res = computeBlendedScore(lines, discountRules, customerTier, policy);
        expect(res.worstLineOverage).toBe(25);
        expect(res.weightedBlendedOverage).toBeLessThan(1);
        expect(res.riskScore).toBeGreaterThanOrEqual(9);
        const steps = resolveApprovalSteps(res.riskScore, approvalChain);
        expect(steps.includes('SALES_MANAGER')).toBe(true);
    });

    test('5. Category ceiling stricter than tier ceiling -> stricter wins', () => {
        const line = { category: 'Hardware', unitPrice: 100, quantity: 1, discountPercent: 20, productName: 'HW' };
        const lr = computeLineRisk(line, discountRules, customerTier);
        // Tier Gold=25, Hardware=15 => Allowed 15. Given 20 => Overage 5.
        expect(lr.allowedPercent).toBe(15);
        expect(lr.overagePercent).toBe(5);
    });

    test('6. Empty lines / zero-value order -> score 0, no divide-by-zero', () => {
        const lines: any[] = [];
        const res = computeBlendedScore(lines, discountRules, customerTier, policy);
        expect(res.riskScore).toBe(0);

        const linesZeroNet = [{ category: 'Hardware', unitPrice: 0, quantity: 1, discountPercent: 10, productName: 'Freebie' }];
        const resZero = computeBlendedScore(linesZeroNet, discountRules, customerTier, policy);
        expect(resZero.riskScore).toBe(0); // lineNet is 0
    });

    test('7. Line with 0% discount contributes 0 overage but counts in denominator', () => {
        const lines = [
            { category: 'Hardware', unitPrice: 100, quantity: 1, discountPercent: 20, productName: 'Over' }, // Net 80, over 5
            { category: 'Hardware', unitPrice: 100, quantity: 1, discountPercent: 0, productName: 'Under' }  // Net 100, over 0
        ];
        const res = computeBlendedScore(lines, discountRules, customerTier, policy);
        // Denominator = 180, weighted over = (5*80 + 0*100) / 180 = 400/180 = 2.22
        // Worst = 5
        // Score = 0.6*(2.22) + 0.4*(5) = 1.33 + 2 = 3.3
        expect(res.weightedBlendedOverage).toBeCloseTo(2.22, 1);
        expect(res.riskScore).toBe(3.3);
    });
});
