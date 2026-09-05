import { Request, Response, NextFunction } from 'express';
import { Negotiation } from '../models/Negotiation';
import { QuotationLine } from '../models/QuotationLine';
import { serializePortalQuotation } from '../views/serializers/portalQuotationSerializer';
import { recalculateQuotation } from '../services/quotationCalc';
import { logAudit } from '../services/auditService';
import { createOrderFromQuotation } from './order.controller';
import { Order } from '../models/Order';
import mongoose from 'mongoose';
import { Quotation } from '../models/Quotation';
import { ApiError } from '../utils/ApiError';

const getCustomerQuote = async (req: Request) => {
    const quote = await Quotation.findOne({
        _id: req.params.id,
        customerId: (req as any).user._id
    });
    if (!quote) throw new ApiError(404, 'Quotation not found');
    return quote;
};

export const getPortalDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customerId = (req as any).user._id;
        console.log('Customer Portal Dashboard requested for:', customerId);
        
        const quotations = await Quotation.find({
            customerId,
            status: { $in: ['APPROVED', 'UNDER_NEGOTIATION', 'CONFIRMED'] }
        }).sort({ createdAt: -1 });
        console.log('Found quotations:', quotations.length);

        const allUserQuotations = await Quotation.find({ customerId });
        console.log('Total quotes for this customer (ignoring status):', allUserQuotations.length);

        const orders = await Order.find({ customerId }).sort({ createdAt: -1 });

        res.json({
            quotations: quotations.map(q => serializePortalQuotation(q.toObject())),
            orders
        });
    } catch (e) {
        next(e);
    }
};

export const getPortalQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await getCustomerQuote(req);
        const lines = await QuotationLine.find({ quotationId: quote._id });
        const populatedQuote = { ...quote.toObject(), lines: lines.map(l => l.toObject()) };

        // Fetch Negotiations thread
        const negotiations = await Negotiation.find({ quotationId: quote._id }).sort({ createdAt: 1 });

        res.json({
            quotation: serializePortalQuotation(populatedQuote),
            negotiations
        });
    } catch (e) {
        next(e);
    }
};

export const postComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await getCustomerQuote(req);
        const { lineId, message } = req.body;

        const neg = await Negotiation.create({
            quotationId: quote._id,
            lineId: lineId || undefined,
            type: 'COMMENT',
            actorType: 'CUSTOMER',
            message,
            status: 'OPEN'
        });

        await logAudit({
            entityType: 'quotation', entityId: quote._id, entityRef: quote.quotationNumber,
            action: 'negotiation_comment', fromStatus: quote.status, toStatus: quote.status,
            actor: { id: quote.customerId.toString(), name: 'Customer', role: 'CUSTOMER', type: 'customer' },
            metadata: { message }
        });

        res.status(201).json(neg);
    } catch (e) {
        next(e);
    }
};

export const postCounter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await getCustomerQuote(req);
        const { lineId, requestedDiscountPercent, message } = req.body;

        const neg = await Negotiation.create({
            quotationId: quote._id,
            lineId: lineId || undefined,
            type: 'COUNTER_DISCOUNT',
            actorType: 'CUSTOMER',
            message,
            requestedDiscountPercent,
            status: 'OPEN'
        });

        if (quote.status !== 'UNDER_NEGOTIATION') {
            quote.status = 'UNDER_NEGOTIATION';
            await quote.save();
        }

        await logAudit({
            entityType: 'quotation', entityId: quote._id, entityRef: quote.quotationNumber,
            action: 'negotiation_counter', fromStatus: quote.status, toStatus: quote.status,
            actor: { id: quote.customerId.toString(), name: 'Customer', role: 'CUSTOMER', type: 'customer' },
            metadata: { lineId, requestedDiscountPercent, message }
        });

        res.status(201).json(neg);
    } catch (e) {
        next(e);
    }
};

export const confirmQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await getCustomerQuote(req);

        // Verify there are no OPEN customer counters (we shouldn't confirm if a rep hasn't replied to a counter)
        const openCounters = await Negotiation.countDocuments({ quotationId: quote._id, status: 'OPEN', actorType: 'CUSTOMER' });
        if (openCounters > 0) {
            return res.status(400).json({ error: 'Cannot confirm while there are unanswered counter requests.' });
        }

        // CRITICAL RULE: a. Recompute the risk score against the CURRENT terms
        await recalculateQuotation(quote._id.toString());

        // Refetch to get the updated requiredApprovalSteps
        const updatedQuote: any = await mongoose.model('Quotation').findById(quote._id);

        if (!updatedQuote) return res.status(404).json({ error: 'Not found' });

        // CRITICAL RULE: b. If requiredApprovalSteps is non-empty, set status back to PENDING_APPROVAL
        if (updatedQuote.requiredApprovalSteps && updatedQuote.requiredApprovalSteps.length > 0) {
            updatedQuote.status = 'PENDING_APPROVAL';
            await updatedQuote.save();

            await logAudit({
                entityType: 'quotation', entityId: updatedQuote._id, entityRef: updatedQuote.quotationNumber,
                action: 'portal_confirm_requires_approval', fromStatus: 'UNDER_NEGOTIATION', toStatus: 'PENDING_APPROVAL',
                actor: { id: updatedQuote.customerId.toString(), name: 'Customer', role: 'CUSTOMER', type: 'customer' },
                metadata: { steps: updatedQuote.requiredApprovalSteps }
            });

            return res.json({
                status: 'PENDING_APPROVAL',
                message: 'Quotation confirmed but requires internal approval due to risk policies.',
                quotation: serializePortalQuotation(updatedQuote)
            });
        }

        // CRITICAL RULE: c. Otherwise set CONFIRMED and create the Order
        updatedQuote.status = 'CONFIRMED';
        await updatedQuote.save();

        await logAudit({
            entityType: 'quotation', entityId: updatedQuote._id, entityRef: updatedQuote.quotationNumber,
            action: 'portal_confirm_direct', fromStatus: 'UNDER_NEGOTIATION', toStatus: 'CONFIRMED',
            actor: { id: updatedQuote.customerId.toString(), name: 'Customer', role: 'CUSTOMER', type: 'customer' }
        });

        // Create the order directly without going through the HTTP endpoints (internal call)
        const lines = await QuotationLine.find({ quotationId: updatedQuote._id });
        const existingOrder = await Order.findOne({ quotationId: updatedQuote._id });

        if (!existingOrder) {
            await Order.create({
                orderNumber: `SO-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
                quotationId: updatedQuote._id,
                customerId: updatedQuote.customerId,
                salesRepId: updatedQuote.salesRepId,
                status: 'PENDING_FULFILLMENT',
                fulfillmentPlan: [],
                splitMode: 'AUTO',
                hasBackorder: false,
                shipmentCount: 0,
                totalShippingCost: 0,
                grandTotal: updatedQuote.totalAmount
            });
        }

        return res.json({
            status: 'CONFIRMED',
            message: 'Quotation confirmed successfully and order placed.',
            quotation: serializePortalQuotation(updatedQuote)
        });
    } catch (e) {
        next(e);
    }
};
