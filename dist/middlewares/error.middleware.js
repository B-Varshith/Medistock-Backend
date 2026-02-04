"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const ApiError_1 = require("../utils/ApiError");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler = (err, req, res, next) => {
    let error = err;
    // Normalize error to ApiError
    if (!(error instanceof ApiError_1.ApiError)) {
        const statusCode = error.statusCode || error instanceof client_1.Prisma.PrismaClientKnownRequestError ? 400 : 500;
        const message = error.message || "Something went wrong";
        error = new ApiError_1.ApiError(statusCode, message, error?.errors || [], err.stack);
    }
    // Handle specific error types
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            error = new ApiError_1.ApiError(409, "Duplicate entry found", err.meta ? [err.meta] : []);
        }
        else if (err.code === 'P2025') {
            error = new ApiError_1.ApiError(404, "Record not found");
        }
    }
    else if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        error = new ApiError_1.ApiError(400, "Validation Error (Prisma)", [err.message]);
    }
    else if (err instanceof zod_1.ZodError) {
        error = new ApiError_1.ApiError(400, "Validation Error", err.errors);
    }
    else if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
        error = new ApiError_1.ApiError(401, "Invalid token");
    }
    else if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
        error = new ApiError_1.ApiError(401, "Token expired");
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
        if (error.statusCode >= 500)
            console.error(err);
    }
    return res.status(error.statusCode).json(response);
};
exports.errorHandler = errorHandler;
