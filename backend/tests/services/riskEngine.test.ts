import { computeLineRisk, computeBlendedScore, resolveApprovalSteps } from '../../src/services/riskEngine';

describe('Risk Engine Tests', () => {
    const RULES = [
        { customerTierId: 'tier1', categoryId: 'cat_hardware', maxDiscountPercent: 15 },
        { customerTierId: 'tier1', maxDiscountPercent: 10 } // fallback
    ];
    const TIER = { _id: 'tier1', name: 'GOLD' };

    it('throws if customerTier is missing', () => {
        expect(() => {
            computeBlendedScore([{ productName: 'Laptop', discountPercent: 20 }], RULES, null, {});
        }).toThrow(/Customer Tier is strictly required/);
    });

    it('throws if rule does not resolve', () => {
        expect(() => {
            computeBlendedScore([{ productName: 'Laptop', category: 'cat_software', discountPercent: 20 }], [], TIER, {});
        }).toThrow(/CRITICAL: No discount policy found for customer tier/);
    });

    it('hardware line at 20% for a GOLD customer yields overagePercent 5 and exact steps', () => {
        const lineRisks = computeLineRisk({ productName: 'Laptop', category: 'cat_hardware', discountPercent: 20, unitPrice: 1000, quantity: 1 }, RULES, TIER);

        expect(lineRisks.overagePercent).toBe(5);
        expect(lineRisks.isViolation).toBe(true);

        const result = computeBlendedScore([{ productName: 'Laptop', category: 'cat_hardware', discountPercent: 20, unitPrice: 1000, quantity: 1 }], RULES, TIER, {});
        expect(result.worstLineOverage).toBe(5);

        const approvalChain = [
            { threshold: 1, role: 'SALES_MANAGER' },
            { threshold: 10, role: 'FINANCE' }
        ];

        // Let's assume result.riskScore > 1
        const steps = resolveApprovalSteps(result.riskScore, approvalChain);
        expect(steps.length).toBeGreaterThan(0);
        expect(steps).toContain('SALES_MANAGER');
    });
});
