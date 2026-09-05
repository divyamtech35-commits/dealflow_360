import { pctOf, subMoney, applyPct, addMoney } from '../utils/money';

export const resolveUnitPrice = (product: any, priceListRules: any, variant?: any): number => {
    let price = product.basePrice;
    if (!priceListRules) return price;

    const pRule = priceListRules.find((r: any) => r.productId === product._id);
    if (pRule) return pRule.priceOverride ? pRule.priceOverride : pctOf(price, 100 - pRule.discountPct);

    const cRule = priceListRules.find((r: any) => r.categoryId === product.categoryId);
    if (cRule) return pctOf(price, 100 - cRule.discountPct);

    return price;
};

export const lineAmounts = (line: any) => {
    const gross = line.unitPrice * line.quantity;
    const discountAmount = pctOf(gross, line.discountPct || 0);
    const net = subMoney(gross, discountAmount);
    const tax = pctOf(net, line.taxPct || 0);
    const margin = subMoney(net, line.costPrice * line.quantity);

    return { gross, discountAmount, net, tax, margin };
};

export const orderTotals = (lines: any[], orderDiscountPct: number) => {
    const lineSummary = lines.map(lineAmounts);
    const subtotal = lineSummary.reduce((sum, l) => addMoney(sum, l.net), 0);
    const orderDiscountAmount = pctOf(subtotal, orderDiscountPct);
    const discountTotal = lineSummary.reduce((sum, l) => addMoney(sum, l.discountAmount), 0) + orderDiscountAmount;

    const finalSubtotal = subMoney(subtotal, orderDiscountAmount);
    const taxTotal = lineSummary.reduce((sum, l) => addMoney(sum, l.tax), 0);
    const grandTotal = addMoney(finalSubtotal, taxTotal);

    const totalCost = lines.reduce((sum, l) => addMoney(sum, l.costPrice * l.quantity), 0);
    const marginAmount = subMoney(finalSubtotal, totalCost);
    const marginPct = finalSubtotal > 0 ? (marginAmount / finalSubtotal) * 100 : 0;

    return { subtotal, discountTotal, taxTotal, grandTotal, marginAmount, marginPct };
};
