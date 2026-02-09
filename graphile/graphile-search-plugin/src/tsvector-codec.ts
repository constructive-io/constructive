/**
 * TsvectorCodecPlugin
 *
 * Teaches PostGraphile v5 how to handle PostgreSQL's tsvector and tsquery types.
 * Without this, tsvector columns are invisible to the schema builder and the
 * search plugin cannot generate condition fields.
 *
 * This plugin:
 * 1. Creates codecs for tsvector/tsquery via gather.hooks.pgCodecs_findPgCodec
 * 2. Registers a custom "FullText" scalar type for tsvector columns
 * 3. Maps tsvector codec to the FullText scalar (isolating filter operators)
 * 4. Maps tsquery codec to GraphQL String
 * 5. Optionally hides tsvector columns from output types
 */

import type { GraphileConfig } from 'graphile-config';
import { GraphQLString } from 'graphql';
import sql from 'pg-sql2';
import type { PgSearchPluginOptions } from './types';

/**
 * Creates a TsvectorCodecPlugin with the given options.
 *
 * @param options - Plugin configuration
 * @returns GraphileConfig.Plugin
 */
export function createTsvectorCodecPlugin(
  options: PgSearchPluginOptions = {}
): GraphileConfig.Plugin {
  const {
    fullTextScalarName = 'FullText',
    hideTsvectorColumns = false,
  } = options;

  return {
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
        // Must run before PgCodecsPlugin's init (to avoid "unknown codec" warning)
        // and before PgConnectionArgFilterPlugin's init (which creates filter
        // types like FullTextFilter based on codec→GraphQL type mappings).
        init: {
          before: ['PgCodecs', 'PgConnectionArgFilterPlugin'],
          callback(_, build) {
            const { setGraphQLTypeForPgCodec } = build;

            // Register a custom scalar type for tsvector columns.
            // This ensures filter operators like `matches` only appear on
            // tsvector filters, not on all String filters.
            build.registerScalarType(
              fullTextScalarName,
              {},
              () => ({
                description: 'A full-text search tsvector value represented as a string.',
                serialize(value: unknown) {
                  return String(value);
                },
                parseValue(value: unknown) {
                  if (typeof value === 'string') {
                    return value;
                  }
                  throw new Error(`${fullTextScalarName} must be a string`);
                },
                parseLiteral(lit: any) {
                  if (lit.kind === 'NullValue') return null;
                  if (lit.kind !== 'StringValue') {
                    throw new Error(`${fullTextScalarName} must be a string`);
                  }
                  return lit.value;
                },
              }),
              `TsvectorCodecPlugin registering ${fullTextScalarName} scalar`
            );

            for (const codec of Object.values(build.input.pgRegistry.pgCodecs)) {
              if (codec.name === 'tsvector') {
                setGraphQLTypeForPgCodec(codec, 'input', fullTextScalarName);
                setGraphQLTypeForPgCodec(codec, 'output', fullTextScalarName);
              } else if (codec.name === 'tsquery') {
                setGraphQLTypeForPgCodec(codec, 'input', GraphQLString.name);
                setGraphQLTypeForPgCodec(codec, 'output', GraphQLString.name);
              }
            }

            return _;
          },
        },
      },

      ...(hideTsvectorColumns
        ? {
            entityBehavior: {
              pgCodecAttribute: {
                inferred: {
                  after: ['postInferred'],
                  provides: ['hideTsvectorColumns'],
                  callback(behavior: any, [codec, attributeName]: [any, string]) {
                    const attr = codec.attributes?.[attributeName];
                    if (attr?.codec?.name === 'tsvector') {
                      return [behavior, '-select'] as any;
                    }
                    return behavior;
                  },
                },
              },
            },
          }
        : {}),
    },
  };
}

/**
 * Default static instance using default options.
 * Maps tsvector to the "FullText" scalar.
 */
export const TsvectorCodecPlugin: GraphileConfig.Plugin =
  createTsvectorCodecPlugin();

export const TsvectorCodecPreset: GraphileConfig.Preset = {
  plugins: [TsvectorCodecPlugin],
};
