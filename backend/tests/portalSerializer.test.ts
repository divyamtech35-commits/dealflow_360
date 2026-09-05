import { serializePortalQuotation } from '../src/views/serializers/portalQuotationSerializer';

describe('Portal Quotation Serializer Security', () => {
    it('strips all internal metrics and identifiers from the payload', () => {
        const sensitiveQuote = {
            _id: 'quote123',
            quotationNumber: 'QT-1001',
            status: 'SENT',
            salesRepId: 'rep123', // should strip
            riskScore: 25, // should strip
            marginAmount: 500, // should strip
            marginPercent: 0.25, // should strip
            requiredApprovalSteps: ['MANAGER'], // should strip
            approvals: [{ role: 'MANAGER', status: 'APPROVED' }], // should strip
            auditData: { history: [] }, // should strip

            subtotal: 2000,
            discountAmount: 0,
            taxAmount: 200,
            totalAmount: 2200,
            orderDiscountPercent: 0,
            currency: 'USD',

            lines: [
                {
                    _id: 'line1',
                    productId: 'prod1',
                    productName: 'Server',
                    quantity: 1,
                    unitPrice: 2000,
                    costPriceSnapshot: 1500, // should strip
                    discountPercent: 0,
                    lineTotal: 2000
                }
            ]
        };

        const serialized = serializePortalQuotation(sensitiveQuote);

        // Generic recursive checker to ensure the keys DO NOT EXIST anywhere
        const traverseAndCheck = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;

            const forbiddenKeys = [
                'costPriceSnapshot', 'marginAmount', 'marginPercent', 'marginPct',
                'riskScore', 'requiredApprovalSteps', 'approvals', 'salesRepId', 'auditData'
            ];

            for (const key of Object.keys(obj)) {
                expect(forbiddenKeys).not.toContain(key);
                traverseAndCheck(obj[key]);
            }
        };

        traverseAndCheck(serialized);

        // Positive assertions
        expect(serialized.id).toBe('quote123');
        expect(serialized.subtotal).toBe(2000);
        expect(serialized.lines[0].id).toBe('line1');
        expect(serialized.lines[0].unitPrice).toBe(2000);

        // Explicitly ensuring they are undefined
        expect((serialized as any).salesRepId).toBeUndefined();
        expect((serialized as any).riskScore).toBeUndefined();
        expect((serialized.lines[0] as any).costPriceSnapshot).toBeUndefined();
    });
});
