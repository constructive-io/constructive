# Graphile v5 Migration Plan

## Overview

This document outlines the plan to upgrade the Constructive framework from PostGraphile v4 to v5, including the migration from GraphQL 15 to GraphQL 16.

**Branch name:** `feature/graphile-v5-migration`

**Reference implementation:** [constructive-io/graphile](https://github.com/constructive-io/graphile) - A working v5 spike with patterns to follow.

**Goal:** Preserve Git history while incrementally upgrading the existing codebase, using the v5 spike as a reference for correct patterns.

## Strategy

Rather than importing the v5 spike as a separate directory, we will upgrade the existing packages in-place:

1. Disable all plugins initially to get a minimal working server
2. Disable middleware that depends on v4-specific APIs
3. Skip tests that depend on the server during initial migration
4. Use the v5 spike as a reference for correct patterns
5. Incrementally re-enable and port plugins one by one
6. Keep code clean and lean throughout

## Phase 1: Core Dependencies Update

### 1.1 Update Root Dependencies

Update `package.json` at workspace root with pnpm overrides:

```json
{
  "pnpm": {
    "overrides": {
      "graphql": "^16.9.0"
    }
  }
}
```

### 1.2 Update Package Dependencies

**Packages requiring dependency updates:**

| Package | Current | Target |
|---------|---------|--------|
| `graphql` | 15.10.1 | ^16.9.0 |
| `postgraphile` | ^4.14.1 | ^5.0.0-rc.4 |
| `graphile-build` | ^4.14.1 | ^5.0.0-rc.3 |
| `graphile-build-pg` | ^4.14.1 | ^5.0.0-rc.3 |
| `graphile-utils` | ^4.14.1 | (removed - use graphile-build directly) |

**New dependencies to add:**

- `grafast`: ^1.0.0-rc.4
- `grafserv`: (included in postgraphile)
- `graphile-config`: 1.0.0-rc.3
- `pg-sql2`: ^5.0.0-rc.3

### 1.3 Primary Packages to Update

1. `graphile-settings` (graphile/graphile-settings)
2. `@constructive-io/graphql-server` (graphql/server)
3. `@constructive-io/graphql-types` (graphql/types)

## Phase 2: Type System Updates

### 2.1 Update `graphql/types/src/graphile.ts`

The v4 `PostGraphileOptions` type needs to be replaced with v5's `GraphileConfig.Preset` pattern.

**Current v4 pattern:**
```typescript
import type { Plugin } from 'graphile-build';
import { PostGraphileOptions } from 'postgraphile';

export interface GraphileOptions {
  schema?: string | string[];
  appendPlugins?: Plugin[];
  graphileBuildOptions?: PostGraphileOptions['graphileBuildOptions'];
  overrideSettings?: Partial<PostGraphileOptions>;
}
```

**Target v5 pattern:**
```typescript
import type { GraphileConfig } from 'graphile-config';

export interface GraphileOptions {
  /** Database schema(s) to expose through GraphQL */
  schemas?: string[];
  /** Additional presets to extend */
  extends?: GraphileConfig.Preset[];
  /** Preset overrides */
  preset?: Partial<GraphileConfig.Preset>;
}
```

### 2.2 Update `graphql/types/src/constructive.ts`

Update `ConstructiveOptions` to use v5 types while maintaining backward compatibility where possible.

## Phase 3: Server Migration

### 3.1 Update `graphile-settings`

**Current v4 pattern (graphile/graphile-settings/src/index.ts):**
```typescript
import { PostGraphileOptions } from 'postgraphile';

export const getGraphileSettings = (opts): PostGraphileOptions => {
  return {
    appendPlugins: [...],
    skipPlugins: [NodePlugin],
    graphileBuildOptions: {...},
    // ... v4 options
  };
};
```

**Target v5 pattern (reference: graphile repo's packages/settings):**
```typescript
import type { GraphileConfig } from 'graphile-config';
import { PostGraphileAmberPreset } from 'postgraphile/presets/amber';

export const getGraphilePreset = (opts): GraphileConfig.Preset => {
  return {
    extends: [
      PostGraphileAmberPreset,
      // MinimalPreset (disables Node/Relay)
      // Other presets...
    ],
    disablePlugins: [...],
    schema: {...},
    grafserv: {...},
    grafast: {...},
  };
};
```

**Initial minimal implementation (all plugins disabled):**
```typescript
import type { GraphileConfig } from 'graphile-config';
import { PostGraphileAmberPreset } from 'postgraphile/presets/amber';

export const getGraphilePreset = (opts): GraphileConfig.Preset => {
  return {
    extends: [PostGraphileAmberPreset],
    disablePlugins: ['NodePlugin'],
    grafserv: {
      graphqlPath: '/graphql',
      graphiqlPath: '/graphiql',
    },
  };
};
```

### 3.2 Update `graphql/server`

**Current v4 pattern (graphql/server/src/middleware/graphile.ts):**
```typescript
import { postgraphile, PostGraphileOptions } from 'postgraphile';

const handler = postgraphile(pgPool, schema, graphileOpts);
graphileCache.set(key, { pgPool, pgPoolKey, handler });
return handler(req, res, next);
```

**Target v5 pattern (reference: graphile repo's packages/server):**
```typescript
import { postgraphile } from 'postgraphile';
import { makePgService } from 'postgraphile/adaptors/pg';
import { grafserv } from 'postgraphile/grafserv/express/v4';

const preset: GraphileConfig.Preset = {
  extends: [getGraphilePreset(opts)],
  pgServices: [
    makePgService({
      connectionString,
      schemas,
    }),
  ],
  grafast: {
    context: (ctx) => ({
      pgSettings: { role: anonRole, ...claims },
    }),
  },
};

const pgl = postgraphile(preset);
const serv = pgl.createServ(grafserv);
const handler = express();
await serv.addTo(handler, httpServer);
```

### 3.3 Update `graphile-cache`

The cache structure needs to change to store v5 instances:

**Current v4:**
```typescript
export interface GraphileCache {
  pgPool: pg.Pool;
  pgPoolKey: string;
  handler: HttpRequestHandler;
}
```

**Target v5:**
```typescript
export interface GraphileCache {
  pgl: ReturnType<typeof postgraphile>;
  serv: ReturnType<typeof grafserv>;
  handler: Express;
  httpServer: HttpServer;
}
```

## Phase 4: Middleware Updates

### 4.1 Middleware to Disable Initially

These middleware depend on v4-specific APIs and should be simplified or disabled initially:

1. **`middleware/api.ts`** - Uses `graphile-query` which depends on v4
   - Simplify to basic schema resolution without GraphQL introspection
   - Re-enable after `graphile-query` is ported to v5

2. **`middleware/auth.ts`** - Can remain mostly unchanged
   - Uses `pg-query-context` which is database-level, not Graphile-specific

3. **`middleware/graphile.ts`** - Complete rewrite needed
   - Port to v5 pattern using grafserv

### 4.2 Patterns to Follow

Use existing patterns from the codebase:
- `pg-env` for PostgreSQL configuration
- `pg-cache` for connection pooling
- `graphql/env` for environment configuration
- `graphql/types` for type definitions

## Phase 5: Plugin Migration

### 5.1 Complete Plugin Inventory

This section tracks all plugins from the `main` branch and their migration status on `develop-v5`.

#### Plugins Inlined into `graphile-settings`

These plugins have been converted to v5 presets and inlined into `graphile/graphile-settings/src/plugins/`:

| Original Package | v5 Preset | Location | Tests |
|-----------------|-----------|----------|-------|
| `graphile-simple-inflector` | `InflektPreset` | `plugins/custom-inflector.ts` | Yes (schema snapshot) |
| `graphile-meta-schema` | `MetaSchemaPreset` | `plugins/meta-schema.ts` | Yes (schema snapshot) |
| (new) | `MinimalPreset` | `plugins/minimal-preset.ts` | Yes |
| (new) | `ConflictDetectorPreset` | `plugins/conflict-detector.ts` | Yes |
| (new) | `InflectorLoggerPreset` | `plugins/inflector-logger.ts` | Yes |
| (new) | `NoUniqueLookupPreset` | `plugins/primary-key-only.ts` | Yes |
| (new) | `EnableAllFilterColumnsPreset` | `plugins/enable-all-filter-columns.ts` | Yes |
| (new) | `ManyToManyOptInPreset` | `plugins/many-to-many-preset.ts` | Yes |
| (new) | `TsvectorCodecPreset` | `plugins/tsvector-codec.ts` | Yes |

#### Plugins Using Community Packages

These plugins are now using official community v5 packages:

| Original Package | Community Package | Version |
|-----------------|-------------------|---------|
| `graphile-plugin-connection-filter` | `postgraphile-plugin-connection-filter` | `^3.0.0-rc.1` |
| `graphile-many-to-many` | `@graphile-contrib/pg-many-to-many` | `2.0.0-rc.1` |

#### Standalone Packages (Upgraded to v5)

These packages exist as separate packages and have been upgraded to v5:

| Package | Location | Status | Tests |
|---------|----------|--------|-------|
| `graphile-settings` | `graphile/graphile-settings` | **Complete** | Yes |
| `graphile-test` | `graphile/graphile-test` | **Complete** | Yes |
| `graphile-query` | `graphile/graphile-query` | **Complete** | Yes |
| `graphile-cache` | `graphile/graphile-cache` | **Complete** | Yes |
| `graphile-authz` | `graphile/graphile-authz` | **Complete** (new from graphile repo) | Yes (66 tests) |
| `postgraphile-plugin-pgvector` | `graphile/postgraphile-plugin-pgvector` | **Complete** (new from graphile repo) | Yes (9 tests) |

#### Packages Deleted (No Longer Needed)

| Package | Reason |
|---------|--------|
| `graphile-simple-inflector` | Inlined as `InflektPreset` in graphile-settings |
| `graphile-plugin-connection-filter` | Using community package instead |

#### Packages Requiring v5 Port

These packages exist on `develop-v5` but have no source code (only `dist/` and `node_modules/`):

| Package | Complexity | Notes | Priority |
|---------|------------|-------|----------|
| `graphile-pg-type-mappings` | Low | Maps custom PG types (email, url, etc.) to GraphQL scalars | High - should inline into settings |
| `graphile-postgis` | High | PostGIS types and filters | Medium |
| `graphile-i18n` | Medium | Language/locale support | Low |
| `graphile-upload-plugin` | Medium | File upload handling | Low |
| `graphile-search-plugin` | Medium | Search functionality | Low |
| `graphile-plugin-connection-filter-postgis` | High | PostGIS filter operators (depends on graphile-postgis) | Medium |
| `graphile-plugin-fulltext-filter` | Medium | Full-text search filters | Low |
| `graphile-sql-expression-validator` | Low | SQL expression validation | Low |

### 5.2 Migration Priority Order

1. **Phase 5a:** Core functionality (no plugins) - **DONE**
2. **Phase 5b:** Inflection (`InflektPreset`) - **DONE**
3. **Phase 5c:** Connection filter (community v5 plugin) - **DONE**
4. **Phase 5d:** Meta schema (`MetaSchemaPreset`) - **DONE**
5. **Phase 5e:** Many-to-many (community v5 plugin) - **DONE**
6. **Phase 5f:** Tsvector codec (`TsvectorCodecPreset`) - **DONE**
7. **Phase 5g:** PG type mappings (inline into settings) - **TODO**
8. **Phase 5h:** PostGIS (requires full port) - **TODO**
9. **Phase 5i:** i18n (requires full port) - **TODO**
10. **Phase 5j:** Upload (requires full port) - **TODO**
11. **Phase 5k:** Search (requires full port) - **TODO**

## Phase 6: Test Migration

### 6.1 Restore `@constructive-io/graphql-test` Package

The `graphql/test` package (`@constructive-io/graphql-test`) was removed during the v5 migration but needs to be restored. This package provides testing infrastructure that pre-loads `ConstructivePreset` from graphile-settings.

**Package structure:**
- `graphile-test` (at `graphile/graphile-test/`) - Generic PostGraphile v5 testing, no preset
- `@constructive-io/graphql-test` (at `graphql/test/`) - Wraps graphile-test with ConstructivePreset

**Restoration plan:**
1. Restore `graphql/test/` from main branch using `git checkout main -- graphql/test/` to preserve history
2. Update for PostGraphile v5:
   - Replace `createPostGraphileSchema` with `makeSchema` from graphile-build
   - Replace `getGraphileSettings()` with extending `ConstructivePreset`
   - Update dependencies (graphql 16, postgraphile v5)
3. Add plugin tests:
   - Add tsvector test schema with `search_tsv` column
   - Test that tsvector fields appear as String type
   - Test other plugins (many-to-many, filters, meta schema, etc.)
4. Enable in CI:
   - Add `graphql/test` to the test matrix in `.github/workflows/run-tests.yaml`

**Key difference from graphile-test:**
- `graphile-test` is simple/generic - tests plugins in isolation without any preset
- `@constructive-io/graphql-test` wraps graphile-test and pre-loads `ConstructivePreset` - tests with full Constructive configuration

### 6.2 Tests to Skip Initially

Skip tests that depend on the GraphQL server during initial migration:

```typescript
// In jest.config.js or test files
describe.skip('Server integration tests', () => {
  // These will be re-enabled after server is working
});
```

### 6.3 Test Categories

1. **Unit tests** - Should mostly work after type updates
2. **Integration tests** - May need updates for v5 API changes
3. **Server tests** - Skip initially, re-enable incrementally
4. **Plugin tests** - Use `@constructive-io/graphql-test` with ConstructivePreset

## Phase 7: Codegen Updates

### 7.1 Update `graphql/codegen`

The codegen package uses PostGraphile introspection to generate types. This needs to be updated to use v5's introspection API.

**Reference:** `graphile repo's packages/codegen`

### 7.2 Codegen Migration Details

The current codegen (`graphql/codegen`) uses v4-based schema building via `buildSchemaSDLFromDatabase`. This needs to be updated to use v5's `makeSchema()` with `ConstructivePreset`.

**Current v4 approach (graphql/codegen/src/core/introspect/source/database.ts):**
```typescript
import { buildSchemaSDLFromDatabase } from '../../database';

// Uses PostGraphile v4 to build schema
const sdl = await buildSchemaSDLFromDatabase({ database, schemas });
const schema = buildSchema(sdl);
const introspection = introspectionFromSchema(schema);
```

**Target v5 approach (from constructive-io/graphile/packages/codegen):**
```typescript
import { makeSchema } from 'postgraphile';
import { makePgService } from 'postgraphile/adaptors/pg';
import { ConstructivePreset } from 'graphile-settings';

const preset: GraphileConfig.Preset = {
  extends: [ConstructivePreset],
  pgServices: [makePgService({ pool, schemas })],
};

const { schema } = await makeSchema(preset);
const introspection = introspectionFromSchema(schema);
```

**Benefits of v5 approach:**
1. Eliminates hardcoded exclusion patterns
2. Generated SDKs match server schema exactly (same preset)
3. Cleaner code generation
4. Access to `_meta` schema for index information

**Migration tasks:**
1. Update `graphql/codegen/src/core/database/index.ts` to use v5's `makeSchema()`
2. Update `DatabaseSchemaSource` to use the new schema builder
3. Remove v4-specific exclusion patterns from introspection pipeline
4. Update tests to work with v5 schema output
5. Ensure generated types match v5 server schema

## Implementation Checklist

### Phase 1: Setup
- [ ] Create branch `feature/graphile-v5-migration`
- [ ] Add pnpm overrides for graphql ^16.9.0
- [ ] Update workspace dependencies

### Phase 2: Types
- [ ] Update `graphql/types/src/graphile.ts` for v5
- [ ] Update `graphql/types/src/constructive.ts` for v5
- [ ] Ensure backward compatibility where possible

### Phase 3: Server
- [ ] Update `graphile-settings` to return v5 preset (minimal, no plugins)
- [ ] Update `graphile-cache` for v5 instance structure
- [ ] Rewrite `graphql/server/src/middleware/graphile.ts` for v5
- [ ] Simplify `graphql/server/src/middleware/api.ts` (disable GraphQL introspection)
- [ ] Get server to start and respond to basic queries

### Phase 4: Tests
- [ ] Skip server-dependent tests
- [ ] Ensure build passes
- [ ] Ensure remaining tests pass

### Phase 5: Testing Infrastructure
- [ ] Restore `graphql/test` from main branch with git history
- [ ] Update `graphql/test` for PostGraphile v5 (preset API)
- [ ] Add tsvector plugin test with search_tsv column
- [ ] Add many-to-many plugin test
- [ ] Add connection filter plugin test
- [ ] Add meta schema plugin test
- [ ] Enable `graphql/test` in CI workflow

### Phase 6: Plugins (incremental)

#### Inlined into graphile-settings
- [x] Port inflection (InflektPreset)
- [x] Port meta schema (MetaSchemaPreset)
- [x] Add tsvector codec (TsvectorCodecPreset)
- [x] Add conflict detector (ConflictDetectorPreset)
- [x] Add inflector logger (InflectorLoggerPreset)
- [x] Add enable all filter columns (EnableAllFilterColumnsPreset)
- [x] Add primary key only lookups (NoUniqueLookupPreset)
- [x] Add many-to-many opt-in (ManyToManyOptInPreset)
- [ ] Port pg-type-mappings (inline into settings)

#### Using community packages
- [x] Enable connection filter (postgraphile-plugin-connection-filter@^3.0.0-rc.1)
- [x] Enable many-to-many (@graphile-contrib/pg-many-to-many@2.0.0-rc.1)

#### Standalone packages upgraded
- [x] graphile-settings
- [x] graphile-test
- [x] graphile-query
- [x] graphile-cache
- [x] graphile-authz (new from graphile repo, 66 tests)
- [x] postgraphile-plugin-pgvector (new from graphile repo, 9 tests)

#### Packages deleted
- [x] graphile-simple-inflector (inlined as InflektPreset)
- [x] graphile-plugin-connection-filter (using community package)

#### Packages requiring v5 port
- [ ] graphile-pg-type-mappings (high priority - inline into settings)
- [ ] graphile-postgis
- [ ] graphile-i18n
- [ ] graphile-upload-plugin
- [ ] graphile-search-plugin
- [ ] graphile-plugin-connection-filter-postgis
- [ ] graphile-plugin-fulltext-filter
- [ ] graphile-sql-expression-validator

### Phase 7: Re-enable
- [x] Re-enable middleware (api.ts refactored to use direct SQL)
- [x] Re-enable tests (server-test passing)
- [ ] Full integration testing

## Key API Differences (v4 vs v5)

### Configuration

| v4 | v5 |
|----|-----|
| `PostGraphileOptions` object | `GraphileConfig.Preset` object |
| `appendPlugins: [...]` | `extends: [Preset, ...]` or `plugins: [...]` |
| `skipPlugins: [...]` | `disablePlugins: [...]` |
| `graphileBuildOptions: {...}` | `schema: {...}` |
| `pgSettings: async (req) => {...}` | `grafast: { context: (ctx) => ({ pgSettings: {...} }) }` |

### Server Integration

| v4 | v5 |
|----|-----|
| `postgraphile(pool, schemas, options)` | `postgraphile(preset)` with `pgServices` |
| Returns Express middleware directly | Returns `pgl` instance, use `grafserv` for Express |
| `handler(req, res, next)` | `serv.addTo(app, httpServer)` |

### Plugin API

| v4 | v5 |
|----|-----|
| `Plugin = (builder, options) => {...}` | `GraphileConfig.Plugin` with hooks |
| `builder.hook('...')` | `schema: { hooks: { ... } }` |
| `makeExtendSchemaPlugin(...)` | Use `graphile-build` hooks directly |

## References

- [PostGraphile v5 Documentation](https://postgraphile.org/postgraphile/next/)
- [Graphile Crystal (v5 source)](https://github.com/graphile/crystal)
- [constructive-io/graphile (v5 spike)](https://github.com/constructive-io/graphile)
- [postgraphile-plugin-connection-filter v5](https://github.com/graphile-contrib/postgraphile-plugin-connection-filter)
- [@graphile-contrib/pg-many-to-many v5](https://github.com/graphile-contrib/pg-many-to-many)
