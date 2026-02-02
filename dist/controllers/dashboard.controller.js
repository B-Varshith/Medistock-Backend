"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const db_1 = require("../config/db");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
exports.getDashboardStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const [totalMedicines, totalSuppliers, lowStockMedicines, expiringMedicines, recentTransactions] = await Promise.all([
        db_1.prisma.medicine.count(),
        db_1.prisma.supplier.count(),
        db_1.prisma.medicine.count({
            where: {
                quantity: {
                    lte: 10
                }
            }
        }),
        db_1.prisma.medicine.count({
            where: {
                expiryDate: {
                    lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
                }
            }
        }),
        db_1.prisma.transaction.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        })
    ]);
    return (0, response_1.sendResponse)(res, 200, true, 'Dashboard stats fetched successfully', {
        totalMedicines,
        totalSuppliers,
        lowStockMedicines,
        expiringMedicines,
        recentTransactions
    });
});
