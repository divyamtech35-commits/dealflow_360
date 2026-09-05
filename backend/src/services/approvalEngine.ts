export interface ApprovalStep {
    role: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export const initApprovalSteps = (riskScore: number, requiredRoles: string[]): ApprovalStep[] => {
    return requiredRoles.map(role => ({
        role,
        status: 'PENDING'
    }));
};

export const canAct = (quotation: any, user: any): boolean => {
    if (quotation.salesRepId.toString() === user._id.toString()) return false;

    if (quotation.status !== 'PENDING_APPROVAL') return false;

    const currentStep = quotation.requiredApprovalSteps?.find((s: ApprovalStep) => s.status === 'PENDING');
    if (!currentStep) return false;

    return currentStep.role === user.role;
};

export const advance = (
    quotation: any,
    action: 'APPROVE' | 'REJECT' | 'RETURN',
    user: any,
    reason: string
) => {
    if (!canAct(quotation, user)) {
        throw new Error('User cannot act on this quotation at this time.');
    }

    const steps = [...quotation.requiredApprovalSteps];
    const stepIndex = steps.findIndex((s: ApprovalStep) => s.status === 'PENDING');

    if (stepIndex === -1) throw new Error('No pending steps found.');

    if (action === 'REJECT') {
        steps[stepIndex].status = 'REJECTED';
        return { steps, nextStatus: 'REJECTED' };
    }

    if (action === 'RETURN') {
        const resetSteps = steps.map(s => ({ ...s, status: 'PENDING' as const }));
        return { steps: resetSteps, nextStatus: 'DRAFT' };
    }

    if (action === 'APPROVE') {
        steps[stepIndex].status = 'APPROVED';
        const hasMore = steps.some((s: ApprovalStep) => s.status === 'PENDING');
        if (hasMore) return { steps, nextStatus: 'PENDING_APPROVAL' };
        else return { steps, nextStatus: 'APPROVED' };
    }

    return { steps, nextStatus: quotation.status };
};
