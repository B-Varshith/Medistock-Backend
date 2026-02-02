import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendResponse } from '../utils/response';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(JSON.stringify(err, null, 2));
    console.error(err); // Keep original trace too

    if (err instanceof ZodError) {
        return sendResponse(res, 400, false, 'Validation Error', (err as any).errors);
    }

    if (err.name === 'JsonWebTokenError') {
        return sendResponse(res, 401, false, 'Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
        return sendResponse(res, 401, false, 'Token expired');
    }

    return sendResponse(res, 500, false, 'Internal Server Error', err.message);
};
