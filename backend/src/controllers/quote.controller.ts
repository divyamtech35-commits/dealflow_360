import { Request, Response } from 'express';
import { Quotation } from '../models/Quotation';
import { QuotationLine } from '../models/QuotationLine';

export const getQuotations = async (req: Request, res: Response) => {
    try {
        const quotes = await Quotation.find().populate('customerId').sort({ createdAt: -1 });
        res.json(quotes);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

export const getQuotationById = async (req: Request, res: Response) => {
    try {
        const quote = await Quotation.findById(req.params.id).populate('customerId');
        const lines = await QuotationLine.find({ quotationId: req.params.id }).populate('productId');
        res.json({ quote, lines });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

export const createQuotation = async (req: Request, res: Response) => {
    try {
        const { customerId, lines } = req.body;

        // Quick mock for deal health/risk score based on discounts.
        // In a real scenario, this involves complex rules validation.
        let totalDiscountRisk = 0;

        const quoteObj = new Quotation({
            createdById: '000000000000000000000000', // Mocked user ID
            customerId: customerId || '000000000000000000000000', // Mocked customer ID
            status: 'Draft',
            blendedRiskScore: 0
        });

        await quoteObj.save();

        for (const line of lines) {
            totalDiscountRisk += (line.discount > 10 ? 5 : 0);
            await QuotationLine.create({
                quotationId: quoteObj._id,
                productId: line.productId,
                quantity: line.quantity,
                priceSnapshot: line.basePrice,
                costPriceSnapshot: line.costPrice,
                discountApplied: line.discount,
                subtotal: line.basePrice * line.quantity,
                finalTotal: (line.basePrice * line.quantity) * (1 - line.discount / 100)
            });
        }

        quoteObj.blendedRiskScore = totalDiscountRisk;
        if (totalDiscountRisk > 0) {
            quoteObj.status = 'Pending Approval';
        }

        await quoteObj.save();

        res.json(quoteObj);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};
