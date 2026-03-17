/**
 * TsvectorCodecPlugin
 *
 * Teaches PostGraphile v5 how to handle PostgreSQL's tsvector and tsquery types.
 *
 * In graphile-build-pg >= 5.0.0-rc.8, tsvector/tsquery codecs are handled
 * natively and tsvector columns are HIDDEN by default (PgAttributesPlugin
 * HIDE_BY_DEFAULT). This plugin:
 *
 * 1. Creates codecs for tsvector/tsquery via gather.hooks.pgCodecs_findPgCodec
 *    (kept for backward compatibility with older versions; rc.8+ handles this
 *    natively so the hook returns early when event.pgCodec is already set)
 * 2. Registers a custom "FullText" scalar type for tsvector columns
 * 3. Maps tsvector codec to the FullText scalar (isolating filter operators)
 * 4. Maps tsquery codec to GraphQL String
 * 5. Re-enables tsvector columns for select/filterBy so that search plugins
 *    can detect and use them (overrides rc.8's HIDE_BY_DEFAULT)
 * 6. Optionally hides tsvector columns from output types
 */

import type { GraphileConfig } from 'graphile-config';
import { GraphQLString } from 'graphql';
import sql from 'pg-sql2';

/**
 * Options for the TsvectorCodecPlugin.
 */
export interface TsvectorCodecPluginOptions {
  /**
   * Prefix for tsvector condition fields.
   * @default 'tsv'
   */
  pgSearchPrefix?: string;

  /**
   * Whether to hide tsvector columns from output types.
   * @default false
   */
  hideTsvectorColumns?: boolean;

  /**
   * Name of the custom GraphQL scalar for tsvector columns.
   * @default 'FullText'
   */
  fullTextScalarName?: string;

  /**
   * PostgreSQL text search configuration used with `websearch_to_tsquery`.
   * @default 'english'
   */
  tsConfig?: string;
}

/**
 * Creates a TsvectorCodecPlugin with the given options.
 *
 * @param options - Plugin configuration
 * @returns GraphileConfig.Plugin
 */
export function createTsvectorCodecPlugin(
  options: TsvectorCodecPluginOptions = {}
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

      // In graphile-build-pg >= 5.0.0-rc.8, PgAttributesPlugin HIDE_BY_DEFAULT
      // hides tsvector columns entirely (-attribute:select, -attribute:base,
      // -condition:attribute:filterBy, etc.). We need entity behavior to
      // re-enable them so search plugins can detect and use them.
      entityBehavior: {
        pgCodecAttribute: {
          inferred: {
            after: ['default'],
            provides: ['tsvectorCodecPlugin'],
            callback(behavior: any, [codec, attributeName]: [any, string]) {
              const attr = codec.attributes?.[attributeName];
              const attrCodec = attr?.codec;
              const isTsvector =
                attrCodec?.name === 'tsvector' ||
                (attrCodec?.extensions?.pg?.schemaName === 'pg_catalog' &&
                  attrCodec?.extensions?.pg?.name === 'tsvector');
              if (!isTsvector) {
                return behavior;
              }
              if (hideTsvectorColumns) {
                // User explicitly wants tsvector columns hidden from output
                return [behavior, '-attribute:select'] as any;
              }
              // Re-enable tsvector columns that rc.8 hides by default.
              // The search plugin needs attribute:select to detect columns,
              // and condition:attribute:filterBy for standard filter support.
              return [
                behavior,
                'attribute:select',
                'attribute:base',
                'condition:attribute:filterBy',
              ] as any;
            },
          },
        },
      },
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
