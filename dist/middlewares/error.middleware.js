"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const response_1 = require("../utils/response");
const errorHandler = (err, req, res, next) => {
    console.error(JSON.stringify(err, null, 2));
    console.error(err); // Keep original trace too
    if (err instanceof zod_1.ZodError) {
        return (0, response_1.sendResponse)(res, 400, false, 'Validation Error', err.errors);
    }
    if (err.name === 'JsonWebTokenError') {
        return (0, response_1.sendResponse)(res, 401, false, 'Invalid token');
    }
    if (err.name === 'TokenExpiredError') {
        return (0, response_1.sendResponse)(res, 401, false, 'Token expired');
    }
    return (0, response_1.sendResponse)(res, 500, false, 'Internal Server Error', err.message);
};
exports.errorHandler = errorHandler;
