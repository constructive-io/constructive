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

### 5.1 Plugins Already Ported in v5 Spike

These can be copied/adapted from the v5 spike:

| v4 Plugin | v5 Equivalent | Status |
|-----------|---------------|--------|
| `graphile-simple-inflector` | `InflektPreset` | Ready |
| `graphile-meta-schema` | `MetaSchemaPreset` | Ready |
| Connection filter | Official v5 plugin | Ready |
| Many-to-many | Official v5 plugin + `ManyToManyOptInPreset` | Ready |

### 5.2 Plugins Requiring Port

| Plugin | Complexity | Notes |
|--------|------------|-------|
| `graphile-postgis` | High | PostGIS types and filters |
| `graphile-i18n` | Medium | Language/locale support |
| `graphile-upload-plugin` | Medium | File upload handling |
| `graphile-search-plugin` | Medium | Search functionality |
| `graphile-plugin-connection-filter-postgis` | High | PostGIS filter operators |
| `graphile-plugin-fulltext-filter` | Medium | Full-text search filters |

### 5.3 Plugin Migration Order

1. **Phase 5a:** Core functionality (no plugins)
2. **Phase 5b:** Inflection (`InflektPreset`)
3. **Phase 5c:** Connection filter (official v5 plugin)
4. **Phase 5d:** Meta schema (`MetaSchemaPreset`)
5. **Phase 5e:** Many-to-many (official v5 plugin)
6. **Phase 5f:** PostGIS (requires full port)
7. **Phase 5g:** i18n (requires full port)
8. **Phase 5h:** Upload (requires full port)
9. **Phase 5i:** Search (requires full port)

## Phase 6: Test Migration

### 6.1 Tests to Skip Initially

Skip tests that depend on the GraphQL server during initial migration:

```typescript
// In jest.config.js or test files
describe.skip('Server integration tests', () => {
  // These will be re-enabled after server is working
});
```

### 6.2 Test Categories

1. **Unit tests** - Should mostly work after type updates
2. **Integration tests** - May need updates for v5 API changes
3. **Server tests** - Skip initially, re-enable incrementally

## Phase 7: Codegen Updates

### 7.1 Update `graphql/codegen`

The codegen package uses PostGraphile introspection to generate types. This needs to be updated to use v5's introspection API.

**Reference:** `graphile repo's packages/codegen`

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

### Phase 5: Plugins (incremental)
- [ ] Port inflection
- [ ] Enable connection filter
- [ ] Port meta schema
- [ ] Enable many-to-many
- [ ] Port PostGIS
- [ ] Port i18n
- [ ] Port upload
- [ ] Port search

### Phase 6: Re-enable
- [ ] Re-enable middleware
- [ ] Re-enable tests
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
