"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactions = exports.createTransaction = void 0;
const db_1 = require("../config/db");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const zod_1 = require("zod");
const transactionSchema = zod_1.z.object({
    amount: zod_1.z.number().int().positive(),
    currency: zod_1.z.string().default('INR'),
    status: zod_1.z.enum(['PENDING', 'SUCCESS', 'FAILED']),
});
exports.createTransaction = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = transactionSchema.parse(req.body);
    const userId = req.user.id;
    const transaction = await db_1.prisma.transaction.create({
        data: {
            ...data,
            userId,
        },
    });
    return (0, response_1.sendResponse)(res, 201, true, 'Transaction recorded successfully', transaction);
});
exports.getTransactions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const transactions = await db_1.prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });
    return (0, response_1.sendResponse)(res, 200, true, 'Transactions fetched successfully', transactions);
});
