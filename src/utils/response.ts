import { Response } from 'express';
import { ApiResponse } from './ApiResponse';

export const sendResponse = (res: Response, statusCode: number, success: boolean, message: string, data?: any) => {
    return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
};
