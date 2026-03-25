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

import type { PresignedUrlPluginOptions } from './types';
import { generatePresignedGetUrl } from './s3-signer';

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
  const { s3 } = options;
  const downloadUrlExpirySeconds = 3600; // 1 hour for GET URLs

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
                  resolve(parent: any) {
                    const key = parent.key || parent.get?.('key');
                    const isPublic = parent.is_public ?? parent.get?.('is_public');
                    const filename = parent.filename || parent.get?.('filename');
                    const status = parent.status || parent.get?.('status');

                    if (!key) return null;

                    // Only provide download URLs for ready/processed files
                    if (status !== 'ready' && status !== 'processed') {
                      return null;
                    }

                    if (isPublic && s3.publicUrlPrefix) {
                      // Public file: return direct URL
                      return `${s3.publicUrlPrefix}/${key}`;
                    }

                    // Private file: generate presigned GET URL
                    return generatePresignedGetUrl(
                      s3,
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
