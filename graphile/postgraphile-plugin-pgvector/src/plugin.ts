/**
 * PostGraphile v5 pgvector Plugin
 *
 * Adds vector similarity search capabilities to PostGraphile using pgvector.
 * Uses the graphile-build hooks API to extend the schema with vector search fields.
 */

import 'graphile-build';
import type { GraphileConfig } from 'graphile-config';
import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLEnumType,
  GraphQLBoolean,
} from 'grafast/graphql';
import type { PgVectorPluginOptions, VectorCollectionConfig, VectorMetric } from './types';
import {
  buildVectorSearchQuery,
  formatVectorString,
  validateQueryVector,
  clampLimit,
  compileSql,
} from './sql';

declare module 'graphile-config' {
  interface GrafastOptions {
    pgVectorOptions?: PgVectorPluginOptions;
  }
}

const DEFAULT_METRIC: VectorMetric = 'COSINE';
const DEFAULT_MAX_LIMIT = 100;

interface VectorSearchResultRow {
  distance: number;
  [key: string]: unknown;
}

/**
 * Creates the pgvector plugin using graphile-build hooks
 */
export function createPgVectorPlugin(options: PgVectorPluginOptions): GraphileConfig.Plugin {
  const {
    collections,
    defaultMetric = DEFAULT_METRIC,
    maxLimit = DEFAULT_MAX_LIMIT,
  } = options;

  return {
    name: 'PgVectorPlugin',
    version: '1.0.0',
    description: 'Adds pgvector similarity search capabilities to PostGraphile',

    schema: {
      hooks: {
        init(_: any, build: any) {
          const { pgRegistry } = build.input;

          for (const collection of collections) {
            const resourceKey = `${collection.schema}.${collection.table}`;
            let foundResource = null;

            for (const [_key, resource] of Object.entries(pgRegistry.pgResources) as [string, any][]) {
              if (!resource.codec?.attributes || resource.codec?.isAnonymous) continue;

              const pgExtensions = resource.codec?.extensions?.pg as { schemaName?: string; name?: string } | undefined;
              const schemaName = pgExtensions?.schemaName;
              const tableName = pgExtensions?.name || resource.codec?.name;

              if (schemaName === collection.schema && tableName === collection.table) {
                foundResource = resource;
                break;
              }
            }

            if (!foundResource) {
              console.warn(
                `[PgVectorPlugin] Warning: Could not find resource for ${resourceKey}. ` +
                `Make sure the table exists and is included in your PostGraphile schemas.`
              );
            }
          }

          return _;
        },

        GraphQLObjectType_fields(fields: any, build: any, context: any) {
          const { Self } = context;

          if (Self.name !== 'Query') {
            return fields;
          }

          const { pgRegistry } = build.input;
          const inflection = build.inflection;

          const VectorMetricEnum = new GraphQLEnumType({
            name: 'VectorMetric',
            description: 'Similarity metric for vector search',
            values: {
              COSINE: {
                value: 'COSINE',
                description: 'Cosine distance (1 - cosine similarity). Range: 0 (identical) to 2 (opposite).',
              },
              L2: {
                value: 'L2',
                description: 'Euclidean (L2) distance. Range: 0 (identical) to infinity.',
              },
              IP: {
                value: 'IP',
                description: 'Negative inner product. Higher (less negative) values indicate more similarity.',
              },
            },
          });

          const newFields: typeof fields = { ...fields };

          for (const collection of collections) {
            let foundResource: any = null;

            for (const resource of Object.values(pgRegistry.pgResources) as any[]) {
              if (!resource.codec?.attributes || resource.codec?.isAnonymous) continue;

              const pgExtensions = resource.codec?.extensions?.pg as { schemaName?: string; name?: string } | undefined;
              const schemaName = pgExtensions?.schemaName;
              const tableName = pgExtensions?.name || resource.codec?.name;

              if (schemaName === collection.schema && tableName === collection.table) {
                foundResource = resource;
                break;
              }
            }

            if (!foundResource) {
              continue;
            }

            const codec = foundResource.codec;
            const tableType = inflection.tableType(codec);
            const fieldName = collection.graphqlFieldName || `vectorSearch${tableType}`;

            const VectorSearchResultType = new GraphQLObjectType({
              name: `${tableType}VectorSearchResult`,
              description: `Vector search result for ${tableType}`,
              fields: () => {
                const resultFields: Record<string, { type: any; description?: string }> = {
                  distance: {
                    type: new GraphQLNonNull(GraphQLFloat),
                    description: 'Distance/similarity score. Interpretation depends on the metric used.',
                  },
                };

                for (const [attrName, attr] of Object.entries(codec.attributes) as [string, any][]) {
                  const gqlType = mapPgTypeToGraphQL(attr.codec?.name, attr.notNull);
                  if (gqlType) {
                    resultFields[attrName] = {
                      type: gqlType,
                    };
                  }
                }

                return resultFields;
              },
            });

            newFields[fieldName] = {
              type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(VectorSearchResultType))),
              description: `Search ${tableType} by vector similarity using pgvector`,
              args: {
                query: {
                  type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLFloat))),
                  description: 'Query vector for similarity search',
                },
                limit: {
                  type: GraphQLInt,
                  description: `Maximum number of results to return (default: 10, max: ${maxLimit})`,
                },
                offset: {
                  type: GraphQLInt,
                  description: 'Number of results to skip (default: 0)',
                },
                metric: {
                  type: VectorMetricEnum,
                  description: `Similarity metric to use (default: ${defaultMetric})`,
                },
              },
              resolve: createVectorSearchResolver(collection, defaultMetric, maxLimit),
            };
          }

          return newFields;
        },
      },
    },
  };
}

function createVectorSearchResolver(
  collection: VectorCollectionConfig,
  defaultMetric: VectorMetric,
  maxLimit: number
) {
  return async (
    _parent: unknown,
    args: {
      query: number[];
      limit?: number;
      offset?: number;
      metric?: VectorMetric;
    },
    context: { pgClient?: any; withPgClient?: (callback: (client: any) => Promise<any>) => Promise<any> }
  ): Promise<VectorSearchResultRow[]> => {
    const { query, limit = 10, offset = 0, metric = defaultMetric } = args;

    validateQueryVector(query, collection.maxQueryDim);

    const clampedLimit = clampLimit(limit, maxLimit);
    const vectorString = formatVectorString(query);

    const sqlQuery = buildVectorSearchQuery(
      collection.schema,
      collection.table,
      collection.embeddingColumn,
      metric
    );

    const compiled = compileSql(sqlQuery);
    const queryText = compiled.text;
    const queryValues = [vectorString, clampedLimit, offset];

    let result;

    if (context.withPgClient) {
      result = await context.withPgClient(async (client) => {
        return client.query(queryText, queryValues);
      });
    } else if (context.pgClient) {
      result = await context.pgClient.query(queryText, queryValues);
    } else {
      throw new Error(
        '[PgVectorPlugin] No database client available in context. ' +
        'Make sure you are using PostGraphile with a proper database connection.'
      );
    }

    return result.rows;
  };
}

function mapPgTypeToGraphQL(pgType: string | undefined, notNull: boolean): any {
  if (!pgType) return null;

  let baseType;
  switch (pgType) {
    case 'int2':
    case 'int4':
    case 'int8':
    case 'integer':
    case 'bigint':
    case 'smallint':
      baseType = GraphQLInt;
      break;
    case 'float4':
    case 'float8':
    case 'real':
    case 'double precision':
    case 'numeric':
    case 'decimal':
      baseType = GraphQLFloat;
      break;
    case 'bool':
    case 'boolean':
      baseType = GraphQLBoolean;
      break;
    case 'text':
    case 'varchar':
    case 'char':
    case 'uuid':
    case 'timestamptz':
    case 'timestamp':
    case 'date':
    case 'time':
    case 'json':
    case 'jsonb':
    default:
      baseType = GraphQLString;
      break;
  }

  return notNull ? new GraphQLNonNull(baseType) : baseType;
}

/**
 * Creates a PgVectorPlugin with the given options.
 * This is the main entry point for using the plugin.
 */
export const PgVectorPlugin = createPgVectorPlugin;

export default PgVectorPlugin;
