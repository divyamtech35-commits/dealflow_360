import { resolveUnitPrice, lineAmounts, orderTotals } from '../src/services/pricingEngine';

describe('pricingEngine.ts', () => {
    test('resolveUnitPrice precedence', () => {
        const product = { _id: 'p1', categoryId: 'c1', basePrice: 10000 };
        expect(resolveUnitPrice(product, null)).toBe(10000);
        expect(resolveUnitPrice(product, [{ categoryId: 'c1', discountPct: 10 }])).toBe(9000);
        expect(resolveUnitPrice(product, [{ categoryId: 'c1', discountPct: 10 }, { productId: 'p1', discountPct: 20 }])).toBe(8000);
    });

    test('lineAmounts', () => {
        const res = lineAmounts({ unitPrice: 10000, quantity: 2, discountPct: 10, costPrice: 5000, taxPct: 0 });
        expect(res.gross).toBe(20000);
        expect(res.discountAmount).toBe(2000);
        expect(res.net).toBe(18000);
        expect(res.margin).toBe(8000);
    });

    test('orderTotals', () => {
        const lines = [
            { unitPrice: 10000, quantity: 2, discountPct: 10, costPrice: 5000, taxPct: 0 }
        ];
        const totals = orderTotals(lines, 0);
        expect(totals.subtotal).toBe(18000);
        expect(totals.grandTotal).toBe(18000);
        expect(totals.marginAmount).toBe(8000);
    });
});
