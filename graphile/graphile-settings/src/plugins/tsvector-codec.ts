import type { GraphileConfig } from 'graphile-config';
import sql from 'pg-sql2';

/**
 * Plugin that adds support for PostgreSQL's tsvector type.
 *
 * The tsvector type is used for full-text search in PostgreSQL.
 * PostGraphile v5 doesn't have built-in support for it, so we need
 * to add a custom codec.
 *
 * This plugin implements the gather.hooks.pgCodecs_findPgCodec hook
 * to provide a codec for tsvector columns. The codec treats tsvector
 * as a string in GraphQL (the text representation of the tsvector).
 */
export const TsvectorCodecPlugin: GraphileConfig.Plugin = {
  name: 'TsvectorCodecPlugin',
  version: '1.0.0',

  gather: {
    hooks: {
      async pgCodecs_findPgCodec(info, event) {
        // Skip if another plugin already provided a codec
        if (event.pgCodec) {
          return;
        }

        const { pgType: type, serviceName } = event;

        // Check if this is the tsvector type from pg_catalog
        const pgCatalog = await info.helpers.pgIntrospection.getNamespaceByName(
          serviceName,
          'pg_catalog'
        );

        if (!pgCatalog) {
          return;
        }

        // Handle tsvector type
        if (type.typnamespace === pgCatalog._id && type.typname === 'tsvector') {
          // Create a simple string codec for tsvector
          // The tsvector will be serialized as its text representation
          event.pgCodec = {
            name: 'tsvector',
            sqlType: sql.identifier('pg_catalog', 'tsvector'),
            // tsvector is represented as text in GraphQL
            fromPg: (value: string) => value,
            toPg: (value: string) => value,
            attributes: undefined,
            executor: null,
            extensions: {
              oid: type._id,
              pg: {
                serviceName,
                schemaName: 'pg_catalog',
                name: 'tsvector',
              },
            },
          };
          return;
        }

        // Handle tsquery type (often used alongside tsvector)
        if (type.typnamespace === pgCatalog._id && type.typname === 'tsquery') {
          event.pgCodec = {
            name: 'tsquery',
            sqlType: sql.identifier('pg_catalog', 'tsquery'),
            fromPg: (value: string) => value,
            toPg: (value: string) => value,
            attributes: undefined,
            executor: null,
            extensions: {
              oid: type._id,
              pg: {
                serviceName,
                schemaName: 'pg_catalog',
                name: 'tsquery',
              },
            },
          };
          return;
        }
      },
    },
  },
};

/**
 * Preset that includes the tsvector codec plugin.
 */
export const TsvectorCodecPreset: GraphileConfig.Preset = {
  plugins: [TsvectorCodecPlugin],
};

export default TsvectorCodecPlugin;
