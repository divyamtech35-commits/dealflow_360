import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof ApiError) {
        res.status(err.statusCode).json({ error: { code: err.statusCode, message: err.message } });
        return;
    }

    console.error(err);
    res.status(500).json({ error: { code: 500, message: 'Internal Server Error' } });
};
