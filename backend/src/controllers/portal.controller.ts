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
import { User } from '../models/User';
import { CustomerTier } from '../models/CustomerTier';
import { DiscountRule } from '../models/DiscountRule';
import { Invoice } from '../models/Invoice';
import { Subscription } from '../models/Subscription';
import { ApiError } from '../utils/ApiError';

const getCustomerQuote = async (req: Request) => {
    const quote = await Quotation.findOne({
        _id: req.params.id,
        customerId: (req as any).user._id
    });
    if (!quote) throw new ApiError(404, 'Quotation not found');
    return quote;
};

export const getCustomerMaxDiscount = async (quote: any): Promise<number> => {
    let maxDiscount = 15; // default baseline

    try {
        let tierId: any = null;
        let tierName: string | null = null;

        if (quote.customerId) {
            const user: any = await User.findById(quote.customerId).populate('tier');
            if (user?.tier) {
                tierId = user.tier._id || user.tier;
                tierName = user.tier.name;
                if (user.tier.maxDiscountPercent !== undefined && user.tier.maxDiscountPercent !== null) {
                    maxDiscount = user.tier.maxDiscountPercent;
                }
            }
        }

        if (!tierId && quote.customerTierSnapshot) {
            tierId = quote.customerTierSnapshot._id;
            tierName = quote.customerTierSnapshot.tier;
        }

        if (tierId) {
            const tier = await CustomerTier.findById(tierId);
            if (tier && tier.maxDiscountPercent !== undefined && tier.maxDiscountPercent !== null) {
                maxDiscount = tier.maxDiscountPercent;
            }

            const rule = await DiscountRule.findOne({ customerTierId: tierId, isActive: { $ne: false } });
            if (rule && rule.maxDiscountPercent !== undefined && rule.maxDiscountPercent !== null) {
                maxDiscount = rule.maxDiscountPercent;
            }
        } else if (tierName) {
            if (tierName === 'Bronze') maxDiscount = 8;
            else if (tierName === 'Silver') maxDiscount = 10;
            else if (tierName === 'Gold') maxDiscount = 15;
        }
    } catch (e) {
        console.error('Error finding customer max discount:', e);
    }

    return maxDiscount;
};

export const getPortalDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customerId = (req as any).user._id;

        const customer = await User.findById(customerId).populate('tier');

        const quotations = await Quotation.find({
            customerId,
            status: { $in: ['SENT', 'APPROVED', 'UNDER_NEGOTIATION', 'CONFIRMED', 'PENDING_APPROVAL'] }
        }).sort({ createdAt: -1 });

        const orders = await Order.find({ customerId }).sort({ createdAt: -1 });
        const invoices = await Invoice.find({ customerId }).sort({ createdAt: -1 });
        const subscriptions = await Subscription.find({ customerId }).sort({ createdAt: -1 });

        res.json({
            customer: {
                id: customer?._id,
                name: customer?.name,
                email: customer?.email,
                tier: customer?.tier
            },
            quotations: quotations.map(q => serializePortalQuotation(q.toObject())),
            orders,
            invoices,
            subscriptions
        });
    } catch (e) {
        next(e);
    }
};

export const getPortalQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await getCustomerQuote(req);
        const lines = await QuotationLine.find({ quotationId: quote._id });
        const maxDiscount = await getCustomerMaxDiscount(quote);
        const populatedQuote = { 
            ...quote.toObject(), 
            lines: lines.map(l => l.toObject()),
            maxDiscountPercent: maxDiscount
        };

        // Fetch Negotiations thread
        const negotiations = await Negotiation.find({ quotationId: quote._id }).sort({ createdAt: 1 });

        // Fetch associated order if any
        const order = await Order.findOne({ quotationId: quote._id });

        res.json({
            quotation: serializePortalQuotation(populatedQuote),
            negotiations,
            maxDiscountPercent: maxDiscount,
            order
        });
    } catch (e) {
        next(e);
    }
};

export const postNegotiationRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await getCustomerQuote(req);
        const { type, lineId, requestedQuantity, requestedDiscountPercent, message } = req.body;

        const requestType: 'COMMENT' | 'COUNTER_DISCOUNT' | 'CHANGE_REQUEST' = 
            type || (requestedDiscountPercent !== undefined && requestedDiscountPercent !== null && requestedDiscountPercent !== ''
                ? 'COUNTER_DISCOUNT' 
                : (requestedQuantity !== undefined && requestedQuantity !== null && requestedQuantity !== '' 
                    ? 'CHANGE_REQUEST' 
                    : 'COMMENT'));

        const maxDiscount = await getCustomerMaxDiscount(quote);
        const discountNum = (requestedDiscountPercent !== undefined && requestedDiscountPercent !== null && requestedDiscountPercent !== '')
            ? Number(requestedDiscountPercent)
            : undefined;

        const isExceeding = discountNum !== undefined && discountNum > maxDiscount;

        let messageText = message;
        if (!messageText) {
            if (requestType === 'COUNTER_DISCOUNT') {
                messageText = `Proposed counter discount of ${discountNum}% on quotation terms.${isExceeding ? ` (Exceeds max authorized discount of ${maxDiscount}%, sent directly to Sales Manager for review)` : ''}`;
            } else if (requestType === 'CHANGE_REQUEST') {
                messageText = `Change request for quantity: ${requestedQuantity}`;
            } else {
                messageText = 'Customer comment';
            }
        }

        const neg = await Negotiation.create({
            quotationId: quote._id,
            lineId: lineId || undefined,
            type: requestType,
            actorType: 'CUSTOMER',
            message: messageText,
            requestedDiscountPercent: discountNum,
            requestedQuantity: (requestedQuantity !== undefined && requestedQuantity !== null && requestedQuantity !== '') ? Number(requestedQuantity) : undefined,
            status: 'OPEN'
        });

        // IF discount greater than max discount then send request directly to sales managers as implemented while creating the quotation!
        if (isExceeding) {
            if (lineId) {
                await QuotationLine.findByIdAndUpdate(lineId, { discountPercent: discountNum });
            } else {
                quote.orderDiscountPercent = discountNum;
                await quote.save();
            }

            // Recalculate quotation
            await recalculateQuotation(quote._id.toString());

            const updatedQuote: any = await Quotation.findById(quote._id);
            if (updatedQuote) {
                updatedQuote.status = 'PENDING_APPROVAL';
                const steps = [
                    { role: 'SALES_MANAGER', status: 'PENDING' }
                ];
                if ((discountNum || 0) >= 25 || (updatedQuote.riskScore && updatedQuote.riskScore >= 50)) {
                    steps.push({ role: 'FINANCE', status: 'PENDING' });
                }
                updatedQuote.requiredApprovalSteps = steps;
                updatedQuote.markModified('requiredApprovalSteps');
                await updatedQuote.save();

                await logAudit({
                    entityType: 'quotation', entityId: updatedQuote._id, entityRef: updatedQuote.quotationNumber,
                    action: 'counter_discount_exceeds_max_escalated_to_manager',
                    fromStatus: quote.status, toStatus: 'PENDING_APPROVAL',
                    actor: { id: quote.customerId.toString(), name: 'Customer', role: 'CUSTOMER', type: 'customer' },
                    metadata: { 
                        requestedDiscountPercent: discountNum, 
                        maxDiscount, 
                        role: 'SALES_MANAGER',
                        reason: `Proposed counter discount of ${discountNum}% exceeds max discount threshold of ${maxDiscount}%. Escalated directly to Sales Manager for approval.`
                    }
                });

                return res.status(201).json({
                    ...neg.toObject(),
                    escalated: true,
                    maxDiscount,
                    status: 'PENDING_APPROVAL',
                    message: `Customer proposed ${discountNum}% discount. Proposed counter discount of ${discountNum}% exceeds max authorized discount (${maxDiscount}%). Request has been sent directly to the Sales Manager for review.`
                });
            }
        }

        // Standard negotiation within authorized parameters
        if (quote.status !== 'UNDER_NEGOTIATION' && quote.status !== 'CONFIRMED') {
            quote.status = 'UNDER_NEGOTIATION';
            await quote.save();
        }

        await logAudit({
            entityType: 'quotation', entityId: quote._id, entityRef: quote.quotationNumber,
            action: `negotiation_${requestType.toLowerCase()}`, fromStatus: quote.status, toStatus: quote.status,
            actor: { id: quote.customerId.toString(), name: 'Customer', role: 'CUSTOMER', type: 'customer' },
            metadata: { lineId, requestedQuantity, requestedDiscountPercent: discountNum, message: messageText }
        });

        res.status(201).json({
            ...neg.toObject(),
            escalated: false,
            maxDiscount,
            status: quote.status
        });
    } catch (e) {
        next(e);
    }
};

export const postComment = async (req: Request, res: Response, next: NextFunction) => {
    req.body.type = 'COMMENT';
    return postNegotiationRequest(req, res, next);
};

export const postCounter = async (req: Request, res: Response, next: NextFunction) => {
    req.body.type = 'COUNTER_DISCOUNT';
    return postNegotiationRequest(req, res, next);
};

export const confirmQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await getCustomerQuote(req);

        // Resolve any open customer negotiations upon confirmation
        await Negotiation.updateMany(
            { quotationId: quote._id, status: 'OPEN', actorType: 'CUSTOMER' },
            { status: 'RESOLVED', resolvedAt: new Date() }
        );

        // CRITICAL RULE: a. Recompute the risk score against the CURRENT terms
        await recalculateQuotation(quote._id.toString());

        // Refetch to get the updated requiredApprovalSteps
        const updatedQuote: any = await mongoose.model('Quotation').findById(quote._id);

        if (!updatedQuote) return res.status(404).json({ error: 'Not found' });

        // CRITICAL RULE: b. If requiredApprovalSteps is non-empty, set status back to PENDING_APPROVAL
        if (updatedQuote.requiredApprovalSteps && updatedQuote.requiredApprovalSteps.length > 0) {
            let stepsArray = updatedQuote.requiredApprovalSteps.map((s: any) =>
                typeof s === 'string' ? { role: s, status: 'PENDING' } : { role: s.role, status: 'PENDING' }
            );
            updatedQuote.requiredApprovalSteps = stepsArray;
            updatedQuote.markModified('requiredApprovalSteps');
            updatedQuote.status = 'PENDING_APPROVAL';
            await updatedQuote.save();

            await logAudit({
                entityType: 'quotation', entityId: updatedQuote._id, entityRef: updatedQuote.quotationNumber,
                action: 'portal_confirm_requires_approval', fromStatus: quote.status, toStatus: 'PENDING_APPROVAL',
                actor: { id: updatedQuote.customerId.toString(), name: 'Customer', role: 'CUSTOMER', type: 'customer' },
                metadata: { steps: updatedQuote.requiredApprovalSteps }
            });

            return res.json({
                status: 'PENDING_APPROVAL',
                message: 'Quotation confirmed! Due to policy thresholds, it has automatically re-entered the approval flow for management review.',
                quotation: serializePortalQuotation(updatedQuote)
            });
        }

        // CRITICAL RULE: c. Otherwise set CONFIRMED and create the Order directly into fulfillment
        updatedQuote.status = 'CONFIRMED';
        await updatedQuote.save();

        await logAudit({
            entityType: 'quotation', entityId: updatedQuote._id, entityRef: updatedQuote.quotationNumber,
            action: 'portal_confirm_direct', fromStatus: quote.status, toStatus: 'CONFIRMED',
            actor: { id: updatedQuote.customerId.toString(), name: 'Customer', role: 'CUSTOMER', type: 'customer' }
        });

        // Create the order directly into fulfillment pipeline
        let order = await Order.findOne({ quotationId: updatedQuote._id });

        const quoteLines = await QuotationLine.find({ quotationId: updatedQuote._id });
        const { Stock } = await import('../models/Stock');
        let hasBackorder = false;
        for (const ql of quoteLines) {
            const stocks = await Stock.find({ productId: ql.productId });
            const totalAvail = stocks.reduce((sum: number, s: any) => sum + Math.max(0, s.quantity - (s.reservedQuantity || 0)), 0);
            if (totalAvail < ql.quantity) {
                hasBackorder = true;
                break;
            }
        }

        if (!order) {
            order = await Order.create({
                orderNumber: `SO-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
                quotationId: updatedQuote._id,
                customerId: updatedQuote.customerId,
                salesRepId: updatedQuote.salesRepId,
                status: 'PENDING_FULFILLMENT',
                fulfillmentPlan: [],
                splitMode: 'AUTO',
                hasBackorder: hasBackorder,
                shipmentCount: 0,
                totalShippingCost: 0,
                grandTotal: updatedQuote.totalAmount
            });
        } else if (hasBackorder && !order.hasBackorder) {
            order.hasBackorder = true;
            await order.save();
        }

        // Auto-create invoice in database for newly placed order
        const { Invoice } = await import('../models/Invoice');
        const existingInv = await Invoice.findOne({ orderId: order._id });
        if (!existingInv) {
            const count = await Invoice.countDocuments();
            await Invoice.create({
                invoiceNumber: `INV-${String(count + 1).padStart(5, '0')}`,
                orderId: order._id,
                customerId: order.customerId,
                invoiceType: 'ONE_TIME',
                lines: quoteLines.map((ql: any) => ({
                    productId: ql.productId,
                    productName: ql.productName,
                    description: 'Quotation Order Line',
                    quantity: ql.quantity,
                    unitPrice: ql.unitPrice,
                    lineTotal: (ql.unitPrice * ql.quantity) - ((ql.unitPrice * ql.quantity * (ql.discountPercent || 0)) / 100),
                    isRecurring: false
                })),
                subtotal: updatedQuote.subtotal,
                taxTotal: updatedQuote.taxAmount,
                grandTotal: updatedQuote.totalAmount,
                amountPaid: 0,
                amountDue: updatedQuote.totalAmount,
                status: 'UNPAID',
                dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
            });
        }

        return res.json({
            status: 'CONFIRMED',
            message: order.hasBackorder
                ? `Quotation confirmed! Order #${order.orderNumber} placed into fulfillment pipeline. (Backorder: available warehouse stock is insufficient for requested quantities).`
                : `Quotation confirmed successfully! Order #${order.orderNumber} has moved directly to fulfillment.`,
            orderId: order._id,
            orderNumber: order.orderNumber,
            order,
            quotation: serializePortalQuotation(updatedQuote)
        });
    } catch (e) {
        next(e);
    }
};
