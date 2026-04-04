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
 * import { getEnvOptions } from '@constructive-io/graphql-env';
 *
 * // Use a lazy getter so env vars are read at runtime, not import time
 * function getConnection() {
 *   const { cdn } = getEnvOptions();
 *   return {
 *     provider: cdn?.provider || 'minio',
 *     region: cdn?.awsRegion || 'us-east-1',
 *     endpoint: cdn?.endpoint || 'http://minio:9000',
 *     accessKeyId: cdn?.awsAccessKey!,
 *     secretAccessKey: cdn?.awsSecretKey!,
 *   };
 * }
 *
 * const preset = {
 *   extends: [
 *     BucketProvisionerPreset({
 *       connection: getConnection, // pass function ref, NOT getConnection()
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
