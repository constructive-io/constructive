/**
 * Bucket provisioner resolver for the Constructive bucket provisioner plugin.
 *
 * Reads CDN/S3 configuration from the standard env system
 * (getEnvOptions -> pgpmDefaults + config files + env vars) and lazily
 * returns a StorageConnectionConfig on first use.
 *
 * Follows the same lazy-init pattern as presigned-url-resolver.ts.
 */

import { getEnvOptions } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import type { StorageConnectionConfig } from 'graphile-bucket-provisioner-plugin';

const log = new Logger('bucket-provisioner-resolver');

let connectionConfig: StorageConnectionConfig | null = null;

/**
 * Lazily initialize and return the StorageConnectionConfig for the
 * bucket provisioner plugin.
 *
 * Reads CDN config on first call via getEnvOptions() (which already merges
 * pgpmDefaults -> config file -> env vars) and caches the result.
 * Same CDN config source as presigned-url-resolver.ts.
 */
export function getBucketProvisionerConnection(): StorageConnectionConfig {
  if (connectionConfig) return connectionConfig;

  const { cdn } = getEnvOptions();

  if (!cdn) {
    throw new Error(
      '[bucket-provisioner-resolver] CDN config not found. ' +
      'Ensure CDN environment variables (AWS_ACCESS_KEY, AWS_SECRET_KEY, etc.) ' +
      'are set or that pgpmDefaults provides CDN fields.',
    );
  }

  const { provider, awsRegion, awsAccessKey, awsSecretKey, endpoint } = cdn;

  if (!awsAccessKey || !awsSecretKey) {
    throw new Error(
      '[bucket-provisioner-resolver] Missing S3 credentials. ' +
      'Set AWS_ACCESS_KEY and AWS_SECRET_KEY environment variables.',
    );
  }

  log.info(
    `[bucket-provisioner-resolver] Initializing: provider=${provider} endpoint=${endpoint}`,
  );

  connectionConfig = {
    provider: (provider as StorageConnectionConfig['provider']) || 'minio',
    region: awsRegion || 'us-east-1',
    accessKeyId: awsAccessKey,
    secretAccessKey: awsSecretKey,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  };

  return connectionConfig;
}
