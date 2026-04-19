/**
 * Presigned URL Plugin for PostGraphile v5
 *
 * Adds presigned URL upload support to PostGraphile v5:
 *
 * 1. `requestUploadUrl` mutation — generates a presigned PUT URL for direct
 *    client-to-S3 upload. Checks bucket access via RLS, deduplicates by
 *    content hash, tracks the request in upload_requests.
 *
 * 2. `confirmUpload` mutation — confirms a file was uploaded to S3, verifies
 *    the object exists with correct content-type, transitions file status
 *    from 'pending' to 'ready'.
 *
 * 3. `downloadUrl` computed field on File types — generates presigned GET URLs
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
import { generatePresignedPutUrl, headObject } from './s3-signer';

const log = new Logger('graphile-presigned-url:plugin');

// --- Protocol-level constants (not configurable) ---

const MAX_CONTENT_HASH_LENGTH = 128;
const MAX_CONTENT_TYPE_LENGTH = 255;
const MAX_BUCKET_KEY_LENGTH = 255;
const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/;

// --- Helpers ---

/**
 * Validate a SHA-256 hex string.
 */
function isValidSha256(hash: string): boolean {
  return SHA256_HEX_REGEX.test(hash);
}

/**
 * Build the S3 key from content hash and content type extension.
 * Format: {contentHash} (flat namespace, content-addressed)
 */
function buildS3Key(contentHash: string): string {
  return contentHash;
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
      }

      input ConfirmUploadInput {
        """The file ID returned by requestUploadUrl"""
        fileId: UUID!
      }

      type ConfirmUploadPayload {
        """The confirmed file ID"""
        fileId: UUID!
        """New file status"""
        status: String!
        """Whether confirmation succeeded"""
        success: Boolean!
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
        Confirm that a file has been uploaded to S3.
        Verifies the object exists in S3, checks content-type,
        and transitions the file status from 'pending' to 'ready'.
        """
        confirmUpload(
          input: ConfirmUploadInput!
        ): ConfirmUploadPayload
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
            // --- Input validation ---
            const { bucketKey, ownerId, contentHash, contentType, size, filename } = input;

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
                // --- Resolve storage module config (all limits come from here) ---
                const databaseId = await resolveDatabaseId(txClient);
                if (!databaseId) {
                  throw new Error('DATABASE_NOT_FOUND');
                }

                // --- Resolve storage module (app-level or entity-scoped) ---
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

                // --- Validate size against storage module default (bucket override checked below) ---
                if (typeof size !== 'number' || size <= 0 || size > storageConfig.defaultMaxFileSize) {
                  throw new Error(`INVALID_FILE_SIZE: must be between 1 and ${storageConfig.defaultMaxFileSize} bytes`);
                }
                if (filename !== undefined && filename !== null) {
                  if (typeof filename !== 'string' || filename.length > storageConfig.maxFilenameLength) {
                    throw new Error('INVALID_FILENAME');
                  }
                }

                // --- Look up the bucket (cached; first miss queries via RLS) ---
                const bucket = await getBucketConfig(txClient, storageConfig, databaseId, bucketKey, ownerId);
                if (!bucket) {
                  throw new Error('BUCKET_NOT_FOUND');
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

                const s3Key = buildS3Key(contentHash);

                // --- Dedup check: look for existing file with same key (content hash) in this bucket ---
                const dedupResult = await txClient.query({
                  text: `SELECT id, status
                   FROM ${storageConfig.filesQualifiedName}
                   WHERE key = $1
                     AND bucket_id = $2
                     AND status IN ('ready', 'processed')
                   LIMIT 1`,
                  values: [s3Key, bucket.id],
                });

                if (dedupResult.rows.length > 0) {
                  const existingFile = dedupResult.rows[0];
                  log.info(`Dedup hit: file ${existingFile.id} for hash ${contentHash}`);

                  // Track the dedup request
                  await txClient.query({
                    text: `INSERT INTO ${storageConfig.uploadRequestsQualifiedName}
                     (file_id, bucket_id, key, content_type, content_hash, size, status, expires_at)
                     VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', NOW())`,
                    values: [existingFile.id, bucket.id, s3Key, contentType, contentHash, size],
                  });

                  return {
                    uploadUrl: null,
                    fileId: existingFile.id,
                    key: s3Key,
                    deduplicated: true,
                    expiresAt: null,
                  };
                }

                // --- Create file record (status=pending) ---
                // For app-level storage (no owner_id column), omit owner_id from the INSERT.
                const hasOwnerColumn = storageConfig.membershipType !== null;
                const fileResult = await txClient.query({
                  text: hasOwnerColumn
                    ? `INSERT INTO ${storageConfig.filesQualifiedName}
                       (bucket_id, key, mime_type, size, filename, owner_id, is_public, status)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
                       RETURNING id`
                    : `INSERT INTO ${storageConfig.filesQualifiedName}
                       (bucket_id, key, mime_type, size, filename, is_public, status)
                       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                       RETURNING id`,
                  values: hasOwnerColumn
                    ? [
                        bucket.id,
                        s3Key,
                        contentType,
                        size,
                        filename || null,
                        bucket.owner_id,
                        bucket.is_public,
                      ]
                    : [
                        bucket.id,
                        s3Key,
                        contentType,
                        size,
                        filename || null,
                        bucket.is_public,
                      ],
                });

                const fileId = fileResult.rows[0].id;

                // --- Ensure the S3 bucket exists (lazy provisioning) ---
                const s3ForDb = resolveS3ForDatabase(options, storageConfig, databaseId);
                await ensureS3BucketExists(options, s3ForDb.bucket, bucket, databaseId, storageConfig.allowedOrigins);

                // --- Generate presigned PUT URL (per-database bucket) ---
                const uploadUrl = await generatePresignedPutUrl(
                  s3ForDb,
                  s3Key,
                  contentType,
                  size,
                  storageConfig.uploadUrlExpirySeconds,
                );

                const expiresAt = new Date(Date.now() + storageConfig.uploadUrlExpirySeconds * 1000).toISOString();

                // --- Track the upload request ---
                await txClient.query({
                  text: `INSERT INTO ${storageConfig.uploadRequestsQualifiedName}
                   (file_id, bucket_id, key, content_type, content_hash, status, expires_at)
                   VALUES ($1, $2, $3, $4, $5, 'issued', $6)`,
                  values: [fileId, bucket.id, s3Key, contentType, contentHash, expiresAt],
                });

                return {
                  uploadUrl,
                  fileId,
                  key: s3Key,
                  deduplicated: false,
                  expiresAt,
                };
              });
            });
          });
        },

        confirmUpload(_$mutation: any, fieldArgs: any) {
          const $input = fieldArgs.getRaw('input');
          const $withPgClient = (grafastContext() as any).get('withPgClient');
          const $pgSettings = (grafastContext() as any).get('pgSettings');
          const $combined = object({
            input: $input,
            withPgClient: $withPgClient,
            pgSettings: $pgSettings,
          });

          return lambda($combined, async ({ input, withPgClient, pgSettings }: any) => {
            const { fileId } = input;

            if (!fileId || typeof fileId !== 'string') {
              throw new Error('INVALID_FILE_ID');
            }

            return withPgClient(pgSettings, async (pgClient: any) => {
              return pgClient.withTransaction(async (txClient: any) => {
                // --- Resolve storage module by file ID (probes all file tables) ---
                const databaseId = await resolveDatabaseId(txClient);
                if (!databaseId) {
                  throw new Error('DATABASE_NOT_FOUND');
                }

                const resolved = await resolveStorageModuleByFileId(txClient, databaseId, fileId);
                if (!resolved) {
                  throw new Error('FILE_NOT_FOUND');
                }

                const { storageConfig, file } = resolved;

                if (file.status !== 'pending') {
                  // File is already confirmed or processed — idempotent success
                  return {
                    fileId: file.id,
                    status: file.status,
                    success: true,
                  };
                }

                // --- Verify file exists in S3 (per-database bucket) ---
                const s3ForDb = resolveS3ForDatabase(options, storageConfig, databaseId);
                const s3Head = await headObject(s3ForDb, file.key, file.mime_type as string);

                if (!s3Head) {
                  throw new Error('FILE_NOT_IN_S3: the file has not been uploaded yet');
                }

                // --- Content-type verification ---
                if (s3Head.contentType && s3Head.contentType !== file.mime_type) {
                  // Mark upload_request as rejected
                  await txClient.query({
                    text: `UPDATE ${storageConfig.uploadRequestsQualifiedName}
                     SET status = 'rejected'
                     WHERE file_id = $1 AND status = 'issued'`,
                    values: [fileId],
                  });

                  throw new Error(
                    `CONTENT_TYPE_MISMATCH: expected ${file.mime_type}, got ${s3Head.contentType}`,
                  );
                }

                // --- Transition file to 'ready' ---
                await txClient.query({
                  text: `UPDATE ${storageConfig.filesQualifiedName}
                   SET status = 'ready'
                   WHERE id = $1`,
                  values: [fileId],
                });

                // --- Update upload_request to 'confirmed' ---
                await txClient.query({
                  text: `UPDATE ${storageConfig.uploadRequestsQualifiedName}
                   SET status = 'confirmed', confirmed_at = NOW()
                   WHERE file_id = $1 AND status = 'issued'`,
                  values: [fileId],
                });

                return {
                  fileId: file.id,
                  status: 'ready',
                  success: true,
                };
              });
            });
          });
        },
      },
    },
  }));
}

export const PresignedUrlPlugin = createPresignedUrlPlugin;
export default PresignedUrlPlugin;
