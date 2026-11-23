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
import { constant, ConstantStep, context as grafastContext, lambda, object } from 'grafast';
import type {} from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import { withRequestPgClient } from 'graphile-plugin-utils';
import { DOWNLOAD_URL_FIELD } from 'graphile-storage-registry';

import { isLiveFileRow } from './file-lifecycle';
import { isVersionKeyOf } from './file-ref-urls';
import { resolveS3ForDatabase } from './physical-bucket';
import { generatePresignedGetUrl } from './s3-signer';
import { loadAllStorageModules, readBucketPhysicalName, resolveStorageConfigFromCodec } from './storage-module-cache';
import type { PresignedUrlPluginOptions } from './types';

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
export function createDownloadUrlPlugin(
  options: PresignedUrlPluginOptions,
): GraphileConfig.Plugin {

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

          const {
            graphql: { GraphQLString },
          } = build;

          const capturedCodec = pgCodec;
          const canReadVersions = pgCodec.attributes.image_versions &&
            build.behavior.pgCodecAttributeMatches([pgCodec, 'image_versions'], 'attribute:select');

          return build.extend(
            fields,
            {
              [DOWNLOAD_URL_FIELD]: context.fieldWithHooks(
                { fieldName: DOWNLOAD_URL_FIELD } as any,
                {
                  description:
                    'URL to download this file. For public files, returns the public URL. ' +
                    'For private files, returns a time-limited presigned URL. ' +
                    'Null until the upload is confirmed (status uploaded or processed), and for a rejected file.',
                  type: GraphQLString,
                  args: {
                    version: {
                      type: GraphQLString,
                      description: 'Exact name of a generated image version. Omit or pass null for the original file. ' +
                        'Returns null when the named version is unavailable or ambiguous.',
                    },
                  },
                  plan($parent: any, fieldArgs) {
                    const $version = fieldArgs.getRaw('version');
                    const sourceOnly = $version instanceof ConstantStep && $version.data == null;
                    const $key = $parent.get('key');
                    const $isPublic = $parent.get('is_public');
                    const $filename = $parent.get('filename');
                    const $bucketId = $parent.get('bucket_id');
                    const $status = $parent.get('status');

                    const $withPgClient = (grafastContext() as any).get('withPgClient');
                    const $pgSettings = (grafastContext() as any).get('pgSettings');

                    const $combined = object({
                      key: $key,
                      isPublic: $isPublic,
                      filename: $filename,
                      bucketId: $bucketId,
                      status: $status,
                      version: $version,
                      imageVersions: canReadVersions && !sourceOnly ? $parent.get('image_versions') : constant(null),
                      withPgClient: $withPgClient,
                      pgSettings: $pgSettings,
                    });

                    return lambda($combined, async ({ key, isPublic, filename, bucketId, status, version, imageVersions, withPgClient, pgSettings }: any) => {
                      if (!key) return null;
                      if (!isLiveFileRow({ status })) return null;

                      if (!withPgClient || !pgSettings) return null;

                      let downloadKey = key;
                      let downloadFilename = filename || undefined;
                      if (version != null) {
                        const versions = imageVersions?.versions;
                        if (!Array.isArray(versions)) return null;
                        const matches = versions.filter((entry) => entry?.name === version);
                        if (matches.length !== 1 || !isVersionKeyOf(key, matches[0].key)) return null;
                        downloadKey = matches[0].key;
                        downloadFilename = downloadKey.slice(downloadKey.lastIndexOf('/') + 1);
                      }

                      const databaseId = await withRequestPgClient(withPgClient, pgSettings, async (pgClient) => {
                        const dbResult = await pgClient.query({
                          text: `SELECT jwt_private.current_database_id() AS id`,
                        });
                        return (dbResult.rows[0]?.id as string | undefined) ?? null;
                      });
                      // Storage config is read on the request lane through the claim-scoped
                      // function_resolution.storage_modules(): no role switch, no RLS bypass.
                      const config = databaseId
                        ? resolveStorageConfigFromCodec(
                          capturedCodec,
                          await withRequestPgClient(withPgClient, pgSettings, (pgClient) => loadAllStorageModules(pgClient, databaseId)),
                        )
                        : null;
                      // The file row already passed the reader's RLS, which is the
                      // authorization for this URL. The reader may not see the bucket
                      // row itself (public file, path share), so its coordinate comes
                      // from the module's narrow bucket physical-name reader.
                      const resolved = config && bucketId
                        ? {
                          config,
                          physicalName: await withRequestPgClient(
                            withPgClient,
                            pgSettings,
                            (pgClient) => readBucketPhysicalName(pgClient, config, bucketId),
                          ),
                        }
                        : null;
                      // No physical bucket was ever provisioned: no object can exist.
                      if (!resolved || resolved.physicalName === null) return null;

                      const s3ForDb = resolveS3ForDatabase(options, resolved.config, resolved.physicalName);
                      if (isPublic && s3ForDb.publicUrlPrefix) {
                        const path = version == null ? key : downloadKey.split('/').map(encodeURIComponent).join('/');
                        return `${s3ForDb.publicUrlPrefix}/${s3ForDb.bucket}/${path}`;
                      }

                      return generatePresignedGetUrl(
                        s3ForDb,
                        downloadKey,
                        resolved.config.downloadUrlExpirySeconds,
                        downloadFilename,
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
