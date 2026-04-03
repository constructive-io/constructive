/**
 * S3 client factory.
 *
 * Creates a configured S3Client from a StorageConnectionConfig.
 * Handles provider-specific settings (path-style for MinIO, etc.).
 */

import { S3Client } from '@aws-sdk/client-s3';
import type { StorageConnectionConfig } from './types';
import { ProvisionerError } from './types';

/**
 * Create an S3Client from a storage connection config.
 *
 * Provider-specific defaults:
 * - `minio`: forces path-style URLs (required by MinIO)
 * - `r2`: forces path-style URLs (required by Cloudflare R2)
 * - `s3`: uses virtual-hosted style (AWS default)
 * - `gcs`: forces path-style URLs (GCS S3-compatible API)
 * - `spaces`: uses virtual-hosted style (DigitalOcean default)
 */
export function createS3Client(config: StorageConnectionConfig): S3Client {
  if (!config.accessKeyId || !config.secretAccessKey) {
    throw new ProvisionerError(
      'INVALID_CONFIG',
      'accessKeyId and secretAccessKey are required',
    );
  }

  if (!config.region) {
    throw new ProvisionerError(
      'INVALID_CONFIG',
      'region is required',
    );
  }

  // Providers that require path-style URLs
  const pathStyleProviders = new Set(['minio', 'r2', 'gcs']);
  const forcePathStyle = config.forcePathStyle ?? pathStyleProviders.has(config.provider);

  // Non-AWS providers require an endpoint
  if (config.provider !== 's3' && !config.endpoint) {
    throw new ProvisionerError(
      'INVALID_CONFIG',
      `endpoint is required for provider '${config.provider}'`,
    );
  }

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}
