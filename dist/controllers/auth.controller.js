"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtp = exports.requestOtp = exports.googleCallback = exports.getMe = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../config/db");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const ApiError_1 = require("../utils/ApiError");
const zod_1 = require("zod");
const email_service_1 = require("../utils/email.service");
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
exports.register = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, email, password } = registerSchema.parse(req.body);
    const existingUser = await db_1.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new ApiError_1.ApiError(400, 'User already exists.');
    }
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    const user = await db_1.prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
        },
    });
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1d',
    });
    return (0, response_1.sendResponse)(res, 201, true, 'User registered successfully', { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
exports.login = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await db_1.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
        throw new ApiError_1.ApiError(400, 'Invalid credentials.');
    }
    const isMatch = await bcrypt_1.default.compare(password, user.password);
    if (!isMatch) {
        throw new ApiError_1.ApiError(400, 'Invalid credentials.');
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1d',
    });
    return (0, response_1.sendResponse)(res, 200, true, 'Login successful', { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
exports.getMe = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new ApiError_1.ApiError(401, 'Not authenticated.');
    }
    const user = await db_1.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    if (!user) {
        throw new ApiError_1.ApiError(404, 'User not found.');
    }
    return (0, response_1.sendResponse)(res, 200, true, 'User fetched successfully', { user });
});
exports.googleCallback = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    if (!user) {
        throw new ApiError_1.ApiError(401, 'Authentication failed');
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1d',
    });
    // Redirect to frontend with token
    res.redirect(`http://localhost:5173/oauth/callback?token=${token}`);
});
exports.requestOtp = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new ApiError_1.ApiError(400, 'Email is required');
    }
    const user = await db_1.prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new ApiError_1.ApiError(404, 'User not found');
    }
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    // Hash OTP before saving
    const hashedOtp = await bcrypt_1.default.hash(otp, 10);
    await db_1.prisma.user.update({
        where: { id: user.id },
        data: {
            otp: hashedOtp,
            otpExpiry
        }
    });
    try {
        await (0, email_service_1.sendEmail)(email, 'Your Login OTP', `Your OTP for login is: ${otp}. It expires in 10 minutes.`);
    }
    catch (error) {
        throw new ApiError_1.ApiError(500, 'Failed to send OTP email');
    }
    return (0, response_1.sendResponse)(res, 200, true, 'OTP sent successfully');
});
exports.verifyOtp = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        throw new ApiError_1.ApiError(400, 'Email and OTP are required');
    }
    const user = await db_1.prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new ApiError_1.ApiError(404, 'User not found');
    }
    if (!user.otp || !user.otpExpiry) {
        throw new ApiError_1.ApiError(400, 'No OTP requested');
    }
    if (new Date() > user.otpExpiry) {
        throw new ApiError_1.ApiError(400, 'OTP expired');
    }
    const isMatch = await bcrypt_1.default.compare(otp, user.otp);
    if (!isMatch) {
        throw new ApiError_1.ApiError(400, 'Invalid OTP');
    }
    // Clear OTP after successful login
    await db_1.prisma.user.update({
        where: { id: user.id },
        data: {
            otp: null,
            otpExpiry: null
        }
    });
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1d',
    });
    return (0, response_1.sendResponse)(res, 200, true, 'Login successful', { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
