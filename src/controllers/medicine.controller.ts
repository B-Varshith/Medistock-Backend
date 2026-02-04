import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { z } from 'zod';
import { s3 } from '../config/s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid';



const medicineSchema = z.object({
    name: z.string().min(2),
    batchNumber: z.string(),
    expiryDate: z.string().transform((str) => new Date(str)),
    quantity: z.number().int().positive(),
    purchaseDate: z.string().transform((str) => new Date(str)),
    supplierId: z.string(),
    location: z.string().optional(),
    billUrl: z.string().optional().default(''), // we store key here technically
});

interface AuthRequest extends Request {
    user?: any;
}

export const addMedicine = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Manually parse numeric fields since they come as strings in FormData
    const rawQuantity = Number(req.body.quantity);
    if (isNaN(rawQuantity)) {
        throw new ApiError(400, 'Invalid quantity format');
    }

    const rawData = {
        ...req.body,
        quantity: rawQuantity,
        billUrl: undefined, // Will be set after upload
    };

    const validData = medicineSchema.parse(rawData);

    // Validate dates technically valid but need logical check if needed?
    // safeParse handles invalid date strings by throwing or returning success:false if transform fails. 
    // But our schema transform might throw. Let's rely on safeParse if we used z.preprocess or similar, 
    // but here we used transform. transform executes after parse checks? No, transform runs during parse.
    // If transform throws, custom error map or handle it. 
    // Actually, `safeParse` catches errors thrown in `transform`? verify.
    // Zod documentation says transform errors are caught in safeParse. 
    // So data.success check is enough for date validity if transform fails for invalid dates.


    const userId = req.user.id;
    let billKey = ''; // Store the Key, not full URL

    if (req.file) {


        const fileContent = req.file.buffer;
        const fileName = `${uuidv4()}-${req.file.originalname}`;
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME || 'medistock-bills',
            Key: fileName,
            Body: fileContent,
            ContentType: req.file.mimetype,
        };

        const command = new PutObjectCommand(params);
        await s3.send(command);
        billKey = fileName; // Save just the filename
    }

    // Verify supplier belongs to user
    const supplier = await prisma.supplier.findFirst({
        where: { id: validData.supplierId, userId },
    });

    if (!supplier) {
        throw new ApiError(400, 'Invalid supplier.');
    }

    const medicine = await prisma.medicine.create({
        data: {
            ...validData,
            billUrl: billKey || undefined, // Store key in billUrl field
            userId,
        },
    });

    return sendResponse(res, 201, true, 'Medicine added successfully', medicine);
});

export const getMedicines = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const { search } = req.query;

    const whereClause: any = { userId };

    if (search) {
        whereClause.OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { location: { contains: search as string, mode: 'insensitive' } },
            { supplier: { name: { contains: search as string, mode: 'insensitive' } } }
        ];
    }

    const medicines = await prisma.medicine.findMany({
        where: whereClause,
        include: { supplier: true },
        orderBy: { expiryDate: 'asc' }
    });

    // Generate signed URLs for each medicine with a bill
    const medicinesWithUrls = await Promise.all(medicines.map(async (med) => {
        if (med.billUrl) {
            try {
                const command = new GetObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME || 'medistock-bills',
                    Key: med.billUrl,
                });
                // Generate a signed URL valid for 1 hour
                const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
                return { ...med, billUrl: signedUrl };
            } catch (error) {
                console.error(`Failed to sign URL for ${med.billUrl}`, error);
                return med;
            }
        }
        return med;
    }));

    return sendResponse(res, 200, true, 'Medicines fetched successfully', medicinesWithUrls);
});

export const getMedicineById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;

    if (typeof id !== 'string') {
        throw new ApiError(400, 'Invalid ID format');
    }

    const medicine = await prisma.medicine.findFirst({
        where: { id, userId },
        include: { supplier: true }
    });

    if (!medicine) {
        throw new ApiError(404, 'Medicine not found');
    }

    return sendResponse(res, 200, true, 'Medicine details fetched', medicine);
});

export const deleteMedicine = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;

    if (typeof id !== 'string') {
        throw new ApiError(400, 'Invalid ID format');
    }

    const medicine = await prisma.medicine.findFirst({
        where: { id, userId }
    });

    if (!medicine) {
        throw new ApiError(404, 'Medicine not found or access denied');
    }

    await prisma.medicine.delete({
        where: { id }
    });

    return sendResponse(res, 200, true, 'Medicine deleted successfully');
});

export const updateMedicine = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = medicineSchema.parse(req.body);
    const userId = req.user.id;

    if (typeof id !== 'string') throw new ApiError(400, 'Invalid ID format');

    const medicine = await prisma.medicine.findFirst({ where: { id, userId } });
    if (!medicine) throw new ApiError(404, 'Medicine not found');

    const updatedMedicine = await prisma.medicine.update({
        where: { id },
        data: { ...data, userId },
    });

    return sendResponse(res, 200, true, 'Medicine updated successfully', updatedMedicine);
});

const sellSchema = z.object({
    items: z.array(z.object({
        medicineId: z.string(),
        quantity: z.number().int().positive(),
        price: z.number().positive(),
    }))
});

export const sellMedicines = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { items } = sellSchema.parse(req.body);
    const userId = req.user.id;
    let totalAmount = 0;

    // Use interactive transaction
    await prisma.$transaction(async (tx) => {
        for (const item of items) {
            const medicine = await tx.medicine.findFirst({
                where: { id: item.medicineId, userId }
            });

            if (!medicine) throw new ApiError(404, `Medicine ${item.medicineId} not found`);
            if (medicine.quantity < item.quantity) throw new ApiError(400, `Insufficient stock for ${medicine.name}`);

            await tx.medicine.update({
                where: { id: item.medicineId },
                data: { quantity: medicine.quantity - item.quantity }
            });

            totalAmount += item.price * item.quantity;
        }

        await tx.transaction.create({
            data: {
                amount: totalAmount,
                currency: 'INR',
                status: 'SUCCESS',
                userId
            }
        });
    });

    return sendResponse(res, 200, true, 'Sale recorded successfully');
});
