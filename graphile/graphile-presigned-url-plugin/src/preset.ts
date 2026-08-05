/**
 * PostGraphile v5 Presigned URL Preset
 *
 * Provides a convenient preset for including presigned URL upload support
 * in PostGraphile. Combines the main mutation plugin (requestUploadUrl)
 * with the downloadUrl computed field plugin.
 */

import type { GraphileConfig } from 'graphile-config';

import { createDownloadUrlPlugin } from './download-url-field';
import { createPresignedUrlPlugin } from './plugin';
import { snapshotPreloadedStorageModules } from './storage-module-source';
import type { PresignedUrlPluginOptions } from './types';

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
 *     }),
 *   ],
 * };
 * ```
 */
export function PresignedUrlPreset(
  options: PresignedUrlPluginOptions,
): GraphileConfig.Preset {
  const preloadedStorageModules = snapshotPreloadedStorageModules(
    options.preloadedStorageModules,
  );
  const buildOptions = preloadedStorageModules === undefined
    ? options
    : { ...options, preloadedStorageModules };

  return {
    plugins: [
      createPresignedUrlPlugin(buildOptions),
      createDownloadUrlPlugin(buildOptions),
    ],
  };
}

export default PresignedUrlPreset;
