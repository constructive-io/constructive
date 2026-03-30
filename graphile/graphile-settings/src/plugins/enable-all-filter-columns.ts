import type { GraphileConfig } from 'graphile-config';

/**
 * EnableAllFilterColumnsPlugin - Enables filtering and ordering on ALL columns, not just indexed ones.
 *
 * WHY THIS EXISTS:
 * PostGraphile v5's `PgIndexBehaviorsPlugin` restricts filtering and ordering to only indexed columns
 * by default. This is a performance optimization - filtering/ordering on non-indexed columns can
 * cause slow table scans. However, for development and flexibility, we want to allow
 * filtering and ordering on all columns and let developers/DBAs decide which columns need indexes.
 *
 * SOURCE CODE REFERENCE:
 * PgIndexBehaviorsPlugin marks non-indexed columns with `extensions.isIndexed = false`
 * and then adds `-filterBy` and `-orderBy` behaviors to remove them from filters and ordering:
 * https://github.com/graphile/crystal/blob/924b2515c6bd30e5905ac1419a25244b40c8bb4d/graphile-build/graphile-build-pg/src/plugins/PgIndexBehaviorsPlugin.ts
 *
 * The relevant v5 code (from PgIndexBehaviorsPlugin):
 * ```typescript
 * entityBehavior: {
 *   pgCodecAttribute: {
 *     inferred: {
 *       after: ["inferred"],
 *       provides: ["postInferred"],
 *       callback(behavior, [codec, attributeName]) {
 *         const newBehavior = [behavior];
 *         const attr = codec.attributes[attributeName];
 *         if (attr.extensions?.isIndexed === false) {
 *           newBehavior.push("-filterBy", "-orderBy");  // <-- This removes filterBy AND orderBy!
 *         }
 *         return newBehavior;
 *       },
 *     },
 *   },
 * },
 * ```
 *
 * OUR FIX:
 * We add a behavior callback that runs AFTER PgIndexBehaviorsPlugin's "postInferred" phase
 * and adds `+attribute:filterBy` and `+attribute:orderBy` back to ALL columns, regardless of index status.
 *
 * This means:
 * - All columns will appear in the connection filter's filter argument
 * - All columns will appear in the connection's orderBy enum
 * - Developers can filter and sort by any column
 * - It's the developer's/DBA's responsibility to add indexes for frequently filtered/sorted columns
 *
 * PERFORMANCE WARNING:
 * Filtering or ordering on non-indexed columns can cause full table scans, which may be slow on large
 * tables. Monitor your query performance and add indexes as needed. You can check which
 * columns are indexed by querying pg_indexes or using EXPLAIN ANALYZE on your queries.
 *
 * To identify non-indexed columns being filtered, you can:
 * 1. Enable slow query logging in PostgreSQL (log_min_duration_statement)
 * 2. Use EXPLAIN ANALYZE on queries to see if they're doing sequential scans
 * 3. Check pg_stat_user_tables for seq_scan counts
 */
export const EnableAllFilterColumnsPlugin: GraphileConfig.Plugin = {
  name: 'EnableAllFilterColumnsPlugin',
  version: '1.0.0',
  description: 'Enables filtering and ordering on all columns, not just indexed ones',

  schema: {
    entityBehavior: {
      pgCodecAttribute: {
        /**
         * This callback runs in the "inferred" phase AFTER PgIndexBehaviorsPlugin's
         * "postInferred" phase. It adds `filterBy` and `orderBy` back to ALL columns,
         * overriding the `-filterBy` and `-orderBy` that PgIndexBehaviorsPlugin adds
         * to non-indexed columns.
         */
        inferred: {
          after: ['postInferred'],
          provides: ['enableAllFilters'],
          callback(behavior) {
            // Add filterBy and orderBy to override PgIndexBehaviorsPlugin restrictions
            // The behavior system will resolve conflicts, with later additions winning
            return [behavior, 'filterBy', 'orderBy'];
          },
        },
      },
    },
  },
};

/**
 * Preset that includes the EnableAllFilterColumnsPlugin.
 * Add this to your main preset's `extends` array.
 */
export const EnableAllFilterColumnsPreset: GraphileConfig.Preset = {
  plugins: [EnableAllFilterColumnsPlugin],
};
