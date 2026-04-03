/**
 * Bucket Provisioner Plugin for PostGraphile v5
 *
 * Provides automatic S3 bucket provisioning for PostGraphile v5.
 * When bucket rows are created via GraphQL mutations, this plugin
 * automatically provisions the corresponding S3 bucket with the
 * correct privacy policies, CORS rules, and lifecycle settings.
 *
 * Also provides an explicit `provisionBucket` mutation for manual
 * provisioning or re-provisioning of S3 buckets.
 *
 * @example
 * ```typescript
 * import { BucketProvisionerPreset } from 'graphile-bucket-provisioner-plugin';
 *
 * const preset = {
 *   extends: [
 *     BucketProvisionerPreset({
 *       connection: {
 *         provider: 'minio',
 *         region: 'us-east-1',
 *         endpoint: 'http://minio:9000',
 *         accessKeyId: process.env.MINIO_ACCESS_KEY!,
 *         secretAccessKey: process.env.MINIO_SECRET_KEY!,
 *       },
 *       allowedOrigins: ['https://app.example.com'],
 *       bucketNamePrefix: 'myapp',
 *     }),
 *   ],
 * };
 * ```
 */

export { BucketProvisionerPlugin, createBucketProvisionerPlugin } from './plugin';
export { BucketProvisionerPreset } from './preset';
export type {
  BucketProvisionerPluginOptions,
  ConnectionConfigOrGetter,
  BucketNameResolver,
  ProvisionBucketInput,
  ProvisionBucketPayload,
  StorageConnectionConfig,
  StorageProvider,
  BucketAccessType,
  ProvisionResult,
} from './types';
