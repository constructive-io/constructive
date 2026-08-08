/**
 * The managed upload lifecycle, shared by both transports.
 *
 * Multipart-through-GraphQL and presigned two-step are transports for one
 * lifecycle, not two data models: either way an object gets a files row, a
 * server-chosen key, a tenant-resolved bucket, and a projection document that
 * carries the files row's id. The only difference is who moves the bytes.
 *
 * This module owns the parts that are the same:
 *   * `resolveManagedUploadTarget` — from a document column to a concrete
 *     (storage module, bucket, physical bucket, S3 config).
 *   * `finalizeStagedUpload` — from bytes already in S3 under a staging key to a
 *     files row and a projection document, deduplicating on content hash.
 *   * `buildFileProjection` — the document shape the column stores.
 *
 * Nothing here bakes a presigned URL into a row: `url` is populated only for a
 * public bucket, where it is a stable CDN address rather than a credential with
 * an expiry.
 */

import { Logger } from '@pgpmjs/logger';

import { resolveDefaultBucket } from './default-bucket';
import { type FileRefFieldBinding, getFileRefFieldBinding } from './file-ref-registry';
import { provisionAndRecordPhysicalBucket, resolveS3ForDatabase } from './physical-bucket';
import { type WithPgClient, withRequestPgClient } from './request-pg-client';
import { copyS3Object, deleteS3Object } from './s3-signer';
import { getBucketConfig, loadAllStorageModules } from './storage-module-cache';
import type { BucketConfig, FileProjection, PresignedUrlPluginOptions, S3Config, StorageModuleConfig } from './types';

const log = new Logger('graphile-presigned-url:managed-upload');

/**
 * The document a managed `image`/`upload` column stores.
 *
 * `id` is the files row — the load-bearing field: it is what makes the column a
 * projection rather than a second, unmanaged copy of the truth, and it is what
 * storage GC counts before collecting an object.
 *
 * `url` is retained for existing readers of the pre-managed shape and is set
 * only for public buckets. Prefer `id` plus the files row's `downloadUrl`, which
 * is late-bound and works for private buckets too.
 */
export type { FileProjection } from './types';

/**
 * Build the projection document for a files row.
 *
 * A public bucket has a stable address, so `url` is a real, durable value there.
 * A private bucket has no such address — only presigned, expiring ones — so the
 * field is omitted rather than filled with a URL that dies in an hour.
 */
export function buildFileProjection(
  file: { id: string; key: string; bucketId: string; mime: string; size: number; filename?: string | null },
  bucket: { is_public: boolean },
  s3: S3Config,
): FileProjection {
  const projection: FileProjection = {
    id: file.id,
    key: file.key,
    bucket_id: file.bucketId,
    mime: file.mime,
    size: file.size,
  };
  if (file.filename) projection.filename = file.filename;

  if (bucket.is_public && s3.publicUrlPrefix) {
    projection.url = `${s3.publicUrlPrefix.replace(/\/$/, '')}/${file.key}`;
  }

  return projection;
}

/**
 * Everything a managed upload needs before bytes move.
 */
export interface ManagedUploadTarget {
  databaseId: string;
  storageConfig: StorageModuleConfig;
  bucket: BucketConfig;
  physicalName: string;
  s3: S3Config;
  /** The registry row, or null when the column predates registration. */
  binding: FileRefFieldBinding | null;
}

/**
 * Resolve where a write to a document column lands.
 *
 * Two routes, one rule — the bucket is always resolved inside the tenant:
 *   * a registered column names its storage module, and either a logical bucket
 *     key or the reserved default tag for its declared publicness;
 *   * an unregistered column (a bare `image`/`upload` on a database provisioned
 *     before the registry) falls back to the app-scope module and the same
 *     reserved default tag. That is a *tenant* default, not an environment one.
 *
 * A database with no storage module raises: there is nowhere tenant-owned to put
 * the bytes, and the deployment's configured bucket is not an answer.
 */
export async function resolveManagedUploadTarget(args: {
  options: PresignedUrlPluginOptions;
  withPgClient: WithPgClient;
  pgSettings: Record<string, string> | null;
  databaseId: string;
  field: { schemaName: string; tableName: string; columnName: string };
  /** Publicness to use when the column is unregistered. */
  defaultPublicAccess: boolean;
}): Promise<ManagedUploadTarget> {
  const { options, withPgClient, pgSettings, databaseId, field, defaultPublicAccess } = args;

  // Registry and module registration are schema metadata, not tenant rows:
  // read them in the system lane, like every other config read here.
  const binding = await withPgClient(null, async (pgClient: any): Promise<FileRefFieldBinding | null> => {
    try {
      return await getFileRefFieldBinding(pgClient, databaseId, field);
    } catch (err: any) {
      // An unregistered column is a legitimate state (it predates the registry)
      // and falls back to the tenant's app-scope default below. Any other
      // failure — a broken connection, a missing registry table — is not.
      if (err?.name === 'FileRefFieldNotRegisteredError') return null;
      throw err;
    }
  });

  const allConfigs = await withPgClient(null, (pgClient: any) =>
    loadAllStorageModules(pgClient, databaseId),
  );

  const storageConfig = binding
    ? allConfigs.find((c) => c.id === binding.storageModuleId)
    : allConfigs.find((c) => c.scope === 'app');

  if (!storageConfig) {
    throw new Error(
      binding
        ? `STORAGE_MODULE_NOT_FOUND: file_ref_field ${binding.id} names storage module ` +
          `${binding.storageModuleId}, which database ${databaseId} does not have`
        : `STORAGE_MODULE_NOT_FOUND: ${field.schemaName}.${field.tableName}.${field.columnName} is an ` +
          `unregistered upload column and database ${databaseId} has no app-scope storage module to ` +
          'default to; there is no environment bucket to fall back to',
    );
  }

  if (storageConfig.scope !== 'app') {
    // An entity-scoped module resolves its bucket per owning row, and a
    // multipart column write does not carry one. Refuse rather than write a
    // tenant's file into whichever bucket happened to resolve.
    throw new Error(
      `STORAGE_SCOPE_UNSUPPORTED: ${field.schemaName}.${field.tableName}.${field.columnName} binds to ` +
      `'${storageConfig.scope}'-scoped storage, which resolves its bucket per owner row. ` +
      'Use the presigned upload mutation, which takes an ownerId.',
    );
  }

  const publicAccess = binding?.isPublic ?? defaultPublicAccess;

  // Bucket resolution and the bucket read run under the request role: what the
  // caller may store into is exactly what RLS lets them see.
  const coordinate = await withRequestPgClient(withPgClient, pgSettings, (pgClient) =>
    resolveDefaultBucket(
      pgClient,
      databaseId,
      storageConfig.scope,
      null,
      publicAccess,
      binding?.bucketKey ?? null,
    ),
  );

  const bucket = await withRequestPgClient(withPgClient, pgSettings, (pgClient) =>
    getBucketConfig(pgClient, storageConfig, databaseId, coordinate.resolvedKey),
  );
  if (!bucket) {
    throw new Error(
      `BUCKET_NOT_FOUND: bucket "${coordinate.resolvedKey}" resolved for ` +
      `${field.schemaName}.${field.tableName}.${field.columnName} is not readable`,
    );
  }

  if (bucket.allow_custom_keys) {
    // A path-keyed bucket (e.g. a static site's) is addressed by the keys its
    // publisher chose; this lane can only mint content-hash keys, which would
    // pollute it with unreachable objects. Path-keyed uploads go through the
    // presigned lane, which accepts an explicit `key`.
    throw new Error(
      `BUCKET_PATH_KEYED: bucket "${bucket.key}" allows custom keys and is addressed by path; ` +
      'the multipart upload lane only writes content-addressed keys. Use the presigned upload ' +
      'mutation with an explicit key.',
    );
  }

  const physicalName = bucket.physical_name === null
    ? await provisionAndRecordPhysicalBucket(
      options, withPgClient, storageConfig, databaseId, bucket, storageConfig.allowedOrigins,
    )
    : bucket.physical_name;

  return {
    databaseId,
    storageConfig,
    bucket,
    physicalName,
    s3: resolveS3ForDatabase(options, storageConfig, physicalName),
    binding,
  };
}

/**
 * Validate an upload against the resolved bucket's rules.
 *
 * The same rules the presigned lane enforces — a transport must not be a way
 * around a bucket's mime allowlist or size cap.
 */
export function assertUploadAllowedByBucket(
  target: ManagedUploadTarget,
  contentType: string,
  size: number,
): void {
  const { bucket, storageConfig } = target;

  if (bucket.allowed_mime_types && bucket.allowed_mime_types.length > 0) {
    const isAllowed = bucket.allowed_mime_types.some((pattern) => {
      if (pattern === '*/*') return true;
      if (pattern.endsWith('/*')) return contentType.startsWith(pattern.slice(0, -1));
      return contentType === pattern;
    });
    if (!isAllowed) {
      throw new Error(`CONTENT_TYPE_NOT_ALLOWED: ${contentType} not in bucket allowed types`);
    }
  }

  const maxSize = bucket.max_file_size ?? storageConfig.defaultMaxFileSize;
  if (size > maxSize) {
    throw new Error(`FILE_TOO_LARGE: ${size} bytes exceeds the ${maxSize} byte limit`);
  }
  if (size <= 0) {
    throw new Error('INVALID_FILE_SIZE: an upload must carry at least one byte');
  }
}

/** Delete an object we are abandoning, without masking the failure in progress. */
async function bestEffortDelete(s3: S3Config, key: string): Promise<void> {
  try {
    await deleteS3Object(s3, key);
  } catch (err) {
    log.warn(`Failed to clean up abandoned object ${key}: ${err}`);
  }
}

/**
 * Turn bytes already staged in S3 into a files row and a projection document.
 *
 * The content hash is only known once the stream has been read, so a streaming
 * transport writes to a staging key first and promotes here:
 *
 *   * hash already present in this bucket → drop the staged object, reuse the
 *     existing files row. Dedup is a property of the object, so it holds no
 *     matter which transport wrote it first.
 *   * otherwise → server-side copy to the content-addressed key, drop the staged
 *     object, insert the files row.
 *
 * The row is inserted *after* the bytes land, so the confirm-upload job the
 * insert trigger enqueues finds the object and completes the
 * `requested → uploaded` transition without any extra wiring here.
 *
 * Every failure path leaves S3 as it found it. Bytes written by this call and
 * not reachable through a files row would be invisible to storage GC, which
 * collects objects by walking rows — so an object is only left behind once the
 * row naming it exists.
 */
export async function finalizeStagedUpload(args: {
  target: ManagedUploadTarget;
  withPgClient: WithPgClient;
  pgSettings: Record<string, string> | null;
  staged: {
    stagingKey: string;
    contentHash: string;
    contentType: string;
    size: number;
    filename?: string | null;
  };
}): Promise<{ projection: FileProjection; deduplicated: boolean }> {
  const { target, withPgClient, pgSettings, staged } = args;
  const { storageConfig, bucket, s3 } = target;

  assertUploadAllowedByBucket(target, staged.contentType, staged.size);

  const finalKey = staged.contentHash;

  const existing = await withRequestPgClient(withPgClient, pgSettings, async (pgClient) => {
    const result = await pgClient.query({
      text: `SELECT id, key, mime_type, size, filename
             FROM ${storageConfig.filesQualifiedName}
             WHERE content_hash = $1 AND bucket_id = $2
             LIMIT 1`,
      values: [staged.contentHash, bucket.id],
    });
    return result.rows[0] as
      | { id: string; key: string; mime_type: string; size: number; filename: string | null }
      | undefined;
  });

  if (existing) {
    log.info(`Dedup hit: file ${existing.id} already carries hash ${staged.contentHash}`);
    await deleteS3Object(s3, staged.stagingKey);

    return {
      projection: buildFileProjection(
        {
          id: existing.id,
          key: existing.key,
          bucketId: bucket.id,
          mime: existing.mime_type,
          size: Number(existing.size),
          filename: existing.filename,
        },
        bucket,
        s3,
      ),
      deduplicated: true,
    };
  }

  await copyS3Object(s3, staged.stagingKey, finalKey, staged.contentType);

  let fileId: string;
  try {
    fileId = await withRequestPgClient(withPgClient, pgSettings, async (pgClient) => {
      const result = await pgClient.query({
        text: `INSERT INTO ${storageConfig.filesQualifiedName}
             (bucket_id, key, content_hash, mime_type, size, filename, is_public)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
        values: [
          bucket.id,
          finalKey,
          staged.contentHash,
          staged.contentType,
          staged.size,
          staged.filename ?? null,
          bucket.is_public,
        ],
      });
      return (result.rows[0] as { id: string }).id;
    });
  } catch (err) {
    // No row names either key, so both are unreachable to GC. Dropping the
    // promoted copy is safe precisely because the dedup probe above found no row
    // on this hash: nothing else in this bucket is entitled to those bytes.
    // Cleanup must never replace the failure that caused it.
    await bestEffortDelete(s3, finalKey);
    await bestEffortDelete(s3, staged.stagingKey);
    throw err;
  }

  await deleteS3Object(s3, staged.stagingKey);

  log.info(`Managed upload created file ${fileId} at ${bucket.key}/${finalKey}`);

  return {
    projection: buildFileProjection(
      {
        id: fileId,
        key: finalKey,
        bucketId: bucket.id,
        mime: staged.contentType,
        size: staged.size,
        filename: staged.filename,
      },
      bucket,
      s3,
    ),
    deduplicated: false,
  };
}
