"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const response_1 = require("../utils/response");
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return (0, response_1.sendResponse)(res, 401, false, 'Access denied. No token provided.');
    }
    const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
};
exports.authenticate = authenticate;
