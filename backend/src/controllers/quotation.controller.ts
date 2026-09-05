import { Request, Response, NextFunction } from 'express';
import { Quotation } from '../models/Quotation';
import { QuotationLine } from '../models/QuotationLine';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { DiscountRule } from '../models/DiscountRule';
import { recalculateQuotation } from '../services/quotationCalc';
import { serializeQuotation } from '../views/serializers/quotationSerializer';
import { resolveUnitPrice } from '../services/pricingEngine';

export const listQuotations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, ownerId } = req.query;
        let filter: any = {};
        if (status) filter.status = status;
        if (ownerId) filter.salesRepId = ownerId;
        else filter.salesRepId = req.user._id;

        const quotes = await Quotation.find(filter)
            .populate('customerId', 'name tier')
            .sort({ lastActivityAt: -1 });

        res.json(quotes.map(q => serializeQuotation(q)));
    } catch (e) { next(e); }
};

export const getQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await Quotation.findById(req.params.id)
            .populate('customerId', 'name tier _id');
        if (!quote) return res.status(404).json({ error: 'Not found' });

        const lines = await QuotationLine.find({ quotationId: quote._id });
        res.json(serializeQuotation(quote, lines));
    } catch (e) { next(e); }
};

export const createQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { customerId } = req.body;
        let tierSnapshot = null;
        if (customerId) {
            const user = await User.findById(customerId);
            if (user && user.tier) tierSnapshot = { tier: user.tier };
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
        const { orderDiscountPercent, notes } = req.body;
        await Quotation.findByIdAndUpdate(req.params.id, { orderDiscountPercent, notes });
        const finalQ = await recalculateQuotation(req.params.id);
        const lines = await QuotationLine.find({ quotationId: finalQ._id });
        res.json(serializeQuotation(finalQ, lines));
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
