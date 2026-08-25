/**
 * Bucket provisioner resolver for the Constructive bucket provisioner plugin.
 *
 * Reads CDN/S3 configuration from the standard env system
 * (getEnvOptions -> pgpmDefaults + config files + env vars) and lazily
 * returns a StorageConnectionConfig on first use.
 *
 * Follows the same lazy-init pattern as presigned-url-resolver.ts.
 */

import { Logger } from '@pgpmjs/logger';
import type { StorageConnectionConfig } from 'graphile-bucket-provisioner-plugin';

import { getGraphileSettingsRuntimeResource } from './runtime-environment';
import { getGraphileSettingsRuntimeOptions } from './runtime-options';

const log = new Logger('bucket-provisioner-resolver');
const BUCKET_CONNECTION = Symbol('constructive.bucket-connection');

/**
 * Lazily initialize and return the StorageConnectionConfig for the
 * bucket provisioner plugin.
 *
 * Reads CDN config on first use in each operation/server runtime and caches it
 * only for that scope. Concurrent runtimes cannot share credentials.
 */
export function getBucketProvisionerConnection(): StorageConnectionConfig {
  return getGraphileSettingsRuntimeResource(BUCKET_CONNECTION, () => {
    const { cdn } = getGraphileSettingsRuntimeOptions();

    if (!cdn) {
      throw new Error(
        '[bucket-provisioner-resolver] CDN config not found. ' +
          'Ensure CDN environment variables (AWS_ACCESS_KEY, AWS_SECRET_KEY, etc.) ' +
          'are set or that pgpmDefaults provides CDN fields.'
      );
    }

    const { provider, awsRegion, awsAccessKey, awsSecretKey, endpoint } = cdn;

    if (!awsAccessKey || !awsSecretKey) {
      throw new Error(
        '[bucket-provisioner-resolver] Missing S3 credentials. ' +
          'Set AWS_ACCESS_KEY and AWS_SECRET_KEY environment variables.'
      );
    }

    log.info(
      `[bucket-provisioner-resolver] Initializing: provider=${provider} endpoint=${endpoint}`
    );

    return {
      provider: (provider as StorageConnectionConfig['provider']) || 'minio',
      region: awsRegion || 'us-east-1',
      accessKeyId: awsAccessKey,
      secretAccessKey: awsSecretKey,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    };
  });
}
