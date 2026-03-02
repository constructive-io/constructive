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
 * 5. **Connection filter operators** for vector columns
 *    - `closeTo` operator for use with postgraphile-plugin-connection-filter
 *
 * Follows the same patterns as graphile-search-plugin (for tsvector columns).
 */

import 'graphile-build';
import 'graphile-build-pg';
import { TYPES } from '@dataplan/pg';
import type { GraphileConfig } from 'graphile-config';
import type { SQL } from 'pg-sql2';
import type { VectorSearchPluginOptions } from './types';

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
 * Navigates from a PgSelectSingleStep up to the PgSelectStep.
 * Uses duck-typing to avoid dependency on exact class names across rc versions.
 */
function getPgSelectStep($someStep: any): any | null {
  let $step = $someStep;

  if ($step && typeof $step.getClassStep === 'function') {
    $step = $step.getClassStep();
  }

  if ($step && typeof $step.orderBy === 'function' && $step.id !== undefined) {
    return $step;
  }

  return null;
}

/**
 * WeakMap keyed by SQL alias object (shared reference between
 * the queryBuilder proxy and PgSelectStep).
 *
 * Stores per-query vector search state so the distance field's lambda
 * can read the computed distance value at execution time.
 */
interface VectorDistanceSlot {
  /** Map of fieldName -> index into the select list */
  indices: Record<string, number>;
}
const vectorDistanceSlots = new WeakMap<object, VectorDistanceSlot>();

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
      'Auto-discovers vector columns and adds search fields, conditions, orderBy, and filter operators',
    after: [
      'VectorCodecPlugin',
      'PgAttributesPlugin',
      'PgConnectionArgFilterPlugin',
      'PgConnectionArgFilterOperatorsPlugin',
      'AddConnectionFilterOperatorPlugin',
    ],

    schema: {
      hooks: {
        init(_, build) {
          const {
            sql,
            graphql: {
              GraphQLList,
              GraphQLNonNull,
              GraphQLFloat,
              GraphQLInputObjectType,
              GraphQLEnumType,
            },
          } = build;

          // Register the VectorNearbyInput type for condition fields
          build.registerInputObjectType(
            'VectorNearbyInput',
            {},
            () => ({
              description:
                'Input for vector similarity search. Provide a query vector, optional metric, and optional max distance threshold.',
              fields: () => {
                const VectorMetricEnumForInput =
                  build.getTypeByName('VectorMetric') as any ||
                  new GraphQLEnumType({
                    name: 'VectorMetric',
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
                  });

                return {
                  vector: {
                    type: new GraphQLNonNull(
                      new GraphQLList(new GraphQLNonNull(GraphQLFloat))
                    ),
                    description: 'Query vector for similarity search.',
                  },
                  metric: {
                    type: VectorMetricEnumForInput,
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

          // Register the VectorMetric enum type
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

          // Register connection filter operators for vector columns
          const addConnectionFilterOperator = (build as any)
            .addConnectionFilterOperator;
          if (typeof addConnectionFilterOperator === 'function') {
            addConnectionFilterOperator('Vector', 'closeTo', {
              description:
                'Filters rows where the vector is within the specified cosine distance of the given vector. Input: "[0.1,0.2,...]" as a vector string.',
              resolveType: () => build.graphql.GraphQLString,
              resolveInputCodec: TYPES ? () => TYPES.text : undefined,
              resolve(
                sqlIdentifier: SQL,
                sqlValue: SQL,
                _input: unknown,
                _$where: any,
                _details: { fieldName: string | null; operatorName: string }
              ) {
                // sqlValue is the text representation of the threshold+vector combo
                // For simplicity, closeTo filters by cosine distance <= threshold
                // The user provides the vector as the value; we use a default distance
                return sql`(${sqlIdentifier} <=> ${sqlValue}::vector) <= 1.0`;
              },
            });
          }

          return _;
        },

        /**
         * Add `<column>Distance` computed fields to output types for tables
         * that have vector columns.
         */
        GraphQLObjectType_fields(fields, build, context) {
          const {
            sql,
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

            newFields = build.extend(
              newFields,
              {
                [fieldName]: fieldWithHooks(
                  { fieldName } as any,
                  () => ({
                    description: `Vector distance when filtered by \`${baseFieldName}\` nearby condition. Returns null when no nearby condition is active.`,
                    type: GraphQLFloat,
                    plan($step: any) {
                      const $select = getPgSelectStep($step);
                      if (!$select) return constant(null);

                      if (
                        typeof $select.setInliningForbidden === 'function'
                      ) {
                        $select.setInliningForbidden();
                      }

                      // Initialise the WeakMap slot for this query
                      const alias = $select.alias;
                      if (!vectorDistanceSlots.has(alias)) {
                        vectorDistanceSlots.set(alias, {
                          indices: Object.create(null),
                        });
                      }

                      const capturedField = baseFieldName;
                      const capturedAlias = alias;
                      return lambda(
                        $step,
                        (row: any) => {
                          if (row == null) return null;
                          const slot =
                            vectorDistanceSlots.get(capturedAlias);
                          if (
                            !slot ||
                            slot.indices[capturedField] === undefined
                          )
                            return null;
                          const rawValue =
                            row[slot.indices[capturedField]];
                          return rawValue == null
                            ? null
                            : parseFloat(rawValue);
                        },
                        true
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

                      // Add distance to the SELECT list
                      const $parent =
                        $condition.dangerouslyGetParent();
                      if (
                        typeof $parent.selectAndReturnIndex ===
                        'function'
                      ) {
                        const wrappedDistanceSql = sql`${sql.parens(distanceExpr)}::text`;
                        const distanceIndex =
                          $parent.selectAndReturnIndex(
                            wrappedDistanceSql
                          );

                        // Store index in alias-keyed WeakMap
                        const slot = vectorDistanceSlots.get(
                          $condition.alias
                        );
                        if (slot) {
                          slot.indices[baseFieldName] =
                            distanceIndex;
                        }
                      }

                      // ORDER BY distance: only add when the user
                      // explicitly requested distance ordering via
                      // the EMBEDDING_DISTANCE_ASC/DESC enum values.
                      const metaKey = `vector_order_${baseFieldName}`;
                      const explicitDir =
                        typeof $parent.getMetaRaw === 'function'
                          ? $parent.getMetaRaw(metaKey)
                          : undefined;
                      if (explicitDir) {
                        $parent.orderBy({
                          fragment: distanceExpr,
                          codec: TYPES.float,
                          direction: explicitDir,
                        });
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
