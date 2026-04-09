/**
 * Presigned URL resolver for the Constructive presigned URL plugin.
 *
 * Reads CDN/S3 configuration from the standard env system
 * (getEnvOptions → pgpmDefaults + config files + env vars) and lazily
 * initializes an S3Client on first use.
 *
 * Also provides a per-database bucket name resolver that derives the
 * S3 bucket name from the database UUID + a configurable prefix.
 *
 * Follows the same lazy-init pattern as upload-resolver.ts.
 */

import { S3Client } from '@aws-sdk/client-s3';
import { getEnvOptions } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import type { S3Config, BucketNameResolver, EnsureBucketProvisioned } from 'graphile-presigned-url-plugin';
import { BucketProvisioner } from '@constructive-io/bucket-provisioner';
import { getBucketProvisionerConnection } from './bucket-provisioner-resolver';

const log = new Logger('presigned-url-resolver');

let s3Config: S3Config | null = null;

/**
 * Lazily initialize and return the S3Config for the presigned URL plugin.
 *
 * Reads CDN config on first call via getEnvOptions() (which already merges
 * pgpmDefaults → config file → env vars), creates an S3Client, and caches
 * the result. Same CDN config as upload-resolver.ts.
 *
 * NOTE: The `bucket` field here is the global fallback bucket name
 * (from BUCKET_NAME env var). When `resolveBucketName` is provided,
 * per-database bucket names take precedence for all S3 operations.
 */
export function getPresignedUrlS3Config(): S3Config {
  if (s3Config) return s3Config;

  const { cdn } = getEnvOptions();

  // cdn is guaranteed populated — pgpmDefaults provides all CDN fields
  const { bucketName, awsRegion, awsAccessKey, awsSecretKey, endpoint, publicUrlPrefix } = cdn!;

  log.info(
    `[presigned-url-resolver] Initializing: bucket=${bucketName} endpoint=${endpoint}`,
  );

  const client = new S3Client({
    region: awsRegion,
    credentials: { accessKeyId: awsAccessKey!, secretAccessKey: awsSecretKey! },
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  });

  s3Config = {
    client,
    bucket: bucketName!,
    region: awsRegion,
    publicUrlPrefix,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  };

  return s3Config;
}

/**
 * Create a per-database bucket name resolver.
 *
 * Uses the BUCKET_NAME env var as a prefix. For each database, the S3 bucket
 * name becomes `{prefix}-{databaseId}` (e.g., "myapp-abc123def456").
 *
 * In local development with MinIO (default BUCKET_NAME="test-bucket"),
 * all databases share the same bucket for simplicity — the resolver
 * returns the prefix as-is when it looks like a local dev bucket.
 *
 * In production, set BUCKET_NAME to your org prefix (e.g., "myapp")
 * and each database gets its own isolated S3 bucket.
 */
export function createBucketNameResolver(): BucketNameResolver {
  const { cdn } = getEnvOptions();
  const prefix = cdn?.bucketName || 'test-bucket';

  return (databaseId: string): string => {
    return `${prefix}-${databaseId}`;
  };
}

/**
 * Create a lazy bucket provisioner callback for the presigned URL plugin.
 *
 * On the first upload to an S3 bucket that doesn't exist yet, this callback
 * uses the BucketProvisioner to create and fully configure the bucket
 * (Block Public Access, CORS, policies, lifecycle rules for temp buckets).
 *
 * Uses the same S3 connection config as the bucket provisioner plugin
 * (getBucketProvisionerConnection) and the same CORS origins.
 *
 * @param allowedOrigins - CORS origins for presigned URL uploads
 */
export function createEnsureBucketProvisioned(
  allowedOrigins: string[],
): EnsureBucketProvisioned {
  let provisioner: BucketProvisioner | null = null;

  return async (
    bucketName: string,
    accessType: 'public' | 'private' | 'temp',
    databaseId: string,
  ): Promise<void> => {
    if (!provisioner) {
      provisioner = new BucketProvisioner({
        connection: getBucketProvisionerConnection(),
        allowedOrigins,
      });
    }

    log.info(
      `[lazy-provision] Provisioning S3 bucket "${bucketName}" ` +
      `(type=${accessType}) for database ${databaseId}`,
    );

    await provisioner.provision({
      bucketName,
      accessType,
      versioning: false,
    });

    log.info(`[lazy-provision] S3 bucket "${bucketName}" provisioned successfully`);
  };
}
