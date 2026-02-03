import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import jwt from 'jsonwebtoken';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    let error = err;

    // Normalize error to ApiError
    if (!(error instanceof ApiError)) {
        const statusCode =
            error.statusCode || error instanceof Prisma.PrismaClientKnownRequestError ? 400 : 500;

        const message = error.message || "Something went wrong";

        error = new ApiError(statusCode, message, error?.errors || [], err.stack);
    }

    // Handle specific error types
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            error = new ApiError(409, "Duplicate entry found", err.meta ? [err.meta] : []);
        } else if (err.code === 'P2025') {
            error = new ApiError(404, "Record not found");
        }
    } else if (err instanceof Prisma.PrismaClientValidationError) {
        error = new ApiError(400, "Validation Error (Prisma)", [err.message]);
    } else if (err instanceof ZodError) {
        error = new ApiError(400, "Validation Error", (err as any).errors);
    } else if (err instanceof jwt.JsonWebTokenError) {
        error = new ApiError(401, "Invalid token");
    } else if (err instanceof jwt.TokenExpiredError) {
        error = new ApiError(401, "Token expired");
    }

    const response = {
        statusCode: error.statusCode,
        data: null,
        success: false,
        message: error.message,
        errors: error.errors,
        ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {})
    };

    // Logging only in dev or critical errors
    if (process.env.NODE_ENV === 'development' || error.statusCode >= 500) {
        console.error(`[${req.method}] ${req.path} >> StatusCode:: ${error.statusCode}, Message:: ${error.message}`);
        if (error.statusCode >= 500) console.error(err);
    }

    return res.status(error.statusCode).json(response);
};

export { errorHandler };
