import { formatINR } from '../../utils/money';

export const serializeQuotation = (q: any, lines?: any[]) => {
    const base = {
        id: q._id,
        quotationNumber: q.quotationNumber,
        customerId: q.customerId,
        customerName: q.customerId?.name || 'Unknown',
        status: q.status,
        subtotal: q.subtotal,
        subtotalFormatted: formatINR(q.subtotal),
        discountAmount: q.discountAmount,
        discountFormatted: formatINR(q.discountAmount),
        taxAmount: q.taxAmount,
        taxFormatted: formatINR(q.taxAmount),
        totalAmount: q.totalAmount,
        totalFormatted: formatINR(q.totalAmount),
        marginAmount: q.marginAmount,
        marginFormatted: formatINR(q.marginAmount),
        marginPct: q.marginPct,
        orderDiscountPercent: q.orderDiscountPercent,
        riskScore: q.riskScore,
        lastActivityAt: q.lastActivityAt
    };

    if (lines) {
        (base as any).lines = lines.map((l: any) => {
            const gross = l.unitPrice * l.quantity;
            const discount = Math.round((gross * l.discountPercent) / 100);
            const lineTotal = gross - discount;
            return {
                id: l._id,
                productId: l.productId,
                productName: l.productName,
                sku: l.sku,
                category: l.category,
                quantity: l.quantity,
                discountPercent: l.discountPercent,
                unitPrice: l.unitPrice,
                unitPriceFormatted: formatINR(l.unitPrice),
                lineTotal,
                lineTotalFormatted: formatINR(lineTotal)
            };
        });
    }

    return base;
};
