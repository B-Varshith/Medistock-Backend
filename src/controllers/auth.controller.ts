import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { z } from 'zod';



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
        return sendResponse(res, 400, false, 'User already exists.');
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
        return sendResponse(res, 400, false, 'Invalid credentials.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return sendResponse(res, 400, false, 'Invalid credentials.');
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1d',
    });

    return sendResponse(res, 200, true, 'Login successful', { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
        return sendResponse(res, 401, false, 'Not authenticated.');
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    if (!user) {
        return sendResponse(res, 404, false, 'User not found.');
    }

    return sendResponse(res, 200, true, 'User fetched successfully', { user });
});

export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;

    if (!user) {
        return sendResponse(res, 401, false, 'Authentication failed');
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '1d',
    });

    // Redirect to frontend with token
    res.redirect(`http://localhost:5173/oauth/callback?token=${token}`);
});
