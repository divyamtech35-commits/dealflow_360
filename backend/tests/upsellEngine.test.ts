import { rankSuggestions } from '../src/services/upsellEngine';
import { orderTotals } from '../src/services/pricingEngine';

describe('Upsell Engine', () => {
    const pLaptop = { _id: 'p_laptop', basePrice: 100000, costPrice: 80000, taxPercent: 0, isPromoted: false };
    const pDock = { _id: 'p_dock', basePrice: 20000, costPrice: 10000, taxPercent: 0, isPromoted: true }; // 50% margin
    const pMouse = { _id: 'p_mouse', basePrice: 2000, costPrice: 1000, taxPercent: 0, isPromoted: false }; // 50% margin
    const pLowMargin = { _id: 'p_low', basePrice: 10000, costPrice: 9200, taxPercent: 0, isPromoted: false }; // 8% margin

    // Existing cart with laptop
    const cartLines = [{
        productId: 'p_laptop',
        quantity: 1,
        unitPrice: 100000,
        costPrice: 80000,
        discountPct: 0,
        taxPct: 0
    }];

    const products = [pLaptop, pDock, pMouse, pLowMargin];

    it('promoted item outranks an equal-scored non-promoted one', () => {
        const rules = [
            { triggerProductId: 'p_laptop', suggestedProductId: 'p_dock', coPurchaseScore: 0.8, minMarginPercent: 10, reason: 'Great dock' },
            { triggerProductId: 'p_laptop', suggestedProductId: 'p_mouse', coPurchaseScore: 0.8, minMarginPercent: 10, reason: 'Great mouse' }
        ];

        const suggestions = rankSuggestions(cartLines, rules, products);

        expect(suggestions.length).toBe(2);
        // p_dock is promoted so 0.8 * 1.5 = 1.2 score, p_mouse is 0.8 * 1.0 = 0.8
        expect(suggestions[0].product._id).toBe('p_dock');
        expect(suggestions[1].product._id).toBe('p_mouse');
        expect(suggestions[0].rankScore).toBe(1.2);
    });

    it('a low-margin product is suppressed', () => {
        const rules = [
            { triggerProductId: 'p_laptop', suggestedProductId: 'p_low', coPurchaseScore: 0.9, minMarginPercent: 15, reason: 'Low margin item' }
        ];

        const suggestions = rankSuggestions(cartLines, rules, products);
        // p_low has 8% margin, min is 15%
        expect(suggestions.length).toBe(0);
    });

    it('an item already in the cart never appears', () => {
        const rules = [
            { triggerProductId: 'p_laptop', suggestedProductId: 'p_laptop', coPurchaseScore: 0.9, minMarginPercent: 10, reason: 'You need two laptops' }
        ];

        const suggestions = rankSuggestions(cartLines, rules, products);
        // Excluded because p_laptop is already in the cart
        expect(suggestions.length).toBe(0);
    });

    it('margin delta matches a manual recomputation', () => {
        const rules = [
            { triggerProductId: 'p_laptop', suggestedProductId: 'p_mouse', coPurchaseScore: 1.0, minMarginPercent: 10, reason: 'Mouse' }
        ];

        const currentTotals = orderTotals(cartLines, 0);
        // cart margin: 100000 - 80000 = 20000 (20%)
        expect(currentTotals.marginPct).toBe(20);

        const suggestions = rankSuggestions(cartLines, rules, products);
        const mouseDelta = suggestions[0];

        // simulated mouse margin standalone: 2000 - 1000 = 1000.
        // new order margin amount = 21000. new subtotal = 102000.
        // new order margin pct = (21000 / 102000) * 100 = 20.588...

        const expectedNewPct = (21000 / 102000) * 100;
        const expectedPctDelta = expectedNewPct - 20;

        expect(mouseDelta.marginDeltaPaise).toBe(1000); // 1000 rupees added to raw margin
        expect(Math.abs(mouseDelta.marginPercentDelta - expectedPctDelta)).toBeLessThan(0.0001);
        expect(Math.abs(mouseDelta.newOrderMarginPercent - expectedNewPct)).toBeLessThan(0.0001);
    });
});
