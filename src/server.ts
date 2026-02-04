import app from './app';

import { CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { s3 } from './config/s3';

const PORT = process.env.PORT || 5000;

const ensureBucketExists = async () => {
    const bucketName = process.env.AWS_BUCKET_NAME || 'medistock-bills';
    try {
        await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
        console.log(`Bucket ${bucketName} exists.`);
    } catch (error) {
        console.log(`Bucket ${bucketName} not found. Creating...`);
        try {
            await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
            console.log(`Bucket ${bucketName} created.`);
        } catch (createError) {
            console.error('Failed to create bucket:', createError);
        }
    }
};

ensureBucketExists();

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: any) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: any) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});
