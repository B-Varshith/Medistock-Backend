import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { z } from 'zod';



const transactionSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().default('INR'),
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED']),
});

interface AuthRequest extends Request {
  user?: any;
}

export const createTransaction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = transactionSchema.parse(req.body);
  const userId = req.user.id;

  const transaction = await prisma.transaction.create({
    data: {
      ...data,
      userId,
    },
  });

  return sendResponse(res, 201, true, 'Transaction recorded successfully', transaction);
});

export const getTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  return sendResponse(res, 200, true, 'Transactions fetched successfully', transactions);
});
