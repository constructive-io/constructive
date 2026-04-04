/**
 * Presigned URL resolver for the Constructive presigned URL plugin.
 *
 * Reads CDN/S3 configuration from the standard env system
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

  if (!cdn) {
    throw new Error(
      '[presigned-url-resolver] CDN config not found. ' +
      'Ensure CDN environment variables (AWS_ACCESS_KEY, AWS_SECRET_KEY, etc.) ' +
      'are set or that pgpmDefaults provides CDN fields.',
    );
  }

  const { bucketName, awsRegion, awsAccessKey, awsSecretKey, endpoint, publicUrlPrefix } = cdn;

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
    `[presigned-url-resolver] Initializing: bucket=${bucketName} endpoint=${endpoint}`,
  );

  const client = new S3Client({
    region: awsRegion,
    credentials: { accessKeyId: awsAccessKey, secretAccessKey: awsSecretKey },
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  });

  s3Config = {
    client,
    bucket: bucketName,
    region: awsRegion,
    publicUrlPrefix,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  };

  return s3Config;
}
