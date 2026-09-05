export const serializePortalQuotation = (quotation: any) => {
    // We deep clone or cherry pick. Cherry picking is safer.
    // The prompt dictates what MUST be stripped:
    // costPriceSnapshot, marginAmount, marginPercent, riskScore, requiredApprovalSteps, approvals, salesRepId, and all audit data.

    const safeQuote = {
        id: quotation._id?.toString() || quotation.id,
        quotationNumber: quotation.quotationNumber,
        status: quotation.status,
        subtotal: quotation.subtotal,
        discountAmount: quotation.discountAmount,
        taxAmount: quotation.taxAmount,
        totalAmount: quotation.totalAmount,
        orderDiscountPercent: quotation.orderDiscountPercent,
        currency: quotation.currency,
        notes: quotation.notes,
        validUntil: quotation.validUntil,
        createdAt: quotation.createdAt,
        updatedAt: quotation.updatedAt,

        // Lines
        lines: (quotation.lines || []).map((line: any) => ({
            id: line._id?.toString() || line.id,
            productId: line.productId,
            productName: line.productName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent,
            lineTotal: line.lineTotal
        }))
    };

    return safeQuote;
};
