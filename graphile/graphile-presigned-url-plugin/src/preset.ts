/**
 * PostGraphile v5 Presigned URL Preset
 *
 * Provides a convenient preset for including presigned URL upload support
 * in PostGraphile. Combines the main mutation plugin (requestUploadUrl,
 * confirmUpload) with the downloadUrl computed field plugin.
 */

import type { GraphileConfig } from 'graphile-config';
import type { PresignedUrlPluginOptions } from './types';
import { createPresignedUrlPlugin } from './plugin';
import { createDownloadUrlPlugin } from './download-url-field';

/**
 * Creates a preset that includes the presigned URL plugins with the given options.
 *
 * @example
 * ```typescript
 * import { PresignedUrlPreset } from 'graphile-presigned-url-plugin';
 * import { S3Client } from '@aws-sdk/client-s3';
 *
 * const s3Client = new S3Client({ region: 'us-east-1' });
 *
 * const preset = {
 *   extends: [
 *     PresignedUrlPreset({
 *       s3: {
 *         client: s3Client,
 *         bucket: 'my-bucket',
 *         publicUrlPrefix: 'https://cdn.example.com',
 *       },
 *       urlExpirySeconds: 900,
 *       maxFileSize: 200 * 1024 * 1024,
 *     }),
 *   ],
 * };
 * ```
 */
export function PresignedUrlPreset(
  options: PresignedUrlPluginOptions,
): GraphileConfig.Preset {
  return {
    plugins: [
      createPresignedUrlPlugin(options),
      createDownloadUrlPlugin(options),
    ],
  };
}

export default PresignedUrlPreset;
