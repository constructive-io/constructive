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

import { BucketProvisioner } from '@constructive-io/bucket-provisioner';
import { getEnvOptions } from '@constructive-io/graphql-env';
import { createS3Client } from '@constructive-io/s3-utils';
import { Logger } from '@pgpmjs/logger';
import type { BucketNameResolver as ProvisionerBucketNameResolver } from 'graphile-bucket-provisioner-plugin';
import type { BucketNameResolver, EnsureBucketProvisioned,S3Config } from 'graphile-presigned-url-plugin';

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
 * NOTE: The `bucket` field here is only the connection's default and is never
 * uploaded to. Every managed upload names its bucket explicitly, resolved from
 * the tenant's logical bucket row via `resolveBucketName`; there is no
 * environment-global upload bucket.
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

  const client = createS3Client({
    provider: (cdn.provider || 'minio') as any,
    region: awsRegion,
    accessKeyId: awsAccessKey,
    secretAccessKey: awsSecretKey,
    ...(endpoint ? { endpoint } : {}),
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

/**
 * Read the configured physical-bucket-name prefix (CDN_BUCKET_NAME).
 *
 * There is no default: a missing prefix throws, mirroring
 * getPresignedUrlS3Config, so an untenanted bucket name can never be minted.
 */
function getBucketNamePrefix(): string {
  const { cdn } = getEnvOptions();
  const prefix = cdn?.bucketName;

  if (!prefix) {
    throw new Error(
      '[presigned-url-resolver] Missing CDN bucket name prefix. ' +
      'Set CDN_BUCKET_NAME environment variable; there is no default bucket name.',
    );
  }

  return prefix;
}

/**
 * The single physical-bucket naming policy: `{prefix}-{bucketKey}-{databaseId}`
 * (e.g., "myapp-public-abc123def456"). Both the presigned-upload (lazy) path
 * and the bucket-provisioner (eager) path derive names from this one function
 * so a bucket's physical name is identical regardless of which path mints it.
 */
function mintPhysicalBucketName(prefix: string, databaseId: string, bucketKey: string): string {
  return `${prefix}-${bucketKey}-${databaseId}`;
}

/**
 * Create a per-(database, bucketKey) bucket name resolver for the presigned
 * URL plugin (argument order: `(databaseId, bucketKey)`).
 *
 * Uses CDN_BUCKET_NAME as a prefix. For each (database, bucketKey) pair, the
 * S3 bucket name becomes `{prefix}-{bucketKey}-{databaseId}`.
 *
 * This aligns with the bucket provisioner plugin which creates separate
 * S3 buckets per logical bucket key.
 */
export function createBucketNameResolver(): BucketNameResolver {
  const prefix = getBucketNamePrefix();
  return (databaseId: string, bucketKey: string): string =>
    mintPhysicalBucketName(prefix, databaseId, bucketKey);
}

/**
 * Create the bucket name resolver for the bucket provisioner plugin
 * (argument order: `(bucketKey, databaseId)`).
 *
 * Produces the exact same physical name as createBucketNameResolver()
 * (`{prefix}-{bucketKey}-{databaseId}`) so the eager `provisionBucket`
 * mutation mints the identical tenant-aware name that the lazy first-upload
 * path would. Throws on a missing prefix — no default bucket name.
 */
export function createProvisionerBucketNameResolver(): ProvisionerBucketNameResolver {
  const prefix = getBucketNamePrefix();
  return (bucketKey: string, databaseId: string): string =>
    mintPhysicalBucketName(prefix, databaseId, bucketKey);
}

/**
 * Resolve CORS allowed origins from the env/config system.
 *
 * Reads SERVER_ORIGIN from the standard env hierarchy
 * (pgpmDefaults → config file → env vars) and wraps it in an array.
 * Falls back to ['http://localhost:3000'] for local development.
 */
export function getAllowedOrigins(): string[] {
  const { server } = getEnvOptions();
  if (server?.origin) return [server.origin];
  return ['*'];
}

/**
 * Create a lazy bucket provisioner callback for the presigned URL plugin.
 *
 * On the first upload to an S3 bucket that doesn't exist yet, this callback
 * uses the BucketProvisioner to create and fully configure the bucket
 * (Block Public Access, CORS, policies, lifecycle rules for temp buckets).
 *
 * Uses the same S3 connection config as the bucket provisioner plugin
 * (getBucketProvisionerConnection) and reads CORS origins from
 * SERVER_ORIGIN env var (falls back to localhost for local dev).
 */
export function createEnsureBucketProvisioned(): EnsureBucketProvisioned {
  let provisioner: BucketProvisioner | null = null;

  return async (
    bucketName: string,
    accessType: 'public' | 'private' | 'temp',
    databaseId: string,
    allowedOrigins: string[] | null,
  ): Promise<void> => {
    // Per-database origins from storage_module, falling back to global SERVER_ORIGIN
    const effectiveOrigins = (allowedOrigins && allowedOrigins.length > 0)
      ? allowedOrigins
      : getAllowedOrigins();

    if (!provisioner) {
      provisioner = new BucketProvisioner({
        connection: getBucketProvisionerConnection(),
        allowedOrigins: effectiveOrigins,
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
      allowedOrigins: effectiveOrigins,
    });

    log.info(`[lazy-provision] S3 bucket "${bucketName}" provisioned successfully`);
  };
}
