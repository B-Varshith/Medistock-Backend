"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_1 = require("./config/s3");
const PORT = process.env.PORT || 5000;
const ensureBucketExists = async () => {
    const bucketName = process.env.AWS_BUCKET_NAME || 'medistock-bills';
    try {
        await s3_1.s3.send(new client_s3_1.HeadBucketCommand({ Bucket: bucketName }));
        console.log(`Bucket ${bucketName} exists.`);
    }
    catch (error) {
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
ensureBucketExists();
const server = app_1.default.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});
// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});
