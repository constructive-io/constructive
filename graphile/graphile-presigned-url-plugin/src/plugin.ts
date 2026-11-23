/**
 * Per-Table Storage Middleware Plugin for PostGraphile v5
 *
 * Hooks into PostGraphile's auto-generated CRUD mutations to add S3 operations:
 *
 * 1. File upload mutations — adds `upload<FileType>(input: {...})` mutations
 *    on root Mutation for each @storageFiles/@storageBuckets pair. These combine
 *    bucket resolution + file INSERT + presigned URL generation in one step.
 *    E.g., `uploadAppFile(input: { bucketKey: "public", contentHash: "...", ... })`
 *    Pairs are discovered from the registry's FK relations (see
 *    graphile-storage-registry) — table naming carries no meaning here.
 *
 * 2. downloadUrl — handled by download-url-field.ts (separate plugin).
 *
 * Scope resolution uses the codec's schema/table name matched against
 * cached storage module configs.
 */

import 'graphile-build';

import { Logger } from '@pgpmjs/logger';
import { QuoteUtils } from '@pgsql/quotes';
import { access, context as grafastContext, lambda, object } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import { withRequestPgClient } from 'graphile-plugin-utils';
import { discoverStoragePlanes, uploadSurfaceNames } from 'graphile-storage-registry';
import { checkTypeAgreement } from 'mime-bytes';

import { validateCustomKey } from './custom-key';
import { resolveDefaultBucket } from './default-bucket';
import { buildFileProjection, type FileProjection } from './file-projection';
import { assertBucketReconciled, resolveS3ForDatabase } from './physical-bucket';
import { generatePresignedPutUrl, presignedPutHeaders } from './s3-signer';
import { recordManagedFile } from './storage-file-recorder';
import { getBucketConfig, loadAllStorageModules, resolveStorageConfigFromCodec } from './storage-module-cache';
import type { BucketConfig,PresignedUrlPluginOptions, S3Config, StorageModuleConfig } from './types';

const log = new Logger('graphile-presigned-url:plugin');

// --- Protocol-level constants (not configurable) ---

const MAX_CONTENT_HASH_LENGTH = 128;
const MAX_CONTENT_TYPE_LENGTH = 255;
const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/;
const RELEASE_SLOT_PREFIX = 'cas/sha256/';

// --- Helpers ---

function isValidSha256(hash: string): boolean {
  return SHA256_HEX_REGEX.test(hash);
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

/**
 * Resolve the bucket an upload mutation writes into.
 *
 * A named `bucketKey` is the caller's override and is read directly, as before.
 * An omitted one asks the database for the tenant's reserved default tag for the
 * requested access, so a missing or ambiguous default raises in SQL rather than
 * falling back to a server-global bucket name here.
 */
async function resolveUploadBucket(
  pgClient: any,
  storageConfig: StorageModuleConfig,
  databaseId: string,
  bucketKey: string | null,
  ownerId: string | null,
  isPublic: boolean,
  byDatabase: boolean,
  explicitDatabase: boolean,
): Promise<BucketConfig | null> {
  if (bucketKey) {
    return getBucketConfig(pgClient, storageConfig, databaseId, bucketKey, ownerId || undefined, byDatabase);
  }

  // A database named on the input is the row's scope, not the session's: its
  // default bucket is read by tag under the request role, so RLS decides
  // whether the caller may see (and so write into) that database's buckets.
  if (explicitDatabase) {
    const result = await pgClient.query({
      text: `SELECT key FROM ${storageConfig.bucketsQualifiedName}
             WHERE database_id = $1 AND $2 = ANY(tags)
             LIMIT 1`,
      values: [databaseId, isPublic ? 'default-public' : 'default'],
    });
    const key = result.rows[0]?.key as string | undefined;
    return key ? getBucketConfig(pgClient, storageConfig, databaseId, key, undefined, true) : null;
  }

  const coordinate = await resolveDefaultBucket(
    pgClient,
    storageConfig.scope,
    ownerId,
    isPublic,
    null,
  );
  return getBucketConfig(pgClient, storageConfig, databaseId, coordinate.resolvedKey, ownerId || undefined, byDatabase);
}

// --- Plugin factory ---

export function createPresignedUrlPlugin(
  options: PresignedUrlPluginOptions,
): GraphileConfig.Plugin {

  return {
    name: 'PresignedUrlPlugin',
    version: '1.0.0',
    description: 'Per-table S3 storage middleware: upload fields on @storageBuckets',

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
              isOutputType,
            },
          } = build;

          // The projection document is jsonb-shaped. PostGraphile registers a JSON
          // scalar whenever the schema has a jsonb column, which any storage-equipped
          // database does; if it is absent the payload simply omits the field rather
          // than failing schema build over a field nothing can have asked for yet.
          const jsonNamedType = build.getTypeByName('JSON');
          const jsonType = jsonNamedType && isOutputType(jsonNamedType) ? jsonNamedType : null;
          if (!jsonType) {
            log.warn('No JSON scalar in this schema; upload payloads will omit the `file` projection');
          }

          // Each @storageFiles table is paired with its @storageBuckets table
          // through the registry's actual FK relation; a tagged table that cannot
          // be paired is a provisioning bug and throws at schema build.
          const registry = (build.input as any).pgRegistry;
          const planes = discoverStoragePlanes(registry);

          if (planes.length === 0) return fields;

          const newFields: Record<string, any> = {};

          // --- File upload mutations (uploadAppFile, uploadDataRoomFile, etc.) ---
          for (const plane of planes) {
            const filesCodec = plane.filesCodec as any;
            const matchingBucketCodec = plane.bucketsCodec as any;
            const names = uploadSurfaceNames(build.inflection as any, plane.filesCodec);
            const { filesTypeName, uploadMutation: mutationName } = names;

            const hasOwnerId = plane.hasOwnerId;
            const hasDatabaseId = plane.hasDatabaseId;
            const uuidGqlType = (build as any).getTypeByName('UUID') || GraphQLString;

            const ownerIdGqlType = hasOwnerId
              ? (build as any).getGraphQLTypeByPgCodec(matchingBucketCodec.attributes.owner_id.codec, 'input')
              : null;

            const InputType = new GraphQLInputObjectType({
              name: names.uploadInputType,
              fields: {
                bucketKey: { type: GraphQLString, description: 'Bucket key (e.g., "public", "private"). Omit to use the database\'s default bucket for the requested access.' },
                isPublic: { type: GraphQLBoolean, description: 'Which default bucket to resolve when bucketKey is omitted: the public one (true) or the private one (default false). Ignored when bucketKey is given.' },
                ...(hasOwnerId
                  ? { ownerId: { type: new GraphQLNonNull(ownerIdGqlType || GraphQLString), description: 'Owner entity ID (required for entity-scoped buckets)' } }
                  : {}),
                ...(hasDatabaseId
                  ? { databaseId: { type: uuidGqlType, description: 'Database the file belongs to. Omit for the database of the current session; a caller who is not a member of the named database is refused.' } }
                  : {}),
                contentHash: { type: new GraphQLNonNull(GraphQLString), description: 'SHA-256 content hash (hex-encoded, 64 chars)' },
                contentType: { type: new GraphQLNonNull(GraphQLString), description: 'MIME type of the file' },
                size: { type: new GraphQLNonNull(GraphQLInt), description: 'File size in bytes' },
                filename: { type: GraphQLString, description: 'Original filename (optional)' },
                key: { type: GraphQLString, description: 'Custom logical key (only when bucket has allow_custom_keys=true)' },
              },
            });

            const PayloadType = new GraphQLObjectType({
              name: names.uploadPayloadType,
              fields: {
                uploadUrl: { type: GraphQLString, description: 'Presigned PUT URL (null if deduplicated)' },
                ...(jsonType
                  ? {
                    uploadHeaders: {
                      type: jsonType,
                      description:
                          'The exact headers the PUT to uploadUrl must send (Content-Type and every header the URL is ' +
                          'signed over, e.g. x-amz-checksum-sha256 and x-amz-meta-upload-id). Forward them as-is. ' +
                          'Null if deduplicated.',
                    },
                  }
                  : {}),
                fileId: { type: new GraphQLNonNull(GraphQLString), description: 'The file ID (UUID)' },
                key: { type: new GraphQLNonNull(GraphQLString), description: 'The S3 object key' },
                deduplicated: { type: new GraphQLNonNull(GraphQLBoolean), description: 'Whether this file was deduplicated (content already exists)' },
                expiresAt: { type: GraphQLString, description: 'Presigned URL expiry time (null if deduplicated)' },
                ...(jsonType
                  ? {
                    file: {
                      type: jsonType,
                      description:
                          'The projection document for the created file: {id, key, bucket_id, mime, size, filename?}. ' +
                          'Store this verbatim in an image/upload column — its `id` is what keeps the object from being ' +
                          'garbage collected while the column still references it. ' +
                          'After the upload is confirmed, use `file.id` to query the file row\'s `downloadUrl`.',
                    },
                  }
                  : {}),
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
                    const $isPublic = access($input, 'isPublic');
                    const $contentHash = access($input, 'contentHash');
                    const $contentType = access($input, 'contentType');
                    const $size = access($input, 'size');
                    const $filename = access($input, 'filename');
                    const $customKey = access($input, 'key');
                    const $ownerId = hasOwnerId ? access($input, 'ownerId') : lambda(null, (): null => null);
                    const $databaseId = hasDatabaseId ? access($input, 'databaseId') : lambda(null, (): null => null);
                    const $withPgClient = (grafastContext() as any).get('withPgClient');
                    const $pgSettings = (grafastContext() as any).get('pgSettings');

                    const $combined = object({
                      bucketKey: $bucketKey,
                      isPublic: $isPublic,
                      ownerId: $ownerId,
                      databaseId: $databaseId,
                      contentHash: $contentHash,
                      contentType: $contentType,
                      size: $size,
                      filename: $filename,
                      customKey: $customKey,
                      withPgClient: $withPgClient,
                      pgSettings: $pgSettings,
                    });

                    return lambda($combined, async (vals: any) => {
                      // Request-lane reads/writes run under the request role's pgSettings
                      // inside an explicit transaction so the jwt claims stay applied
                      // across every statement (see withRequestPgClient).
                      const claimDatabaseId = await withRequestPgClient(vals.withPgClient, vals.pgSettings, (pgClient) =>
                        resolveDatabaseId(pgClient),
                      );
                      if (!claimDatabaseId) throw new Error('DATABASE_NOT_FOUND');
                      // The input's databaseId selects the row's scope; identity stays on the claims.
                      const databaseId: string = vals.databaseId ?? claimDatabaseId;

                      // Storage config is read on the request lane through the claim-scoped

                      // function_resolution.storage_modules(): no role switch, no RLS bypass.
                      const allConfigs = await withRequestPgClient(vals.withPgClient, vals.pgSettings, (pgClient) =>
                        loadAllStorageModules(pgClient, claimDatabaseId),
                      );
                      const storageConfig = resolveStorageConfigFromCodec(capturedFilesCodec, allConfigs);
                      if (!storageConfig) throw new Error('STORAGE_MODULE_NOT_FOUND');

                      // Bucket resolution + read under the request role (RLS-gated visibility).
                      const bucket = await withRequestPgClient(vals.withPgClient, vals.pgSettings, (pgClient) =>
                        resolveUploadBucket(
                          pgClient, storageConfig, databaseId,
                          vals.bucketKey ?? null, vals.ownerId ?? null, vals.isPublic === true,
                          hasDatabaseId, vals.databaseId != null,
                        ),
                      );
                      if (!bucket && vals.databaseId != null) throw new Error('DATABASE_ACCESS_DENIED');
                      if (!bucket) throw new Error('BUCKET_NOT_FOUND');

                      // The reconciler records the coordinate; consumers never
                      // recompute it from the logical bucket row.
                      const physicalName = assertBucketReconciled(bucket, databaseId);
                      const s3ForDb = resolveS3ForDatabase(options, storageConfig, physicalName);

                      // File row INSERT under the request role (RLS enforced).
                      return withRequestPgClient(vals.withPgClient, vals.pgSettings, (txClient) =>
                        processSingleFile(options, txClient, storageConfig, databaseId, bucket, s3ForDb, {
                          contentHash: vals.contentHash,
                          contentType: vals.contentType,
                          size: vals.size,
                          filename: vals.filename,
                          key: vals.customKey,
                        }),
                      );
                    });
                  },
                },
            );

            // --- Bulk file upload mutation ---
            const BulkFileInputType = new GraphQLInputObjectType({
              name: names.bulkUploadFileInputType,
              fields: {
                contentHash: { type: new GraphQLNonNull(GraphQLString), description: 'SHA-256 content hash (hex-encoded, 64 chars)' },
                contentType: { type: new GraphQLNonNull(GraphQLString), description: 'MIME type of the file' },
                size: { type: new GraphQLNonNull(GraphQLInt), description: 'File size in bytes' },
                filename: { type: GraphQLString, description: 'Original filename (optional)' },
                key: { type: GraphQLString, description: 'Custom logical key (only when bucket has allow_custom_keys=true)' },
              },
            });

            const BulkFilePayloadType = new GraphQLObjectType({
              name: names.bulkUploadFilePayloadType,
              fields: {
                uploadUrl: { type: GraphQLString },
                ...(jsonType ? { uploadHeaders: { type: jsonType, description: 'The exact headers the PUT to uploadUrl must send.' } } : {}),
                fileId: { type: new GraphQLNonNull(GraphQLString) },
                key: { type: new GraphQLNonNull(GraphQLString) },
                deduplicated: { type: new GraphQLNonNull(GraphQLBoolean) },
                expiresAt: { type: GraphQLString },
                ...(jsonType ? { file: { type: jsonType, description: 'The projection document for the created file.' } } : {}),
              },
            });

            const BulkInputType = new GraphQLInputObjectType({
              name: names.bulkUploadInputType,
              fields: {
                bucketKey: { type: GraphQLString, description: 'Bucket key (e.g., "public", "private"). Omit to use the database\'s default bucket for the requested access.' },
                isPublic: { type: GraphQLBoolean, description: 'Which default bucket to resolve when bucketKey is omitted. Ignored when bucketKey is given.' },
                ...(hasOwnerId
                  ? { ownerId: { type: new GraphQLNonNull(ownerIdGqlType || GraphQLString), description: 'Owner entity ID (required for entity-scoped buckets)' } }
                  : {}),
                ...(hasDatabaseId
                  ? { databaseId: { type: uuidGqlType, description: 'Database the file belongs to. Omit for the database of the current session; a caller who is not a member of the named database is refused.' } }
                  : {}),
                files: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(BulkFileInputType))), description: 'Array of files to upload' },
              },
            });

            const BulkPayloadType = new GraphQLObjectType({
              name: names.bulkUploadPayloadType,
              fields: {
                files: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(BulkFilePayloadType))) },
              },
            });

            const bulkMutationName = names.bulkUploadMutation;
            log.debug(`Adding bulk file upload mutation "${bulkMutationName}" for ${filesTypeName}`);

            newFields[bulkMutationName] = context.fieldWithHooks(
                { fieldName: bulkMutationName } as any,
                {
                  description: `Upload multiple files: resolves the bucket by key, creates file rows, and returns presigned PUT URLs for each. Accepts at most the bucket's \`maxBulkFiles\` files per call.`,
                  type: BulkPayloadType,
                  args: {
                    input: { type: new GraphQLNonNull(BulkInputType) },
                  },
                  plan(_$mutation: any, fieldArgs: any) {
                    const $input = fieldArgs.getRaw('input');
                    const $bucketKey = access($input, 'bucketKey');
                    const $isPublic = access($input, 'isPublic');
                    const $ownerId = hasOwnerId ? access($input, 'ownerId') : lambda(null, (): null => null);
                    const $databaseId = hasDatabaseId ? access($input, 'databaseId') : lambda(null, (): null => null);
                    const $files = access($input, 'files');
                    const $withPgClient = (grafastContext() as any).get('withPgClient');
                    const $pgSettings = (grafastContext() as any).get('pgSettings');

                    const $combined = object({
                      bucketKey: $bucketKey,
                      isPublic: $isPublic,
                      ownerId: $ownerId,
                      databaseId: $databaseId,
                      files: $files,
                      withPgClient: $withPgClient,
                      pgSettings: $pgSettings,
                    });

                    return lambda($combined, async (vals: any) => {
                      // Request-lane reads/writes run under the request role's pgSettings
                      // inside an explicit transaction so the jwt claims stay applied
                      // across every statement (see withRequestPgClient).
                      const claimDatabaseId = await withRequestPgClient(vals.withPgClient, vals.pgSettings, (pgClient) =>
                        resolveDatabaseId(pgClient),
                      );
                      if (!claimDatabaseId) throw new Error('DATABASE_NOT_FOUND');
                      // The input's databaseId selects the row's scope; identity stays on the claims.
                      const databaseId: string = vals.databaseId ?? claimDatabaseId;

                      // Storage config is read on the request lane through the claim-scoped

                      // function_resolution.storage_modules(): no role switch, no RLS bypass.
                      const allConfigs = await withRequestPgClient(vals.withPgClient, vals.pgSettings, (pgClient) =>
                        loadAllStorageModules(pgClient, claimDatabaseId),
                      );
                      const storageConfig = resolveStorageConfigFromCodec(capturedFilesCodec, allConfigs);
                      if (!storageConfig) throw new Error('STORAGE_MODULE_NOT_FOUND');

                      // Bucket resolution + read under the request role (RLS-gated visibility).
                      const bucket = await withRequestPgClient(vals.withPgClient, vals.pgSettings, (pgClient) =>
                        resolveUploadBucket(
                          pgClient, storageConfig, databaseId,
                          vals.bucketKey ?? null, vals.ownerId ?? null, vals.isPublic === true,
                          hasDatabaseId, vals.databaseId != null,
                        ),
                      );
                      if (!bucket && vals.databaseId != null) throw new Error('DATABASE_ACCESS_DENIED');
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

                      // The reconciler records the coordinate; consumers never
                      // recompute it from the logical bucket row.
                      const physicalName = assertBucketReconciled(bucket, databaseId);
                      const s3ForDb = resolveS3ForDatabase(options, storageConfig, physicalName);

                      // File row INSERTs under the request role (RLS enforced).
                      return withRequestPgClient(vals.withPgClient, vals.pgSettings, async (txClient) => {
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
                  },
                },
            );

            for (const siteCodec of Object.values(registry.pgCodecs) as any[]) {
              const scope = siteCodec.extensions?.tags?.siteUploads;
              if (scope !== 'platform' && scope !== 'database') continue;
              const refs = Object.values(registry.pgRelations[siteCodec.name] ?? {}) as any[];
              if (!refs.some((ref) =>
                !ref.isReferencee && ref.localAttributes.length === 1 &&
                ref.localAttributes[0] === 'bucket_id' && ref.remoteResource?.codec === matchingBucketCodec,
              )) continue;
              const site = siteCodec.extensions.pg;
              const sites = QuoteUtils.quoteQualifiedIdentifier(site.schemaName, site.name);
              const stem = scope === 'platform' ? 'PlatformSiteFile' : 'SiteFile';
              const name = `upload${stem}s`;
              const SiteFilePayload = new GraphQLObjectType({
                name: `${stem}UploadResult`,
                fields: {
                  ...BulkFilePayloadType.toConfig().fields,
                  key: { type: GraphQLString },
                  fileId: { type: GraphQLString },
                  logicalKey: { type: new GraphQLNonNull(GraphQLString) },
                  pending: { type: GraphQLBoolean },
                },
              });
              const SitePayload = new GraphQLObjectType({
                name: `${stem}UploadPayload`,
                fields: { files: { type: new GraphQLList(new GraphQLNonNull(SiteFilePayload)) } },
              });
              const FileInput = new GraphQLInputObjectType({
                name: `Upload${stem}Input`,
                fields: {
                  contentHash: { type: new GraphQLNonNull(GraphQLString) },
                  contentType: { type: new GraphQLNonNull(GraphQLString) },
                  size: { type: new GraphQLNonNull(GraphQLInt) },
                  filename: { type: GraphQLString },
                  route: { type: GraphQLString, description: 'Mutable route. Omit for release content.' },
                },
              });
              const Input = new GraphQLInputObjectType({
                name: `Upload${stem}BulkInput`,
                fields: {
                  siteId: { type: new GraphQLNonNull(uuidGqlType) },
                  files: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(FileInput))) },
                  checkOnly: { type: GraphQLBoolean, description: 'Read upload status without issuing PUT URLs.' },
                },
              });
              newFields[name] = context.fieldWithHooks({ fieldName: name } as any, {
                type: SitePayload,
                args: { input: { type: new GraphQLNonNull(Input) } },
                plan(_$mutation: any, fieldArgs: any) {
                  const $input = fieldArgs.getRaw('input');
                  return lambda(object({
                    siteId: access($input, 'siteId'),
                    files: access($input, 'files'),
                    checkOnly: access($input, 'checkOnly'),
                    withPgClient: (grafastContext() as any).get('withPgClient'),
                    pgSettings: (grafastContext() as any).get('pgSettings'),
                  }), (vals: any) => withRequestPgClient(vals.withPgClient, vals.pgSettings, async (txClient) => {
                    const databaseId = await resolveDatabaseId(txClient);
                    if (!databaseId) throw new Error('DATABASE_NOT_FOUND');
                    const configs = await loadAllStorageModules(txClient, databaseId);
                    const config = resolveStorageConfigFromCodec(capturedFilesCodec, configs);
                    if (!config) throw new Error('STORAGE_MODULE_NOT_FOUND');
                    const { rows } = await txClient.query({
                      text: `SELECT b.id, b.key, b.type, b.is_public, b.allowed_mime_types,
                                    b.max_file_size, b.allow_custom_keys, b.physical_name
                               FROM ${sites} AS s
                               JOIN ${config.bucketsQualifiedName} AS b ON b.id = s.bucket_id
                              WHERE s.id = $1::uuid AND b.is_public
                              ${vals.checkOnly ? 'FOR SHARE OF s' : 'FOR UPDATE OF s'}`,
                      values: [vals.siteId],
                    });
                    const bucket = rows[0] as unknown as BucketConfig | undefined;
                    if (!bucket) throw new Error('SITE_UPLOAD_NOT_AUTHORIZED');
                    const files = vals.files as any[];
                    if (files.length > config.maxBulkFiles) throw new Error('BULK_UPLOAD_FILES_EXCEEDED');
                    if (files.reduce((sum, file) => sum + file.size, 0) > config.maxBulkTotalSize) {
                      throw new Error('BULK_UPLOAD_SIZE_EXCEEDED');
                    }
                    if (!vals.checkOnly && files.some((file) => file.route == null)) {
                      await txClient.query({
                        text: "SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('site-release:' || $1::text, 0))",
                        values: [bucket.id],
                      });
                    }
                    const s3 = resolveS3ForDatabase(options, config, assertBucketReconciled(bucket, databaseId));
                    const results = [];
                    for (const file of files) {
                      results.push(await processSingleFile(
                        options, txClient, config, databaseId, bucket, s3,
                        { ...file, key: file.route },
                        { release: file.route == null, checkOnly: vals.checkOnly === true },
                      ));
                    }
                    return { files: results };
                  }));
                },
              });
            }
          }

          return build.extend(
            fields,
            newFields,
            'PresignedUrlPlugin adding file upload mutations',
          );
        },
      },
    },
  };
}

// --- Shared upload logic ---

export async function processSingleFile(
  options: PresignedUrlPluginOptions,
  txClient: any,
  storageConfig: StorageModuleConfig,
  databaseId: string,
  bucket: BucketConfig,
  s3ForDb: S3Config,
  input: any,
  siteUpload?: { release: boolean; checkOnly: boolean },
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

  // The bytes are not here to be examined — the client PUTs them straight to S3 —
  // so this checks the two claims that *are* here against each other. It is the
  // cheap half of the rule: an upload declaring `image/jpeg` under the name
  // `payload.html` is refused before a row exists, without reading a byte. The
  // bytes themselves are checked on confirmation, before the row leaves
  // `requested`.
  const agreement = checkTypeAgreement({ filename, declaredMime: contentType });
  if (!agreement.ok) {
    throw new Error(`UPLOAD_TYPE_MISMATCH: ${agreement.violation.message}`);
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

  // The projection document the caller stores in an image/upload column. Built
  // from the same values the files row carries, so the column and the row cannot
  // disagree, and it names the files row by id — which is what stops GC from
  // collecting an object a document still points at.
  const projectFile = (fileId: string, key: string): FileProjection =>
    buildFileProjection({ id: fileId, key, bucketId: bucket.id, mime: contentType, size, filename });

  const signUpload = async (fileId: string, key: string, mime: string, bytes: number, ttl: number) => ({
    uploadUrl: await generatePresignedPutUrl(s3ForDb, key, mime, bytes, ttl, contentHash, fileId),
    uploadHeaders: presignedPutHeaders(mime, contentHash, fileId),
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
  });

  // The user names a logical slot, never an object-store location. Only the
  // recorder allocates the physical key, independently for every new request.
  const logicalKey = siteUpload?.release ? RELEASE_SLOT_PREFIX + contentHash : customKey || contentHash;
  if (customKey || (siteUpload && !siteUpload.release)) {
    if (!customKey) throw new Error('INVALID_ROUTE');
    if (customKey.startsWith(RELEASE_SLOT_PREFIX)) {
      throw new Error('RESERVED_RELEASE_SLOT');
    }
    if (!siteUpload && !bucket.allow_custom_keys) {
      throw new Error('CUSTOM_KEY_NOT_ALLOWED: bucket does not allow custom keys');
    }
    const keyError = validateCustomKey(customKey);
    if (keyError) throw new Error(keyError);
  }

  if (siteUpload?.release || siteUpload?.checkOnly) {
    const { rows } = await txClient.query({
      text: `SELECT id, key, status::text AS status, mime_type, size, filename, created_at
               FROM ${storageConfig.filesQualifiedName}
              WHERE logical_key = $1 AND bucket_id = $2 AND content_hash = $3
                AND NOT logical_key_retired AND status IN ('requested', 'uploaded', 'processed')
              ORDER BY CASE WHEN status = 'requested' THEN 1 ELSE 0 END LIMIT 1`,
      values: [logicalKey, bucket.id, contentHash],
    });
    const row = rows[0];
    if (row) {
      if (row.status === 'requested' && !siteUpload.checkOnly) {
        const deadline = new Date(row.created_at).getTime() + storageConfig.uploadUrlExpirySeconds * 1000;
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) throw new Error('SITE_RELEASE_UPLOAD_EXPIRED');
        return {
          ...await signUpload(row.id, row.key, row.mime_type, Number(row.size), Math.ceil(remainingMs / 1000)),
          expiresAt: new Date(deadline).toISOString(),
          fileId: row.id, key: row.key, logicalKey,
          deduplicated: false, pending: false,
          file: buildFileProjection({
            id: row.id, key: row.key, bucketId: bucket.id,
            mime: row.mime_type, size: Number(row.size), filename: row.filename,
          }),
        };
      }
      return {
        uploadUrl: null as string | null, uploadHeaders: null as Record<string, string> | null,
        fileId: row.id, key: row.key, logicalKey,
        deduplicated: row.status !== 'requested', pending: row.status === 'requested',
        expiresAt: null as string | null, file: projectFile(row.id, row.key),
      };
    }
    if (siteUpload.checkOnly) return { logicalKey, deduplicated: false, pending: false };
  }

  // Dedup is a read of confirmed identical content in the same logical slot.
  // It issues no PUT URL. Pending/rejected attempts are not reused or deleted:
  // each retry gets its own object and lifecycle, including its expiry/GC.
  const existingResult = await txClient.query({
    text: `SELECT id, key
       FROM ${storageConfig.filesQualifiedName}
       WHERE logical_key = $1 AND bucket_id = $2 AND content_hash = $3
         AND NOT logical_key_retired
         AND status IN ('uploaded', 'processed')
       LIMIT 1`,
    values: [logicalKey, bucket.id, contentHash],
  });
  if (existingResult.rows.length > 0) {
    const existing = existingResult.rows[0];
    log.info(`Dedup hit: file ${existing.id} for hash ${contentHash}`);
    return {
      uploadUrl: null as string | null,
      uploadHeaders: null as Record<string, string> | null,
      fileId: existing.id as string,
      key: existing.key as string,
      logicalKey,
      deduplicated: true,
      expiresAt: null as string | null,
      file: projectFile(existing.id as string, existing.key as string),
    };
  }

  const derivedPath = customKey && storageConfig.hasPathShares ? derivePathFromKey(logicalKey) : null;
  const recorded = await recordManagedFile(txClient, storageConfig, {
    bucketId: bucket.id,
    key: logicalKey,
    contentHash,
    mimeType: contentType,
    size,
    filename: filename || null,
    path: derivedPath,
  });
  const fileId = recorded.id;
  const s3Key = recorded.key;

  // Generate presigned PUT URL, signed over the client's SHA-256 so the store
  // only accepts bytes that hash to the content hash on this row and any
  // later dedup hit. Neither logical keys nor checksums locate the object.
  return {
    ...await signUpload(fileId, s3Key, contentType, size, storageConfig.uploadUrlExpirySeconds),
    fileId,
    key: s3Key,
    logicalKey,
    deduplicated: false,
    file: projectFile(fileId, s3Key),
  };
}

export const PresignedUrlPlugin = createPresignedUrlPlugin;
export default PresignedUrlPlugin;
