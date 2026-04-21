/**
 * S3 client factory.
 *
 * Delegates to @constructive-io/s3-utils for the actual S3Client creation.
 * Re-exports createS3Client so existing consumers of bucket-provisioner
 * continue to work without changes.
 */

import { createS3Client as createS3ClientFromUtils, S3ConfigError } from '@constructive-io/s3-utils';
import type { S3Client } from '@aws-sdk/client-s3';
import type { StorageConnectionConfig } from './types';
import { ProvisionerError } from './types';
import type { ProvisionerErrorCode } from './types';

/**
 * Create an S3Client from a storage connection config.
 *
 * Delegates to @constructive-io/s3-utils/createS3Client.
 * This wrapper exists for backward compatibility — new code should
 * import createS3Client from @constructive-io/s3-utils directly.
 *
 * Catches S3ConfigError from s3-utils and re-throws as ProvisionerError
 * so existing consumers that catch ProvisionerError continue to work.
 */
export function createS3Client(config: StorageConnectionConfig): S3Client {
  try {
    return createS3ClientFromUtils(config);
  } catch (err) {
    if (err instanceof S3ConfigError) {
      throw new ProvisionerError(err.code as ProvisionerErrorCode, err.message);
    }
    throw err;
  }
}
