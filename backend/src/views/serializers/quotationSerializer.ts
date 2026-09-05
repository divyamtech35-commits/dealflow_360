import { formatINR } from '../../utils/money';

export const serializeQuotation = (q: any, lines?: any[]) => {
    const base = {
        id: q._id,
        quotationNumber: q.quotationNumber,
        customerId: q.customerId?._id || q.customerId,
        customerName: q.customerId?.name || 'Unknown',
        customerTierSnapshot: {
            ...q.customerTierSnapshot,
            tier: q.customerId?.tier?.name || (typeof q.customerTierSnapshot?.tier === 'string' && q.customerTierSnapshot.tier.length !== 24 ? q.customerTierSnapshot.tier : 'Unknown')
        },
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
        marginPct: q.marginPct || 0,
        orderDiscountPercent: q.orderDiscountPercent,
        riskScore: q.riskScore || 0,
        requiredApprovalSteps: q.requiredApprovalSteps || [],
        lastActivityAt: q.lastActivityAt
    };

    if (lines) {
        let violationCount = 0;
        (base as any).lines = lines.map((l: any) => {
            if (l.isViolation) violationCount++;
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
                costPrice: l.costPrice || 0,
                unitPriceFormatted: formatINR(l.unitPrice),
                unitPriceFormatted: formatINR(l.unitPrice),
                lineTotal,
                lineTotalFormatted: formatINR(lineTotal),

                // Risk
                overagePercent: l.overagePercent || 0,
                isViolation: !!l.isViolation,
                allowedPercent: l.discountPercent - (l.overagePercent || 0) // Derived for UI display (given - overage)
            };
        });
        (base as any).violationCount = violationCount;
    }

    return base;
};
