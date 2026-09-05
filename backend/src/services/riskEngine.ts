export interface LineRisk {
    allowedPercent: number;
    givenPercent: number;
    overagePercent: number;
    lineNet: number;
    isViolation: boolean;
    explanation?: string;
}

// Ensure the structure maps: line -> category, line -> discountPercent
export const computeLineRisk = (line: any, discountRules: any[], customerTier: any, categories: any[]): LineRisk => {
    let tierCeiling = 100;
    let categoryCeiling = 100;

    if (customerTier && customerTier._id) {
        const tRule = discountRules.find(r => r.customerTierId?.toString() === customerTier._id.toString());
        if (tRule && tRule.maxDiscountPercent) tierCeiling = tRule.maxDiscountPercent;
    }

    const cat = categories.find(c => c._id?.toString() === line.category || c.name === line.category);
    if (cat && cat.defaultDiscountLimit !== undefined) categoryCeiling = cat.defaultDiscountLimit;

    // STRICTER of tier ceiling and category ceiling
    const allowedPercent = Math.min(tierCeiling, categoryCeiling);
    const givenPercent = line.discountPercent || 0;

    const overagePercent = Math.max(0, givenPercent - allowedPercent);
    const isViolation = overagePercent > 0;

    const gross = line.unitPrice * line.quantity;
    const lineNet = gross - (gross * givenPercent / 100);

    let explanation = '';
    if (isViolation) {
        explanation = `Discount exceeds limit by ${overagePercent.toFixed(1)}% (+${(overagePercent * 4).toFixed(0)} risk pts)`;
    }

    return { allowedPercent, givenPercent, overagePercent, lineNet, isViolation, explanation };
};

export const computeBlendedScore = (lines: any[], discountRules: any[], customerTier: any, policy: any, categories: any[]) => {
    const lineRisks = lines.map(l => computeLineRisk(l, discountRules, customerTier, categories));

    let riskScore = 0;
    let violationCount = 0;
    const explanations: string[] = [];

    for (const lr of lineRisks) {
        if (lr.isViolation) {
            violationCount++;
            if (lr.explanation) explanations.push(lr.explanation);
            
            // Formula: 4 points per 1% overage
            riskScore += (lr.overagePercent * 4);
        }
    }

    // Add margin risk if margin is low (e.g., < 35%)
    // But margin is calculated at the order level. Let's return the base score and explanations, and we can add to it later.
    riskScore = Math.round(riskScore);

    return { lineRisks, riskScore, violationCount, explanation: explanations };
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
