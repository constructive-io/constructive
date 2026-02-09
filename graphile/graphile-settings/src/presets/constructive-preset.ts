import type { GraphileConfig } from 'graphile-config';
import { PostGraphileConnectionFilterPreset } from 'postgraphile-plugin-connection-filter';
import { MinimalPreset } from '../plugins/minimal-preset';
import { InflektPreset } from '../plugins/custom-inflector';
import { ConflictDetectorPreset } from '../plugins/conflict-detector';
import { InflectorLoggerPreset } from '../plugins/inflector-logger';
import { NoUniqueLookupPreset } from '../plugins/primary-key-only';
import { EnableAllFilterColumnsPreset } from '../plugins/enable-all-filter-columns';
import { ManyToManyOptInPreset } from '../plugins/many-to-many-preset';
import { MetaSchemaPreset } from '../plugins/meta-schema';
import { PgSearchPreset } from 'graphile-search-plugin';
import { PgTypeMappingsPreset } from '../plugins/pg-type-mappings';

/**
 * Constructive PostGraphile v5 Preset
 *
 * This is the main preset that combines all our custom plugins and configurations.
 * It provides a clean, opinionated GraphQL API built from PostgreSQL.
 *
 * FEATURES:
 * - No Node/Relay features (keeps `id` as `id`, no global object identification)
 * - Custom inflection using inflekt library
 * - Conflict detection for multi-schema setups
 * - Inflector logging for debugging (enable with INFLECTOR_LOG=1)
 * - Primary key only lookups (no *ByEmail, *ByUsername, etc.)
 * - Connection filter plugin with all columns filterable
 * - Many-to-many relationships (opt-in via @behavior +manyToMany)
 * - Meta schema plugin (_meta query for introspection of tables, fields, indexes)
 * - PG type mappings (maps custom types like email, url to GraphQL scalars)
 *
 * DISABLED PLUGINS:
 * - PgConnectionArgFilterBackwardRelationsPlugin (relation filters bloat the API)
 * - PgConnectionArgFilterForwardRelationsPlugin (relation filters bloat the API)
 *
 * USAGE:
 * ```typescript
 * import { ConstructivePreset } from 'graphile-settings/presets';
 * import { makePgService } from 'postgraphile/adaptors/pg';
 *
 * const preset: GraphileConfig.Preset = {
 *   extends: [ConstructivePreset],
 *   pgServices: [
 *     makePgService({
 *       connectionString: DATABASE_URL,
 *       schemas: ['public'],
 *     }),
 *   ],
 * };
 * ```
 */
export const ConstructivePreset: GraphileConfig.Preset = {
  extends: [
    MinimalPreset,
    ConflictDetectorPreset,
    InflektPreset,
    InflectorLoggerPreset,
    NoUniqueLookupPreset,
    PostGraphileConnectionFilterPreset,
    EnableAllFilterColumnsPreset,
    ManyToManyOptInPreset,
    MetaSchemaPreset,
    PgSearchPreset({ pgSearchPrefix: 'fullText' }),
    PgTypeMappingsPreset,
  ],
  /**
   * Disable relation filter plugins from postgraphile-plugin-connection-filter.
   *
   * WHY THIS EXISTS:
   * The connection filter plugin includes PgConnectionArgFilterBackwardRelationsPlugin and
   * PgConnectionArgFilterForwardRelationsPlugin which add relation filter fields like
   * `apiExtensions`, `apiExtensionsExist`, `database`, `domains`, etc. to every filter type.
   *
   * The `connectionFilterRelations: false` schema option does NOT work - it's defined in the
   * plugin's TypeScript types but the actual code always includes the plugins regardless.
   * See: https://github.com/graphile-contrib/postgraphile-plugin-connection-filter/blob/master/src/index.ts
   * The comments `//if (connectionFilterRelations)` are just comments, not actual conditional logic.
   *
   * The entityBehavior approach (setting `pgCodecRelation: '-filterBy'`) also doesn't work
   * because the behavior system doesn't properly negate the plugin's default `filterBy` behavior.
   *
   * OUR FIX:
   * We use `disablePlugins` to directly disable the two relation filter plugins.
   * This is the most reliable way to prevent relation filter fields from being generated.
   */
  disablePlugins: [
    'PgConnectionArgFilterBackwardRelationsPlugin',
    'PgConnectionArgFilterForwardRelationsPlugin',
  ],
  /**
   * Connection Filter Plugin Configuration
   *
   * These options control what fields appear in the `filter` argument on connections.
   * We disable relation filters to keep the API surface clean and match our v4 behavior.
   *
   * NOTE: By default, PostGraphile v5 only allows filtering on INDEXED columns.
   * We override this with EnableAllFilterColumnsPreset to allow filtering on ALL columns.
   * This gives developers flexibility but requires monitoring for slow queries on
   * non-indexed columns. See the plugin documentation for performance considerations.
   *
   * NOTE: Relation filtering is disabled via `disablePlugins` above.
   *
   * Documentation: https://github.com/graphile-contrib/postgraphile-plugin-connection-filter
   */
  schema: {
    /**
     * connectionFilterRelations: false
     * This option is defined in the plugin's types but does NOT actually work.
     * The relation filter plugins are disabled via `disablePlugins` above.
     * We keep this option set to false for documentation purposes.
     */
    connectionFilterRelations: false,

    /**
     * connectionFilterComputedColumns: false
     * Disables filtering on computed columns (functions that return a value for a row).
     * Computed columns can be expensive to filter on since they may not be indexed.
     * To selectively enable, use `@filterable` smart tag on specific functions.
     */
    connectionFilterComputedColumns: false,

    /**
     * connectionFilterSetofFunctions: false
     * Disables filtering on functions that return `setof` (multiple rows).
     * These can be expensive operations. To selectively enable, use `@filterable` smart tag.
     */
    connectionFilterSetofFunctions: false,

    /**
     * connectionFilterLogicalOperators: true (default)
     * Keeps `and`, `or`, `not` operators for combining filter conditions.
     * Example: filter: { or: [{ name: { eq: "foo" } }, { name: { eq: "bar" } }] }
     */
    connectionFilterLogicalOperators: true,

    /**
     * connectionFilterArrays: true (default)
     * Allows filtering on PostgreSQL array columns.
     * Example: filter: { tags: { contains: ["important"] } }
     */
    connectionFilterArrays: true,
  },
};

export default ConstructivePreset;
