export interface ProrationInput {
    oldQuantity: number;
    newQuantity: number;
    oldUnitPrice: number;
    newUnitPrice: number;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    changeDate: Date;
}

export interface ProrationAdjustment {
    remainingDays: number;
    totalBillingDays: number;
    oldPeriodValue: number;
    newPeriodValue: number;
    adjustmentAmount: number;
}

export class ProrationService {
    static calculateAdjustment(input: ProrationInput): ProrationAdjustment {
        const msInDay = 1000 * 60 * 60 * 24;

        const totalBillingDays = Math.max(1, Math.round((input.billingPeriodEnd.getTime() - input.billingPeriodStart.getTime()) / msInDay));
        const remainingDays = Math.max(0, Math.round((input.billingPeriodEnd.getTime() - input.changeDate.getTime()) / msInDay));
        
        const prorationRatio = Math.min(1.0, remainingDays / totalBillingDays);

        const oldPeriodValue = input.oldUnitPrice * input.oldQuantity;
        const newPeriodValue = input.newUnitPrice * input.newQuantity;

        // The adjustment is the difference in value for the remaining days
        const oldRemainingValue = oldPeriodValue * prorationRatio;
        const newRemainingValue = newPeriodValue * prorationRatio;

        const adjustmentAmount = newRemainingValue - oldRemainingValue;

        return {
            remainingDays,
            totalBillingDays,
            oldPeriodValue,
            newPeriodValue,
            adjustmentAmount: Number(adjustmentAmount.toFixed(2))
        };
    }
}
