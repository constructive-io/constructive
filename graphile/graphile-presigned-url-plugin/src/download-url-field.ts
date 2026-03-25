/**
 * downloadUrl Computed Field Plugin
 *
 * Adds a `downloadUrl` computed field to File types in the GraphQL schema.
 * For public files, returns the public URL prefix + key.
 * For private files, generates a presigned GET URL.
 *
 * This plugin uses the GraphQLObjectType_fields hook to detect file tables
 * (by checking for the storage module's files table) and add the computed field.
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
 * the storage module's files table, which we discover at schema-build time.
 */
export function createDownloadUrlPlugin(
  options: PresignedUrlPluginOptions,
): GraphileConfig.Plugin {
  const { s3 } = options;
  const downloadUrlExpirySeconds = 3600; // 1 hour for GET URLs

  return {
    name: 'PresignedUrlDownloadPlugin',
    version: '0.1.0',
    description: 'Adds downloadUrl computed field to File types',

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

          const attrs = pgCodec.attributes as Record<string, any>;

          // Detect if this is a files table by checking for characteristic columns:
          // key, content_type, content_hash, status, bucket_id, is_public
          const hasKey = 'key' in attrs;
          const hasContentType = 'content_type' in attrs;
          const hasContentHash = 'content_hash' in attrs;
          const hasStatus = 'status' in attrs;
          const hasBucketId = 'bucket_id' in attrs;
          const hasIsPublic = 'is_public' in attrs;

          if (!hasKey || !hasContentType || !hasContentHash || !hasStatus || !hasBucketId || !hasIsPublic) {
            return fields;
          }

          log.debug(`Adding downloadUrl field to type: ${pgCodec.name}`);

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
