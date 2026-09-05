import { Quotation } from '../models/Quotation';
import { QuotationLine } from '../models/QuotationLine';
import { orderTotals } from './pricingEngine';
import { computeBlendedScore, resolveApprovalSteps } from './riskEngine';
import { DiscountRule } from '../models/DiscountRule';
import { Policy } from '../models/Policy';

export const recalculateQuotation = async (quotationId: string) => {
    const quote = await Quotation.findById(quotationId).populate('customerId');
    if (!quote) throw new Error('Quotation not found');

    const rawLines = await QuotationLine.find({ quotationId });
    const mappedLines = rawLines.map(l => ({
        unitPrice: l.unitPrice,
        quantity: l.quantity,
        discountPct: l.discountPercent,
        costPrice: l.costPrice,
        taxPct: l.taxPercent
    }));

    const totals = orderTotals(mappedLines, quote.orderDiscountPercent || 0);

    // Risk Integration
    const rules = await DiscountRule.find({});
    let policy = await Policy.findOne();
    if (!policy) policy = { blendedWeight: 0.6, worstWeight: 0.4 } as any;

    // Use customerTierSnapshot if available, else fetch current tier (mostly it should be in snapshot)
    const tier = quote.customerTierSnapshot || (quote.customerId ? { tier: (quote.customerId as any).tier } : null);

    const riskRes = computeBlendedScore(rawLines, rules, tier, policy);

    // Mock static approval chain per Phase requirements. (In real system, read from ApprovalChain config)
    const approvalChain = [
        { role: 'SALES_MANAGER', threshold: 1 },
        { role: 'FINANCE', threshold: 10 }
    ];
    const reqSteps = resolveApprovalSteps(riskRes.riskScore, approvalChain);

    // Update Quotation Fields
    quote.subtotal = totals.subtotal;
    quote.discountAmount = totals.discountTotal;
    quote.taxAmount = totals.taxTotal;
    quote.totalAmount = totals.grandTotal;
    quote.marginAmount = totals.marginAmount;
    quote.marginPct = totals.marginPct;
    quote.riskScore = riskRes.riskScore;
    quote.requiredApprovalSteps = reqSteps;
    quote.lastActivityAt = new Date();

    await quote.save();

    // Save per-line risk data
    for (let i = 0; i < rawLines.length; i++) {
        const lineRisk = riskRes.lineRisks[i];
        await QuotationLine.findByIdAndUpdate(rawLines[i]._id, {
            overagePercent: lineRisk.overagePercent,
            isViolation: lineRisk.isViolation
        });
    }

    return await Quotation.findById(quotationId).populate('customerId');
};
