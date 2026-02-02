"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleCallback = exports.getMe = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../config/db");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const zod_1 = require("zod");
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
        return (0, response_1.sendResponse)(res, 400, false, 'User already exists.');
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
        return (0, response_1.sendResponse)(res, 400, false, 'Invalid credentials.');
    }
    const isMatch = await bcrypt_1.default.compare(password, user.password);
    if (!isMatch) {
        return (0, response_1.sendResponse)(res, 400, false, 'Invalid credentials.');
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1d',
    });
    return (0, response_1.sendResponse)(res, 200, true, 'Login successful', { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
exports.getMe = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return (0, response_1.sendResponse)(res, 401, false, 'Not authenticated.');
    }
    const user = await db_1.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    if (!user) {
        return (0, response_1.sendResponse)(res, 404, false, 'User not found.');
    }
    return (0, response_1.sendResponse)(res, 200, true, 'User fetched successfully', { user });
});
exports.googleCallback = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    if (!user) {
        return (0, response_1.sendResponse)(res, 401, false, 'Authentication failed');
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1d',
    });
    // Redirect to frontend with token
    res.redirect(`http://localhost:5173/oauth/callback?token=${token}`);
});
