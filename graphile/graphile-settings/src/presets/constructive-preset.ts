import type { GraphileConfig } from 'graphile-config';
import { ConnectionFilterPreset } from 'graphile-connection-filter';
import {
  MinimalPreset,
  InflektPreset,
  ConflictDetectorPreset,
  InflectorLoggerPreset,
  NoUniqueLookupPreset,
  EnableAllFilterColumnsPreset,
  ManyToManyOptInPreset,
  MetaSchemaPreset,
  PgTypeMappingsPreset,
} from 'graphile-misc-plugins';
import { PgSearchPreset } from 'graphile-search-plugin';
import { GraphilePostgisPreset } from 'graphile-postgis';
import { VectorCodecPreset, createVectorSearchPlugin } from 'graphile-pgvector-plugin';
import { Bm25SearchPreset } from 'graphile-pg-textsearch-plugin';
import { PostgisConnectionFilterPreset } from 'graphile-plugin-connection-filter-postgis';
import { UploadPreset } from 'graphile-upload-plugin';
import { SqlExpressionValidatorPreset } from 'graphile-sql-expression-validator';
import { constructiveUploadFieldDefinitions } from '../upload-resolver';

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
 * - PostGIS support (geometry/geography types, GeoJSON scalar — auto-detects PostGIS extension)
 * - PostGIS connection filter operators (spatial filtering on geometry/geography columns)
 * - Upload plugin (file upload to S3/MinIO for image, upload, attachment domain columns)
 * - SQL expression validator (validates @sqlExpression columns in mutations)
 * - PG type mappings (maps custom types like email, url to GraphQL scalars)
 * - pgvector search (auto-discovers vector columns: condition fields, distance computed fields,
 *   orderBy distance — zero config)
 * - pg_textsearch BM25 search (auto-discovers BM25 indexes: condition fields, score computed fields,
 *   orderBy score — zero config)
 *
 * RELATION FILTERS:
 * - Enabled via connectionFilterRelations: true
 * - Forward: filter child by parent (e.g. allOrders(filter: { clientByClientId: { name: { startsWith: "Acme" } } }))
 * - Backward: filter parent by children (e.g. allClients(filter: { ordersByClientId: { some: { total: { greaterThan: 1000 } } } }))
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
    ConnectionFilterPreset({ connectionFilterRelations: true }),
    EnableAllFilterColumnsPreset,
    ManyToManyOptInPreset,
    MetaSchemaPreset,
    PgSearchPreset({ pgSearchPrefix: 'fullText' }),
    GraphilePostgisPreset,
    VectorCodecPreset,
    {
      plugins: [createVectorSearchPlugin()],
    },
    Bm25SearchPreset(),
    PostgisConnectionFilterPreset,
    UploadPreset({
      uploadFieldDefinitions: constructiveUploadFieldDefinitions,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    }),
    SqlExpressionValidatorPreset(),
    PgTypeMappingsPreset,
  ],
  /**
   * Connection Filter Plugin Configuration
   *
   * These options control what fields appear in the `filter` argument on connections.
   * Our v5-native graphile-connection-filter plugin controls relation filters via the
   * `connectionFilterRelations` option passed to ConnectionFilterPreset().
   *
   * NOTE: By default, PostGraphile v5 only allows filtering on INDEXED columns.
   * We override this with EnableAllFilterColumnsPreset to allow filtering on ALL columns.
   * This gives developers flexibility but requires monitoring for slow queries on
   * non-indexed columns.
   */
  schema: {
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
