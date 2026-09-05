import { calculateProration, generateInvoice, SubscriptionInput, InvoiceInputLine } from '../src/services/billingEngine';

describe('Billing Engine Proration', () => {

    it('calculates perfect 50% proration for a mid-month Monthly subscription', () => {
        const sub: SubscriptionInput = {
            id: 'sub123',
            productName: 'Cloud Standard',
            unitPrice: 100, // $100 / month
            quantity: 1,
            billingCycle: 'MONTHLY'
        };

        // April has 30 days.
        const activationDate = new Date('2024-04-16T00:00:00Z'); // 15 days active (16 to 30 = 15 days)
        const cycleEndDate = new Date('2024-05-01T00:00:00Z'); // 30 days total (April 1 to May 1)

        const proration = calculateProration(sub, activationDate, cycleEndDate);

        expect(proration.recurringSubtotal).toBe(50.00); // 15/30 = 0.5
        expect(proration.lines.length).toBe(1);
        expect(proration.lines[0].lineTotal).toBe(50.00);
        expect(proration.lines[0].description).toContain('15 days');
        expect(proration.lines[0].description).toContain('30 day');
    });

    it('calculates full amount if activation is exactly at start of cycle', () => {
        const sub: SubscriptionInput = {
            id: 'sub124',
            productName: 'CRM Yearly',
            unitPrice: 1200, // $1200 / year
            quantity: 2, // 2 users
            billingCycle: 'YEARLY'
        };

        // Leap year 2024 has 366 days
        const activationDate = new Date('2024-01-01T00:00:00Z');
        const cycleEndDate = new Date('2025-01-01T00:00:00Z');

        const proration = calculateProration(sub, activationDate, cycleEndDate);

        // 2 users * 1200 = 2400
        expect(proration.recurringSubtotal).toBe(2400.00);
    });

    it('calculates a 0 amount if activation is precisely on the cycle end limit (edge case)', () => {
        const sub: SubscriptionInput = {
            id: 'sub125',
            productName: 'Pro Service',
            unitPrice: 100,
            quantity: 1,
            billingCycle: 'MONTHLY'
        };

        const activationDate = new Date('2024-05-01T00:00:00Z');
        const cycleEndDate = new Date('2024-05-01T00:00:00Z');

        const proration = calculateProration(sub, activationDate, cycleEndDate);

        expect(proration.recurringSubtotal).toBe(0.00);
    });

});

describe('Invoice Generation via Hybrid Billing', () => {

    it('generates a mixed invoice with correct taxes and totals', () => {
        const lines: InvoiceInputLine[] = [
            { productName: 'Hardware Router', quantity: 2, unitPrice: 200, isRecurring: false }, // 400
            { productName: 'Setup Fee', quantity: 1, unitPrice: 150, isRecurring: false }, // 150
            { productName: 'Cloud Recurring (Prorated)', quantity: 1, unitPrice: 50, isRecurring: true } // 50
        ];

        // Subtotal = 600.
        // Tax (10%) = 60.
        // Grand = 660.

        const inv = generateInvoice(lines, 10.0);

        expect(inv.subtotal).toBe(600.00);
        expect(inv.taxTotal).toBe(60.00);
        expect(inv.grandTotal).toBe(660.00);
        expect(inv.lines.length).toBe(3);
    });

});
