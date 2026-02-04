import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { z } from 'zod';
import { sendEmail } from '../utils/email.service';



const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const register = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new ApiError(400, 'User already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
        },
    });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1d',
    });

    return sendResponse(res, 201, true, 'User registered successfully', { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
        throw new ApiError(400, 'Invalid credentials.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new ApiError(400, 'Invalid credentials.');
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1d',
    });

    return sendResponse(res, 200, true, 'Login successful', { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
        throw new ApiError(401, 'Not authenticated.');
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    if (!user) {
        throw new ApiError(404, 'User not found.');
    }

    return sendResponse(res, 200, true, 'User fetched successfully', { user });
});

export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;

    if (!user) {
        throw new ApiError(401, 'Authentication failed');
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1d',
    });

    // Redirect to frontend with token
    res.redirect(`http://localhost:5173/oauth/callback?token=${token}`);
});

export const requestOtp = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, 'Email is required');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Hash OTP before saving
    const hashedOtp = await bcrypt.hash(otp, 10);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            otp: hashedOtp,
            otpExpiry
        }
    });

    try {
        await sendEmail(email, 'Your Login OTP', `Your OTP for login is: ${otp}. It expires in 10 minutes.`);
    } catch (error) {
        throw new ApiError(500, 'Failed to send OTP email');
    }

    return sendResponse(res, 200, true, 'OTP sent successfully');
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        throw new ApiError(400, 'Email and OTP are required');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    if (!user.otp || !user.otpExpiry) {
        throw new ApiError(400, 'No OTP requested');
    }

    if (new Date() > user.otpExpiry) {
        throw new ApiError(400, 'OTP expired');
    }

    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
        throw new ApiError(400, 'Invalid OTP');
    }

    // Clear OTP after successful login
    await prisma.user.update({
        where: { id: user.id },
        data: {
            otp: null,
            otpExpiry: null
        }
    });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1d',
    });

    return sendResponse(res, 200, true, 'Login successful', { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
