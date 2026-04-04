/**
 * PostGraphile v5 Bucket Provisioner Preset
 *
 * Provides a convenient preset for including bucket provisioning support
 * in PostGraphile. Wraps the main plugin with sensible defaults.
 */

import type { GraphileConfig } from 'graphile-config';
import type { BucketProvisionerPluginOptions } from './types';
import { createBucketProvisionerPlugin } from './plugin';

/**
 * Creates a preset that includes the bucket provisioner plugin with the given options.
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
export function BucketProvisionerPreset(
  options: BucketProvisionerPluginOptions,
): GraphileConfig.Preset {
  return {
    plugins: [createBucketProvisionerPlugin(options)],
  };
}

export default BucketProvisionerPreset;
