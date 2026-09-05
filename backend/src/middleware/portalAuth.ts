import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { Quotation } from '../models/Quotation';

declare global {
    namespace Express {
        interface Request {
            portalCustomer?: any;
        }
    }
}

export const authenticatePortal = async (req: Request, res: Response, next: NextFunction) => {
    // Stub for Phase 7
    try {
        const portalToken = req.headers['x-portal-token'] as string;
        if (!portalToken) throw new ApiError(401, 'Missing Portal Token');

        const quote = await Quotation.findOne({ portalToken });
        if (!quote) throw new ApiError(401, 'Invalid Portal Token');

        req.portalCustomer = { customerId: quote.customerId, quotationId: quote._id };
        next();
    } catch (error) {
        next(error);
    }
};
