import { Quotation } from '../models/Quotation';
import { QuotationLine } from '../models/QuotationLine';
import { orderTotals } from './pricingEngine';
import { computeBlendedScore, resolveApprovalSteps } from './riskEngine';
import { DiscountRule } from '../models/DiscountRule';
import { Policy } from '../models/Policy';
import { Category } from '../models/Category';
import { CustomerTier } from '../models/CustomerTier';

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
    const categories = await Category.find({});
    let policy = await Policy.findOne();
    if (!policy) policy = { blendedWeight: 0.6, worstWeight: 0.4 } as any;

    let tier = null;
    if (quote.customerId) {
        const user: any = quote.customerId; // Populated in some contexts, but let's fetch strictly
        if (user.tier) {
            tier = await CustomerTier.findById(user.tier);
        }
    }
    
    // Fallback if not found
    if (!tier && quote.customerTierSnapshot) {
        tier = quote.customerTierSnapshot;
    }

    const riskRes = computeBlendedScore(rawLines, rules, tier, policy, categories);
    
    // Add margin risk
    let finalRiskScore = riskRes.riskScore;
    if (totals.marginPct < 35 && totals.subtotal > 0) {
        const marginRiskPts = Math.round((35 - totals.marginPct) * 2);
        finalRiskScore += marginRiskPts;
        riskRes.explanation.push(`Gross margin is ${totals.marginPct.toFixed(1)}% (below 35% target) (+${marginRiskPts} risk pts)`);
    }

    // Mock static approval chain per Phase requirements. (In real system, read from ApprovalChain config)
    const approvalChain = [
        { role: 'SALES_MANAGER', threshold: 20 },
        { role: 'FINANCE', threshold: 50 }
    ];
    const reqSteps = resolveApprovalSteps(finalRiskScore, approvalChain);

    // Update Quotation Fields
    quote.subtotal = totals.subtotal;
    quote.discountAmount = totals.discountTotal;
    quote.taxAmount = totals.taxTotal;
    quote.totalAmount = totals.grandTotal;
    quote.marginAmount = totals.marginAmount;
    quote.marginPct = totals.marginPct;
    quote.riskScore = finalRiskScore;
    quote.requiredApprovalSteps = reqSteps.map((role: string) => ({ role, status: 'PENDING' }));
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
