"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sellMedicines = exports.updateMedicine = exports.deleteMedicine = exports.getMedicineById = exports.getMedicines = exports.addMedicine = void 0;
const db_1 = require("../config/db");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const zod_1 = require("zod");
const s3_1 = require("../config/s3");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
// Helper to ensure bucket exists
const ensureBucketExists = async () => {
    const bucketName = process.env.AWS_BUCKET_NAME || 'medistock-bills';
    try {
        await s3_1.s3.send(new client_s3_1.HeadBucketCommand({ Bucket: bucketName }));
    }
    catch (error) {
        // Bucket doesn't exist, create it
        console.log(`Bucket ${bucketName} not found. Creating...`);
        try {
            await s3_1.s3.send(new client_s3_1.CreateBucketCommand({ Bucket: bucketName }));
            console.log(`Bucket ${bucketName} created.`);
        }
        catch (createError) {
            console.error('Failed to create bucket:', createError);
        }
    }
};
const medicineSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    batchNumber: zod_1.z.string(),
    expiryDate: zod_1.z.string().transform((str) => new Date(str)),
    quantity: zod_1.z.number().int().positive(),
    purchaseDate: zod_1.z.string().transform((str) => new Date(str)),
    supplierId: zod_1.z.string(),
    location: zod_1.z.string().optional(),
    billUrl: zod_1.z.string().optional().default(''), // we store key here technically
});
exports.addMedicine = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    // Manually parse numeric fields since they come as strings in FormData
    const rawData = {
        ...req.body,
        quantity: parseInt(req.body.quantity),
        billUrl: undefined, // Will be set after upload
    };
    const data = medicineSchema.parse(rawData);
    const userId = req.user.id;
    let billKey = ''; // Store the Key, not full URL
    if (req.file) {
        await ensureBucketExists(); // Ensure bucket exists before upload
        const fileContent = req.file.buffer;
        const fileName = `${(0, uuid_1.v4)()}-${req.file.originalname}`;
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME || 'medistock-bills',
            Key: fileName,
            Body: fileContent,
            ContentType: req.file.mimetype,
        };
        const command = new client_s3_1.PutObjectCommand(params);
        await s3_1.s3.send(command);
        billKey = fileName; // Save just the filename
    }
    // Verify supplier belongs to user
    const supplier = await db_1.prisma.supplier.findFirst({
        where: { id: data.supplierId, userId },
    });
    if (!supplier) {
        return (0, response_1.sendResponse)(res, 400, false, 'Invalid supplier.');
    }
    const medicine = await db_1.prisma.medicine.create({
        data: {
            ...data,
            billUrl: billKey || undefined, // Store key in billUrl field
            userId,
        },
    });
    return (0, response_1.sendResponse)(res, 201, true, 'Medicine added successfully', medicine);
});
exports.getMedicines = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { search } = req.query;
    const whereClause = { userId };
    if (search) {
        whereClause.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
            { supplier: { name: { contains: search, mode: 'insensitive' } } }
        ];
    }
    const medicines = await db_1.prisma.medicine.findMany({
        where: whereClause,
        include: { supplier: true },
        orderBy: { expiryDate: 'asc' }
    });
    // Generate signed URLs for each medicine with a bill
    const medicinesWithUrls = await Promise.all(medicines.map(async (med) => {
        if (med.billUrl) {
            try {
                const command = new client_s3_1.GetObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME || 'medistock-bills',
                    Key: med.billUrl,
                });
                // Generate a signed URL valid for 1 hour
                const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3_1.s3, command, { expiresIn: 3600 });
                return { ...med, billUrl: signedUrl };
            }
            catch (error) {
                console.error(`Failed to sign URL for ${med.billUrl}`, error);
                return med;
            }
        }
        return med;
    }));
    return (0, response_1.sendResponse)(res, 200, true, 'Medicines fetched successfully', medicinesWithUrls);
});
exports.getMedicineById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    if (typeof id !== 'string') {
        return (0, response_1.sendResponse)(res, 400, false, 'Invalid ID format');
    }
    const medicine = await db_1.prisma.medicine.findFirst({
        where: { id, userId },
        include: { supplier: true }
    });
    if (!medicine) {
        return (0, response_1.sendResponse)(res, 404, false, 'Medicine not found');
    }
    return (0, response_1.sendResponse)(res, 200, true, 'Medicine details fetched', medicine);
});
exports.deleteMedicine = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    if (typeof id !== 'string') {
        return (0, response_1.sendResponse)(res, 400, false, 'Invalid ID format');
    }
    const medicine = await db_1.prisma.medicine.findFirst({
        where: { id, userId }
    });
    if (!medicine) {
        return (0, response_1.sendResponse)(res, 404, false, 'Medicine not found or access denied');
    }
    await db_1.prisma.medicine.delete({
        where: { id }
    });
    return (0, response_1.sendResponse)(res, 200, true, 'Medicine deleted successfully');
});
exports.updateMedicine = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const data = medicineSchema.parse(req.body);
    const userId = req.user.id;
    if (typeof id !== 'string')
        return (0, response_1.sendResponse)(res, 400, false, 'Invalid ID format');
    const medicine = await db_1.prisma.medicine.findFirst({ where: { id, userId } });
    if (!medicine)
        return (0, response_1.sendResponse)(res, 404, false, 'Medicine not found');
    const updatedMedicine = await db_1.prisma.medicine.update({
        where: { id },
        data: { ...data, userId },
    });
    return (0, response_1.sendResponse)(res, 200, true, 'Medicine updated successfully', updatedMedicine);
});
const sellSchema = zod_1.z.object({
    items: zod_1.z.array(zod_1.z.object({
        medicineId: zod_1.z.string(),
        quantity: zod_1.z.number().int().positive(),
        price: zod_1.z.number().positive(),
    }))
});
exports.sellMedicines = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { items } = sellSchema.parse(req.body);
    const userId = req.user.id;
    let totalAmount = 0;
    // Use interactive transaction
    await db_1.prisma.$transaction(async (tx) => {
        for (const item of items) {
            const medicine = await tx.medicine.findFirst({
                where: { id: item.medicineId, userId }
            });
            if (!medicine)
                throw new Error(`Medicine ${item.medicineId} not found`);
            if (medicine.quantity < item.quantity)
                throw new Error(`Insufficient stock for ${medicine.name}`);
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
    return (0, response_1.sendResponse)(res, 200, true, 'Sale recorded successfully');
});
