/**
 * Presigned URL resolver for the Constructive presigned URL plugin.
 *
 * Reads CDN/S3/MinIO configuration from the standard env system
 * (getEnvOptions → pgpmDefaults + config files + env vars) and lazily
 * initializes an S3Client on first use.
 *
 * Follows the same lazy-init pattern as upload-resolver.ts.
 */

import { S3Client } from '@aws-sdk/client-s3';
import { getEnvOptions } from '@constructive-io/graphql-env';
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
 */
export function getPresignedUrlS3Config(): S3Config {
  if (s3Config) return s3Config;

  const { cdn } = getEnvOptions();

  // cdn is guaranteed populated — pgpmDefaults provides all CDN fields
  const { provider, bucketName, awsRegion, awsAccessKey, awsSecretKey, minioEndpoint } = cdn!;
  const isMinio = provider === 'minio';

  log.info(
    `[presigned-url-resolver] Initializing: provider=${provider} bucket=${bucketName}`,
  );

  const client = new S3Client({
    region: awsRegion,
    credentials: { accessKeyId: awsAccessKey!, secretAccessKey: awsSecretKey! },
    ...(isMinio ? { endpoint: minioEndpoint, forcePathStyle: true } : {}),
  });

  // For MinIO (path-style), public URL prefix is endpoint/bucket.
  // For S3 (virtual-hosted), it's https://{bucket}.s3.{region}.amazonaws.com
  const publicUrlPrefix = isMinio
    ? `${minioEndpoint}/${bucketName}`
    : `https://${bucketName}.s3.${awsRegion}.amazonaws.com`;

  s3Config = {
    client,
    bucket: bucketName!,
    region: awsRegion,
    publicUrlPrefix,
    ...(isMinio ? { endpoint: minioEndpoint, forcePathStyle: true } : {}),
  };

  return s3Config;
}
