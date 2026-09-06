import { Request, Response, NextFunction } from 'express';
import { Quotation } from '../models/Quotation';
import { QuotationLine } from '../models/QuotationLine';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { DiscountRule } from '../models/DiscountRule';
import { Negotiation } from '../models/Negotiation';
import { recalculateQuotation } from '../services/quotationCalc';
import { serializeQuotation } from '../views/serializers/quotationSerializer';
import { resolveUnitPrice } from '../services/pricingEngine';
import { rankSuggestions } from '../services/upsellEngine';
import { UpsellRule } from '../models/UpsellRule';

export const listQuotations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, ownerId } = req.query;
        let filter: any = {};
        if (status) filter.status = status;

        if (ownerId) {
            filter.salesRepId = ownerId;
        } else if (req.user?.role === 'SALES_REP') {
            const hasOwn = await Quotation.exists({ salesRepId: req.user._id });
            if (hasOwn) {
                filter.salesRepId = req.user._id;
            }
        } else if (req.user?.role === 'CUSTOMER') {
            filter.customerId = req.user._id;
        }

        const quotes = await Quotation.find(filter)
            .populate({ path: 'customerId', populate: { path: 'tier' } })
            .sort({ lastActivityAt: -1 });

        res.json(quotes.map(q => serializeQuotation(q)));
    } catch (e) { next(e); }
};

export const getQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await Quotation.findById(req.params.id)
            .populate({ path: 'customerId', populate: { path: 'tier' } });
        if (!quote) return res.status(404).json({ error: 'Not found' });

        const lines = await QuotationLine.find({ quotationId: quote._id });
        const negotiations = await Negotiation.find({ quotationId: quote._id }).sort({ createdAt: 1 });
        res.json({ ...serializeQuotation(quote, lines), negotiations });
    } catch (e) { next(e); }
};

export const createQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { customerId } = req.body;
        let tierSnapshot = null;
        if (customerId) {
            const user = await User.findById(customerId).populate('tier');
            if (user && user.tier) tierSnapshot = { _id: (user.tier as any)._id, tier: (user.tier as any).name };
        }

        const quote = await Quotation.create({
            customerId,
            salesRepId: req.user._id,
            customerTierSnapshot: tierSnapshot
        });

        res.status(201).json(serializeQuotation(quote));
    } catch (e) { next(e); }
};

export const updateQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orderDiscountPercent, notes, customerId } = req.body;
        
        let updateData: any = { orderDiscountPercent, notes };
        
        if (customerId) {
            updateData.customerId = customerId;
            const user = await User.findById(customerId).populate('tier');
            if (user && user.tier) {
                updateData.customerTierSnapshot = { _id: (user.tier as any)._id, tier: (user.tier as any).name };
            }
        }

        await Quotation.findByIdAndUpdate(req.params.id, updateData);
        const finalQ = await recalculateQuotation(req.params.id);
        const lines = await QuotationLine.find({ quotationId: finalQ._id });
        const negotiations = await Negotiation.find({ quotationId: finalQ._id }).sort({ createdAt: 1 });
        res.json({ ...serializeQuotation(finalQ, lines), negotiations });
    } catch (e) { next(e); }
};

export const addLine = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { productId, variantId, quantity, discountPercent } = req.body;
        const quote = await Quotation.findById(req.params.id);
        if (!quote) return res.status(404).json({ error: 'Quote not found' });

        const product = await Product.findById(productId);
        if (!product) return res.status(400).json({ error: 'Product invalid' });

        // Resolve price
        const rules = await DiscountRule.find();
        const resolvedPrice = resolveUnitPrice(product, rules);

        await QuotationLine.create({
            quotationId: quote._id,
            productId, variantId, quantity, discountPercent,
            productName: product.name,
            sku: product.sku || '',
            category: product.categoryId ? product.categoryId.toString() : 'Default',
            unitPrice: resolvedPrice,
            costPrice: product.costPrice || 0,
            taxPercent: product.taxPercent || 0
        });

        const finalQ = await recalculateQuotation(req.params.id);
        const lines = await QuotationLine.find({ quotationId: finalQ._id });
        res.json(serializeQuotation(finalQ, lines));
    } catch (e) { next(e); }
};

export const updateLine = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { quantity, discountPercent } = req.body;
        await QuotationLine.findByIdAndUpdate(req.params.lineId, { quantity, discountPercent });
        const finalQ = await recalculateQuotation(req.params.id);
        const lines = await QuotationLine.find({ quotationId: finalQ._id });
        res.json(serializeQuotation(finalQ, lines));
    } catch (e) { next(e); }
};

export const removeLine = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await QuotationLine.findByIdAndDelete(req.params.lineId);
        const finalQ = await recalculateQuotation(req.params.id);
        const lines = await QuotationLine.find({ quotationId: finalQ._id });
        res.json(serializeQuotation(finalQ, lines));
    } catch (e) { next(e); }
};

export const getSuggestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await Quotation.findById(req.params.id);
        if (!quote) return res.status(404).json({ error: 'Not found' });

        const lines = await QuotationLine.find({ quotationId: quote._id });
        const rules = await UpsellRule.find({ isActive: true });
        const products = await Product.find({ isActive: true });

        const suggestions = rankSuggestions(lines, rules, products, quote.orderDiscountPercent || 0);
        res.json(suggestions);
    } catch (e) { next(e); }
};

export const replyToNegotiation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { message } = req.body;
        const neg = await Negotiation.create({
            quotationId: req.params.id,
            type: 'COMMENT',
            actorType: 'REP',
            message,
            status: 'RESOLVED'
        });
        
        // Mark customer OPEN counters as RESOLVED since rep has replied
        await Negotiation.updateMany(
            { quotationId: req.params.id, status: 'OPEN', actorType: 'CUSTOMER' },
            { status: 'RESOLVED' }
        );

        const quote = await Quotation.findById(req.params.id);
        const negotiations = await Negotiation.find({ quotationId: quote?._id }).sort({ createdAt: 1 });
        const lines = await QuotationLine.find({ quotationId: quote?._id });
        
        res.status(201).json({ ...serializeQuotation(quote, lines), negotiations });
    } catch (e) { next(e); }
};
