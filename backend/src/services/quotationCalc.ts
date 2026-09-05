import { Quotation } from '../models/Quotation';
import { QuotationLine } from '../models/QuotationLine';
import { orderTotals } from './pricingEngine';

export const recalculateQuotation = async (quotationId: string) => {
    const quote = await Quotation.findById(quotationId);
    if (!quote) throw new Error('Quotation not found');

    const lines = await QuotationLine.find({ quotationId });
    const mappedLines = lines.map(l => ({
        unitPrice: l.unitPrice,
        quantity: l.quantity,
        discountPct: l.discountPercent,
        costPrice: l.costPrice,
        taxPct: l.taxPercent
    }));

    const totals = orderTotals(mappedLines, quote.orderDiscountPercent || 0);

    quote.subtotal = totals.subtotal;
    quote.discountAmount = totals.discountTotal;
    quote.taxAmount = totals.taxTotal;
    quote.totalAmount = totals.grandTotal;
    quote.marginAmount = totals.marginAmount;
    quote.marginPct = totals.marginPct;
    quote.lastActivityAt = new Date();

    return await quote.save();
};
