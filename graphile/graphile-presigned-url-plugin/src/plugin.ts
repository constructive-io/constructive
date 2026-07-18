/**
 * Per-Table Storage Middleware Plugin for PostGraphile v5
 *
 * Hooks into PostGraphile's auto-generated CRUD mutations to add S3 operations:
 *
 * 1. File upload mutations — adds `upload<FileType>(input: {...})` mutations
 *    on root Mutation for each @storageFiles/@storageBuckets pair. These combine
 *    bucket resolution + file INSERT + presigned URL generation in one step.
 *    E.g., `uploadAppFile(input: { bucketKey: "public", contentHash: "...", ... })`
 *
 * 2. Delete middleware — wraps `delete*` mutations on `@storageFiles`-tagged tables
 *    with S3 object cleanup (sync + async GC fallback via AFTER DELETE trigger).
 *
 * 3. downloadUrl — handled by download-url-field.ts (separate plugin).
 *
 * Scope resolution uses the codec's schema/table name matched against
 * cached storage module configs.
 */

import { access, context as grafastContext, lambda, object } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import 'graphile-build';
import { Logger } from '@pgpmjs/logger';

import type { PresignedUrlPluginOptions, S3Config, StorageModuleConfig, BucketConfig } from './types';
import { loadAllStorageModules, resolveStorageConfigFromCodec, getBucketConfig, isS3BucketProvisioned, markS3BucketProvisioned } from './storage-module-cache';
import { generatePresignedPutUrl, deleteS3Object } from './s3-signer';

const log = new Logger('graphile-presigned-url:plugin');

// --- Protocol-level constants (not configurable) ---

const MAX_CONTENT_HASH_LENGTH = 128;
const MAX_CONTENT_TYPE_LENGTH = 255;
const MAX_CUSTOM_KEY_LENGTH = 1024;
const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/;
const CUSTOM_KEY_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.\-\/]*$/;

// --- Helpers ---

function isValidSha256(hash: string): boolean {
  return SHA256_HEX_REGEX.test(hash);
}

function buildS3Key(contentHash: string): string {
  return contentHash;
}

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

function derivePathFromKey(key: string): string | null {
  const lastSlash = key.lastIndexOf('/');
  if (lastSlash <= 0) return null;
  const dir = key.substring(0, lastSlash);
  return dir.replace(/\//g, '.');
}

async function resolveDatabaseId(pgClient: any): Promise<string | null> {
  const result = await pgClient.query({
    text: `SELECT jwt_private.current_database_id() AS id`,
  });
  return result.rows[0]?.id ?? null;
}

function resolveS3(options: PresignedUrlPluginOptions): S3Config {
  if (typeof options.s3 === 'function') {
    const resolved = options.s3();
    options.s3 = resolved;
    return resolved;
  }
  return options.s3;
}

function resolveS3ForDatabase(
  options: PresignedUrlPluginOptions,
  storageConfig: StorageModuleConfig,
  databaseId: string,
  bucketKey: string,
): S3Config {
  const globalS3 = resolveS3(options);
  const bucket = options.resolveBucketName
    ? options.resolveBucketName(databaseId, bucketKey)
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

// --- Plugin factory ---

export function createPresignedUrlPlugin(
  options: PresignedUrlPluginOptions,
): GraphileConfig.Plugin {

  return {
    name: 'PresignedUrlPlugin',
    version: '1.0.0',
    description: 'Per-table S3 storage middleware: upload fields on @storageBuckets, delete middleware on @storageFiles',

    after: ['PgAttributesPlugin', 'PgMutationCreatePlugin', 'PgMutationUpdateDeletePlugin'],

    schema: {
      hooks: {
        /**
         * Add file upload mutations (uploadAppFile, uploadDataRoomFile, etc.) on root Mutation.
         */
        GraphQLObjectType_fields(fields, build, context) {
          const {
            scope: { isRootMutation },
          } = context as any;

          if (!isRootMutation) return fields;

          const {
              graphql: {
                GraphQLString,
                GraphQLNonNull,
                GraphQLInt,
                GraphQLBoolean,
                GraphQLObjectType,
                GraphQLInputObjectType,
                GraphQLList,
              },
            } = build;

            const bucketCodecs = Object.values((build.input as any).pgRegistry.pgCodecs).filter(
              (codec: any) => codec.attributes && (codec.extensions as any)?.tags?.storageBuckets,
            );

            if (bucketCodecs.length === 0) return fields;

            const newFields: Record<string, any> = {};

            // --- File upload mutations (uploadAppFile, uploadDataRoomFile, etc.) ---
            const fileCodecs = Object.values((build.input as any).pgRegistry.pgCodecs).filter(
              (codec: any) => codec.attributes && (codec.extensions as any)?.tags?.storageFiles,
            );

            for (const filesCodec of fileCodecs as any[]) {
              const filesTypeName = (build.inflection as any).tableType(filesCodec);

              // Find the matching bucket codec by table name prefix.
              // Schema-name matching is ambiguous when multiple storage modules share
              // the same PG schema (e.g. app_files + data_room_files both in storage_public).
              // Instead, derive the prefix from the raw SQL table name:
              //   "data_room_files" → prefix "data_room" → matches "data_room_buckets"
              //   "app_files"       → prefix "app"       → matches "app_buckets"
              const filesRawName = filesCodec.extensions?.pg?.name as string | undefined;
              const filesPrefix = filesRawName?.replace(/_files$/, '');
              const matchingBucketCodec = (bucketCodecs as any[]).find((bc: any) => {
                const bucketRawName = bc.extensions?.pg?.name as string | undefined;
                const bucketPrefix = bucketRawName?.replace(/_buckets$/, '');
                return bucketPrefix === filesPrefix;
              });
              if (!matchingBucketCodec) {
                log.debug(`Skipping upload mutation for ${filesCodec.name}: no matching bucket codec with prefix "${filesPrefix}"`);
                continue;
              }

              const hasOwnerId = !!matchingBucketCodec.attributes.owner_id;
              const mutationName = `upload${filesTypeName}`;

              const ownerIdGqlType = hasOwnerId
                ? (build as any).getGraphQLTypeByPgCodec(matchingBucketCodec.attributes.owner_id.codec, 'input')
                : null;

              const InputType = new GraphQLInputObjectType({
                name: `Upload${filesTypeName}Input`,
                fields: {
                  bucketKey: { type: new GraphQLNonNull(GraphQLString), description: 'Bucket key (e.g., "public", "private")' },
                  ...(hasOwnerId
                    ? { ownerId: { type: new GraphQLNonNull(ownerIdGqlType || GraphQLString), description: 'Owner entity ID (required for entity-scoped buckets)' } }
                    : {}),
                  contentHash: { type: new GraphQLNonNull(GraphQLString), description: 'SHA-256 content hash (hex-encoded, 64 chars)' },
                  contentType: { type: new GraphQLNonNull(GraphQLString), description: 'MIME type of the file' },
                  size: { type: new GraphQLNonNull(GraphQLInt), description: 'File size in bytes' },
                  filename: { type: GraphQLString, description: 'Original filename (optional)' },
                  key: { type: GraphQLString, description: 'Custom S3 key (only when bucket has allow_custom_keys=true)' },
                },
              });

              const PayloadType = new GraphQLObjectType({
                name: `Upload${filesTypeName}Payload`,
                fields: {
                  uploadUrl: { type: GraphQLString, description: 'Presigned PUT URL (null if deduplicated)' },
                  fileId: { type: new GraphQLNonNull(GraphQLString), description: 'The file ID (UUID)' },
                  key: { type: new GraphQLNonNull(GraphQLString), description: 'The S3 object key' },
                  deduplicated: { type: new GraphQLNonNull(GraphQLBoolean), description: 'Whether this file was deduplicated (content already exists)' },
                  expiresAt: { type: GraphQLString, description: 'Presigned URL expiry time (null if deduplicated)' },
                  previousVersionId: { type: GraphQLString, description: 'ID of the previous version (when using custom keys)' },
                },
              });

              const capturedFilesCodec = filesCodec;

              log.debug(`Adding file upload mutation "${mutationName}" for ${filesTypeName} (entity-scoped=${hasOwnerId})`);

              newFields[mutationName] = context.fieldWithHooks(
                { fieldName: mutationName } as any,
                {
                  description: `Upload a file: resolves the bucket by key, creates the file row, and returns a presigned PUT URL.`,
                  type: PayloadType,
                  args: {
                    input: { type: new GraphQLNonNull(InputType) },
                  },
                  plan(_$mutation: any, fieldArgs: any) {
                    const $input = fieldArgs.getRaw('input');
                    const $bucketKey = access($input, 'bucketKey');
                    const $contentHash = access($input, 'contentHash');
                    const $contentType = access($input, 'contentType');
                    const $size = access($input, 'size');
                    const $filename = access($input, 'filename');
                    const $customKey = access($input, 'key');
                    const $ownerId = hasOwnerId ? access($input, 'ownerId') : lambda(null, (): null => null);
                    const $withPgClient = (grafastContext() as any).get('withPgClient');
                    const $pgSettings = (grafastContext() as any).get('pgSettings');

                    const $combined = object({
                      bucketKey: $bucketKey,
                      ownerId: $ownerId,
                      contentHash: $contentHash,
                      contentType: $contentType,
                      size: $size,
                      filename: $filename,
                      customKey: $customKey,
                      withPgClient: $withPgClient,
                      pgSettings: $pgSettings,
                    });

                    return lambda($combined, async (vals: any) => {
                      const databaseId = await vals.withPgClient(vals.pgSettings, (pgClient: any) =>
                        resolveDatabaseId(pgClient),
                      );
                      if (!databaseId) throw new Error('DATABASE_NOT_FOUND');

                      // Module registration is server config, not user data:
                      // resolve it without the request role's pgSettings.
                      const allConfigs = await vals.withPgClient(null, (pgClient: any) =>
                        loadAllStorageModules(pgClient, databaseId),
                      );
                      const storageConfig = resolveStorageConfigFromCodec(capturedFilesCodec, allConfigs);
                      if (!storageConfig) throw new Error('STORAGE_MODULE_NOT_FOUND');

                      return vals.withPgClient(vals.pgSettings, async (pgClient: any) => {
                        return pgClient.withTransaction(async (txClient: any) => {
                          const bucket = await getBucketConfig(
                            txClient, storageConfig, databaseId, vals.bucketKey, vals.ownerId || undefined,
                          );
                          if (!bucket) throw new Error('BUCKET_NOT_FOUND');

                          const s3ForDb = resolveS3ForDatabase(options, storageConfig, databaseId, bucket.key);
                          await ensureS3BucketExists(options, s3ForDb.bucket, bucket, databaseId, storageConfig.allowedOrigins);

                          return processSingleFile(options, txClient, storageConfig, databaseId, bucket, s3ForDb, {
                            contentHash: vals.contentHash,
                            contentType: vals.contentType,
                            size: vals.size,
                            filename: vals.filename,
                            key: vals.customKey,
                          });
                        });
                      });
                    });
                  },
                },
              );

              // --- Bulk file upload mutation ---
              const BulkFileInputType = new GraphQLInputObjectType({
                name: `Upload${filesTypeName}BulkFileInput`,
                fields: {
                  contentHash: { type: new GraphQLNonNull(GraphQLString), description: 'SHA-256 content hash (hex-encoded, 64 chars)' },
                  contentType: { type: new GraphQLNonNull(GraphQLString), description: 'MIME type of the file' },
                  size: { type: new GraphQLNonNull(GraphQLInt), description: 'File size in bytes' },
                  filename: { type: GraphQLString, description: 'Original filename (optional)' },
                  key: { type: GraphQLString, description: 'Custom S3 key (only when bucket has allow_custom_keys=true)' },
                },
              });

              const BulkFilePayloadType = new GraphQLObjectType({
                name: `Upload${filesTypeName}BulkFilePayload`,
                fields: {
                  uploadUrl: { type: GraphQLString },
                  fileId: { type: new GraphQLNonNull(GraphQLString) },
                  key: { type: new GraphQLNonNull(GraphQLString) },
                  deduplicated: { type: new GraphQLNonNull(GraphQLBoolean) },
                  expiresAt: { type: GraphQLString },
                  previousVersionId: { type: GraphQLString },
                },
              });

              const BulkInputType = new GraphQLInputObjectType({
                name: `Upload${filesTypeName}BulkInput`,
                fields: {
                  bucketKey: { type: new GraphQLNonNull(GraphQLString), description: 'Bucket key (e.g., "public", "private")' },
                  ...(hasOwnerId
                    ? { ownerId: { type: new GraphQLNonNull(ownerIdGqlType || GraphQLString), description: 'Owner entity ID (required for entity-scoped buckets)' } }
                    : {}),
                  files: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(BulkFileInputType))), description: 'Array of files to upload' },
                },
              });

              const BulkPayloadType = new GraphQLObjectType({
                name: `Upload${filesTypeName}BulkPayload`,
                fields: {
                  files: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(BulkFilePayloadType))) },
                },
              });

              const bulkMutationName = `upload${filesTypeName}s`;
              log.debug(`Adding bulk file upload mutation "${bulkMutationName}" for ${filesTypeName}`);

              newFields[bulkMutationName] = context.fieldWithHooks(
                { fieldName: bulkMutationName } as any,
                {
                  description: `Upload multiple files: resolves the bucket by key, creates file rows, and returns presigned PUT URLs for each.`,
                  type: BulkPayloadType,
                  args: {
                    input: { type: new GraphQLNonNull(BulkInputType) },
                  },
                  plan(_$mutation: any, fieldArgs: any) {
                    const $input = fieldArgs.getRaw('input');
                    const $bucketKey = access($input, 'bucketKey');
                    const $ownerId = hasOwnerId ? access($input, 'ownerId') : lambda(null, (): null => null);
                    const $files = access($input, 'files');
                    const $withPgClient = (grafastContext() as any).get('withPgClient');
                    const $pgSettings = (grafastContext() as any).get('pgSettings');

                    const $combined = object({
                      bucketKey: $bucketKey,
                      ownerId: $ownerId,
                      files: $files,
                      withPgClient: $withPgClient,
                      pgSettings: $pgSettings,
                    });

                    return lambda($combined, async (vals: any) => {
                      const databaseId = await vals.withPgClient(vals.pgSettings, (pgClient: any) =>
                        resolveDatabaseId(pgClient),
                      );
                      if (!databaseId) throw new Error('DATABASE_NOT_FOUND');

                      // Module registration is server config, not user data:
                      // resolve it without the request role's pgSettings.
                      const allConfigs = await vals.withPgClient(null, (pgClient: any) =>
                        loadAllStorageModules(pgClient, databaseId),
                      );
                      const storageConfig = resolveStorageConfigFromCodec(capturedFilesCodec, allConfigs);
                      if (!storageConfig) throw new Error('STORAGE_MODULE_NOT_FOUND');

                      return vals.withPgClient(vals.pgSettings, async (pgClient: any) => {
                        return pgClient.withTransaction(async (txClient: any) => {
                          const bucket = await getBucketConfig(
                            txClient, storageConfig, databaseId, vals.bucketKey, vals.ownerId || undefined,
                          );
                          if (!bucket) throw new Error('BUCKET_NOT_FOUND');

                          // Enforce bulk upload limits
                          const filesArray = vals.files as any[];
                          if (filesArray.length > storageConfig.maxBulkFiles) {
                            throw new Error(
                              `BULK_UPLOAD_FILES_EXCEEDED: ${filesArray.length} files exceeds maximum of ${storageConfig.maxBulkFiles} per batch`,
                            );
                          }
                          const totalSize = filesArray.reduce((sum: number, f: any) => sum + (f.size || 0), 0);
                          if (totalSize > storageConfig.maxBulkTotalSize) {
                            throw new Error(
                              `BULK_UPLOAD_SIZE_EXCEEDED: ${totalSize} bytes exceeds maximum of ${storageConfig.maxBulkTotalSize} bytes per batch`,
                            );
                          }

                          const s3ForDb = resolveS3ForDatabase(options, storageConfig, databaseId, bucket.key);
                          await ensureS3BucketExists(options, s3ForDb.bucket, bucket, databaseId, storageConfig.allowedOrigins);

                          const results = [];
                          for (const file of filesArray) {
                            results.push(
                              await processSingleFile(options, txClient, storageConfig, databaseId, bucket, s3ForDb, {
                                contentHash: file.contentHash,
                                contentType: file.contentType,
                                size: file.size,
                                filename: file.filename,
                                key: file.key,
                              }),
                            );
                          }
                          return { files: results };
                        });
                      });
                    });
                  },
                },
              );
            }

          return build.extend(
            fields,
            newFields,
            'PresignedUrlPlugin adding file upload mutations',
          );
        },

        /**
         * Wrap delete* mutations on @storageFiles-tagged tables with S3 cleanup.
         *
         * Pattern: identical to graphile-bucket-provisioner-plugin's create/update hooks.
         * 1. Read the file row BEFORE delete (need key + bucket_id for S3 cleanup)
         * 2. Call PostGraphile's generated delete (RLS enforced)
         * 3. If delete succeeded, check refcount and attempt sync S3 delete
         * 4. AFTER DELETE trigger (constructive-db) enqueues async GC job as fallback
         */
        GraphQLObjectType_fields_field(field: any, build: any, context: any) {
          const {
            scope: { isRootMutation, fieldName, pgCodec },
          } = context;

          if (!isRootMutation || !pgCodec || !pgCodec.attributes) {
            return field;
          }

          const tags = pgCodec.extensions?.tags;
          if (!tags?.storageFiles) {
            return field;
          }

          if (!fieldName.startsWith('delete')) {
            return field;
          }

          log.debug(`Wrapping delete mutation "${fieldName}" with S3 cleanup (codec: ${pgCodec.name})`);

          const defaultResolver = (obj: any) => obj[fieldName];
          const { resolve: oldResolve = defaultResolver, ...rest } = field;
          const capturedCodec = pgCodec;

          return {
            ...rest,
            async resolve(source: any, args: any, graphqlContext: any, info: any) {
              // Extract the file ID from the mutation input
              const inputKey = Object.keys(args.input || {}).find(
                (k) => k !== 'clientMutationId',
              );
              const fileInput = inputKey ? args.input[inputKey] : null;

              let fileRow: { key: string; bucket_id: string } | null = null;

              if (fileInput) {
                // Read the file row BEFORE delete to get the S3 key + bucket_id
                const withPgClient = graphqlContext.withPgClient;
                const pgSettings = graphqlContext.pgSettings;

                if (withPgClient) {
                  try {
                    const databaseId = await withPgClient(pgSettings, (pgClient: any) => resolveDatabaseId(pgClient));
                    // Module registration is server config, not user data:
                    // resolve it without the request role's pgSettings.
                    const allConfigs = databaseId
                      ? await withPgClient(null, (pgClient: any) => loadAllStorageModules(pgClient, databaseId))
                      : [];
                    const storageConfig = resolveStorageConfigFromCodec(capturedCodec, allConfigs);

                    if (storageConfig) {
                      await withPgClient(pgSettings, async (pgClient: any) => {
                        // Read the file row (RLS enforced)
                        const result = await pgClient.query({
                          text: `SELECT key, bucket_id FROM ${storageConfig.filesQualifiedName} WHERE id = $1 LIMIT 1`,
                          values: [fileInput],
                        });
                        if (result.rows.length > 0) {
                          fileRow = result.rows[0] as { key: string; bucket_id: string };
                        }
                      });
                    }
                  } catch (err: any) {
                    log.warn(`Pre-delete file lookup failed: ${err.message}`);
                  }
                }
              }

              // Call PostGraphile's generated delete (RLS enforced)
              const result = await oldResolve(source, args, graphqlContext, info);

              // Attempt sync S3 cleanup if we have the file row
              if (fileRow) {
                const withPgClient = graphqlContext.withPgClient;
                const pgSettings = graphqlContext.pgSettings;

                if (withPgClient) {
                  try {
                    const databaseId = await withPgClient(pgSettings, (pgClient: any) => resolveDatabaseId(pgClient));
                    // Module registration is server config, not user data:
                    // resolve it without the request role's pgSettings.
                    const allConfigs = databaseId
                      ? await withPgClient(null, (pgClient: any) => loadAllStorageModules(pgClient, databaseId))
                      : [];
                    const storageConfig = resolveStorageConfigFromCodec(capturedCodec, allConfigs);

                    if (storageConfig) await withPgClient(pgSettings, async (pgClient: any) => {
                      // Check refcount: any other file with the same key in this bucket?
                      const refResult = await pgClient.query({
                        text: `SELECT COUNT(*)::int AS ref_count FROM ${storageConfig.filesQualifiedName} WHERE key = $1 AND bucket_id = $2`,
                        values: [fileRow!.key, fileRow!.bucket_id],
                      });
                      const refCount = refResult.rows[0]?.ref_count ?? 0;

                      if (refCount > 0) {
                        log.info(`File deleted from DB; S3 key ${fileRow!.key} still referenced by ${refCount} file(s)`);
                        return;
                      }

                      // No other references — attempt sync S3 delete
                      // Look up the bucket key for scoped S3 resolution
                      const bucketResult = await pgClient.query({
                        text: `SELECT key FROM ${storageConfig.bucketsQualifiedName} WHERE id = $1 LIMIT 1`,
                        values: [fileRow!.bucket_id],
                      });
                      const bucketKey = bucketResult.rows[0]?.key;
                      if (!bucketKey) {
                        log.warn(`Bucket not found for bucket_id=${fileRow!.bucket_id}; skipping S3 delete`);
                        return;
                      }
                      const s3ForDb = resolveS3ForDatabase(options, storageConfig, databaseId, bucketKey);
                      await deleteS3Object(s3ForDb, fileRow!.key);
                      log.info(`Sync S3 delete succeeded for key=${fileRow!.key}`);
                    });
                  } catch (err: any) {
                    // Sync S3 delete failed — the AFTER DELETE trigger has enqueued an async GC job
                    log.warn(`Sync S3 delete failed for key=${fileRow.key}; async GC job will retry: ${err.message}`);
                  }
                }
              }

              return result;
            },
          };
        },
      },
    },
  };
}

// --- Shared upload logic ---

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

  if (!contentHash || typeof contentHash !== 'string' || contentHash.length > MAX_CONTENT_HASH_LENGTH) {
    throw new Error('INVALID_CONTENT_HASH');
  }
  if (!isValidSha256(contentHash)) {
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

  // Validate content type against bucket's allowed_mime_types
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

  // Validate size against bucket's max_file_size
  if (bucket.max_file_size && size > bucket.max_file_size) {
    throw new Error(`FILE_TOO_LARGE: exceeds bucket max of ${bucket.max_file_size} bytes`);
  }

  // Determine S3 key
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

  // Dedup / versioning check
  let previousVersionId: string | null = null;

  if (isCustomKey) {
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
      previousVersionId = existing.id;
      log.info(`Versioning: new version of key ${s3Key}, previous=${previousVersionId}`);
    }
  } else {
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

  // Auto-derive ltree path from custom key directory (only when has_path_shares)
  const derivedPath = isCustomKey && storageConfig.hasPathShares ? derivePathFromKey(s3Key) : null;

  // Create file record
  const hasOwnerColumn = storageConfig.scope !== 'app';
  const columns = ['bucket_id', 'key', 'content_hash', 'mime_type', 'size', 'filename', 'is_public'];
  const values: any[] = [bucket.id, s3Key, contentHash, contentType, size, filename || null, bucket.is_public];

  if (hasOwnerColumn) {
    columns.push('owner_id');
    values.push(bucket.owner_id);
  }
  if (previousVersionId) {
    columns.push('previous_version_id');
    values.push(previousVersionId);
  }
  if (derivedPath) {
    columns.push('path');
    values.push(derivedPath);
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

  // Generate presigned PUT URL
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

export const PresignedUrlPlugin = createPresignedUrlPlugin;
export default PresignedUrlPlugin;
