import { S3Client } from '@aws-sdk/client-s3';

console.log('Initializing S3 Client with:', {
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ? '***' + process.env.AWS_ACCESS_KEY_ID.slice(-4) : 'undefined',
});

export const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    },
    endpoint: process.env.AWS_ENDPOINT, // e.g. http://127.0.0.1:4566
    forcePathStyle: true, // Required for LocalStack
});
