/**
 * downloadUrl Computed Field Plugin
 *
 * Adds a `downloadUrl` computed field to File types in the GraphQL schema.
 * For public files, returns the public URL prefix + key.
 * For private files, generates a presigned GET URL.
 *
 * Detection: Uses the `@storageFiles` smart tag on the codec (table).
 * The storage module generator in constructive-db sets this tag on the
 * generated files table via a smart comment:
 *   COMMENT ON TABLE files IS E'@storageFiles\nStorage files table';
 *
 * This is explicit and reliable — no duck-typing on column names.
 *
 * IMPORTANT: Uses Grafast plan() instead of traditional resolve().
 * In PostGraphile V5, Grafast's planning system does not invoke traditional
 * resolve functions on PG table type fields — it plans them as column
 * lookups. Since downloadUrl is a computed field (not a real column),
 * the plan() function is required for Grafast to execute the S3 signing.
 */

import 'graphile-build';

import { Logger } from '@pgpmjs/logger';
import { context as grafastContext, lambda, object } from 'grafast';
import type { GraphileConfig } from 'graphile-config';

import {
  type RequestPgClient,
  type WithPgClient,
  withRequestPgClient,
} from './request-pg-client';
import { generatePresignedGetUrl } from './s3-signer';
import { resolveS3ConfigForPhysicalBucket } from './s3-config';
import {
  getStorageModuleCacheScope,
  resolveStorageConfigFromCodec,
  storedPhysicalName,
  type StorageModuleCacheScope,
} from './storage-module-cache';
import {
  assertStorageRequestContext,
  loadStorageModulesForBuild,
  snapshotPreloadedStorageModules,
  type PreloadedStorageModules,
  type StorageWithPgClient,
} from './storage-module-source';
import type { PresignedUrlPluginOptions, S3Config } from './types';

const log = new Logger('graphile-presigned-url:download-url');

/**
 * Creates the downloadUrl computed field plugin.
 *
 * This is a separate plugin from the main presigned URL plugin because it
 * uses the GraphQLObjectType_fields hook (low-level) rather than extendSchema.
 * The downloadUrl field needs to be added dynamically to whatever table is
 * the storage module's files table, which we discover at schema-build time
 * via the `@storageFiles` smart tag.
 */
interface DownloadStorageTargetOptions {
  options: PresignedUrlPluginOptions;
  preloadedStorageModules: PreloadedStorageModules;
  cacheScope: StorageModuleCacheScope;
  codec: {
    name: string;
    extensions?: { pg?: { schemaName?: string; name?: string } };
    sqlType?: string;
  };
  withPgClient: (WithPgClient & StorageWithPgClient) | null | undefined;
  pgSettings: unknown;
  bucketId: string | null | undefined;
}

function withCurrentRequestPgClient(
  pgClient: RequestPgClient,
): StorageWithPgClient {
  return async (_pgSettings, callback) => callback(pgClient);
}

/**
 * Resolve every tenant-bound input before choosing credentials or signing.
 * Any missing metadata or database error rejects the field instead of signing
 * the same key with process-global fallback configuration.
 */
export async function resolveDownloadStorageTarget({
  options,
  preloadedStorageModules,
  cacheScope,
  codec,
  withPgClient,
  pgSettings,
  bucketId,
}: DownloadStorageTargetOptions): Promise<{
  s3: S3Config;
  downloadUrlExpirySeconds: number;
}> {
  assertStorageRequestContext(withPgClient, pgSettings);
  const requestSettings = pgSettings as Record<string, string>;

  return withRequestPgClient(withPgClient, requestSettings, async (pgClient) => {
    const result = await pgClient.query({
      text: `SELECT jwt_private.current_database_id() AS id`,
    });
    const databaseId = result.rows[0]?.id as string | null | undefined;
    if (!databaseId) {
      throw new Error('DATABASE_NOT_FOUND');
    }

    const allConfigs = await loadStorageModulesForBuild(
      preloadedStorageModules,
      withCurrentRequestPgClient(pgClient),
      requestSettings,
      databaseId,
      cacheScope,
    );
    const storageConfig = resolveStorageConfigFromCodec(codec, allConfigs);
    if (!storageConfig) {
      throw new Error('STORAGE_MODULE_NOT_FOUND');
    }
    if (!bucketId) {
      throw new Error('BUCKET_NOT_FOUND');
    }

    const bucketResult = await pgClient.query({
      text: `SELECT key, physical_name FROM ${storageConfig.bucketsQualifiedName} WHERE id = $1 LIMIT 1`,
      values: [bucketId],
    });
    const bucketRow = bucketResult.rows[0] as { key: string; physical_name?: string | null } | undefined;
    if (!bucketRow) {
      throw new Error('BUCKET_NOT_FOUND');
    }
    const physicalName = storedPhysicalName(bucketRow);
    if (physicalName === null) {
      throw new Error('BUCKET_NOT_PROVISIONED');
    }

    return {
      s3: resolveS3ConfigForPhysicalBucket(
        options,
        storageConfig,
        physicalName,
        cacheScope,
      ),
      downloadUrlExpirySeconds: storageConfig.downloadUrlExpirySeconds,
    };
  });
}

export function createDownloadUrlPlugin(
  options: PresignedUrlPluginOptions,
): GraphileConfig.Plugin {
  const preloadedStorageModules = snapshotPreloadedStorageModules(
    options.preloadedStorageModules,
  );

  return {
    name: 'PresignedUrlDownloadPlugin',
    version: '0.2.0',
    description: 'Adds downloadUrl computed field to File types tagged with @storageFiles',

    schema: {
      hooks: {
        GraphQLObjectType_fields(fields, build, context) {
          const {
            scope: { pgCodec, isPgClassType },
          } = context as any;

          // Only process PG class types (table row types)
          if (!isPgClassType || !pgCodec || !pgCodec.attributes) {
            return fields;
          }

          // Check for @storageFiles smart tag — set by the storage module generator
          const tags = (pgCodec.extensions as any)?.tags;
          if (!tags?.storageFiles) {
            return fields;
          }

          log.debug(`Adding downloadUrl field to type: ${pgCodec.name} (has @storageFiles tag)`);
          const cacheScope = getStorageModuleCacheScope(build);

          const {
            graphql: { GraphQLString },
          } = build;

          const capturedCodec = pgCodec;

          return build.extend(
            fields,
            {
              downloadUrl: context.fieldWithHooks(
                { fieldName: 'downloadUrl' } as any,
                {
                  description:
                    'URL to download this file. For public files, returns the public URL. ' +
                    'For private files, returns a time-limited presigned URL.',
                  type: GraphQLString,
                  plan($parent: any) {
                    const $key = $parent.get('key');
                    const $isPublic = $parent.get('is_public');
                    const $filename = $parent.get('filename');
                    const $bucketId = $parent.get('bucket_id');

                    const $withPgClient = (grafastContext() as any).get('withPgClient');
                    const $pgSettings = (grafastContext() as any).get('pgSettings');

                    const $combined = object({
                      key: $key,
                      isPublic: $isPublic,
                      filename: $filename,
                      bucketId: $bucketId,
                      withPgClient: $withPgClient,
                      pgSettings: $pgSettings,
                    });

                    return lambda($combined, async ({ key, isPublic, filename, bucketId, withPgClient, pgSettings }: any) => {
                      if (!key) return null;

                      let target: Awaited<ReturnType<typeof resolveDownloadStorageTarget>>;
                      try {
                        target = await resolveDownloadStorageTarget({
                          options,
                          preloadedStorageModules,
                          cacheScope,
                          codec: capturedCodec,
                          withPgClient,
                          pgSettings,
                          bucketId,
                        });
                      } catch (error) {
                        if (error instanceof Error && error.message === 'BUCKET_NOT_PROVISIONED') {
                          return null;
                        }
                        throw error;
                      }

                      if (isPublic && target.s3.publicUrlPrefix) {
                        return `${target.s3.publicUrlPrefix}/${target.s3.bucket}/${key}`;
                      }

                      return generatePresignedGetUrl(
                        target.s3,
                        key,
                        target.downloadUrlExpirySeconds,
                        filename || undefined,
                      );
                    });
                  },
                },
              ),
            },
            'PresignedUrlDownloadPlugin adding downloadUrl field',
          );
        },
      },
    },
  };
}

export default createDownloadUrlPlugin;
