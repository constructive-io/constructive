/**
 * Presigned URL resolver for the Constructive presigned URL plugin.
 *
 * Reads CDN/S3 configuration from the standard env system
 * (getEnvOptions → pgpmDefaults + config files + env vars) and lazily
 * initializes an S3Client on first use.
 *
 * Follows the same lazy-init pattern as upload-resolver.ts.
 *
 * `cdn.endpoint` (CDN_ENDPOINT) is the host the server talks to; presigned URLs
 * are signed for `cdn.publicEndpoint` (CDN_PUBLIC_ENDPOINT) when it is set, so a
 * cluster-internal storage host never reaches a client.
 */

import { getEnvOptions } from '@constructive-io/graphql-env';
import { createS3Client } from '@constructive-io/s3-utils';
import { Logger } from '@pgpmjs/logger';
import type { S3Config } from 'graphile-presigned-url-plugin';

const log = new Logger('presigned-url-resolver');

let s3Config: S3Config | null = null;

/**
 * Lazily initialize and return the S3Config for the presigned URL plugin.
 *
 * Reads CDN config on first call via getEnvOptions() (which already merges
 * pgpmDefaults → config file → env vars), creates an S3Client, and caches
 * the result. Same CDN config as upload-resolver.ts.
 *
 * NOTE: The `bucket` field here is only the connection's default and is never
 * uploaded to. Every managed upload names its bucket explicitly, resolved from
 * the tenant's logical bucket row; there is no environment-global upload
 * bucket.
 */
export function getPresignedUrlS3Config(): S3Config {
  if (s3Config) return s3Config;

  const { cdn } = getEnvOptions();

  if (!cdn) {
    throw new Error(
      '[presigned-url-resolver] CDN config not found. ' +
      'Ensure CDN environment variables (AWS_ACCESS_KEY, AWS_SECRET_KEY, etc.) ' +
      'are set or that pgpmDefaults provides CDN fields.',
    );
  }

  const { bucketName, awsRegion, awsAccessKey, awsSecretKey, endpoint, publicEndpoint, publicUrlPrefix } = cdn;

  if (!awsAccessKey || !awsSecretKey) {
    throw new Error(
      '[presigned-url-resolver] Missing S3 credentials. ' +
      'Set AWS_ACCESS_KEY and AWS_SECRET_KEY environment variables.',
    );
  }

  if (!bucketName) {
    throw new Error(
      '[presigned-url-resolver] Missing CDN bucket name. ' +
      'Set CDN_BUCKET_NAME environment variable.',
    );
  }

  log.info(
    `[presigned-url-resolver] Initializing: bucket=${bucketName} endpoint=${endpoint} ` +
    `publicEndpoint=${publicEndpoint ?? endpoint}`,
  );

  const connect = (url: string | undefined) => createS3Client({
    provider: (cdn.provider || 'minio') as any,
    region: awsRegion,
    accessKeyId: awsAccessKey,
    secretAccessKey: awsSecretKey,
    ...(url ? { endpoint: url } : {}),
  });

  s3Config = {
    client: connect(endpoint),
    bucket: bucketName,
    region: awsRegion,
    publicUrlPrefix,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    ...(publicEndpoint ? { presignClient: connect(publicEndpoint), publicEndpoint } : {}),
  };

  return s3Config;
}
