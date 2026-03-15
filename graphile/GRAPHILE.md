# Graphile Plugin Architecture

This document describes the PostGraphile v5 plugin ecosystem in the Constructive monorepo. All plugins are v5-native, written in TypeScript, and compose via Graphile's preset system.

## Overview

The `graphile/` directory contains all PostGraphile v5 plugins, organized as individual packages in the pnpm workspace. The central entry point is `graphile-settings`, which exports `ConstructivePreset` — a single preset that wires everything together.

```
ConstructivePreset
├── MinimalPreset              (no Node/Relay — keeps id as id)
├── InflektPreset              (custom inflection via inflekt library)
├── ConflictDetectorPreset     (warns about naming conflicts between schemas)
├── InflectorLoggerPreset      (debug logging for inflector calls)
├── NoUniqueLookupPreset       (primary key only lookups)
├── ConnectionFilterPreset     (v5-native connection filter with relation filters)
├── EnableAllFilterColumnsPreset (allow filtering on all columns)
├── ManyToManyOptInPreset      (many-to-many via @behavior +manyToMany)
├── MetaSchemaPreset           (_meta query for schema introspection)
├── UnifiedSearchPreset        (tsvector + BM25 + pg_trgm + pgvector)
├── GraphilePostgisPreset      (PostGIS types + spatial filter operators)
├── UploadPreset               (S3/MinIO file uploads)
├── SqlExpressionValidatorPreset (validates @sqlExpression columns)
└── PgTypeMappingsPreset       (custom type → GraphQL scalar mappings)
```

## Active Packages

### graphile-settings

**The main configuration package.** Exports `ConstructivePreset` and all sub-presets. This is the only package most consumers need to import.

- Combines all plugins into a single composable preset
- Disables `condition` argument (all filtering via `filter`/`where`)
- Configures connection filter options (logical operators, arrays, computed columns)
- Aggregates satellite plugin operator factories

```typescript
import { ConstructivePreset, makePgService } from 'graphile-settings';
```

### graphile-connection-filter

**V5-native connection filter plugin.** Adds the `where` argument to connections with per-table filter types (e.g. `UserFilter`) and per-scalar operator types (e.g. `StringFilter`, `IntFilter`).

Key features:
- Standard operators: `equalTo`, `notEqualTo`, `isNull`, `in`, `notIn`, `lessThan`, `greaterThan`
- Pattern matching: `includes`, `startsWith`, `endsWith`, `like` + case-insensitive variants
- Type-specific operators: JSONB, hstore, inet, array, range
- Logical operators: `and`, `or`, `not`
- Relation filters: filter by related table fields (forward and backward)
- **Declarative operator API**: satellite plugins register custom operators via `connectionFilterOperatorFactories`

```typescript
import { ConnectionFilterPreset } from 'graphile-connection-filter';
```

### graphile-search

**Unified search plugin with adapter pattern.** Replaces the previous separate plugins (`graphile-tsvector`, `graphile-bm25`, `graphile-trgm`, `graphile-pgvector`) with a single plugin that supports all four search algorithms.

Each algorithm is a ~50-line adapter implementing the `SearchAdapter` interface:
- **tsvector** — PostgreSQL full-text search via `ts_rank`
- **BM25** — `pg_textsearch` extension scoring
- **pg_trgm** — Trigram fuzzy matching via `similarity()`
- **pgvector** — Vector similarity search (cosine, L2, inner product)

Generated GraphQL fields per adapter:
- **Score fields**: `{column}{Algorithm}{Metric}` (e.g. `bodyBm25Score`, `titleTrgmSimilarity`)
- **Composite score**: `searchScore` — normalized 0..1 aggregating all active search signals
- **OrderBy enums**: `{COLUMN}_{ALGORITHM}_{METRIC}_ASC/DESC` + `SEARCH_SCORE_ASC/DESC`
- **Filter fields**: `{algorithm}{Column}` on connection filter input types (e.g. `fullTextBody`, `trgmTitle`)

Zero config — auto-discovers columns and indexes per adapter.

```typescript
import { UnifiedSearchPreset } from 'graphile-search';
```

### graphile-postgis

**PostGIS support.** Generates GraphQL types for geometry/geography columns including GeoJSON scalar types, dimension-aware interfaces, and spatial filter operators.

Features:
- GeoJSON scalar type for input/output
- Concrete types for all geometry subtypes (Point, LineString, Polygon, etc.)
- Geography-aware field naming (longitude/latitude instead of x/y)
- Spatial filter operators via `createPostgisOperatorFactory()`
- Graceful degradation when PostGIS is not installed

```typescript
import { GraphilePostgisPreset, createPostgisOperatorFactory } from 'graphile-postgis';
```

### graphile-misc-plugins

**Collection of smaller plugins** that don't warrant their own package:

| Plugin/Preset | Description |
|---|---|
| `MinimalPreset` | PostGraphile without Node/Relay features |
| `InflektPreset` | Custom inflection using inflekt library |
| `ConflictDetectorPreset` | Warns about naming conflicts between schemas |
| `InflectorLoggerPreset` | Debug logging (enable with `INFLECTOR_LOG=1`) |
| `EnableAllFilterColumnsPreset` | Allow filtering on all columns (not just indexed) |
| `ManyToManyOptInPreset` | Many-to-many via `@behavior +manyToMany` smart tag |
| `NoUniqueLookupPreset` | Disable non-primary-key unique lookups |
| `MetaSchemaPreset` | `_meta` query for database schema introspection |
| `PgTypeMappingsPreset` | Custom PostgreSQL type → GraphQL scalar mappings |

### graphile-cache

**PostGraphile instance LRU cache** with automatic cleanup when PostgreSQL pools are disposed. Integrates with `pg-cache` for pool management.

```typescript
import { graphileCache } from 'graphile-cache';
```

### graphile-schema

**Lightweight GraphQL SDL builder.** Build schemas directly from a database or fetch from a running endpoint — no server dependencies.

```typescript
import { buildSchemaSDL } from 'graphile-schema';
import { fetchEndpointSchemaSDL } from 'graphile-schema';
```

### graphile-query

**GraphQL query execution utilities.** Supports `pgSettings`, role-based access control, and custom request context.

- `GraphileQuery` — Full-featured with roles, settings, and request context
- `GraphileQuerySimple` — Minimal wrapper for simple execution

```typescript
import { GraphileQuery } from 'graphile-query';
```

### graphile-test

**Testing utilities for PostGraphile.** Builds on `pgsql-test` to provide isolated, seeded, role-aware test databases with GraphQL helpers.

- Per-test rollback via savepoints
- RLS-aware context injection (`setContext`)
- GraphQL `query()` function with snapshot support
- Seed support for SQL, JSON, CSV, Constructive, or Sqitch

For batteries-included testing with all Constructive plugins, use `@constructive-io/graphql-test` instead.

```typescript
import { getConnections, seed } from 'graphile-test';
```

### graphile-sql-expression-validator

**SQL expression validation** for PostGraphile v5. Validates SQL expressions against a configurable allowlist of functions and schemas.

```typescript
import { SqlExpressionValidatorPreset } from 'graphile-sql-expression-validator';
```

### graphile-upload-plugin

**File upload support** for PostGraphile v5. Handles S3/MinIO uploads for image, upload, and attachment domain columns.

```typescript
import { UploadPreset } from 'graphile-upload-plugin';
```

## Legacy Directories (Not Source Code)

The following directories contain npm-installed upstream packages from the v4 era. They have no `package.json` or `src/` — only `dist/` and `node_modules/`. They are consumed as dependencies but not maintained as source:

| Directory | Status |
|---|---|
| `graphile-i18n` | Upstream v4 package |
| `graphile-many-to-many` | Upstream `@graphile-contrib/pg-many-to-many` |
| `graphile-meta-schema` | Folded into `graphile-misc-plugins` as `MetaSchemaPreset` |
| `graphile-pg-type-mappings` | Folded into `graphile-misc-plugins` as `PgTypeMappingsPreset` |
| `graphile-plugin-connection-filter` | Replaced by v5-native `graphile-connection-filter` |
| `graphile-plugin-fulltext-filter` | Replaced by `graphile-search` unified plugin |
| `graphile-simple-inflector` | Replaced by `InflektPreset` in `graphile-misc-plugins` |

## How Satellite Plugins Register Filter Operators

Satellite plugins (search, PostGIS, trgm) register custom filter operators via the **declarative operator factory API** on `graphile-connection-filter`. Each factory is a function that receives the Graphile `build` object and returns operator registrations:

```typescript
// In constructive-preset.ts
schema: {
  connectionFilterOperatorFactories: [
    createMatchesOperatorFactory('FullText', 'english'),  // tsvector matches
    createTrgmOperatorFactories(),                         // similarTo, wordSimilarTo
    createPostgisOperatorFactory(),                        // spatial operators
  ],
}
```

This ensures `graphile-config`'s array replacement behavior is handled correctly — all factories are collected at the top-level preset.

## Key Design Decisions

1. **`condition` is disabled.** All filtering lives under `where` (the v5-native filter argument). `PgConditionArgumentPlugin` and `PgConditionCustomFieldsPlugin` are explicitly disabled in the preset.

2. **All columns are filterable.** `EnableAllFilterColumnsPreset` overrides PostGraphile's default of only filtering indexed columns. Index optimization is left to DBAs.

3. **Many-to-many is opt-in.** No many-to-many fields are generated unless the junction table has `@behavior +manyToMany` smart tag. This prevents API bloat.

4. **Relation filters are enabled.** `connectionFilterRelations: true` allows filtering across foreign key relationships (forward and backward).

5. **Search is unified.** One plugin (`graphile-search`) handles all four search algorithms via adapters instead of four separate plugins.

6. **Computed fields are excluded from codegen defaults.** The codegen's `getSelectableScalarFields()` helper uses the TypeRegistry to filter out plugin-added computed fields (search scores, hash UUIDs) from default CLI select objects.

## Testing

| Test Suite | Command | What It Covers |
|---|---|---|
| `graphile-connection-filter` | `pnpm --filter graphile-connection-filter test` | 51 filter operator tests |
| `graphile-search` | `pnpm --filter graphile-search test` | Unified search adapter tests |
| `graphile-settings` | `pnpm --filter graphile-settings test` | Preset integration + metadata tests |
| `graphile-test` | `pnpm --filter graphile-test test` | Test framework self-tests |
| `graphql/test` | `pnpm --filter @constructive-io/graphql-test test` | Full ConstructivePreset integration (84 tests) |
| `graphql/server-test` | `pnpm --filter @constructive-io/graphql-server-test test` | Server-level integration + search mega queries |

All tests run in CI against `constructiveio/postgres-plus:18` (includes PostGIS, pg_trgm, pgvector, pg_textsearch).
