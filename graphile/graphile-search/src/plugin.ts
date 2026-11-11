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

import type { PgCodecWithAttributes } from '@dataplan/pg';
import { TYPES } from '@dataplan/pg';
import type { GraphileConfig } from 'graphile-config';
import { getQueryBuilder } from 'graphile-plugin-utils';
import type { SQL } from 'pg-sql2';

import type { SearchableColumn, SearchAdapter, UnifiedSearchOptions } from './types';

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
  /** Which filter scored the column: its own filter field, or unifiedSearch. */
  source?: ScoreSource;
}

type ScoreSource = 'explicit' | 'unified';

/** Resolved composite-score settings for one table. */
interface SearchScoreConfig {
  weights: Record<string, number> | undefined;
  boostRecent: boolean;
  boostRecencyField: string;
  boostRecencyDecay: number;
  /** Set when boost_recent named a column the table does not have. */
  missingRecencyField: string | null;
}

/**
 * Per-table search configuration read from the @searchConfig smart tag.
 */
interface SearchConfig {
  weights?: Record<string, number>;
  boost_recent?: boolean;
  boost_recency_field?: string;
  boost_recency_decay?: number;
}

/**
 * Read the @searchConfig smart tag from a codec's extensions.
 * Returns undefined if no searchConfig tag is present.
 */
function getSearchConfig(codec: PgCodecWithAttributes): SearchConfig | undefined {
  const tags = (codec.extensions as any)?.tags;
  if (!tags) return undefined;
  const raw = tags.searchConfig;
  if (!raw) return undefined;
  // Smart tags can be strings (JSON-encoded) or already-parsed objects
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as SearchConfig;
    } catch {
      return undefined;
    }
  }
  if (typeof raw === 'object') return raw as SearchConfig;
  return undefined;
}

/**
 * Resolve the composite searchScore settings for a table: per-table
 * @searchConfig first, then the plugin's global options.
 */
function resolveSearchScoreConfig(
  codec: PgCodecWithAttributes,
  globalWeights: Record<string, number> | undefined,
): SearchScoreConfig {
  const tableSearchConfig = getSearchConfig(codec);
  let boostRecent = tableSearchConfig?.boost_recent ?? false;
  const boostRecencyField = tableSearchConfig?.boost_recency_field ?? 'updated_at';
  let missingRecencyField: string | null = null;
  if (boostRecent && boostRecencyField && !codec.attributes[boostRecencyField]) {
    missingRecencyField = boostRecencyField;
    boostRecent = false;
  }
  return {
    weights: tableSearchConfig?.weights ?? globalWeights,
    boostRecent,
    boostRecencyField,
    boostRecencyDecay: tableSearchConfig?.boost_recency_decay ?? 0.95,
    missingRecencyField,
  };
}

/**
 * Map a raw score to 0..1 for effective rank estimation in the RRF fallback path.
 * Used only when a rank window function is not available for an adapter.
 */
function normalizeScore(
  score: number,
  lowerIsBetter: boolean,
  range: [number, number] | null,
): number {
  let normalized: number;

  if (range) {
    const [min, max] = range;
    normalized = lowerIsBetter
      ? 1 - (score - min) / (max - min)
      : (score - min) / (max - min);
  } else {
    if (lowerIsBetter) {
      normalized = 1 / (1 + Math.abs(score));
    } else {
      normalized = score / (1 + score);
    }
  }

  return Math.max(0, Math.min(1, normalized));
}

/**
 * Apply recency boost to a normalized score.
 * Uses exponential decay based on age in days.
 *
 * @param normalizedScore - The already-normalized score (0..1)
 * @param recencyValue - The raw recency field value (timestamp string from SQL row)
 * @param decay - Decay factor per day (e.g. 0.95 means 5% penalty per day)
 */
function applyRecencyBoost(
  normalizedScore: number,
  recencyValue: any,
  decay: number,
): number {
  if (recencyValue == null) return normalizedScore;

  const fieldDate = new Date(recencyValue);
  if (isNaN(fieldDate.getTime())) return normalizedScore;

  const now = new Date();
  const ageInDays = (now.getTime() - fieldDate.getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays < 0) return normalizedScore; // future dates get no penalty

  // Exponential decay: boost = decay^ageInDays
  const boost = Math.pow(decay, ageInDays);
  return normalizedScore * boost;
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
  const { adapters, enableSearchScore = true, enableUnifiedSearch = true, rrfK = 60 } = options;

  // Discovered columns per codec. One plugin instance can build several
  // schemas (a shared preset), and two builds can have codecs with the same
  // name but different attributes, so the cache is keyed by build and then
  // by codec identity, never by name.
  const codecCache = new WeakMap<object, WeakMap<object, AdapterColumnCache[]>>();

  const SEARCH_SCORE_ORDER_KEY = 'unified_order_search_score';

  // A search orderBy needs the direction (from the orderBy enum) and the
  // score expression (from the filter). The filter always applies at
  // runtime; a literal orderBy applies at plan time, before it, and a
  // variable orderBy applies at runtime, after it. Each side stores its
  // half in the query builder's meta, which is copied per execution, and
  // whichever side runs second adds the ORDER BY.
  //
  // The ORDER BY spec object is kept in meta so a later filter can swap
  // the expression in place (pgSelect renders `orders` after every apply
  // has run): unifiedSearch adds adapters to the composite score one at a
  // time, and an explicit column filter replaces the unifiedSearch score
  // for the same column.
  function setSearchOrder(qb: any, orderKey: string, fragment: SQL, nulls?: 'LAST'): void {
    const direction = qb.getMetaRaw(`${orderKey}__direction`);
    if (!direction) return;
    const spec = qb.getMetaRaw(`${orderKey}__spec`);
    if (spec) {
      spec.fragment = fragment;
      return;
    }
    const newSpec: Record<string, unknown> = { fragment, codec: TYPES.float, direction };
    if (nulls) newSpec.nulls = nulls;
    qb.orderBy(newSpec);
    qb.setMeta(`${orderKey}__spec`, newSpec);
  }

  function orderBySearchScore(qb: any, orderKey: string): void {
    const fragment = qb.getMetaRaw(`${orderKey}__score`);
    if (fragment) setSearchOrder(qb, orderKey, fragment);
  }

  // SEARCH_SCORE_* orders by the same Reciprocal Rank Fusion sum the
  // searchScore field displays: each active adapter contributes
  // weight / (k + rank), rank being the row's position by that adapter's
  // score. The field divides by a per-query constant to land in 0..1,
  // which does not change the order, so the SQL skips it.
  function orderByCompositeScore(qb: any, sql: any): void {
    const terms: Map<string, SQL> | undefined = qb.getMetaRaw(`${SEARCH_SCORE_ORDER_KEY}__terms`);
    if (!terms || terms.size === 0) return;
    const sum = sql.join([...terms.values()], ' + ');
    setSearchOrder(qb, SEARCH_SCORE_ORDER_KEY, sql`(${sum})::float8`, 'LAST');
  }

  /**
   * Get (or compute) the adapter columns for a given codec.
   *
   * Runs non-supplementary adapters first (e.g. tsvector, BM25, pgvector).
   * Supplementary adapters (e.g. trgm with requireIntentionalSearch) are only
   * run if at least one adapter with `isIntentionalSearch: true` found columns.
   *
   * This distinction matters because pgvector (embeddings) is NOT intentional
   * text search — its presence alone should not trigger trgm similarity fields.
   * Only tsvector and BM25, which represent explicit search infrastructure,
   * count as intentional search.
   */
  function getAdapterColumns(codec: PgCodecWithAttributes, build: any): AdapterColumnCache[] {
    let buildCache = codecCache.get(build);
    if (!buildCache) {
      buildCache = new WeakMap();
      codecCache.set(build, buildCache);
    }
    const cached = buildCache.get(codec);
    if (cached) return cached;

    const primaryAdapters = adapters.filter((a) => !a.isSupplementary);
    const supplementaryAdapters = adapters.filter((a) => a.isSupplementary);

    // Phase 1: Run non-supplementary adapters (tsvector, BM25, pgvector, etc.)
    const results: AdapterColumnCache[] = [];
    let hasIntentionalSearch = false;
    for (const adapter of primaryAdapters) {
      const columns = adapter.detectColumns(codec, build);
      if (columns.length > 0) {
        results.push({ adapter, columns });
        // Track whether any "intentional search" adapter found columns.
        // isIntentionalSearch defaults to true when not explicitly set.
        if (adapter.isIntentionalSearch !== false) {
          hasIntentionalSearch = true;
        }
      }
    }

    // Phase 2: Run supplementary adapters if intentional search exists
    // OR if the table/column has a @trgmSearch smart tag.
    // pgvector (isIntentionalSearch: false) alone won't trigger trgm.
    const hasTrgmSearchTag =
      // Table-level tag
      (codec.extensions as any)?.tags?.trgmSearch ||
      // Column-level tag
      (codec.attributes && Object.values(codec.attributes as Record<string, any>).some(
        (attr: any) => attr?.extensions?.tags?.trgmSearch
      ));

    if (hasIntentionalSearch || hasTrgmSearchTag) {
      for (const adapter of supplementaryAdapters) {
        const columns = adapter.detectColumns(codec, build);
        if (columns.length > 0) {
          results.push({ adapter, columns });
        }
      }
    }

    buildCache.set(codec, results);
    return results;
  }

  /**
   * The filter fields that give an adapter's column a score: the column's
   * own filter, and unifiedSearch when the adapter takes part in it.
   */
  function filtersScoring(adapter: SearchAdapter, column: SearchableColumn, inflection: any): string[] {
    const names = [inflection.camelCase(`${adapter.filterPrefix}_${column.attributeName}`)];
    if (enableUnifiedSearch && (adapter.supportsTextSearch || adapter.name === 'vector')) {
      names.push('unifiedSearch');
    }
    return names;
  }

  /** Filter field names present (non-null) anywhere in a `where` value. */
  function collectFilterFields(where: unknown, into: Set<string>): Set<string> {
    if (Array.isArray(where)) {
      for (const item of where) collectFilterFields(item, into);
    } else if (where && typeof where === 'object') {
      for (const [key, value] of Object.entries(where as Record<string, unknown>)) {
        if (value == null) continue;
        if (key === 'and' || key === 'or' || key === 'not') {
          collectFilterFields(value, into);
        } else {
          into.add(key);
        }
      }
    }
    return into;
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
      'ConnectionFilterTypesPlugin',
      'ConnectionFilterCustomOperatorsPlugin',
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
              // Use getAdapterColumns which respects isSupplementary logic,
              // so trgm columns only appear when intentional search exists
              if (!codec?.attributes) return behavior;
              const adapterColumns = getAdapterColumns(codec as PgCodecWithAttributes, build);
              for (const { columns } of adapterColumns) {
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

          // Register StringTrgmFilter — a variant of StringFilter that includes
          // trgm operators (similarTo, wordSimilarTo). Only string columns on
          // tables that qualify for trgm will use this type instead of StringFilter.
          const hasTrgmAdapter = adapters.some((a) => a.name === 'trgm');
          if (hasTrgmAdapter) {
            const DPTYPES = (build as any).dataplanPg?.TYPES;
            const textCodec = DPTYPES?.text ?? TYPES.text;
            build.registerInputObjectType(
              'StringTrgmFilter',
              {
                pgConnectionFilterOperators: {
                  isList: false,
                  pgCodecs: [textCodec],
                  inputTypeName: 'String',
                  rangeElementInputTypeName: null,
                  domainBaseTypeName: null,
                },
              },
              () => ({
                description:
                  'A filter to be used against String fields with pg_trgm support. ' +
                  'All fields are combined with a logical \u2018and.\u2019',
              }),
              'UnifiedSearchPlugin (StringTrgmFilter)'
            );
          }

          return _;
        },

        /**
         * A search orderBy only has a score to order by when the filter that
         * computes it is active. Validate `orderBy` against `where` on every
         * collection field of a searchable table and fail the request with
         * the filter that is missing, instead of silently returning rows in
         * primary key order.
         */
        GraphQLObjectType_fields_field(field, build, context) {
          const {
            inflection,
            grafast: { lambda, constant },
          } = build;
          const {
            scope: { isPgFieldConnection, isPgFieldSimpleCollection, pgFieldResource },
          } = context;
          if (!isPgFieldConnection && !isPgFieldSimpleCollection) return field;
          const codec = pgFieldResource?.codec as PgCodecWithAttributes | undefined;
          if (!codec?.attributes || (codec as any).isAnonymous) return field;
          const adapterColumns = getAdapterColumns(codec, build);
          if (adapterColumns.length === 0) return field;
          const plan = (field as any).plan;
          if (typeof plan !== 'function') return field;

          const requiredFilters = new Map<string, string[]>();
          const anySearchFilter = new Set<string>();
          for (const { adapter, columns } of adapterColumns) {
            for (const column of columns) {
              const filters = filtersScoring(adapter, column, inflection);
              filters.forEach((f) => anySearchFilter.add(f));
              for (const ascending of [true, false]) {
                const name = inflection.pgSearchOrderByEnum(
                  codec, column.attributeName, adapter.name, adapter.scoreSemantics.metric, ascending,
                );
                requiredFilters.set(name, filters);
              }
            }
          }
          if (enableSearchScore) {
            const all = [...anySearchFilter];
            requiredFilters.set(inflection.constantCase('search_score_asc'), all);
            requiredFilters.set(inflection.constantCase('search_score_desc'), all);
          }

          const compositeOrders = enableSearchScore
            ? [inflection.constantCase('search_score_asc'), inflection.constantCase('search_score_desc')]
            : [];

          function validateOrderBy(orderBy: unknown, where: unknown, hasCursor: boolean): void {
            if (orderBy == null) return;
            const values = Array.isArray(orderBy) ? orderBy : [orderBy];
            let present: Set<string> | null = null;
            for (const value of values) {
              const name = String(value);
              const filters = requiredFilters.get(name);
              if (!filters) continue;
              present ??= collectFilterFields(where, new Set());
              if (!filters.some((f) => present!.has(f))) {
                throw new Error(
                  `Cannot order by ${name} without a search filter that scores it: ` +
                  `add ${filters.map((f) => `where.${f}`).join(' or ')}.`,
                );
              }
              // The composite score is a sum of window functions, which
              // Postgres does not allow in the WHERE a cursor turns into.
              if (hasCursor && compositeOrders.includes(name)) {
                throw new Error(
                  `Cannot order by ${name} with cursor paging (after/before): ` +
                  'page with offset, or order by a single adapter score.',
                );
              }
            }
          }

          return {
            ...field,
            plan($parent: any, fieldArgs: any, info: any) {
              const $result = plan($parent, fieldArgs, info);
              const argNames: string[] = (info?.field?.args ?? []).map((a: any) => a.name);
              if ($result == null || !argNames.includes('orderBy')) return $result;
              const $select = typeof $result.getSubplan === 'function' ? $result.getSubplan() : $result;
              if (typeof $select?.apply !== 'function') return $result;
              const $where = argNames.includes('where') ? fieldArgs.getRaw('where') : constant(null);
              const $after = argNames.includes('after') ? fieldArgs.getRaw('after') : constant(null);
              const $before = argNames.includes('before') ? fieldArgs.getRaw('before') : constant(null);
              $select.apply(
                lambda(
                  [fieldArgs.getRaw('orderBy'), $where, $after, $before],
                  ([orderBy, where, after, before]: readonly [unknown, unknown, unknown, unknown]) => {
                    validateOrderBy(orderBy, where, after != null || before != null);
                  },
                ),
              );
              return $result;
            },
          } as typeof field;
        },

        /**
         * Add score/rank/similarity/distance fields for each adapter's columns
         * on the appropriate output types.
         */
        GraphQLObjectType_fields(fields, build, context) {
          const {
            inflection,
            sql,
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

          // ── Composite searchScore field (RRF — Reciprocal Rank Fusion) ──
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

            const scoreConfig = resolveSearchScoreConfig(codec, options.searchScoreWeights);
            const effectiveWeights = scoreConfig.weights;
            const { boostRecent, boostRecencyField, boostRecencyDecay } = scoreConfig;
            if (scoreConfig.missingRecencyField) {
              console.warn(
                `[graphile-search] @searchConfig.boost_recency_field "${scoreConfig.missingRecencyField}" ` +
                `not found on table "${codec.name}". Recency boost disabled for this table.`
              );
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
                      'Computed using Reciprocal Rank Fusion (RRF) across all active search signals. ' +
                      'Supports per-table weight customization via @searchConfig smart tag. ' +
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

                      // If recency boost is configured, inject the recency field into
                      // the SQL SELECT so we can read it by numeric index at runtime.
                      let recencySelectIndex: number | null = null;
                      if (boostRecent && boostRecencyField) {
                        const recencyColumnSql = sql`${$select.alias}.${sql.identifier(boostRecencyField)}::text`;
                        recencySelectIndex = $select.selectAndReturnIndex(recencyColumnSql);
                      }

                      // Capture the index in a local const for the lambda closure
                      const capturedRecencyIndex = recencySelectIndex;

                      // For RRF we also need rank expressions. Inject ROW_NUMBER()
                      // window functions for each adapter score into the SELECT.
                      // These will be populated at filter-apply time via meta.
                      // We store a meta key suffix "__rank" alongside the score.
                      const rankMetaKeys = allMetaKeys.map(
                        (mk) => `${mk.metaKey}__rank`
                      );
                      const $rankMetaSteps = rankMetaKeys.map(
                        (key) => $select.getMeta(key)
                      );

                      return lambda(
                        [...$metaSteps, ...$rankMetaSteps, $row],
                        (args: readonly any[]) => {
                          const row = args[args.length - 1];
                          if (row == null) return null;

                          const numAdapters = allMetaKeys.length;
                          let rrfSum = 0;
                          let maxPossibleRrf = 0;
                          let hasAnyScore = false;

                          // Read recency value from the injected SELECT column
                          const recencyValue = (boostRecent && capturedRecencyIndex != null)
                            ? row[capturedRecencyIndex]
                            : null;

                          for (let i = 0; i < numAdapters; i++) {
                            const scoreDetails = args[i] as SearchScoreDetails | null;
                            const rankDetails = args[numAdapters + i] as SearchScoreDetails | null;

                            const mk = allMetaKeys[i];
                            const weight = effectiveWeights?.[mk.adapterName] ?? 1;

                            // Determine if this adapter is active (has meta set by a filter)
                            const adapterHasMeta = (rankDetails != null && rankDetails.selectIndex != null)
                              || (scoreDetails != null && scoreDetails.selectIndex != null);

                            if (!adapterHasMeta) continue;

                            // Only include active adapters in normalization denominator
                            maxPossibleRrf += weight / (rrfK + 1);

                            // Try to use rank-based RRF (preferred)
                            if (rankDetails != null && rankDetails.selectIndex != null) {
                              const rawRank = row[rankDetails.selectIndex];
                              if (rawRank != null) {
                                const rank = TYPES.float.fromPg(rawRank as string);
                                if (typeof rank === 'number' && !isNaN(rank) && rank > 0) {
                                  hasAnyScore = true;
                                  let contribution = weight / (rrfK + rank);

                                  // Apply recency boost if configured
                                  if (boostRecent && recencyValue != null) {
                                    contribution = applyRecencyBoost(
                                      contribution,
                                      recencyValue,
                                      boostRecencyDecay,
                                    );
                                  }

                                  rrfSum += contribution;
                                  continue;
                                }
                              }
                            }

                            // Fallback: if rank is not available but score exists,
                            // use score-based rank estimation.
                            if (scoreDetails != null && scoreDetails.selectIndex != null) {
                              const rawValue = row[scoreDetails.selectIndex];
                              if (rawValue != null) {
                                const score = TYPES.float.fromPg(rawValue as string);
                                if (typeof score === 'number' && !isNaN(score)) {
                                  hasAnyScore = true;
                                  const normalizedScore = normalizeScore(
                                    score,
                                    mk.lowerIsBetter,
                                    mk.range,
                                  );
                                  // Map normalized score to an effective rank:
                                  // score=1.0 → rank=1, score=0.5 → rank=rrfK, score→0 → rank=very high
                                  const effectiveRank = Math.max(1, Math.round(
                                    1 + (1 - normalizedScore) * (rrfK * 2)
                                  ));
                                  let contribution = weight / (rrfK + effectiveRank);

                                  if (boostRecent && recencyValue != null) {
                                    contribution = applyRecencyBoost(
                                      contribution,
                                      recencyValue,
                                      boostRecencyDecay,
                                    );
                                  }

                                  rrfSum += contribution;
                                }
                              }
                            }
                          }

                          if (!hasAnyScore || maxPossibleRrf === 0) return null;

                          // Normalize to 0..1 by dividing by max possible RRF score
                          return Math.min(1, rrfSum / maxPossibleRrf);
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
              const orderKey = `unified_order_${adapter.name}_${baseFieldName}`;
              const makePlan =
                (direction: 'ASC' | 'DESC') => (qb: any) => {
                  qb.setMeta(`${orderKey}__direction`, direction);
                  orderBySearchScore(qb, orderKey);
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
              (direction: 'ASC' | 'DESC') => (qb: any) => {
                qb.setMeta(`${SEARCH_SCORE_ORDER_KEY}__direction`, direction);
                orderByCompositeScore(qb, build.sql);
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

          /**
           * Inject a single adapter's score expression + rank window function
           * into the query builder, and add its ORDER BY if one was requested.
           *
           * Shared by per-adapter filter fields AND the unifiedSearch
           * composite filter (both text and vector adapter branches).
           *
           * A column is scored once per query: its own filter field wins
           * over unifiedSearch, whichever applied first.
           */
          function injectScoreAndRank(
            qb: any,
            adapter: SearchAdapter,
            column: SearchableColumn,
            result: { scoreExpression: any },
            codec_: PgCodecWithAttributes,
            source: ScoreSource,
            scoreConfig: SearchScoreConfig,
          ): void {
            if (!qb || qb.mode !== 'normal') return;

            const baseFieldName = inflection.attribute({
              codec: codec_ as any,
              attributeName: column.attributeName,
            });
            const scoreMetaKey = `__unified_search_${adapter.name}_${baseFieldName}`;
            const existing: SearchScoreDetails | undefined = qb.getMetaRaw(scoreMetaKey);
            if (existing && (existing.source === 'explicit' || source === 'unified')) return;

            const score = sql.parens(result.scoreExpression);
            const scoreIndex = qb.selectAndReturnIndex(sql`${score}::text`);
            qb.setMeta(scoreMetaKey, { selectIndex: scoreIndex, source } as SearchScoreDetails);

            const rankMetaKey = `${scoreMetaKey}__rank`;
            const rankDirection = adapter.scoreSemantics.lowerIsBetter ? sql.fragment`ASC` : sql.fragment`DESC`;
            // A row without a score has no rank: otherwise ROW_NUMBER() would
            // hand unscored rows the positions right after the scored ones.
            const rankSql = sql`ROW_NUMBER() OVER (ORDER BY ${score} ${rankDirection} NULLS LAST)`;
            const rankIndex = qb.selectAndReturnIndex(sql`(CASE WHEN ${score} IS NULL THEN NULL ELSE ${rankSql} END)::text`);
            qb.setMeta(rankMetaKey, { selectIndex: rankIndex } as SearchScoreDetails);

            // Scores such as similarity() and ts_rank() are real; the cursor
            // round-trips them through the float8 codec, so the ORDER BY must
            // compare as float8 too or the boundary row repeats on `before`.
            const orderKey = `unified_order_${adapter.name}_${baseFieldName}`;
            qb.setMeta(`${orderKey}__score`, sql`${score}::float8`);
            orderBySearchScore(qb, orderKey);

            const weight = scoreConfig.weights?.[adapter.name] ?? 1;
            let term = sql`CASE WHEN ${score} IS NULL THEN 0::float8 ELSE ${sql.literal(weight)}::float8 / (${sql.literal(rrfK)}::float8 + ${rankSql}) END`;
            if (scoreConfig.boostRecent) {
              const recency = sql`${qb.alias}.${sql.identifier(scoreConfig.boostRecencyField)}`;
              term = sql`${sql.parens(term)} * CASE WHEN ${recency} IS NULL THEN 1::float8 ELSE power(${sql.literal(scoreConfig.boostRecencyDecay)}::float8, GREATEST(0::float8, EXTRACT(EPOCH FROM (now() - ${recency}))::float8 / 86400)) END`;
            }
            let terms: Map<string, SQL> | undefined = qb.getMetaRaw(`${SEARCH_SCORE_ORDER_KEY}__terms`);
            if (!terms) {
              terms = new Map();
              qb.setMeta(`${SEARCH_SCORE_ORDER_KEY}__terms`, terms);
            }
            terms.set(scoreMetaKey, sql.parens(term));
            orderByCompositeScore(qb, sql);
          }

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

          const scoreConfig = resolveSearchScoreConfig(codec, options.searchScoreWeights);

          let newFields = fields;

          // ── StringFilter → StringTrgmFilter type swapping ──
          // For tables that qualify for trgm, swap the type of string attribute
          // filter fields so they get similarTo/wordSimilarTo operators.
          const hasTrgm = adapterColumns.some((ac) => ac.adapter.name === 'trgm');
          if (hasTrgm) {
            const StringTrgmFilterType = build.getTypeByName('StringTrgmFilter');
            const StringFilterType = build.getTypeByName('StringFilter');
            if (StringTrgmFilterType && StringFilterType) {
              const swapped: Record<string, any> = {};
              for (const [key, field] of Object.entries(newFields)) {
                if (field && typeof field === 'object' && (field as any).type === StringFilterType) {
                  swapped[key] = Object.assign({}, field, { type: StringTrgmFilterType });
                } else {
                  swapped[key] = field;
                }
              }
              newFields = swapped;
            }
          }

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
                        // Only rows this adapter can score are returned
                        if (result.scorableClause) {
                          $condition.where(result.scorableClause);
                        }

                        const qb = getQueryBuilder(build, $condition);
                        injectScoreAndRank(qb, adapter, column, result, codec, 'explicit', scoreConfig);
                      },
                    }
                  ),
                },
                `UnifiedSearchPlugin adding ${adapter.name} filter field '${fieldName}' for '${column.attributeName}' on '${codec.name}'`
              );
            }
          }

          // ── unifiedSearch composite filter ──
          // Adds a single `unifiedSearch: String` field that fans out the same
          // text query to all adapters where supportsTextSearch is true.
          // WHERE clauses are combined with OR (match ANY algorithm).
          //
          // When graphile-llm is active, the resolver wrapper transforms the
          // String value into { __text, __vector } so pgvector also participates.
          if (enableUnifiedSearch) {
            // Collect text-compatible adapters and their columns for this codec
            const textAdapterColumns = adapterColumns.filter(
              (ac) => ac.adapter.supportsTextSearch && ac.adapter.buildTextSearchInput
            );
            // Collect vector adapters (participate when __vector is injected by LLM plugin)
            const vectorAdapterColumns = adapterColumns.filter(
              (ac) => ac.adapter.name === 'vector'
            );

            if (textAdapterColumns.length > 0) {
              const fieldName = 'unifiedSearch';

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
                        'Composite unified search. Provide a search string and it will be dispatched ' +
                        'to all text-compatible search algorithms (tsvector, BM25, pg_trgm) simultaneously. ' +
                        'When the LLM plugin is active, pgvector also participates via auto-embedding. ' +
                        'Rows matching ANY algorithm are returned. All matching score fields are populated.',
                        'field'
                      ),
                      type: build.graphql.GraphQLString as any,
                      apply: function plan($condition: any, val: any) {
                        if (val == null) return;

                        // Support both plain string and { __text, __vector } from LLM plugin
                        let text: string;
                        let vector: number[] | null = null;
                        if (typeof val === 'object' && val.__text) {
                          text = val.__text;
                          vector = val.__vector ?? null;
                        } else {
                          text = typeof val === 'string' ? val : String(val);
                          if (text.trim().length === 0) return;
                        }

                        const qb = getQueryBuilder(build, $condition);

                        // Collect all WHERE clauses (combined with OR)
                        const whereClauses: any[] = [];

                        // Text adapters (tsvector, BM25, trgm)
                        for (const { adapter, columns } of textAdapterColumns) {
                          for (const column of columns) {
                            // Convert text to adapter-specific filter input
                            const filterInput = adapter.buildTextSearchInput!(text);

                            const result = adapter.buildFilterApply(
                              sql,
                              $condition.alias,
                              column,
                              filterInput,
                              build,
                            );
                            if (!result) continue;

                            if (result.whereClause) {
                              whereClauses.push(result.whereClause);
                            }
                            injectScoreAndRank(qb, adapter, column, result, codec, 'unified', scoreConfig);
                          }
                        }

                        // Vector adapters (pgvector) — only when __vector is injected
                        if (vector && vectorAdapterColumns.length > 0) {
                          for (const { adapter, columns } of vectorAdapterColumns) {
                            for (const column of columns) {
                              const result = adapter.buildFilterApply(
                                sql,
                                $condition.alias,
                                column,
                                { vector, metric: 'COSINE' },
                                build,
                              );
                              if (!result) continue;

                              if (result.whereClause) {
                                whereClauses.push(result.whereClause);
                              }
                              injectScoreAndRank(qb, adapter, column, result, codec, 'unified', scoreConfig);
                            }
                          }
                        }

                        // Apply combined WHERE with OR
                        if (whereClauses.length > 0) {
                          if (whereClauses.length === 1) {
                            $condition.where(whereClauses[0]);
                          } else {
                            const combined = sql.fragment`(${sql.join(whereClauses, ' OR ')})`;
                            $condition.where(combined);
                          }
                        } else if (vector && textAdapterColumns.length === 0) {
                          // Vector-only table with no text adapters and embedding failed
                          // This shouldn't happen (caught in resolver wrapper) but safety net
                          throw new Error(
                            'unifiedSearch: no text adapters available and vector search requires an embedding. ' +
                            'Ensure the LLM plugin is configured or add text search columns.'
                          );
                        }
                      },
                    }
                  ),
                },
                `UnifiedSearchPlugin adding unifiedSearch composite filter on '${codec.name}'`
              );
            }
          }

          return newFields;
        },
      },
    },
  };
}
