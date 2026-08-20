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
import { createS3Client } from '@constructive-io/s3-utils';
import { Logger } from '@pgpmjs/logger';
import { createHash } from 'crypto';
import type { BucketNameResolver as ProvisionerBucketNameResolver } from 'graphile-bucket-provisioner-plugin';
import type { BucketNameResolver, EnsureBucketProvisioned,S3Config } from 'graphile-presigned-url-plugin';

import { getBucketProvisionerConnection } from './bucket-provisioner-resolver';
import { getGraphileSettingsRuntimeResource } from './runtime-environment';
import { getGraphileSettingsRuntimeOptions } from './runtime-options';

const log = new Logger('presigned-url-resolver');

const PRESIGNED_S3_CONFIG = Symbol('constructive.presigned-s3-config');
const ENSURE_BUCKET_PROVISIONER = Symbol(
  'constructive.ensure-bucket-provisioner'
);

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
  return getGraphileSettingsRuntimeResource(
    PRESIGNED_S3_CONFIG,
    () => {
      const { cdn } = getGraphileSettingsRuntimeOptions();

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

      return {
        client,
        bucket: bucketName,
        region: awsRegion,
        publicUrlPrefix,
        ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      };
    },
    ({ client }) => client.destroy()
  );
}

/**
 * Read the configured physical-bucket-name prefix (CDN_BUCKET_NAME).
 *
 * There is no default: a missing prefix throws, mirroring
 * getPresignedUrlS3Config, so an untenanted bucket name can never be minted.
 */
function getBucketNamePrefix(): string {
  const { cdn } = getGraphileSettingsRuntimeOptions();
  const prefix = cdn?.bucketName;

  if (!prefix) {
    throw new Error(
      '[presigned-url-resolver] Missing CDN bucket name prefix. ' +
      'Set CDN_BUCKET_NAME environment variable; there is no default bucket name.',
    );
  }

  return prefix;
}

/** S3's hard ceiling on a bucket name. */
const MAX_BUCKET_NAME_LENGTH = 63;
/** S3's floor, which a degenerate prefix/key could otherwise fall under. */
const MIN_BUCKET_NAME_LENGTH = 3;
/** Hex characters of the identity digest kept as the uniqueness tail. */
const IDENTITY_DIGEST_LENGTH = 12;
/** Readable budget: how much of the name the prefix and key may each occupy. */
const PREFIX_BUDGET = 20;
const BUCKET_KEY_BUDGET = 63 - IDENTITY_DIGEST_LENGTH - PREFIX_BUDGET - 3;

/**
 * Reduce a component to the S3 bucket-name alphabet: lowercase, `[a-z0-9-]`,
 * with runs of separators collapsed and no leading or trailing hyphen.
 *
 * Dots are legal in a bucket name but deliberately dropped — a dotted name
 * cannot be used with virtual-hosted-style HTTPS, because the wildcard
 * certificate does not match a further label.
 */
function sanitizeBucketNameComponent(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The single physical-bucket naming policy:
 * `{prefix}-{bucketKey}-{digest}` (e.g. `myapp-public-3f9c1a2b7e04`).
 *
 * Both the presigned-upload (lazy) path and the bucket-provisioner (eager) path
 * derive names from this one function, so a bucket's physical name is identical
 * regardless of which path mints it.
 *
 * The name is bounded and S3-legal by construction: the prefix and key are
 * sanitized to `[a-z0-9-]` and truncated to a readable budget, and the tail is a
 * digest of the *untruncated* identity — so two buckets whose keys agree only
 * past the truncation point, or the same key in two databases, still get distinct
 * names. Names remain stable for a given (prefix, databaseId, bucketKey) because
 * nothing here reads the clock or a counter; and an already-provisioned bucket
 * never consults this function at all, since `platform_buckets.physical_name` is
 * authoritative once recorded.
 */
function mintPhysicalBucketName(prefix: string, databaseId: string, bucketKey: string): string {
  const identity = `${prefix}/${databaseId}/${bucketKey}`;
  const digest = createHash('sha256').update(identity).digest('hex').slice(0, IDENTITY_DIGEST_LENGTH);

  const safePrefix = sanitizeBucketNameComponent(prefix).slice(0, PREFIX_BUDGET).replace(/-+$/, '');
  const safeKey = sanitizeBucketNameComponent(bucketKey).slice(0, BUCKET_KEY_BUDGET).replace(/-+$/, '');

  const name = [safePrefix, safeKey, digest].filter((part) => part.length > 0).join('-');

  // The digest alone already satisfies both bounds, so this is only reachable
  // when both readable components sanitize away to nothing.
  if (name.length < MIN_BUCKET_NAME_LENGTH || name.length > MAX_BUCKET_NAME_LENGTH) {
    throw new Error(
      `[presigned-url-resolver] Cannot mint a legal S3 bucket name for key "${bucketKey}": got "${name}"`,
    );
  }

  return name;
}

/**
 * Create a per-(database, bucketKey) bucket name resolver for the presigned
 * URL plugin (argument order: `(databaseId, bucketKey)`).
 *
 * Uses CDN_BUCKET_NAME as a prefix. For each (database, bucketKey) pair, the
 * S3 bucket name becomes `{prefix}-{bucketKey}-{digest}`.
 *
 * This aligns with the bucket provisioner plugin which creates separate
 * S3 buckets per logical bucket key.
 */
export function createBucketNameResolver(): BucketNameResolver {
  return (databaseId: string, bucketKey: string): string =>
    mintPhysicalBucketName(getBucketNamePrefix(), databaseId, bucketKey);
}

/**
 * Create the bucket name resolver for the bucket provisioner plugin
 * (argument order: `(bucketKey, databaseId)`).
 *
 * Produces the exact same physical name as createBucketNameResolver()
 * (`{prefix}-{bucketKey}-{digest}`) so the eager `provisionBucket`
 * mutation mints the identical tenant-aware name that the lazy first-upload
 * path would. Throws on a missing prefix — no default bucket name.
 */
export function createProvisionerBucketNameResolver(): ProvisionerBucketNameResolver {
  return (bucketKey: string, databaseId: string): string =>
    mintPhysicalBucketName(getBucketNamePrefix(), databaseId, bucketKey);
}

/**
 * Resolve CORS allowed origins from the env/config system.
 *
 * Reads SERVER_ORIGIN from the standard env hierarchy
 * (pgpmDefaults → config file → env vars) and wraps it in an array.
 * Falls back to ['http://localhost:3000'] for local development.
 */
export function getAllowedOrigins(): string[] {
  const { server } = getGraphileSettingsRuntimeOptions();
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

    const provisioner = getGraphileSettingsRuntimeResource(
      ENSURE_BUCKET_PROVISIONER,
      () => new BucketProvisioner({
        connection: getBucketProvisionerConnection(),
        allowedOrigins: effectiveOrigins,
      }),
      (resource) => resource.getClient().destroy()
    );

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
