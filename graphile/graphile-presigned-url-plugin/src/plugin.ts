/**
 * Presigned URL Plugin for PostGraphile v5
 *
 * Adds presigned URL upload support to PostGraphile v5:
 *
 * 1. `requestUploadUrl` mutation — generates a presigned PUT URL for direct
 *    client-to-S3 upload. Checks bucket access via RLS, deduplicates by
 *    content hash via UNIQUE(bucket_id, key) constraint.
 *
 * 2. `downloadUrl` computed field on File types — generates presigned GET URLs
 *    for private files, returns public URL prefix + key for public files.
 *
 * Uses the extendSchema + grafast plan pattern (same as PublicKeySignature).
 */

import { context as grafastContext, lambda, object } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import { extendSchema, gql } from 'graphile-utils';
import { Logger } from '@pgpmjs/logger';

import type { PresignedUrlPluginOptions, S3Config, StorageModuleConfig, BucketConfig } from './types';
import { getStorageModuleConfig, getStorageModuleConfigForOwner, getBucketConfig, resolveStorageModuleByFileId, isS3BucketProvisioned, markS3BucketProvisioned } from './storage-module-cache';
import { generatePresignedPutUrl, deleteS3Object } from './s3-signer';

const log = new Logger('graphile-presigned-url:plugin');

// --- Protocol-level constants (not configurable) ---

const MAX_CONTENT_HASH_LENGTH = 128;
const MAX_CONTENT_TYPE_LENGTH = 255;
const MAX_BUCKET_KEY_LENGTH = 255;
const MAX_CUSTOM_KEY_LENGTH = 1024;
const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/;
const CUSTOM_KEY_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.\-\/]*$/;

// --- Helpers ---

/**
 * Validate a SHA-256 hex string.
 */
function isValidSha256(hash: string): boolean {
  return SHA256_HEX_REGEX.test(hash);
}

/**
 * Build the S3 key from content hash.
 * Format: {contentHash} (flat namespace, content-addressed)
 */
function buildS3Key(contentHash: string): string {
  return contentHash;
}

/**
 * Validate a custom S3 key.
 * Must be 1-1024 chars, no path traversal, no leading slash, no null bytes.
 */
function validateCustomKey(key: string): string | null {
  if (key.length === 0 || key.length > MAX_CUSTOM_KEY_LENGTH) {
    return 'INVALID_KEY_LENGTH: must be 1-1024 characters';
  }
  if (key.includes('..')) {
    return 'INVALID_KEY: path traversal (..) not allowed';
  }
  if (key.startsWith('/')) {
    return 'INVALID_KEY: leading slash not allowed';
  }
  if (key.includes('\0')) {
    return 'INVALID_KEY: null bytes not allowed';
  }
  if (!CUSTOM_KEY_REGEX.test(key)) {
    return 'INVALID_KEY: must start with alphanumeric and contain only alphanumeric, dots, hyphens, underscores, and slashes';
  }
  return null;
}

/**
 * Derive an ltree path from a custom S3 key's directory portion.
 * e.g., "reports/2024/Q1/revenue.pdf" → "reports.2024.Q1"
 * Returns null if the key has no directory component.
 */
function derivePathFromKey(key: string): string | null {
  const lastSlash = key.lastIndexOf('/');
  if (lastSlash <= 0) return null;
  const dir = key.substring(0, lastSlash);
  return dir.replace(/\//g, '.');
}

/**
 * Resolve the database_id from the JWT context.
 * The server middleware sets jwt.claims.database_id, which is accessible
 * via jwt_private.current_database_id() — a simple function call, no
 * metaschema query needed.
 */
async function resolveDatabaseId(pgClient: any): Promise<string | null> {
  const result = await pgClient.query({
    text: `SELECT jwt_private.current_database_id() AS id`,
  });
  return result.rows[0]?.id ?? null;
}

// --- Plugin factory ---

/**
 * Resolve the S3 config from the options. If the option is a lazy getter
 * function, call it (and cache the result). This avoids reading env vars
 * or constructing an S3Client at module-import time.
 */
function resolveS3(options: PresignedUrlPluginOptions): S3Config {
  if (typeof options.s3 === 'function') {
    const resolved = options.s3();
    // Cache so subsequent calls don't re-evaluate
    options.s3 = resolved;
    return resolved;
  }
  return options.s3;
}

/**
 * Build a per-database S3Config by overlaying storage_module overrides
 * onto the global S3Config.
 *
 * - Bucket name: from resolveBucketName(databaseId) if provided, else global
 * - publicUrlPrefix: from storageConfig.publicUrlPrefix if set, else global
 * - S3 client (credentials, endpoint): always global (shared IAM key)
 */
function resolveS3ForDatabase(
  options: PresignedUrlPluginOptions,
  storageConfig: StorageModuleConfig,
  databaseId: string,
): S3Config {
  const globalS3 = resolveS3(options);
  const bucket = options.resolveBucketName
    ? options.resolveBucketName(databaseId)
    : globalS3.bucket;
  const publicUrlPrefix = storageConfig.publicUrlPrefix ?? globalS3.publicUrlPrefix;

  if (bucket === globalS3.bucket && publicUrlPrefix === globalS3.publicUrlPrefix) {
    return globalS3;
  }

  return {
    ...globalS3,
    bucket,
    ...(publicUrlPrefix != null ? { publicUrlPrefix } : {}),
  };
}

/**
 * Ensure the S3 bucket for a database exists, provisioning it lazily if needed.
 *
 * Checks an in-memory Set of known-provisioned bucket names. On the first
 * request for an unseen bucket, calls the `ensureBucketProvisioned` callback
 * (which creates the bucket with correct CORS, policies, etc.), then marks
 * it as provisioned so subsequent requests skip the check entirely.
 *
 * If no `ensureBucketProvisioned` callback is configured, this is a no-op.
 */
async function ensureS3BucketExists(
  options: PresignedUrlPluginOptions,
  s3BucketName: string,
  bucket: BucketConfig,
  databaseId: string,
  allowedOrigins: string[] | null,
): Promise<void> {
  if (!options.ensureBucketProvisioned) return;
  if (isS3BucketProvisioned(s3BucketName)) return;

  log.info(`Lazy-provisioning S3 bucket "${s3BucketName}" for database ${databaseId}`);
  await options.ensureBucketProvisioned(s3BucketName, bucket.type, databaseId, allowedOrigins);
  markS3BucketProvisioned(s3BucketName);
  log.info(`Lazy-provisioned S3 bucket "${s3BucketName}" successfully`);
}

export function createPresignedUrlPlugin(
  options: PresignedUrlPluginOptions,
): GraphileConfig.Plugin {

  return extendSchema(() => ({
    typeDefs: gql`
      input RequestUploadUrlInput {
        """Bucket key (e.g., "public", "private")"""
        bucketKey: String!
        """
        Owner entity ID for entity-scoped uploads.
        Omit for app-level (database-wide) storage.
        When provided, resolves the storage module for the entity type
        that owns this entity instance (e.g., a data room ID, team ID).
        """
        ownerId: UUID
        """SHA-256 content hash computed by the client (hex-encoded, 64 chars)"""
        contentHash: String!
        """MIME type of the file (e.g., "image/png")"""
        contentType: String!
        """File size in bytes"""
        size: Int!
        """Original filename (optional, for display and Content-Disposition)"""
        filename: String
        """
        Custom S3 key (e.g., "reports/2024/Q1.pdf").
        Only allowed when the bucket has allow_custom_keys=true.
        When omitted, key defaults to contentHash (content-addressed dedup).
        When provided, the file is stored at this key.
        Re-uploading to an existing key auto-creates a new version.
        """
        key: String
      }

      type RequestUploadUrlPayload {
        """Presigned PUT URL (null if file was deduplicated)"""
        uploadUrl: String
        """The file ID (existing if deduplicated, new if fresh upload)"""
        fileId: UUID!
        """The S3 object key"""
        key: String!
        """Whether this file was deduplicated (already exists with same hash)"""
        deduplicated: Boolean!
        """Presigned URL expiry time (null if deduplicated)"""
        expiresAt: Datetime
        """ID of the previous version (set when re-uploading to an existing custom key)"""
        previousVersionId: UUID
      }

      input BulkUploadFileInput {
        """SHA-256 content hash computed by the client (hex-encoded, 64 chars)"""
        contentHash: String!
        """MIME type of the file (e.g., "image/png")"""
        contentType: String!
        """File size in bytes"""
        size: Int!
        """Original filename (optional, for display and Content-Disposition)"""
        filename: String
        """Custom S3 key (only when bucket has allow_custom_keys=true)"""
        key: String
      }

      input RequestBulkUploadUrlsInput {
        """Bucket key (e.g., "public", "private")"""
        bucketKey: String!
        """Owner entity ID for entity-scoped uploads"""
        ownerId: UUID
        """Array of files to upload"""
        files: [BulkUploadFileInput!]!
      }

      type BulkUploadFilePayload {
        """Presigned PUT URL (null if file was deduplicated)"""
        uploadUrl: String
        """The file ID"""
        fileId: UUID!
        """The S3 object key"""
        key: String!
        """Whether this file was deduplicated"""
        deduplicated: Boolean!
        """Presigned URL expiry time (null if deduplicated)"""
        expiresAt: Datetime
        """ID of the previous version (set when re-uploading to an existing custom key)"""
        previousVersionId: UUID
        """Index of this file in the input array (for client correlation)"""
        index: Int!
      }

      type RequestBulkUploadUrlsPayload {
        """Array of results, one per input file"""
        files: [BulkUploadFilePayload!]!
      }

      input DeleteFileInput {
        """File ID to delete"""
        fileId: UUID!
      }

      type DeleteFilePayload {
        """Whether the file record was deleted from the database"""
        success: Boolean!
        """Whether the S3 object was deleted (false if other files reference the same key)"""
        deletedFromS3: Boolean!
        """The S3 key that was (or would have been) deleted"""
        key: String
      }

      extend type Mutation {
        """
        Request a presigned URL for uploading a file directly to S3.
        Client computes SHA-256 of the file content and provides it here.
        If a file with the same hash already exists (dedup), returns the
        existing file ID and deduplicated=true with no uploadUrl.
        """
        requestUploadUrl(
          input: RequestUploadUrlInput!
        ): RequestUploadUrlPayload

        """
        Request presigned URLs for uploading multiple files in a single batch.
        Subject to per-storage-module limits (max_bulk_files, max_bulk_total_size).
        Each file is processed independently — some may dedup while others get fresh URLs.
        """
        requestBulkUploadUrls(
          input: RequestBulkUploadUrlsInput!
        ): RequestBulkUploadUrlsPayload

        """
        Delete a file record and its S3 object.
        The DB record is always deleted (subject to RLS). The S3 object is
        deleted only if no other file records reference the same key in the
        same bucket (content-addressed dedup safety). If the inline S3
        delete fails, cleanup falls back to the async delete_s3_object job.
        """
        deleteFile(
          input: DeleteFileInput!
        ): DeleteFilePayload
      }
    `,
    plans: {
      Mutation: {
        requestUploadUrl(_$mutation: any, fieldArgs: any) {
          const $input = fieldArgs.getRaw('input');
          const $withPgClient = (grafastContext() as any).get('withPgClient');
          const $pgSettings = (grafastContext() as any).get('pgSettings');
          const $combined = object({
            input: $input,
            withPgClient: $withPgClient,
            pgSettings: $pgSettings,
          });

          return lambda($combined, async ({ input, withPgClient, pgSettings }: any) => {
            const result = await processUpload(options, input, withPgClient, pgSettings);
            return result;
          });
        },
        deleteFile(_$mutation: any, fieldArgs: any) {
          const $input = fieldArgs.getRaw('input');
          const $withPgClient = (grafastContext() as any).get('withPgClient');
          const $pgSettings = (grafastContext() as any).get('pgSettings');
          const $combined = object({
            input: $input,
            withPgClient: $withPgClient,
            pgSettings: $pgSettings,
          });

          return lambda($combined, async ({ input, withPgClient, pgSettings }: any) => {
            const result = await processDelete(options, input, withPgClient, pgSettings);
            return result;
          });
        },
        requestBulkUploadUrls(_$mutation: any, fieldArgs: any) {
          const $input = fieldArgs.getRaw('input');
          const $withPgClient = (grafastContext() as any).get('withPgClient');
          const $pgSettings = (grafastContext() as any).get('pgSettings');
          const $combined = object({
            input: $input,
            withPgClient: $withPgClient,
            pgSettings: $pgSettings,
          });

          return lambda($combined, async ({ input, withPgClient, pgSettings }: any) => {
            const { bucketKey, ownerId, files } = input;

            if (!bucketKey || typeof bucketKey !== 'string' || bucketKey.length > MAX_BUCKET_KEY_LENGTH) {
              throw new Error('INVALID_BUCKET_KEY');
            }
            if (!Array.isArray(files) || files.length === 0) {
              throw new Error('INVALID_FILES: must provide at least one file');
            }

            return withPgClient(pgSettings, async (pgClient: any) => {
              return pgClient.withTransaction(async (txClient: any) => {
                const databaseId = await resolveDatabaseId(txClient);
                if (!databaseId) {
                  throw new Error('DATABASE_NOT_FOUND');
                }

                const storageConfig = ownerId
                  ? await getStorageModuleConfigForOwner(txClient, databaseId, ownerId)
                  : await getStorageModuleConfig(txClient, databaseId);
                if (!storageConfig) {
                  throw new Error(
                    ownerId
                      ? 'STORAGE_MODULE_NOT_FOUND_FOR_OWNER: no storage module found for the given ownerId'
                      : 'STORAGE_MODULE_NOT_PROVISIONED',
                  );
                }

                // --- Validate bulk limits ---
                if (files.length > storageConfig.maxBulkFiles) {
                  throw new Error(`BULK_LIMIT_EXCEEDED: max ${storageConfig.maxBulkFiles} files per batch`);
                }
                const totalSize = files.reduce((sum: number, f: any) => sum + (f.size || 0), 0);
                if (totalSize > storageConfig.maxBulkTotalSize) {
                  throw new Error(`BULK_SIZE_EXCEEDED: total size ${totalSize} exceeds max ${storageConfig.maxBulkTotalSize} bytes`);
                }

                const bucket = await getBucketConfig(txClient, storageConfig, databaseId, bucketKey, ownerId);
                if (!bucket) {
                  throw new Error('BUCKET_NOT_FOUND');
                }

                // --- Ensure S3 bucket exists once for the batch ---
                const s3ForDb = resolveS3ForDatabase(options, storageConfig, databaseId);
                await ensureS3BucketExists(options, s3ForDb.bucket, bucket, databaseId, storageConfig.allowedOrigins);

                // --- Process each file ---
                const results = [];
                for (let i = 0; i < files.length; i++) {
                  const fileInput = files[i];
                  const singleInput = {
                    ...fileInput,
                    bucketKey,
                    ownerId,
                  };
                  const result = await processSingleFile(
                    options, txClient, storageConfig, databaseId, bucket, s3ForDb, singleInput,
                  );
                  results.push({ ...result, index: i });
                }

                return { files: results };
              });
            });
          });
        },
      },
    },
  }));
}

// --- Shared upload logic ---

/**
 * Process a single upload request (used by both requestUploadUrl and requestBulkUploadUrls).
 */
async function processUpload(
  options: PresignedUrlPluginOptions,
  input: any,
  withPgClient: any,
  pgSettings: any,
) {
  const { bucketKey, ownerId, contentHash, contentType, size, filename, key: customKey } = input;

  if (!bucketKey || typeof bucketKey !== 'string' || bucketKey.length > MAX_BUCKET_KEY_LENGTH) {
    throw new Error('INVALID_BUCKET_KEY');
  }
  if (!contentHash || typeof contentHash !== 'string' || contentHash.length > MAX_CONTENT_HASH_LENGTH) {
    throw new Error('INVALID_CONTENT_HASH');
  }
  if (!isValidSha256(contentHash)) {
    throw new Error('INVALID_CONTENT_HASH_FORMAT: must be a 64-char lowercase hex SHA-256');
  }
  if (!contentType || typeof contentType !== 'string' || contentType.length > MAX_CONTENT_TYPE_LENGTH) {
    throw new Error('INVALID_CONTENT_TYPE');
  }

  return withPgClient(pgSettings, async (pgClient: any) => {
    return pgClient.withTransaction(async (txClient: any) => {
      const databaseId = await resolveDatabaseId(txClient);
      if (!databaseId) {
        throw new Error('DATABASE_NOT_FOUND');
      }

      const storageConfig = ownerId
        ? await getStorageModuleConfigForOwner(txClient, databaseId, ownerId)
        : await getStorageModuleConfig(txClient, databaseId);
      if (!storageConfig) {
        throw new Error(
          ownerId
            ? 'STORAGE_MODULE_NOT_FOUND_FOR_OWNER: no storage module found for the given ownerId'
            : 'STORAGE_MODULE_NOT_PROVISIONED',
        );
      }

      if (typeof size !== 'number' || size <= 0 || size > storageConfig.defaultMaxFileSize) {
        throw new Error(`INVALID_FILE_SIZE: must be between 1 and ${storageConfig.defaultMaxFileSize} bytes`);
      }
      if (filename !== undefined && filename !== null) {
        if (typeof filename !== 'string' || filename.length > storageConfig.maxFilenameLength) {
          throw new Error('INVALID_FILENAME');
        }
      }

      const bucket = await getBucketConfig(txClient, storageConfig, databaseId, bucketKey, ownerId);
      if (!bucket) {
        throw new Error('BUCKET_NOT_FOUND');
      }

      const s3ForDb = resolveS3ForDatabase(options, storageConfig, databaseId);
      await ensureS3BucketExists(options, s3ForDb.bucket, bucket, databaseId, storageConfig.allowedOrigins);

      return processSingleFile(options, txClient, storageConfig, databaseId, bucket, s3ForDb, input);
    });
  });
}

/**
 * Process a single file upload within an already-resolved context.
 * Handles dedup, custom keys, versioning, and auto-path derivation.
 */
async function processSingleFile(
  options: PresignedUrlPluginOptions,
  txClient: any,
  storageConfig: StorageModuleConfig,
  databaseId: string,
  bucket: BucketConfig,
  s3ForDb: S3Config,
  input: any,
) {
  const { contentHash, contentType, size, filename, key: customKey } = input;

  // --- Validate inputs ---
  if (!contentHash || !isValidSha256(contentHash)) {
    throw new Error('INVALID_CONTENT_HASH_FORMAT: must be a 64-char lowercase hex SHA-256');
  }
  if (!contentType || typeof contentType !== 'string' || contentType.length > MAX_CONTENT_TYPE_LENGTH) {
    throw new Error('INVALID_CONTENT_TYPE');
  }
  if (typeof size !== 'number' || size <= 0 || size > storageConfig.defaultMaxFileSize) {
    throw new Error(`INVALID_FILE_SIZE: must be between 1 and ${storageConfig.defaultMaxFileSize} bytes`);
  }
  if (filename !== undefined && filename !== null) {
    if (typeof filename !== 'string' || filename.length > storageConfig.maxFilenameLength) {
      throw new Error('INVALID_FILENAME');
    }
  }

  // --- Validate content type against bucket's allowed_mime_types ---
  if (bucket.allowed_mime_types && bucket.allowed_mime_types.length > 0) {
    const allowed = bucket.allowed_mime_types as string[];
    const isAllowed = allowed.some((pattern: string) => {
      if (pattern === '*/*') return true;
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -1);
        return contentType.startsWith(prefix);
      }
      return contentType === pattern;
    });
    if (!isAllowed) {
      throw new Error(`CONTENT_TYPE_NOT_ALLOWED: ${contentType} not in bucket allowed types`);
    }
  }

  // --- Validate size against bucket's max_file_size ---
  if (bucket.max_file_size && size > bucket.max_file_size) {
    throw new Error(`FILE_TOO_LARGE: exceeds bucket max of ${bucket.max_file_size} bytes`);
  }

  // --- Determine S3 key ---
  let s3Key: string;
  let isCustomKey = false;
  if (customKey) {
    if (!bucket.allow_custom_keys) {
      throw new Error('CUSTOM_KEY_NOT_ALLOWED: bucket does not allow custom keys');
    }
    const keyError = validateCustomKey(customKey);
    if (keyError) {
      throw new Error(keyError);
    }
    s3Key = customKey;
    isCustomKey = true;
  } else {
    s3Key = buildS3Key(contentHash);
  }

  // --- Dedup / versioning check ---
  let previousVersionId: string | null = null;

  if (isCustomKey) {
    // Custom key mode: check if a file with this key already exists in this bucket.
    // If so, auto-version by linking via previous_version_id.
    const existingResult = await txClient.query({
      text: `SELECT id, content_hash
       FROM ${storageConfig.filesQualifiedName}
       WHERE key = $1
         AND bucket_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      values: [s3Key, bucket.id],
    });

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      // Same content hash = true dedup (no new upload needed)
      if (existing.content_hash === contentHash) {
        log.info(`Dedup hit (custom key): file ${existing.id} for key ${s3Key}`);
        return {
          uploadUrl: null as string | null,
          fileId: existing.id as string,
          key: s3Key,
          deduplicated: true,
          expiresAt: null as string | null,
          previousVersionId: null as string | null,
        };
      }
      // Different content = new version
      previousVersionId = existing.id;
      log.info(`Versioning: new version of key ${s3Key}, previous=${previousVersionId}`);
    }
  } else {
    // Hash-based mode: dedup by content_hash in this bucket
    const dedupResult = await txClient.query({
      text: `SELECT id
       FROM ${storageConfig.filesQualifiedName}
       WHERE content_hash = $1
         AND bucket_id = $2
       LIMIT 1`,
      values: [contentHash, bucket.id],
    });

    if (dedupResult.rows.length > 0) {
      const existingFile = dedupResult.rows[0];
      log.info(`Dedup hit: file ${existingFile.id} for hash ${contentHash}`);

      return {
        uploadUrl: null as string | null,
        fileId: existingFile.id as string,
        key: s3Key,
        deduplicated: true,
        expiresAt: null as string | null,
        previousVersionId: null as string | null,
      };
    }
  }

  // --- Auto-derive ltree path from custom key directory (only when has_path_shares) ---
  const derivedPath = isCustomKey && storageConfig.hasPathShares ? derivePathFromKey(s3Key) : null;

  // --- Create file record ---
  const hasOwnerColumn = storageConfig.membershipType !== null;
  const columns = ['bucket_id', 'key', 'content_hash', 'mime_type', 'size', 'filename', 'is_public'];
  const values: any[] = [bucket.id, s3Key, contentHash, contentType, size, filename || null, bucket.is_public];
  let paramIdx = values.length;

  if (hasOwnerColumn) {
    columns.push('owner_id');
    values.push(bucket.owner_id);
    paramIdx = values.length;
  }
  if (previousVersionId) {
    columns.push('previous_version_id');
    values.push(previousVersionId);
    paramIdx = values.length;
  }
  if (derivedPath) {
    columns.push('path');
    values.push(derivedPath);
    paramIdx = values.length;
  }

  const placeholders = values.map((_: any, i: number) => `$${i + 1}`).join(', ');
  const fileResult = await txClient.query({
    text: `INSERT INTO ${storageConfig.filesQualifiedName}
           (${columns.join(', ')})
           VALUES (${placeholders})
           RETURNING id`,
    values,
  });

  const fileId = fileResult.rows[0].id;

  // --- Generate presigned PUT URL ---
  const uploadUrl = await generatePresignedPutUrl(
    s3ForDb,
    s3Key,
    contentType,
    size,
    storageConfig.uploadUrlExpirySeconds,
  );

  const expiresAt = new Date(Date.now() + storageConfig.uploadUrlExpirySeconds * 1000).toISOString();

  return {
    uploadUrl,
    fileId,
    key: s3Key,
    deduplicated: false,
    expiresAt,
    previousVersionId,
  };
}

// --- Delete logic ---

/**
 * Process a file deletion: remove the DB record, then attempt sync S3 cleanup.
 *
 * The AFTER DELETE trigger on the files table always enqueues an async
 * delete_s3_object job as a safety net. This function attempts the S3 delete
 * inline for immediate cleanup — if it fails, the async job handles it.
 *
 * 1. Resolve the file row (key, bucket_id) and storage config
 * 2. DELETE the file row (RLS enforced — only owner/admin can delete)
 *    → AFTER DELETE trigger enqueues async GC job (SECURITY DEFINER)
 * 3. Check refcount: any other file with same key in the same bucket?
 * 4. If orphaned: try S3 DeleteObject inline (sync, best-effort)
 * 5. Return result
 */
async function processDelete(
  options: PresignedUrlPluginOptions,
  input: any,
  withPgClient: any,
  pgSettings: any,
) {
  const { fileId } = input;

  if (!fileId || typeof fileId !== 'string') {
    throw new Error('INVALID_FILE_ID');
  }

  return withPgClient(pgSettings, async (pgClient: any) => {
    return pgClient.withTransaction(async (txClient: any) => {
      const databaseId = await resolveDatabaseId(txClient);
      if (!databaseId) {
        throw new Error('DATABASE_NOT_FOUND');
      }

      // 1. Resolve storage config + file across all storage modules
      const resolved = await resolveStorageModuleByFileId(txClient, databaseId, fileId);
      if (!resolved) {
        throw new Error('FILE_NOT_FOUND: file does not exist or access denied');
      }

      const { storageConfig, file } = resolved;
      const { key, bucket_id } = file;

      // 2. DELETE the file row (RLS enforced)
      const deleteResult = await txClient.query({
        text: `DELETE FROM ${storageConfig.filesQualifiedName}
         WHERE id = $1
         RETURNING id`,
        values: [fileId],
      });

      if (deleteResult.rows.length === 0) {
        throw new Error('DELETE_DENIED: insufficient permissions to delete this file');
      }

      // 3. Check refcount: any other file with same key in this bucket?
      const refcountResult = await txClient.query({
        text: `SELECT COUNT(*)::int AS ref_count
         FROM ${storageConfig.filesQualifiedName}
         WHERE key = $1
           AND bucket_id = $2`,
        values: [key, bucket_id],
      });

      const refCount = refcountResult.rows[0]?.ref_count ?? 0;

      if (refCount > 0) {
        log.info(`File ${fileId} deleted from DB; S3 key ${key} still referenced by ${refCount} file(s)`);
        return {
          success: true,
          deletedFromS3: false,
          key,
        };
      }

      // 4. Attempt sync S3 delete (best-effort; async GC job is the fallback)
      try {
        const s3ForDb = resolveS3ForDatabase(options, storageConfig, databaseId);
        await deleteS3Object(s3ForDb, key);
        log.info(`File ${fileId} deleted from DB and S3 (key=${key})`);
        return {
          success: true,
          deletedFromS3: true,
          key,
        };
      } catch (s3Error: any) {
        log.warn(`Sync S3 delete failed for key=${key}; async GC job will retry: ${s3Error.message}`);
        return {
          success: true,
          deletedFromS3: false,
          key,
        };
      }
    });
  });
}

export const PresignedUrlPlugin = createPresignedUrlPlugin;
export default PresignedUrlPlugin;
