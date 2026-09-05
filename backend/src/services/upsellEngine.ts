import { orderTotals } from './pricingEngine';

export interface SuggestionResult {
    product: any;
    reason: string;
    coPurchaseScore: number;
    isPromoted: boolean;
    marginDeltaPaise: number;
    marginPercentDelta: number;
    newOrderMarginPercent: number;
    rankScore: number;
}

export const rankSuggestions = (
    cartLines: any[],
    rules: any[],
    products: any[],
    orderDiscountPct: number = 0
): SuggestionResult[] => {
    const currentTotals = orderTotals(cartLines, orderDiscountPct);
    const cartProductIds = new Set(cartLines.map(l => String(l.productId)));

    const rawSuggestions: SuggestionResult[] = [];

    for (const rule of rules) {
        if (cartProductIds.has(String(rule.triggerProductId)) && !cartProductIds.has(String(rule.suggestedProductId))) {
            const suggestedProd = products.find(p => String(p._id) === String(rule.suggestedProductId));
            if (!suggestedProd) continue;

            const simulatedLine = {
                productId: suggestedProd._id,
                quantity: 1,
                unitPrice: suggestedProd.basePrice,
                costPrice: suggestedProd.costPrice,
                discountPct: 0,
                taxPct: suggestedProd.taxPercent || 0
            };

            const ownMarginPct = suggestedProd.basePrice > 0
                ? ((suggestedProd.basePrice - suggestedProd.costPrice) / suggestedProd.basePrice) * 100
                : 0;

            if (ownMarginPct < rule.minMarginPercent) {
                continue;
            }

            const simulatedCart = [...cartLines, simulatedLine];
            const newTotals = orderTotals(simulatedCart, orderDiscountPct);

            const marginDeltaPaise = newTotals.marginAmount - currentTotals.marginAmount;
            const marginPercentDelta = newTotals.marginPct - currentTotals.marginPct;
            const rankScore = rule.coPurchaseScore * (suggestedProd.isPromoted ? 1.5 : 1.0);

            rawSuggestions.push({
                product: suggestedProd,
                reason: rule.reason,
                coPurchaseScore: rule.coPurchaseScore,
                isPromoted: !!suggestedProd.isPromoted,
                marginDeltaPaise,
                marginPercentDelta,
                newOrderMarginPercent: newTotals.marginPct,
                rankScore
            });
        }
    }

    const dedup = new Map<string, SuggestionResult>();
    for (const sug of rawSuggestions) {
        const existing = dedup.get(String(sug.product._id));
        if (!existing || sug.rankScore > existing.rankScore) {
            dedup.set(String(sug.product._id), sug);
        }
    }

    return Array.from(dedup.values())
        .sort((a, b) => b.rankScore - a.rankScore)
        .slice(0, 5);
};
