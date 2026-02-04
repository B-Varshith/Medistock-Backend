"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSupplier = exports.updateSupplier = exports.getSuppliers = exports.createSupplier = void 0;
const db_1 = require("../config/db");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const ApiError_1 = require("../utils/ApiError");
const zod_1 = require("zod");
const supplierSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
});
exports.createSupplier = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, phone, address } = supplierSchema.parse(req.body);
    const userId = req.user.id;
    const supplier = await db_1.prisma.supplier.create({
        data: {
            name,
            phone,
            address,
            userId,
        },
    });
    return (0, response_1.sendResponse)(res, 201, true, 'Supplier created successfully', supplier);
});
exports.getSuppliers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const suppliers = await db_1.prisma.supplier.findMany({
        where: { userId },
    });
    return (0, response_1.sendResponse)(res, 200, true, 'Suppliers fetched successfully', suppliers);
});
exports.updateSupplier = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { name, phone, address } = supplierSchema.parse(req.body);
    const userId = req.user.id;
    if (typeof id !== 'string')
        throw new ApiError_1.ApiError(400, 'Invalid ID format');
    const supplier = await db_1.prisma.supplier.findFirst({ where: { id, userId } });
    if (!supplier)
        return (0, response_1.sendResponse)(res, 404, false, 'Supplier not found');
    const updatedSupplier = await db_1.prisma.supplier.update({
        where: { id },
        data: { name, phone, address },
    });
    return (0, response_1.sendResponse)(res, 200, true, 'Supplier updated successfully', updatedSupplier);
});
exports.deleteSupplier = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    if (typeof id !== 'string')
        throw new ApiError_1.ApiError(400, 'Invalid ID format');
    const supplier = await db_1.prisma.supplier.findFirst({ where: { id, userId } });
    if (!supplier)
        return (0, response_1.sendResponse)(res, 404, false, 'Supplier not found');
    await db_1.prisma.supplier.delete({ where: { id } });
    return (0, response_1.sendResponse)(res, 200, true, 'Supplier deleted successfully');
});
