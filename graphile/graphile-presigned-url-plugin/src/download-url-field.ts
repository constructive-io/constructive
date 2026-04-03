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
 */

import type { GraphileConfig } from 'graphile-config';
import { Logger } from '@pgpmjs/logger';

import type { PresignedUrlPluginOptions, S3Config } from './types';
import { generatePresignedGetUrl } from './s3-signer';
import { getStorageModuleConfig } from './storage-module-cache';

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
/**
 * Resolve the S3 config from the options. If the option is a lazy getter
 * function, call it (and cache the result).
 */
function resolveS3(options: PresignedUrlPluginOptions): S3Config {
  if (typeof options.s3 === 'function') {
    const resolved = options.s3();
    options.s3 = resolved;
    return resolved;
  }
  return options.s3;
}

export function createDownloadUrlPlugin(
  options: PresignedUrlPluginOptions,
): GraphileConfig.Plugin {

  return {
    name: 'PresignedUrlDownloadPlugin',
    version: '0.1.0',
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
                  async resolve(parent: any, _args: any, context: any) {
                    const key = parent.key || parent.get?.('key');
                    const isPublic = parent.is_public ?? parent.get?.('is_public');
                    const filename = parent.filename || parent.get?.('filename');
                    const status = parent.status || parent.get?.('status');

                    if (!key) return null;

                    // Only provide download URLs for ready/processed files
                    if (status !== 'ready' && status !== 'processed') {
                      return null;
                    }

                    const s3 = resolveS3(options);

                    if (isPublic && s3.publicUrlPrefix) {
                      // Public file: return direct URL
                      return `${s3.publicUrlPrefix}/${key}`;
                    }

                    // Resolve download URL expiry from storage module config (per-database)
                    let downloadUrlExpirySeconds = 3600; // fallback default
                    try {
                      const withPgClient = context.pgSettings
                        ? context.withPgClient
                        : null;
                      if (withPgClient) {
                        const config = await withPgClient(null, async (pgClient: any) => {
                          const dbResult = await pgClient.query(
                            `SELECT jwt_private.current_database_id() AS id`,
                          );
                          const databaseId = dbResult.rows[0]?.id;
                          if (!databaseId) return null;
                          return getStorageModuleConfig(pgClient, databaseId);
                        });
                        if (config) {
                          downloadUrlExpirySeconds = config.downloadUrlExpirySeconds;
                        }
                      }
                    } catch {
                      // Fall back to default if config lookup fails
                    }

                    // Private file: generate presigned GET URL
                    return generatePresignedGetUrl(
                      resolveS3(options),
                      key,
                      downloadUrlExpirySeconds,
                      filename || undefined,
                    );
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
