/**
 * Physical bucket coordinates: reading the reconciler's recorded name and
 * building an S3 config against that known name.
 *
 * A logical bucket belongs to a tenant; a physical bucket is an S3 name. The
 * mapping is recorded on the bucket row by the storage reconciler, and that
 * value is the only coordinate anything reads — no name is ever recomputed.
 */

import type { BucketConfig, PresignedUrlPluginOptions, S3Config, StorageModuleConfig } from './types';

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
 * Build the S3 config for a *known* physical bucket. `physicalName` is
 * required — callers must resolve the coordinate from the stored row value
 * before getting here. No name is ever recomputed.
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
 * Return the reconciler's recorded physical name, or fail with a typed,
 * retryable error while reconciliation is still pending.
 */
export function assertBucketReconciled(bucket: BucketConfig, databaseId: string): string {
  if (bucket.physical_name !== null) return bucket.physical_name;

  const message =
    `STORAGE_BUCKET_NOT_RECONCILED: bucket "${bucket.key}" (id=${bucket.id}) ` +
    `for database ${databaseId} has not yet been reconciled; the reconciler has ` +
    'not yet recorded a physical name';
  const error = new Error(message);
  Object.assign(error, {
    code: 'STORAGE_BUCKET_NOT_RECONCILED',
    retryable: true,
    extensions: {
      code: 'STORAGE_BUCKET_NOT_RECONCILED',
      retryable: true,
    },
  });
  throw error;
}
