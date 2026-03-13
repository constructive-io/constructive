/**
 * Unified Search Plugin
 *
 * A single Graphile plugin that iterates over all registered SearchAdapters
 * and wires their column detection, filter fields, score fields, and orderBy
 * enums into the Graphile v5 hook system.
 *
 * This replaces the need for separate plugins per algorithm — one plugin,
 * multiple adapters.
 *
 * ARCHITECTURE:
 * - init hook: calls adapter.registerTypes() for each adapter
 * - GraphQLObjectType_fields hook: adds score fields for each adapter's columns
 * - GraphQLEnumType_values hook: adds orderBy enums for each adapter's columns
 * - GraphQLInputObjectType_fields hook: adds filter fields for each adapter's columns
 *
 * Uses the same Grafast meta system (setMeta/getMeta) as the individual plugins.
 */

import 'graphile-build';
import 'graphile-build-pg';
import 'graphile-connection-filter';
import { TYPES } from '@dataplan/pg';
import type { PgCodecWithAttributes } from '@dataplan/pg';
import type { GraphileConfig } from 'graphile-config';
import { getQueryBuilder } from 'graphile-connection-filter';
import type { SearchAdapter, SearchableColumn, UnifiedSearchOptions } from './types';

// ─── TypeScript Namespace Augmentations ──────────────────────────────────────

declare global {
  namespace GraphileBuild {
    interface Inflection {
      /** Name for a unified search score field: {column}{Algorithm}{Metric} */
      pgSearchScore(this: Inflection, fieldName: string, algorithmName: string, metricName: string): string;
      /** Name for a unified search orderBy enum: {COLUMN}_{ALGORITHM}_{METRIC}_ASC/DESC */
      pgSearchOrderByEnum(
        this: Inflection,
        codec: PgCodecWithAttributes,
        attributeName: string,
        algorithmName: string,
        metricName: string,
        ascending: boolean,
      ): string;
    }
    interface ScopeObjectFieldsField {
      isUnifiedSearchScoreField?: boolean;
    }
    interface BehaviorStrings {
      'unifiedSearch:select': true;
      'unifiedSearch:orderBy': true;
    }
  }
  namespace GraphileConfig {
    interface Plugins {
      UnifiedSearchPlugin: true;
    }
  }
}

/**
 * Interface for the meta value stored by the filter apply via setMeta
 * and read by the output field plan via getMeta.
 */
interface SearchScoreDetails {
  selectIndex: number;
}

/**
 * Cache key for discovered columns per adapter per codec.
 * Built during the first hook invocation and reused across hooks.
 */
interface AdapterColumnCache {
  adapter: SearchAdapter;
  columns: SearchableColumn[];
}

/**
 * Creates the unified search plugin with the given options.
 */
export function createUnifiedSearchPlugin(
  options: UnifiedSearchOptions
): GraphileConfig.Plugin {
  const { adapters, enableSearchScore = true } = options;

  // Per-codec cache of discovered columns, keyed by codec name
  const codecCache = new Map<string, AdapterColumnCache[]>();

  /**
   * Get (or compute) the adapter columns for a given codec.
   */
  function getAdapterColumns(codec: PgCodecWithAttributes, build: any): AdapterColumnCache[] {
    const cacheKey = codec.name;
    if (codecCache.has(cacheKey)) {
      return codecCache.get(cacheKey)!;
    }

    const results: AdapterColumnCache[] = [];
    for (const adapter of adapters) {
      const columns = adapter.detectColumns(codec, build);
      if (columns.length > 0) {
        results.push({ adapter, columns });
      }
    }
    codecCache.set(cacheKey, results);
    return results;
  }

  return {
    name: 'UnifiedSearchPlugin',
    version: '1.0.0',
    description:
      'Unified search plugin — abstracts tsvector, BM25, pg_trgm, and pgvector behind a single adapter-based architecture',
    after: [
      'PgAttributesPlugin',
      'PgConnectionArgFilterPlugin',
      'PgConnectionArgFilterAttributesPlugin',
      'PgConnectionArgFilterOperatorsPlugin',
      'AddConnectionFilterOperatorPlugin',
      // Allow individual codec plugins to load first (e.g. Bm25CodecPlugin)
      'Bm25CodecPlugin',
      'VectorCodecPlugin',
    ],

    // ─── Custom Inflection Methods ─────────────────────────────────────
    inflection: {
      add: {
        pgSearchScore(_preset, fieldName, algorithmName, metricName) {
          // Dedup: if fieldName already ends with the algorithm name, skip it
          const algoLower = algorithmName.toLowerCase();
          const fieldLower = fieldName.toLowerCase();
          const algoSuffix = fieldLower.endsWith(algoLower) ? '' : `-${algorithmName}`;
          return this.camelCase(`${fieldName}${algoSuffix}-${metricName}`);
        },
        pgSearchOrderByEnum(_preset, codec, attributeName, algorithmName, metricName, ascending) {
          const columnName = this._attributeName({
            codec,
            attributeName,
            skipRowId: true,
          });
          // Dedup: if columnName already ends with the algorithm, skip it
          const algoLower = algorithmName.toLowerCase();
          const colLower = columnName.toLowerCase();
          const algoSuffix = colLower.endsWith(`_${algoLower}`) || colLower.endsWith(algoLower)
            ? '' : `_${algorithmName}`;
          return this.constantCase(
            `${columnName}${algoSuffix}_${metricName}_${ascending ? 'asc' : 'desc'}`,
          );
        },
      },
    },

    schema: {
      // ─── Behavior Registry ─────────────────────────────────────────────
      behaviorRegistry: {
        add: {
          'unifiedSearch:select': {
            description: 'Should unified search score fields be exposed for this attribute',
            entities: ['pgCodecAttribute'],
          },
          'unifiedSearch:orderBy': {
            description: 'Should unified search orderBy enums be exposed for this attribute',
            entities: ['pgCodecAttribute'],
          },
        },
      },
      entityBehavior: {
        pgCodecAttribute: {
          inferred: {
            provides: ['default'],
            before: ['inferred', 'override', 'PgAttributesPlugin'],
            callback(behavior, [codec, attributeName], build) {
              // Check if any adapter claims this column
              for (const adapter of adapters) {
                const columns = adapter.detectColumns(codec, build);
                if (columns.some((c) => c.attributeName === attributeName)) {
                  return [
                    'unifiedSearch:orderBy',
                    'unifiedSearch:select',
                    behavior,
                  ];
                }
              }
              return behavior;
            },
          },
        },
      },

      hooks: {
        /**
         * Register all adapter-specific GraphQL types during init.
         */
        init(_, build) {
          for (const adapter of adapters) {
            adapter.registerTypes(build);
          }
          return _;
        },

        /**
         * Add score/rank/similarity/distance fields for each adapter's columns
         * on the appropriate output types.
         */
        GraphQLObjectType_fields(fields, build, context) {
          const {
            inflection,
            graphql: { GraphQLFloat },
            grafast: { lambda },
          } = build;
          const {
            scope: { isPgClassType, pgCodec: rawPgCodec },
            fieldWithHooks,
          } = context;

          if (!isPgClassType || !rawPgCodec?.attributes) {
            return fields;
          }

          const codec = rawPgCodec as PgCodecWithAttributes;
          const adapterColumns = getAdapterColumns(codec, build);

          if (adapterColumns.length === 0) {
            return fields;
          }

          let newFields = fields;

          for (const { adapter, columns } of adapterColumns) {
            for (const column of columns) {
              const baseFieldName = inflection.attribute({
                codec: codec as any,
                attributeName: column.attributeName,
              });
              const fieldName = inflection.pgSearchScore(
                baseFieldName,
                adapter.name,
                adapter.scoreSemantics.metric,
              );
              const metaKey = `__unified_search_${adapter.name}_${baseFieldName}`;

              newFields = build.extend(
                newFields,
                {
                  [fieldName]: fieldWithHooks(
                    {
                      fieldName,
                      isUnifiedSearchScoreField: true,
                    } as any,
                    () => ({
                      description: `${adapter.name.toUpperCase()} ${adapter.scoreSemantics.metric} when searching \`${baseFieldName}\`. Returns null when no ${adapter.name} search filter is active.`,
                      type: GraphQLFloat,
                      plan($step: any) {
                        const $row = $step;
                        const $select = typeof $row.getClassStep === 'function'
                          ? $row.getClassStep()
                          : null;
                        if (!$select) return build.grafast.constant(null);

                        if (typeof $select.setInliningForbidden === 'function') {
                          $select.setInliningForbidden();
                        }

                        const $details = $select.getMeta(metaKey);

                        return lambda(
                          [$details, $row],
                          ([details, row]: readonly [any, any]) => {
                            const d = details as SearchScoreDetails | null;
                            if (d == null || row == null || d.selectIndex == null) {
                              return null;
                            }
                            const rawValue = row[d.selectIndex];
                            return rawValue == null
                              ? null
                              : TYPES.float.fromPg(rawValue as string);
                          }
                        );
                      },
                    })
                  ),
                },
                `UnifiedSearchPlugin adding ${adapter.name} ${adapter.scoreSemantics.metric} field '${fieldName}' for '${column.attributeName}' on '${codec.name}'`
              );
            }
          }

          // ── Composite searchScore field ──
          if (enableSearchScore && adapterColumns.length > 0) {
            // Collect all meta keys for all adapters/columns so the
            // composite field can read them at execution time
            const allMetaKeys: Array<{
              adapterName: string;
              metaKey: string;
              lowerIsBetter: boolean;
              range: [number, number] | null;
            }> = [];

            for (const { adapter, columns } of adapterColumns) {
              for (const column of columns) {
                const baseFieldName = inflection.attribute({
                  codec: codec as any,
                  attributeName: column.attributeName,
                });
                allMetaKeys.push({
                  adapterName: adapter.name,
                  metaKey: `__unified_search_${adapter.name}_${baseFieldName}`,
                  lowerIsBetter: adapter.scoreSemantics.lowerIsBetter,
                  range: adapter.scoreSemantics.range,
                });
              }
            }

            newFields = build.extend(
              newFields,
              {
                searchScore: fieldWithHooks(
                  {
                    fieldName: 'searchScore',
                    isUnifiedSearchScoreField: true,
                  } as any,
                  () => ({
                    description:
                      'Composite search relevance score (0..1, higher = more relevant). ' +
                      'Computed by normalizing and averaging all active search signals. ' +
                      'Returns null when no search filters are active.',
                    type: GraphQLFloat,
                    plan($step: any) {
                      const $row = $step;
                      const $select = typeof $row.getClassStep === 'function'
                        ? $row.getClassStep()
                        : null;
                      if (!$select) return build.grafast.constant(null);

                      if (typeof $select.setInliningForbidden === 'function') {
                        $select.setInliningForbidden();
                      }

                      // Collect all meta steps for all adapters
                      const $metaSteps = allMetaKeys.map((mk) => $select.getMeta(mk.metaKey));

                      return lambda(
                        [...$metaSteps, $row],
                        (args: readonly any[]) => {
                          const row = args[args.length - 1];
                          if (row == null) return null;

                          let sum = 0;
                          let count = 0;

                          for (let i = 0; i < allMetaKeys.length; i++) {
                            const details = args[i] as SearchScoreDetails | null;
                            if (details == null || details.selectIndex == null) continue;

                            const rawValue = row[details.selectIndex];
                            if (rawValue == null) continue;

                            const score = TYPES.float.fromPg(rawValue as string);
                            if (typeof score !== 'number' || isNaN(score)) continue;

                            const mk = allMetaKeys[i];

                            // Normalize to 0..1 (higher = better)
                            let normalized: number;
                            if (mk.range) {
                              // Known range: linear normalization
                              const [min, max] = mk.range;
                              normalized = mk.lowerIsBetter
                                ? 1 - (score - min) / (max - min)
                                : (score - min) / (max - min);
                            } else {
                              // Unbounded: sigmoid normalization
                              if (mk.lowerIsBetter) {
                                // BM25: negative scores, more negative = better
                                // Map via 1 / (1 + abs(score))
                                normalized = 1 / (1 + Math.abs(score));
                              } else {
                                // Hypothetical unbounded higher-is-better
                                normalized = score / (1 + score);
                              }
                            }

                            // Clamp to [0, 1]
                            normalized = Math.max(0, Math.min(1, normalized));
                            sum += normalized;
                            count++;
                          }

                          if (count === 0) return null;

                          // Apply optional weights
                          if (options.searchScoreWeights) {
                            let weightedSum = 0;
                            let totalWeight = 0;
                            let weightIdx = 0;

                            for (let i = 0; i < allMetaKeys.length; i++) {
                              const details = args[i] as SearchScoreDetails | null;
                              if (details == null || details.selectIndex == null) continue;

                              const rawValue = row[details.selectIndex];
                              if (rawValue == null) continue;

                              const mk = allMetaKeys[i];
                              const weight = options.searchScoreWeights[mk.adapterName] ?? 1;

                              const score = TYPES.float.fromPg(rawValue as string);
                              if (typeof score !== 'number' || isNaN(score)) continue;

                              let normalized: number;
                              if (mk.range) {
                                const [min, max] = mk.range;
                                normalized = mk.lowerIsBetter
                                  ? 1 - (score - min) / (max - min)
                                  : (score - min) / (max - min);
                              } else {
                                if (mk.lowerIsBetter) {
                                  normalized = 1 / (1 + Math.abs(score));
                                } else {
                                  normalized = score / (1 + score);
                                }
                              }

                              normalized = Math.max(0, Math.min(1, normalized));
                              weightedSum += normalized * weight;
                              totalWeight += weight;
                              weightIdx++;
                            }

                            return totalWeight > 0 ? weightedSum / totalWeight : null;
                          }

                          return sum / count;
                        }
                      );
                    },
                  })
                ),
              },
              `UnifiedSearchPlugin adding composite searchScore field on '${codec.name}'`
            );
          }

          return newFields;
        },

        /**
         * Add orderBy enum values for each adapter's score metrics.
         */
        GraphQLEnumType_values(values, build, context) {
          const { inflection } = build;
          const {
            scope: { isPgRowSortEnum, pgCodec: rawPgCodec },
          } = context;

          if (!isPgRowSortEnum || !rawPgCodec?.attributes) {
            return values;
          }

          const codec = rawPgCodec as PgCodecWithAttributes;
          const adapterColumns = getAdapterColumns(codec, build);

          if (adapterColumns.length === 0) {
            return values;
          }

          let newValues = values;

          for (const { adapter, columns } of adapterColumns) {
            for (const column of columns) {
              const baseFieldName = inflection.attribute({
                codec: codec as any,
                attributeName: column.attributeName,
              });
              const metaKey = `unified_order_${adapter.name}_${baseFieldName}`;
              const makePlan =
                (direction: 'ASC' | 'DESC') => (step: any) => {
                  if (typeof step.setMeta === 'function') {
                    step.setMeta(metaKey, direction);
                  }
                };

              const ascName = inflection.pgSearchOrderByEnum(
                codec, column.attributeName, adapter.name, adapter.scoreSemantics.metric, true,
              );
              const descName = inflection.pgSearchOrderByEnum(
                codec, column.attributeName, adapter.name, adapter.scoreSemantics.metric, false,
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
                `UnifiedSearchPlugin adding ${adapter.name} orderBy for '${column.attributeName}' on '${codec.name}'`
              );
            }
          }

          // ── Composite SEARCH_SCORE orderBy ──
          if (enableSearchScore && adapterColumns.length > 0) {
            const searchScoreAscName = inflection.constantCase('search_score_asc');
            const searchScoreDescName = inflection.constantCase('search_score_desc');

            const makeSearchScorePlan =
              (direction: 'ASC' | 'DESC') => (step: any) => {
                if (typeof step.setMeta === 'function') {
                  step.setMeta('unified_order_search_score', direction);
                }
              };

            newValues = build.extend(
              newValues,
              {
                [searchScoreAscName]: {
                  extensions: {
                    grafast: {
                      apply: makeSearchScorePlan('ASC'),
                    },
                  },
                },
                [searchScoreDescName]: {
                  extensions: {
                    grafast: {
                      apply: makeSearchScorePlan('DESC'),
                    },
                  },
                },
              },
              `UnifiedSearchPlugin adding composite SEARCH_SCORE orderBy on '${codec.name}'`
            );
          }

          return newValues;
        },

        /**
         * Add filter fields for each adapter's columns on connection filter
         * input types.
         */
        GraphQLInputObjectType_fields(fields, build, context) {
          const { inflection, sql } = build;
          const {
            scope: { isPgConnectionFilter, pgCodec } = {},
            fieldWithHooks,
          } = context;

          if (
            !isPgConnectionFilter ||
            !pgCodec ||
            !pgCodec.attributes ||
            pgCodec.isAnonymous
          ) {
            return fields;
          }

          const codec = pgCodec as PgCodecWithAttributes;
          const adapterColumns = getAdapterColumns(codec, build);

          if (adapterColumns.length === 0) {
            return fields;
          }

          let newFields = fields;

          for (const { adapter, columns } of adapterColumns) {
            for (const column of columns) {
              const fieldName = inflection.camelCase(
                `${adapter.filterPrefix}_${column.attributeName}`
              );
              const baseFieldName = inflection.attribute({
                codec: pgCodec as any,
                attributeName: column.attributeName,
              });
              const scoreMetaKey = `__unified_search_${adapter.name}_${baseFieldName}`;

              newFields = build.extend(
                newFields,
                {
                  [fieldName]: fieldWithHooks(
                    {
                      fieldName,
                      isPgConnectionFilterField: true,
                    } as any,
                    {
                      description: build.wrapDescription(
                        `${adapter.name.toUpperCase()} search on the \`${column.attributeName}\` column.`,
                        'field'
                      ),
                      type: build.getTypeByName(adapter.getFilterTypeName(build)) as any,
                      apply: function plan($condition: any, val: any) {
                        if (val == null) return;

                        const result = adapter.buildFilterApply(
                          sql,
                          $condition.alias,
                          column,
                          val,
                          build,
                        );
                        if (!result) return;

                        // Apply WHERE clause
                        if (result.whereClause) {
                          $condition.where(result.whereClause);
                        }

                        // Get the query builder for SELECT/ORDER BY injection
                        const qb = getQueryBuilder(build, $condition);

                        if (qb && qb.mode === 'normal') {
                          // Add score to the SELECT list
                          const wrappedScoreSql = sql`${sql.parens(result.scoreExpression)}::text`;
                          const scoreIndex = qb.selectAndReturnIndex(wrappedScoreSql);

                          // Store the select index in meta for the output field plan
                          qb.setMeta(scoreMetaKey, {
                            selectIndex: scoreIndex,
                          } as SearchScoreDetails);
                        }

                        // ORDER BY: only add when explicitly requested
                        if (qb && typeof qb.getMetaRaw === 'function') {
                          const orderMetaKey = `unified_order_${adapter.name}_${baseFieldName}`;
                          const explicitDir = qb.getMetaRaw(orderMetaKey);
                          if (explicitDir) {
                            qb.orderBy({
                              fragment: result.scoreExpression,
                              codec: TYPES.float,
                              direction: explicitDir,
                            });
                          }
                        }
                      },
                    }
                  ),
                },
                `UnifiedSearchPlugin adding ${adapter.name} filter field '${fieldName}' for '${column.attributeName}' on '${codec.name}'`
              );
            }
          }

          return newFields;
        },
      },
    },
  };
}
