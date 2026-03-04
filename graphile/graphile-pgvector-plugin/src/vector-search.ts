/**
 * VectorSearchPlugin
 *
 * Auto-discovers all `vector` columns across all tables and adds:
 *
 * 1. **vectorSearch<TableType>** query fields on Query
 *    - Accepts a query vector, metric, limit, offset
 *    - Returns rows ordered by distance with a `distance` score
 *
 * 2. **<column>Nearby** condition fields on connection condition inputs
 *    - Accepts { vector, metric?, distance? } to filter by distance threshold
 *    - Computes distance server-side using pgvector operators
 *
 * 3. **<column>Distance** computed fields on output types
 *    - Returns the distance value when a nearby condition is active (null otherwise)
 *
 * 4. **<COLUMN>_DISTANCE_ASC/DESC** orderBy enum values
 *    - Orders results by vector distance when a nearby condition is active
 *
 * Uses the Grafast meta system (setMeta/getMeta) to pass data between
 * the condition apply phase and the output field plan, following the
 * pattern from Benjie's postgraphile-plugin-fulltext-filter reference.
 *
 * Follows the same patterns as graphile-search-plugin (for tsvector columns).
 */

import 'graphile-build';
import 'graphile-build-pg';
import { TYPES } from '@dataplan/pg';
import type { GraphileConfig } from 'graphile-config';
import type { VectorSearchPluginOptions } from './types';

/**
 * Interface for the meta value stored by the condition apply via setMeta
 * and read by the output field plan via getMeta.
 */
interface VectorDistanceDetails {
  selectIndex: number;
}

/**
 * pgvector distance operators.
 * - <=> : Cosine distance
 * - <-> : L2 (Euclidean) distance
 * - <#> : Negative inner product
 */
const METRIC_OPERATORS: Record<string, string> = {
  COSINE: '<=>',
  L2: '<->',
  IP: '<#>',
};

function isVectorCodec(codec: any): boolean {
  return codec?.name === 'vector';
}

/**
 * Walks from a PgCondition up to the PgSelectQueryBuilder.
 * Uses the .parent property on PgCondition to traverse up the chain,
 * following Benjie's pattern from postgraphile-plugin-fulltext-filter.
 *
 * Returns the query builder if found, or null if the traversal fails.
 */
function getQueryBuilder(
  build: any,
  $condition: any
): any | null {
  const PgCondition = build.dataplanPg?.PgCondition;
  if (!PgCondition) return null;

  let current = $condition;
  const { alias } = current;

  // Walk up through nested PgConditions (e.g. and/or/not)
  while (
    current &&
    current instanceof PgCondition &&
    current.alias === alias
  ) {
    current = (current as any).parent;
  }

  // Verify we found a query builder with matching alias
  if (
    current &&
    typeof current.selectAndReturnIndex === 'function' &&
    current.alias === alias
  ) {
    return current;
  }

  return null;
}

/**
 * Creates the vector search plugin with the given options.
 */
export function createVectorSearchPlugin(
  options: VectorSearchPluginOptions = {}
): GraphileConfig.Plugin {
  const {
    defaultMetric = 'COSINE',
    maxLimit = 100,
    conditionPrefix = 'vector',
  } = options;

  return {
    name: 'VectorSearchPlugin',
    version: '1.0.0',
    description:
      'Auto-discovers vector columns and adds search fields, conditions, and orderBy',
    after: [
      'VectorCodecPlugin',
      'PgAttributesPlugin',
    ],

    schema: {
      hooks: {
        init(_, build) {
          const {
            graphql: {
              GraphQLList,
              GraphQLNonNull,
              GraphQLFloat,
            },
          } = build;

          // Register the VectorMetric enum type FIRST so it's available
          // for VectorNearbyInput's fields resolver
          build.registerEnumType(
            'VectorMetric',
            {},
            () => ({
              description: 'Similarity metric for vector search',
              values: {
                COSINE: {
                  value: 'COSINE',
                  description:
                    'Cosine distance (1 - cosine similarity). Range: 0 (identical) to 2 (opposite).',
                },
                L2: {
                  value: 'L2',
                  description:
                    'Euclidean (L2) distance. Range: 0 (identical) to infinity.',
                },
                IP: {
                  value: 'IP',
                  description:
                    'Negative inner product. Higher (less negative) = more similar.',
                },
              },
            }),
            'VectorSearchPlugin registering VectorMetric enum'
          );

          // Register the VectorNearbyInput type for condition fields
          build.registerInputObjectType(
            'VectorNearbyInput',
            {},
            () => ({
              description:
                'Input for vector similarity search. Provide a query vector, optional metric, and optional max distance threshold.',
              fields: () => {
                const VectorMetricEnum =
                  build.getTypeByName('VectorMetric') as any;

                return {
                  vector: {
                    type: new GraphQLNonNull(
                      new GraphQLList(new GraphQLNonNull(GraphQLFloat))
                    ),
                    description: 'Query vector for similarity search.',
                  },
                  metric: {
                    type: VectorMetricEnum,
                    description: `Similarity metric to use (default: ${defaultMetric}).`,
                  },
                  distance: {
                    type: GraphQLFloat,
                    description:
                      'Maximum distance threshold. Only rows within this distance are returned.',
                  },
                };
              },
            }),
            'VectorSearchPlugin registering VectorNearbyInput type'
          );

          return _;
        },

        /**
         * Add `<column>Distance` computed fields to output types for tables
         * that have vector columns.
         */
        GraphQLObjectType_fields(fields, build, context) {
          const {
            inflection,
            graphql: { GraphQLFloat },
            grafast: { constant, lambda },
          } = build;
          const {
            scope: { isPgClassType, pgCodec },
            fieldWithHooks,
          } = context;

          if (!isPgClassType || !pgCodec?.attributes) {
            return fields;
          }

          let newFields = fields;

          for (const [attributeName, attribute] of Object.entries(
            pgCodec.attributes as Record<string, any>
          )) {
            if (!isVectorCodec(attribute.codec)) continue;

            const baseFieldName = inflection.attribute({
              codec: pgCodec as any,
              attributeName,
            });
            const fieldName = inflection.camelCase(`${baseFieldName}-distance`);
            const metaKey = `__vector_distance_${baseFieldName}`;

            newFields = build.extend(
              newFields,
              {
                [fieldName]: fieldWithHooks(
                  { fieldName } as any,
                  () => ({
                    description: `Vector distance when filtered by \`${baseFieldName}\` nearby condition. Returns null when no nearby condition is active.`,
                    type: GraphQLFloat,
                    plan($step: any) {
                      const $row = $step;
                      const $select = typeof $row.getClassStep === 'function'
                        ? $row.getClassStep()
                        : null;
                      if (!$select) return constant(null);

                      if (
                        typeof $select.setInliningForbidden === 'function'
                      ) {
                        $select.setInliningForbidden();
                      }

                      // Use the meta system to retrieve distance details.
                      // getMeta returns a Grafast Step that resolves at
                      // execution time to the value set by setMeta in
                      // the condition apply phase.
                      const $details = $select.getMeta(metaKey);

                      return lambda(
                        [$details, $row],
                        ([details, row]: readonly [any, any]) => {
                          const d = details as VectorDistanceDetails | null;
                          if (
                            d == null ||
                            row == null ||
                            d.selectIndex == null
                          ) {
                            return null;
                          }
                          const rawValue = row[d.selectIndex];
                          return rawValue == null
                            ? null
                            : parseFloat(rawValue);
                        }
                      );
                    },
                  })
                ),
              },
              `VectorSearchPlugin adding distance field '${fieldName}' for '${attributeName}' on '${pgCodec.name}'`
            );
          }

          return newFields;
        },

        /**
         * Add orderBy enum values for vector distance:
         * <COLUMN>_DISTANCE_ASC and <COLUMN>_DISTANCE_DESC
         */
        GraphQLEnumType_values(values, build, context) {
          const { inflection } = build;
          const {
            scope: { isPgRowSortEnum, pgCodec },
          } = context;

          if (!isPgRowSortEnum || !pgCodec?.attributes) {
            return values;
          }

          let newValues = values;

          for (const [attributeName, attribute] of Object.entries(
            pgCodec.attributes as Record<string, any>
          )) {
            if (!isVectorCodec(attribute.codec)) continue;

            const fieldName = inflection.attribute({
              codec: pgCodec as any,
              attributeName,
            });
            const metaKey = `vector_order_${fieldName}`;
            const makePlan =
              (direction: 'ASC' | 'DESC') => (step: any) => {
                if (typeof step.setMeta === 'function') {
                  step.setMeta(metaKey, direction);
                }
              };

            const ascName = inflection.constantCase(
              `${attributeName}_distance_asc`
            );
            const descName = inflection.constantCase(
              `${attributeName}_distance_desc`
            );

            newValues = build.extend(
              newValues,
              {
                [ascName]: {
                  extensions: {
                    grafast: {
                      apply: makePlan('ASC'),
                    },
                  },
                },
                [descName]: {
                  extensions: {
                    grafast: {
                      apply: makePlan('DESC'),
                    },
                  },
                },
              },
              `VectorSearchPlugin adding distance orderBy for '${attributeName}' on '${pgCodec.name}'`
            );
          }

          return newValues;
        },

        /**
         * Add `<column>Nearby` condition fields on connection condition input types
         * for tables with vector columns.
         */
        GraphQLInputObjectType_fields(fields, build, context) {
          const { inflection, sql } = build;
          const {
            scope: { isPgCondition, pgCodec },
            fieldWithHooks,
          } = context;

          if (
            !isPgCondition ||
            !pgCodec ||
            !pgCodec.attributes ||
            pgCodec.isAnonymous
          ) {
            return fields;
          }

          const vectorAttributes = Object.entries(
            pgCodec.attributes as Record<string, any>
          ).filter(([_name, attr]: [string, any]) =>
            isVectorCodec(attr.codec)
          );

          if (vectorAttributes.length === 0) {
            return fields;
          }

          let newFields = fields;

          for (const [attributeName] of vectorAttributes) {
            const fieldName = inflection.camelCase(
              `${conditionPrefix}_${attributeName}`
            );
            const baseFieldName = inflection.attribute({
              codec: pgCodec as any,
              attributeName,
            });
            const distanceMetaKey = `__vector_distance_${baseFieldName}`;

            newFields = build.extend(
              newFields,
              {
                [fieldName]: fieldWithHooks(
                  {
                    fieldName,
                    isPgConnectionConditionInputField: true,
                  },
                  {
                    description: build.wrapDescription(
                      `Vector similarity search on the \`${attributeName}\` column. ` +
                        `Provide a query vector to filter and compute distance. ` +
                        `Optionally specify a metric (COSINE, L2, IP) and maximum distance threshold.`,
                      'field'
                    ),
                    type: build.getTypeByName(
                      'VectorNearbyInput'
                    ) as any,
                    apply: function plan(
                      $condition: any,
                      val: any
                    ) {
                      if (val == null) return;

                      const { vector, metric, distance } = val;
                      if (
                        !vector ||
                        !Array.isArray(vector) ||
                        vector.length === 0
                      )
                        return;

                      const resolvedMetric = metric || defaultMetric;
                      const operator =
                        METRIC_OPERATORS[resolvedMetric] ||
                        METRIC_OPERATORS.COSINE;
                      const vectorString = `[${vector.join(',')}]`;

                      const columnExpr = sql`${$condition.alias}.${sql.identifier(attributeName)}`;
                      const vectorExpr = sql`${sql.value(vectorString)}::vector`;
                      const distanceExpr = sql`(${columnExpr} ${sql.raw(operator)} ${vectorExpr})`;

                      // If a distance threshold is provided, add WHERE clause
                      if (
                        distance !== undefined &&
                        distance !== null
                      ) {
                        $condition.where(
                          sql`${distanceExpr} <= ${sql.value(distance)}`
                        );
                      }

                      // Get the query builder via meta-safe traversal
                      const qb = getQueryBuilder(build, $condition);
                      if (qb) {
                        // Add distance to the SELECT list
                        const wrappedDistanceSql = sql`${sql.parens(distanceExpr)}::text`;
                        const distanceIndex = qb.selectAndReturnIndex(
                          wrappedDistanceSql
                        );

                        // Store the select index in meta (replaces WeakMap)
                        qb.setMeta(distanceMetaKey, {
                          selectIndex: distanceIndex,
                        } as VectorDistanceDetails);
                      }

                      // ORDER BY distance: only add when the user
                      // explicitly requested distance ordering via
                      // the EMBEDDING_DISTANCE_ASC/DESC enum values.
                      if (qb && typeof qb.getMetaRaw === 'function') {
                        const orderMetaKey = `vector_order_${baseFieldName}`;
                        const explicitDir = qb.getMetaRaw(orderMetaKey);
                        if (explicitDir) {
                          qb.orderBy({
                            fragment: distanceExpr,
                            codec: TYPES.float,
                            direction: explicitDir,
                          });
                        }
                      }
                    },
                  }
                ),
              },
              `VectorSearchPlugin adding condition field '${fieldName}' for vector column '${attributeName}' on '${pgCodec.name}'`
            );
          }

          return newFields;
        },
      },
    },
  };
}

/**
 * Creates a VectorSearchPlugin with the given options.
 * This is the main entry point for using the plugin.
 */
export const VectorSearchPlugin = createVectorSearchPlugin;

export default VectorSearchPlugin;
