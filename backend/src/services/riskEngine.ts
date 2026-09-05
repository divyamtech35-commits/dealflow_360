export interface LineRisk {
    allowedPercent: number;
    givenPercent: number;
    overagePercent: number;
    lineNet: number;
    isViolation: boolean;
    explanation?: string;
}

// Ensure the structure maps: line -> category, line -> discountPercent
export const computeLineRisk = (line: any, discountRules: any[], customerTier: any): LineRisk => {
    let tierCeiling = 100;
    let categoryCeiling = 100;

    if (customerTier && customerTier.tier) {
        const tRule = discountRules.find(r => r.tier === customerTier.tier);
        if (tRule && tRule.maxDiscountPercent) tierCeiling = tRule.maxDiscountPercent;
    }

    const cRule = discountRules.find(r => r.category === line.category); // Assuming strict category matching
    if (cRule && cRule.defaultDiscountLimit) categoryCeiling = cRule.defaultDiscountLimit;

    // STRICTER of tier ceiling and category ceiling
    const allowedPercent = Math.min(tierCeiling, categoryCeiling);
    const givenPercent = line.discountPercent || 0;

    const overagePercent = Math.max(0, givenPercent - allowedPercent);
    const isViolation = overagePercent > 0;

    const gross = line.unitPrice * line.quantity;
    const lineNet = gross - (gross * givenPercent / 100);

    let explanation = '';
    if (isViolation) {
        explanation = `${line.productName}: ${givenPercent}% given vs ${allowedPercent}% allowed (+${overagePercent.toFixed(1)})`;
    }

    return { allowedPercent, givenPercent, overagePercent, lineNet, isViolation, explanation };
};

export const computeBlendedScore = (lines: any[], discountRules: any[], customerTier: any, policy: any) => {
    const lineRisks = lines.map(l => computeLineRisk(l, discountRules, customerTier));

    const worstLineOverage = lineRisks.reduce((max, lr) => Math.max(max, lr.overagePercent), 0);

    let totalNet = 0;
    let weightedOverageSum = 0;
    let violationCount = 0;
    const explanations: string[] = [];

    for (const lr of lineRisks) {
        totalNet += lr.lineNet;
        weightedOverageSum += (lr.overagePercent * lr.lineNet);
        if (lr.isViolation) {
            violationCount++;
            if (lr.explanation) explanations.push(lr.explanation);
        }
    }

    const weightedBlendedOverage = totalNet > 0 ? (weightedOverageSum / totalNet) : 0;

    // Weights based on active policy doc
    const bWeight = policy && policy.blendedWeight !== undefined ? policy.blendedWeight : 0.6;
    const wWeight = policy && policy.worstWeight !== undefined ? policy.worstWeight : 0.4;

    const riskScore = Math.round((bWeight * weightedBlendedOverage + wWeight * worstLineOverage) * 10) / 10;

    return { lineRisks, worstLineOverage, weightedBlendedOverage, riskScore, violationCount, explanation: explanations };
};

export const resolveApprovalSteps = (riskScore: number, approvalChain: any[]): string[] => {
    // Sort chain by threshold ascending to determine steps properly
    const sorted = [...approvalChain].sort((a, b) => a.threshold - b.threshold);
    const steps: string[] = [];

    for (const step of sorted) {
        if (riskScore >= step.threshold) {
            steps.push(step.role);
        }
    }

    // Deduplicate array
    return Array.from(new Set(steps));
};
