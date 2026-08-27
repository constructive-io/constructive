/**
 * Bucket Provisioner Plugin for PostGraphile v5
 *
 * Provides an explicit `provisionBucket` mutation for PostGraphile v5.
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
 *     }),
 *   ],
 * };
 * ```
 */

export { BucketProvisionerPlugin, createBucketProvisionerPlugin } from './plugin';
export { BucketProvisionerPreset } from './preset';
export type {
  BucketAccessType,
  BucketNameResolver,
  BucketProvisionerPluginOptions,
  ConnectionConfigOrGetter,
  ProvisionBucketInput,
  ProvisionBucketPayload,
  ProvisionResult,
  StorageConnectionConfig,
  StorageProvider,
} from './types';
