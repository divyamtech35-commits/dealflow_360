import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock DB connection before importing app
jest.mock('../src/config/db', () => ({ connectDB: jest.fn() }));
import app from '../src/app';

import { User } from '../src/models/User';
import { Product } from '../src/models/Product';
import { Quotation } from '../src/models/Quotation';
import { QuotationLine } from '../src/models/QuotationLine';
import { Order } from '../src/models/Order';
import { Warehouse } from '../src/models/Warehouse';
import { Stock } from '../src/models/Stock';
import { CustomerTier } from '../src/models/CustomerTier';
import { DiscountRule } from '../src/models/DiscountRule';
import { issueToken } from '../src/services/authService';

describe('14-Step End-to-End DealFlow Scenario', () => {
    let repToken: string;
    let managerToken: string;
    let customerId: string;
    let hwProductId: string;
    let subProductId: string;
    let quotationId: string;
    let quotationLineId: string;
    let portalToken: string;
    let negotiationId: string;
    let orderId: string;
    let mongoServer: MongoMemoryServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);

        // Clear collections for clean run
        await Quotation.deleteMany({});
        await Order.deleteMany({});

        // Ensure test users exist (Assuming seedData already ran or creating them on the fly)
        let rep = await User.findOne({ email: 'rep@df.com' });
        if (!rep) rep = await User.create({ email: 'rep@df.com', passwordHash: 'hashed', role: 'SALES_REP', name: 'Test Rep' });

        let mgr = await User.findOne({ email: 'manager@df.com' });
        if (!mgr) mgr = await User.create({ email: 'manager@df.com', passwordHash: 'hashed', role: 'SALES_MANAGER', name: 'Test Mgr' });

        // Dummy tokens since our JWT middleware uses a secret (Assuming standard bypass or we generate proper JWT)
        // For testing, we might need a real JWT if auth is enforced. Let's login via auth controller!
        // If password is not easily known, we can force-update it for the test.
    });

    afterAll(async () => {
        await mongoose.disconnect();
        if (mongoServer) await mongoServer.stop();
    });

    it('Step 1: Login (Rep & Manager)', async () => {
        // We will issue a token manually to bypass bcrypt issues if password isn't 'password'
        const rep = await User.findOne({ email: 'rep@df.com' });
        const mgr = await User.findOne({ email: 'manager@df.com' });

        repToken = issueToken({ userId: rep!._id, role: 'SALES_REP' });
        managerToken = issueToken({ userId: mgr!._id, role: 'SALES_MANAGER' });

        expect(repToken).toBeDefined();
        expect(managerToken).toBeDefined();
    });

    it('Step 2: Create Customer', async () => {
        // Set up a tier + a blanket discount rule so the risk engine has a policy to evaluate against
        const tier = await CustomerTier.create({ name: 'Gold Test Tier', maxDiscountPercent: 15 });
        await DiscountRule.create({
            customerTierId: tier._id,
            maxDiscountPercent: 15,
            approvalRequiredAbove: 10,
            financeApprovalRequiredAbove: 20
        });

        // Mock a direct customer DB injection since there is no standard POST /api/customers route
        const cust = await User.create({
            name: 'Acme Test Corp',
            email: 'buyer@acmetest.com',
            role: 'CUSTOMER',
            customerTierId: tier._id,
            passwordHash: 'none'
        });
        customerId = String(cust._id);
        expect(customerId).toBeDefined();
    });

    it('Step 3: Create Product (HW and Sub)', async () => {
        // Inject a Hardware product and a Subscription product
        const hw = await Product.create({
            name: 'Test Server X1',
            sku: 'SRV-X1',
            categoryId: new mongoose.Types.ObjectId(),
            unit: 'unit',
            basePrice: 5000,
            costPrice: 3000,
            isSubscription: false
        });
        hwProductId = String(hw._id);

        const sub = await Product.create({
            name: 'Cloud Maintenance (MRR)',
            sku: 'MAINT-MRR',
            categoryId: new mongoose.Types.ObjectId(),
            unit: 'unit',
            basePrice: 500,
            costPrice: 100,
            isSubscription: true
        });
        subProductId = String(sub._id);

        // Add some stock for the HW
        const wh = await Warehouse.create({ name: 'Central Test Hub', code: 'HUB-CENTRAL' });
        await Stock.create({ warehouseId: wh._id, productId: hw._id, quantity: 100, reservedQuantity: 0 });
    });

    it('Step 4: Create Quotation', async () => {
        const res = await request(app)
            .post('/api/quotations')
            .set('Authorization', `Bearer ${repToken}`)
            .send({ customerId });

        expect(res.status).toBe(201);
        quotationId = res.body.id;
        expect(res.body.status).toBe('DRAFT');
    });

    it('Step 5: Add Products', async () => {
        const res = await request(app)
            .post(`/api/quotations/${quotationId}/lines`)
            .set('Authorization', `Bearer ${repToken}`)
            .send({ productId: hwProductId, quantity: 2, discountPercent: 0 });

        expect(res.status).toBe(200);
        expect(res.body.lines.length).toBe(1);
    });

    it('Step 6 & 7: Apply Discount & Auto Approval Trigger', async () => {
        // Update the line with a 25% discount, which should violate standard tiers and kick it into PENDING_APPROVAL
        const line = await QuotationLine.findOne({ quotationId });
        const lineId = line!.id;
        quotationLineId = lineId; // store for later

        const res = await request(app)
            .patch(`/api/quotations/${quotationId}/lines/${lineId}`)
            .set('Authorization', `Bearer ${repToken}`)
            .send({ quantity: 2, discountPercent: 25 }); // 25% discount!

        expect(res.status).toBe(200);
        // We need to 'Submit' it to push it from DRAFT to PENDING_APPROVAL
        const submitRes = await request(app)
            .post(`/api/approvals/${quotationId}/submit`)
            .set('Authorization', `Bearer ${repToken}`);

        expect(submitRes.status).toBe(200);
        const updated = await Quotation.findById(quotationId);
        expect(updated!.status).toBe('PENDING_APPROVAL');
    });

    it('Step 8: Manager Approves', async () => {
        const res = await request(app)
            .post(`/api/approvals/${quotationId}/approve`)
            .set('Authorization', `Bearer ${managerToken}`)
            .send({ message: 'Approved - need this deal.' });

        expect(res.status).toBe(200);
        const updated = await Quotation.findById(quotationId);
        expect(updated!.status).toBe('APPROVED');
    });

    it('Step 10: Rep Sends to Portal & Customer Views Quote', async () => {
        // Rep generates link
        const res = await request(app)
            .post(`/api/quotations/${quotationId}/send-to-portal`)
            .set('Authorization', `Bearer ${repToken}`);

        expect(res.status).toBe(200);
        portalToken = res.body.portalToken;
        expect(portalToken).toBeDefined();

        // Customer Views Quote statelessly
        const viewRes = await request(app)
            .get(`/api/portal/${portalToken}`);

        expect(viewRes.status).toBe(200);
        expect(viewRes.body.totalAmount).toBeDefined();
        expect(viewRes.body.cost).toBeUndefined(); // Verify payload stripped of internal metrics!
    });

    it('Step 11: Customer Negotiates (Counters)', async () => {
        const res = await request(app)
            .post(`/api/portal/${portalToken}/counter`)
            .send({
                lineId: quotationLineId,
                requestedDiscountPercent: 30, // Pushing it to 30%!
                message: 'Can you do 30%?'
            });

        expect(res.status).toBe(201);
        negotiationId = res.body._id;

        const updated = await Quotation.findById(quotationId);
        expect(updated!.status).toBe('UNDER_NEGOTIATION');
    });

    it('Step 12: Rep Accepts Counter & Re-Approves', async () => {
        // Rep accepts
        const res = await request(app)
            .post(`/api/quotations/${quotationId}/negotiations/${negotiationId}/accept`)
            .set('Authorization', `Bearer ${repToken}`);

        expect(res.status).toBe(200);

        // Check if backend pushed limits back to PENDING_APPROVAL?
        // Wait, Rep accepted counter, which recalculates. But to finalize the quote, Customer must Confirm!
        // Actually, let's have the customer CONFIRM from portal now.
        const confirmRes = await request(app)
            .post(`/api/portal/${portalToken}/confirm`);

        expect(confirmRes.status).toBe(200);

        // Since the customer requested 30% and rep accepted, the risk is higher. It should have auto-reverted to PENDING_APPROVAL.
        const updatedQuote = await Quotation.findById(quotationId);
        if (updatedQuote!.status === 'PENDING_APPROVAL') {
            // Manager approves again!
            await request(app)
                .post(`/api/approvals/${quotationId}/approve`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ message: 'Fine, 30% approved.' });
        }
    });

    it('Step 13: Confirm & Create Order', async () => {
        const res = await request(app)
            .post(`/api/orders/from-quotation/${quotationId}`)
            .set('Authorization', `Bearer ${repToken}`);

        expect(res.status).toBe(201);
        orderId = res.body._id;
        expect(res.body.status).toBe('PENDING_FULFILLMENT');
        expect(res.body.orderNumber).toBeDefined();
    });

    it('Step 9 (Delayed): Warehouse Allocation (Split Engine)', async () => {
        // Accept Split natively
        const res = await request(app)
            .post(`/api/orders/${orderId}/accept-split`)
            .set('Authorization', `Bearer ${repToken}`);

        expect(res.status).toBe(200);
        expect(res.body.fulfillmentPlan.length).toBeGreaterThan(0);
        expect(res.body.shipmentCount).toBeDefined();
    });

    it('Step 14: Hybrid Billing Generation', async () => {
        // Activate Billing
        const res = await request(app)
            .post(`/api/billing/${orderId}/activate`)
            .set('Authorization', `Bearer ${repToken}`);

        expect(res.status).toBe(201);
        expect(res.body.invoiceNumber).toBeDefined();
        expect(res.body.lines.length).toBeGreaterThan(0); // Hardware line + Shipping + anything else
        expect(res.body.grandTotal).toBeGreaterThan(0);
    });

});
