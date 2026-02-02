import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { z } from 'zod';



const supplierSchema = z.object({
    name: z.string().min(2),
    phone: z.string().optional(),
    address: z.string().optional(),
});

interface AuthRequest extends Request {
    user?: any;
}

export const createSupplier = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, phone, address } = supplierSchema.parse(req.body);
    const userId = req.user.id;

    const supplier = await prisma.supplier.create({
        data: {
            name,
            phone,
            address,
            userId,
        },
    });

    return sendResponse(res, 201, true, 'Supplier created successfully', supplier);
});

export const getSuppliers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const suppliers = await prisma.supplier.findMany({
        where: { userId },
    });
    return sendResponse(res, 200, true, 'Suppliers fetched successfully', suppliers);
});

export const updateSupplier = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, phone, address } = supplierSchema.parse(req.body);
    const userId = req.user.id;

    if (typeof id !== 'string') return sendResponse(res, 400, false, 'Invalid ID format');

    const supplier = await prisma.supplier.findFirst({ where: { id, userId } });
    if (!supplier) return sendResponse(res, 404, false, 'Supplier not found');

    const updatedSupplier = await prisma.supplier.update({
        where: { id },
        data: { name, phone, address },
    });

    return sendResponse(res, 200, true, 'Supplier updated successfully', updatedSupplier);
});

export const deleteSupplier = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;

    if (typeof id !== 'string') return sendResponse(res, 400, false, 'Invalid ID format');

    const supplier = await prisma.supplier.findFirst({ where: { id, userId } });
    if (!supplier) return sendResponse(res, 404, false, 'Supplier not found');

    await prisma.supplier.delete({ where: { id } });

    return sendResponse(res, 200, true, 'Supplier deleted successfully');
});
