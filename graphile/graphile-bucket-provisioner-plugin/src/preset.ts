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
export function BucketProvisionerPreset(
  options: BucketProvisionerPluginOptions,
): GraphileConfig.Preset {
  return {
    plugins: [createBucketProvisionerPlugin(options)],
  };
}

export default BucketProvisionerPreset;
