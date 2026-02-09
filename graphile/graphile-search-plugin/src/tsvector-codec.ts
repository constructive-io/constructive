/**
 * TsvectorCodecPlugin
 *
 * Teaches PostGraphile v5 how to handle PostgreSQL's tsvector and tsquery types.
 * Without this, tsvector columns are invisible to the schema builder and the
 * search plugin cannot generate condition fields.
 *
 * This plugin:
 * 1. Creates codecs for tsvector/tsquery via gather.hooks.pgCodecs_findPgCodec
 * 2. Maps those codecs to GraphQL String via schema.hooks.init
 */

import type { GraphileConfig } from 'graphile-config';
import { GraphQLString } from 'graphql';
import sql from 'pg-sql2';

export const TsvectorCodecPlugin: GraphileConfig.Plugin = {
  name: 'TsvectorCodecPlugin',
  version: '1.0.0',

  gather: {
    hooks: {
      async pgCodecs_findPgCodec(info, event) {
        if (event.pgCodec) {
          return;
        }

        const { pgType: type, serviceName } = event;

        const pgCatalog = await info.helpers.pgIntrospection.getNamespaceByName(
          serviceName,
          'pg_catalog'
        );

        if (!pgCatalog) {
          return;
        }

        if (type.typnamespace === pgCatalog._id && type.typname === 'tsvector') {
          event.pgCodec = {
            name: 'tsvector',
            sqlType: sql.identifier('pg_catalog', 'tsvector'),
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

  schema: {
    hooks: {
      init(_, build) {
        const { setGraphQLTypeForPgCodec } = build;

        for (const codec of Object.values(build.input.pgRegistry.pgCodecs)) {
          if (codec.name === 'tsvector') {
            setGraphQLTypeForPgCodec(codec, 'input', GraphQLString.name);
            setGraphQLTypeForPgCodec(codec, 'output', GraphQLString.name);
          } else if (codec.name === 'tsquery') {
            setGraphQLTypeForPgCodec(codec, 'input', GraphQLString.name);
            setGraphQLTypeForPgCodec(codec, 'output', GraphQLString.name);
          }
        }

        return _;
      },
    },
  },
};

export const TsvectorCodecPreset: GraphileConfig.Preset = {
  plugins: [TsvectorCodecPlugin],
};
