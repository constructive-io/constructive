export * from './client';
export * from './policies';
export * from './presigned';
export * from './utils';

// Re-export S3Client so consumers don't need @aws-sdk/client-s3 directly
export { S3Client } from '@aws-sdk/client-s3';
export type { S3ClientConfig } from '@aws-sdk/client-s3';
