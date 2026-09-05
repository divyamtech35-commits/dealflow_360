export interface SubscriptionInput {
    id: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
}

export interface BillingPeriod {
    start: Date;
    end: Date;
}

export interface ProrationResult {
    lines: {
        productName: string;
        description: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        isRecurring: boolean;
        periodStart?: Date;
        periodEnd?: Date;
    }[];
    recurringSubtotal: number;
}

export interface InvoiceInputLine {
    productName: string;
    quantity: number;
    unitPrice: number;
    isRecurring: boolean;
    periodStart?: Date;
    periodEnd?: Date;
    description?: string;
}

export interface InvoiceGenerationResult {
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    lines: InvoiceInputLine[];
}

/**
 * Calculates the prorated amount for a subscription starting mid-cycle.
 * The prorated amount is calculated based on days remaining in the current billing cycle.
 */
export const calculateProration = (
    sub: SubscriptionInput,
    activationDate: Date,
    cycleDateLimit: Date // Evaluated end of cycle, for a monthly sub could be 1st of next month
): ProrationResult => {

    const msInDay = 1000 * 60 * 60 * 24;

    // Find absolute boundaries of the current conceptual cycle the activation falls into
    let cycleStart = new Date(cycleDateLimit);
    if (sub.billingCycle === 'MONTHLY') cycleStart.setMonth(cycleStart.getMonth() - 1);
    else if (sub.billingCycle === 'QUARTERLY') cycleStart.setMonth(cycleStart.getMonth() - 3);
    else if (sub.billingCycle === 'YEARLY') cycleStart.setFullYear(cycleStart.getFullYear() - 1);
    else cycleStart = new Date(activationDate);

    // Number of days in the current cycle
    const cycleDays = Math.max(1, Math.round((cycleDateLimit.getTime() - cycleStart.getTime()) / msInDay));

    // Number of days they actually used
    const activeDays = Math.max(0, Math.round((cycleDateLimit.getTime() - activationDate.getTime()) / msInDay));

    // Monthly / Cycle Rate
    let cycleRate = sub.unitPrice;

    // We expect unit price to strictly equal the CYCLE price.
    const prorationRatio = Math.min(1.0, activeDays / cycleDays);

    const proratedTotal = cycleRate * sub.quantity * prorationRatio;

    return {
        lines: [
            {
                productName: sub.productName,
                description: `Prorated charge (${activeDays} days remaining of ${cycleDays} day cycle)`,
                quantity: sub.quantity,
                unitPrice: cycleRate * prorationRatio,
                lineTotal: Number(proratedTotal.toFixed(2)),
                isRecurring: true,
                periodStart: activationDate,
                periodEnd: cycleDateLimit
            }
        ],
        recurringSubtotal: Number(proratedTotal.toFixed(2))
    };
};

/**
 * Generates summary for a hybrid invoice incorporating one-off lines (hardware/service)
 * and recurring lines (subscriptions with prorations).
 * Applies a blanket 10% tax for the hackathon logic.
 */
export const generateInvoice = (lines: InvoiceInputLine[], taxRatePercent: number = 10.0): InvoiceGenerationResult => {
    let subtotal = 0;

    const formattedLines = lines.map(line => {
        const lineTotal = Number((line.unitPrice * line.quantity).toFixed(2));
        subtotal += lineTotal;
        return {
            ...line,
            lineTotal,
            description: line.description || ''
        };
    });

    subtotal = Number(subtotal.toFixed(2));
    const taxTotal = Number((subtotal * (taxRatePercent / 100)).toFixed(2));
    const grandTotal = Number((subtotal + taxTotal).toFixed(2));

    return {
        subtotal,
        taxTotal,
        grandTotal,
        lines: formattedLines
    };
};
