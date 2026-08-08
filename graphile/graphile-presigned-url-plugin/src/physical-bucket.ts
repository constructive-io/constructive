/**
 * Physical bucket coordinates: minting a name once, recording it, and building
 * an S3 config against a *known* name.
 *
 * A logical bucket belongs to a tenant; a physical bucket is an S3 name. The
 * mapping is recorded on the bucket row the first time it is provisioned, and
 * from then on the recorded value is the only coordinate anything reads — no
 * name is ever recomputed from a prefix convention, and there is no
 * environment-level bucket standing in for a tenant's.
 */

import { Logger } from '@pgpmjs/logger';

import { type WithPgClient, withRequestPgClient } from './request-pg-client';
import { isS3BucketProvisioned, markS3BucketProvisioned } from './storage-module-cache';
import type { BucketConfig, PresignedUrlPluginOptions, S3Config, StorageModuleConfig } from './types';

const log = new Logger('graphile-presigned-url:physical-bucket');

/**
 * Resolve the plugin's S3 connection (credentials, endpoint, region), memoizing
 * a lazy getter on first use.
 *
 * `s3.bucket` on the result is the deployment's *default* physical bucket. It is
 * a connection default only — never a tenant's bucket. Every upload path
 * resolves its physical bucket from the tenant's bucket row.
 */
export function resolveS3(options: PresignedUrlPluginOptions): S3Config {
  if (typeof options.s3 === 'function') {
    const resolved = options.s3();
    options.s3 = resolved;
    return resolved;
  }
  return options.s3;
}

/**
 * Mint the physical S3 bucket name for a logical bucket's first provision.
 *
 * This is a naming *policy*, consulted exactly once per bucket — before the
 * physical bucket exists. Once provisioned, the recorded `physical_name` on the
 * row is authoritative and this function must not be consulted again.
 *
 * There is no fallback to the configured `s3.bucket`: a deployment-wide bucket
 * name is not a tenant's storage, and silently minting one is how objects ended
 * up in a bucket no database owned. A deployment that wants per-tenant buckets
 * must supply the policy.
 */
export function mintPhysicalBucketName(
  options: PresignedUrlPluginOptions,
  databaseId: string,
  bucketKey: string,
): string {
  if (!options.resolveBucketName) {
    throw new Error(
      'STORAGE_BUCKET_NAME_POLICY_MISSING: no resolveBucketName was configured, so there is ' +
      `no name to provision for bucket "${bucketKey}" of database ${databaseId}. ` +
      'Physical bucket naming is a deployment policy; the configured s3.bucket is a ' +
      'connection default and is never a tenant bucket.',
    );
  }
  return options.resolveBucketName(databaseId, bucketKey);
}

/**
 * Build the S3 config for a *known* physical bucket. `physicalName` is
 * required — callers must resolve the coordinate (stored row value, or a
 * freshly provisioned name) before getting here. No name is ever recomputed.
 */
export function resolveS3ForDatabase(
  options: PresignedUrlPluginOptions,
  storageConfig: StorageModuleConfig,
  physicalName: string,
): S3Config {
  const globalS3 = resolveS3(options);
  const publicUrlPrefix = storageConfig.publicUrlPrefix != null
    ? storageConfig.publicUrlPrefix
    : globalS3.publicUrlPrefix;

  if (physicalName === globalS3.bucket && publicUrlPrefix === globalS3.publicUrlPrefix) {
    return globalS3;
  }

  return {
    ...globalS3,
    bucket: physicalName,
    ...(publicUrlPrefix != null ? { publicUrlPrefix } : {}),
  };
}

/**
 * First provision of a logical bucket: mint a name, create the physical S3
 * bucket, and record the exact name on the source row. Returns the recorded
 * physical name.
 *
 * Only called when the row has no `physical_name` yet. Afterwards the stored
 * value is the durable coordinate: route resolution and every later read use
 * it verbatim; nothing is recomputed.
 *
 * The record write runs in the system lane (privileged role, so it bypasses the
 * RLS that stops request roles from UPDATE-ing bucket rows) — it is server
 * bookkeeping, not request data. It still carries the tenant `database_id`
 * claim, because the buckets table's catalog-sync trigger calls
 * `jwt_private.current_database_id()` and would otherwise raise
 * DATABASE_CLAIM_REQUIRED; `withRequestPgClient` applies that claim inside the
 * write's transaction without switching off the privileged role.
 * `bucket` (the cached config) is mutated in place so subsequent reads observe
 * the recorded name without a DB round-trip.
 */
export async function provisionAndRecordPhysicalBucket(
  options: PresignedUrlPluginOptions,
  withPgClient: WithPgClient,
  storageConfig: StorageModuleConfig,
  databaseId: string,
  bucket: BucketConfig,
  allowedOrigins: string[] | null,
): Promise<string> {
  const s3BucketName = mintPhysicalBucketName(options, databaseId, bucket.key);

  if (options.ensureBucketProvisioned && !isS3BucketProvisioned(s3BucketName)) {
    log.info(`Lazy-provisioning S3 bucket "${s3BucketName}" for database ${databaseId}`);
    await options.ensureBucketProvisioned(s3BucketName, bucket.type, databaseId, allowedOrigins);
    markS3BucketProvisioned(s3BucketName);
    log.info(`Lazy-provisioned S3 bucket "${s3BucketName}" successfully`);
  }

  // Record the physical coordinate on the source row. The `physical_name IS NULL`
  // guard keeps this idempotent and race-safe across concurrent first uploads.
  // The catalog-sync trigger on this UPDATE needs `jwt.claims.database_id`, so the
  // write runs under the resolved database claim (privileged role preserved).
  await withRequestPgClient(withPgClient, { 'jwt.claims.database_id': databaseId }, (client) =>
    client.query({
      text: `UPDATE ${storageConfig.bucketsQualifiedName}
             SET physical_name = $1
             WHERE id = $2 AND physical_name IS NULL`,
      values: [s3BucketName, bucket.id],
    }),
  );
  bucket.physical_name = s3BucketName;
  log.info(`Recorded physical_name="${s3BucketName}" on bucket ${bucket.id}`);
  return s3BucketName;
}
