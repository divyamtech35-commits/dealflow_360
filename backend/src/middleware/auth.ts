import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService';
import { ApiError } from '../utils/ApiError';
import { User } from '../models/User';

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError(401, 'Unauthorized');
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        // Attach user to req
        const user = await User.findById(decoded.userId).select('-passwordHash');
        if (!user) throw new ApiError(401, 'User not found');

        req.user = user;
        next();
    } catch (error) {
        next(new ApiError(401, 'Unauthorized'));
    }
};

export const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.map(r => r.toUpperCase()).includes(req.user.role?.toUpperCase())) {
            return next(new ApiError(403, 'Forbidden'));
        }
        next();
    };
};
