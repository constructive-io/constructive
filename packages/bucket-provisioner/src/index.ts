/**
 * @constructive-io/bucket-provisioner
 *
 * S3-compatible bucket provisioning library for the Constructive storage module.
 * Creates and configures buckets with the correct privacy policies, CORS rules,
 * versioning, and lifecycle settings for private and public file storage.
 *
 * @example
 * ```typescript
 * import { BucketProvisioner } from '@constructive-io/bucket-provisioner';
 *
 * const provisioner = new BucketProvisioner({
 *   connection: {
 *     provider: 'minio',
 *     region: 'us-east-1',
 *     endpoint: 'http://minio:9000',
 *     accessKeyId: 'minioadmin',
 *     secretAccessKey: 'minioadmin',
 *   },
 *   allowedOrigins: ['https://app.example.com'],
 * });
 *
 * const result = await provisioner.provision({
 *   bucketName: 'my-app-storage',
 *   accessType: 'private',
 * });
 * ```
 */

// Core provisioner
export { BucketProvisioner } from './provisioner';
export type { BucketProvisionerOptions } from './provisioner';

// S3 client factory
export { createS3Client } from './client';

// Policy builders
export {
  getPublicAccessBlock,
  buildPublicReadPolicy,
  buildCloudFrontOacPolicy,
  buildPresignedUrlIamPolicy,
} from './policies';
export type {
  PublicAccessBlockConfig,
  BucketPolicyDocument,
  BucketPolicyStatement,
} from './policies';

// CORS builders
export { buildUploadCorsRules, buildPrivateCorsRules } from './cors';

// Lifecycle builders
export { buildTempCleanupRule, buildAbortIncompleteMultipartRule } from './lifecycle';

// Types
export type {
  StorageProvider,
  StorageConnectionConfig,
  BucketAccessType,
  CreateBucketOptions,
  CorsRule,
  LifecycleRule,
  ProvisionResult,
  ProvisionerErrorCode,
} from './types';
export { ProvisionerError } from './types';
