import { orderTotals } from '../../src/services/pricingEngine';

describe('Pricing Engine Math Reconciliation', () => {
    it('Gross - Discount + Tax = Grand Total for every case', () => {
        // Mock subtotal 9900, discount 1980 (20%), net 7920, tax 792 (10% of 7920), total 8712
        const lines = [
            {
                unitPrice: 9900,
                quantity: 1,
                discountPct: 20,
                costPrice: 5000,
                taxPct: 10
            }
        ];

        const totals = orderTotals(lines, 0);

        // Subtotal (Gross)
        expect(totals.subtotal).toBe(9900);
        // Discount
        expect(totals.discountTotal).toBe(1980);
        // Net
        expect(totals.netTotal).toBe(7920);
        // Tax
        expect(totals.taxTotal).toBe(792);
        // Grand Total
        expect(totals.grandTotal).toBe(8712);

        // Core requirement mathematical check
        expect(totals.subtotal - totals.discountTotal + totals.taxTotal).toBe(totals.grandTotal);
    });

    it('reconciles with order discount as well', () => {
        const lines = [
            {
                unitPrice: 1000,
                quantity: 2, // 2000 gross
                discountPct: 10, // 200 discount (line net 1800)
                costPrice: 500,
                taxPct: 10 // tax on line net is 180
            }
        ];

        // 10% order discount on line net (1800) = 180
        const totals = orderTotals(lines, 10);

        expect(totals.subtotal).toBe(2000);
        expect(totals.discountTotal).toBe(380); // 200 line + 180 order
        expect(totals.netTotal).toBe(1620); // 2000 - 380

        // Original tax was 180. Reduced by 10% order discount = 162
        expect(totals.taxTotal).toBe(162);
        expect(totals.grandTotal).toBe(1782); // 1620 + 162

        expect(totals.subtotal - totals.discountTotal + totals.taxTotal).toBe(totals.grandTotal);
    });
});
