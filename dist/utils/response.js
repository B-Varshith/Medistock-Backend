"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendResponse = void 0;
const ApiResponse_1 = require("./ApiResponse");
const sendResponse = (res, statusCode, success, message, data) => {
    return res.status(statusCode).json(new ApiResponse_1.ApiResponse(statusCode, data, message));
};
exports.sendResponse = sendResponse;
