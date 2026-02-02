import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    const [
        totalMedicines,
        totalSuppliers,
        lowStockMedicines,
        expiringMedicines,
        recentTransactions
    ] = await Promise.all([
        prisma.medicine.count(),
        prisma.supplier.count(),
        prisma.medicine.count({
            where: {
                quantity: {
                    lte: 10
                }
            }
        }),
        prisma.medicine.count({
            where: {
                expiryDate: {
                    lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
                }
            }
        }),
        prisma.transaction.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        })
    ]);

    return sendResponse(res, 200, true, 'Dashboard stats fetched successfully', {
        totalMedicines,
        totalSuppliers,
        lowStockMedicines,
        expiringMedicines,
        recentTransactions
    });
});
