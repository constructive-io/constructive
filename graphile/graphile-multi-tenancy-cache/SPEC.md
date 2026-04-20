# graphile-multi-tenancy-cache — Implementation Spec

## Problem

Constructive's GraphQL server creates a **dedicated PostGraphile instance per tenant** (one `postgraphile()` call per unique `svc_key`). Each instance holds its own `PgRegistry`, `GraphQLSchema`, operation plan cache, and V8 closures — ~50–80 MB per tenant. At scale (hundreds of tenants), this leads to:

- **Unbounded memory growth** — RSS grows linearly with tenant count
- **Slow cold starts** — each new tenant triggers a full schema build (~200–400ms)
- **LRU churn** — when tenant count exceeds `GRAPHILE_CACHE_MAX`, constant eviction/rebuild cycles tank QPS and spike latency

## Solution

A **template-based multi-tenancy cache** that shares a single PostGraphile instance across all tenants with structurally identical schemas. SQL is remapped per-request at the `client.query()` level — no Crystal modifications required.

### Key invariant

Constructive tenant schemas use the naming convention `t_<id>_<purpose>` (e.g., `t_1_services_public`, `t_2_services_public`). These names **never collide** with table/column names (`apis`, `apps`, `domains`). This invariant is necessary but not sufficient for safety, so SQL remap uses AST-based rewrite with strict failure policy (see SQL Remap Safety Contract below), not best-effort raw text replacement.

---

## Architecture

### Request flow

```
Request (svc_key)
  │
  ├─ HIT ──► tenantInstances.get(svc_key) ──► inject sqlTextTransform ──► handler
  │
  └─ MISS ──► getOrCreateTenantInstance()
                │
                ├─ Introspect + fingerprint (cached)
                │
                ├─ Template exists for fingerprint?
                │     ├─ YES ──► reuse template, build schema remap transform
                │     └─ NO  ──► build new template (single-flight), register
                │
                └─ Return TenantInstance { handler, sqlTextTransform, pgSettings }
```

### SQL interception (wrapper approach)

```
PgContextPlugin (Crystal, runs first in prepareArgs)
  contextValue["withPgClient"] = withPgClientFromPgService(…)
                    │
PgMultiTenancyWrapperPlugin (this package, runs AFTER)
  contextValue["withPgClient"] = wrap(original, contextValue)
                    │
PgExecutor reads ctx.get("withPgClient") at execution time
  → gets wrapped version
  → client.query({ text }) passes through Proxy
  → SQL text transformed: "t_1_services_public" → "t_2_services_public"
  → PostgreSQL receives tenant-correct SQL
```

The transform is read **lazily** at call time (not at middleware time) because `grafast.context` finalization happens after middleware.

### Three cache layers

| Layer | Key | Value | Eviction |
|---|---|---|---|
| **Tenant Instance** | `svc_key` | `TenantInstance` (handler + transform) | Package-owned: `flushTenantInstance()`, flush via LISTEN/NOTIFY |
| **Introspection** | `connHash:schema1,schema2` | Parsed introspection + fingerprint | LRU (max 100) + TTL (30min idle) |
| **Template** | SHA-256 fingerprint | PostGraphile instance (pgl + handler + httpServer) | LRU (max 50) + TTL (30min idle) + refCount protection |

---

## Folder structure

### New package: `graphile/graphile-multi-tenancy-cache/`

```
graphile/graphile-multi-tenancy-cache/
├── SPEC.md                          ← this file
├── package.json
├── jest.config.js
├── tsconfig.json
├── tsconfig.esm.json
└── src/
    ├── index.ts                     ← public API exports
    │
    │   # Core modules
    ├── pg-client-wrapper-plugin.ts  ← Grafast middleware (SQL interception via Proxy)
    ├── multi-tenancy-cache.ts       ← orchestrator (full lifecycle: tenant instances, templates, shutdown)
    ├── registry-template-map.ts     ← template registry (LRU/TTL eviction, refCount)
    ├── introspection-cache.ts       ← introspection cache (LRU/TTL eviction)
    │
    │   # Utilities
    ├── utils/
    │   ├── fingerprint.ts           ← SHA-256 structural fingerprint (schema-name-agnostic)
    │   ├── sql-transform.ts         ← SQL remap orchestrator (AST rewrite + hot-path cache)
    │   ├── schema-map.ts            ← buildSchemaMap, buildTenantPgSettings, remapSchemas
    │   └── introspection-query.ts   ← fetchIntrospection, parseIntrospection (raw pg_catalog access)
    │
    │   # Tests
    └── __tests__/
        ├── pg-client-wrapper-plugin.test.ts
        ├── registry-template-map.test.ts
        ├── introspection-cache.test.ts
        ├── fingerprint.test.ts
        ├── sql-transform.test.ts
        ├── schema-map.test.ts
        └── single-flight.test.ts
```

### Modified files in existing packages

```
graphql/server/src/middleware/
├── graphile.ts                      ← add multiTenancyHandler (calls package APIs, no preset builder)
└── flush.ts                         ← add multi-tenancy cache invalidation (calls package's flushTenantInstance)

graphql/server/src/
├── server.ts                        ← wire shutdownMultiTenancyCache, createFlushMiddleware
└── index.ts                         ← export createFlushMiddleware

graphql/env/src/
└── env.ts                           ← add USE_MULTI_TENANCY_CACHE env var

graphql/types/src/
└── graphile.ts                      ← add useMultiTenancyCache to ApiOptions
```

### Benchmark scripts: `graphql/server/perf/`

E2E benchmark scripts live at the server level (not in the package) since they
start the actual GraphQL server, manage databases, and do HTTP load testing.

```
graphql/server/perf/
├── README.md                        ← usage docs
├── common.mjs                       ← shared utilities (fetch, timing, pool helpers)
├── run-k-sweep.mjs                  ← orchestrator: run both modes, compare results
├── run-test-spec.mjs                ← single-mode runner (dedicated or multi-tenant)
├── phase1-preflight.mjs             ← pre-flight checks (DB connectivity, server health)
├── phase1-tech-validate-dbpm.mjs    ← validate DBPM tenant databases exist
├── phase2-load.mjs                  ← HTTP load generator (configurable workers, duration)
├── seed-real-multitenant.mjs        ← seed k tenant databases for benchmarking
├── build-token-pool.mjs             ← generate auth tokens for load testing
├── build-keyspace-profiles.mjs      ← build tenant keyspace profiles
├── build-business-op-profiles.mjs   ← build business operation profiles
├── prepare-public-test-access.mjs   ← prepare public API test access
├── public-test-access-lib.mjs       ← shared lib for public test access
├── reset-business-test-data.mjs     ← reset test data between runs
├── run-comparison.sh                ← shell wrapper: run both modes + compare
└── results/                         ← raw JSON benchmark results (gitignored)
```

---

## Module specifications

### 1. `pg-client-wrapper-plugin.ts`

**Purpose:** Grafast middleware plugin that intercepts `client.query()` to transform SQL per-request.

**Exports:**
- `PgMultiTenancyWrapperPlugin: GraphileConfig.Plugin`

**Internal functions:**
- `createSqlTransformProxy<T>(client, transform)` — Proxy wrapping `query()` and `withTransaction()`
- `wrapWithPgClient(original, contextValue)` — lazy wrapper that reads `pgSqlTextTransform` at call time

**Behavior:**
1. Runs in `grafast.middleware.prepareArgs` (after `PgContextPlugin`)
2. Iterates all `pgServices`, wraps each `withPgClient` function on `contextValue`
3. At execution time, reads `contextValue.pgSqlTextTransform`
4. If transform exists: proxy `client.query()` to transform `opts.text`
5. If no transform: pass through unchanged
6. Also wraps `client.withTransaction()` for transaction-scoped queries

**Dependencies:** None (pure Grafast plugin, no external imports)

### 2. `multi-tenancy-cache.ts`

**Purpose:** Top-level orchestrator — owns the full tenant lifecycle including the `tenantInstances` Map.

**Exports:**
- `configureMultiTenancyCache({ basePresetBuilder })` — one-time package bootstrap; stores wrapped preset builder internally.
- `getOrCreateTenantInstance(config)` → `Promise<TenantInstance>` — resolves tenant, stores in internal `tenantInstances` map. Uses the package-owned wrapped preset builder configured at bootstrap.
- `getTenantInstance(cacheKey)` → `TenantInstance | undefined` — fast-path lookup from internal map
- `flushTenantInstance(cacheKey)` — evict from `tenantInstances` map + deregister from template refCount
- `getMultiTenancyCacheStats()` → `MultiTenancyCacheStats`
- `shutdownMultiTenancyCache()` — release all resources (templates, dedicated instances, introspection cache, tenantInstances)
- Types: `TenantConfig`, `TenantInstance`, `MultiTenancyCacheStats`

**Internal state:**
- `tenantInstances: Map<string, TenantInstance>` — fast-path cache of resolved tenant instances
- `creatingTenants: Map<string, Promise<TenantInstance>>` — single-flight for tenant creation
- `creatingTemplates: Map<string, Promise<RegistryTemplate>>` — single-flight for template creation
- `dedicatedInstances: Map<string, {...}>` — fallback non-shared instances, tracked with lifecycle metadata (createdAt, lastUsedAt, source=introspection-failure)

**Flow (getOrCreateTenantInstance):**
1. Check `tenantInstances` map (fast path) → return if hit
2. Check `creatingTenants` map (single-flight coalesce) → wait if in-flight
3. `getOrCreateIntrospection(pool, schemas, connectionKey)` → fingerprint
4. `getTemplate(fingerprint)` → hit? → reuse, `registerTenant()`
5. Miss → check `creatingTemplates` (single-flight for template)
6. Miss → `createTemplate()` (builds PostGraphile instance, `setTemplate()`)
7. Build `TenantInstance` with `buildSchemaRemapTransform()` as `sqlTextTransform`
8. Store in `tenantInstances` map → return

**Preset wrapping (package-owned):**
`configureMultiTenancyCache()` wraps the base preset builder once to add:
1. `plugins: [PgMultiTenancyWrapperPlugin]`
2. `grafast.context` callback that reads `svc_key` from `requestContext.expressv4.req.svc_key`, looks up the tenant's `sqlTextTransform` from the internal `tenantInstances` map, and injects it as `pgSqlTextTransform` on the Grafast context — **no `req.sqlTextTransform` field needed on Express.Request**

**Fallback:** If introspection fails, creates a dedicated (non-shared) instance (resilience over visibility).
Fallback instances MUST be lifecycle-bound: cleaned by `flushTenantInstance()`, swept by idle TTL/LRU, and always released by `shutdownMultiTenancyCache()` so they cannot linger after cache flush/eviction.

**Dependencies:** `introspection-cache`, `registry-template-map`, `utils/sql-transform`, `utils/schema-map`, `postgraphile`, `grafserv`, `express`

### 3. `registry-template-map.ts`

**Purpose:** Global template registry with lifecycle management.

**Exports:**
- `getTemplate(fingerprint)` → `RegistryTemplate | undefined`
- `setTemplate(fingerprint, template)`
- `registerTenant(cacheKey, fingerprint)` — increment refCount
- `deregisterTenant(cacheKey)` — decrement refCount, mark idle
- `sweepIdleTemplates()` — evict expired + over-cap templates
- `clearAllTemplates()` — shutdown cleanup
- `getTemplateStats()` — diagnostic stats
- `_testSetMaxTemplates(n)` — test-only hook
- Type: `RegistryTemplate`

**Eviction policy:**
- **TTL:** Templates with `refCount === 0` and `idleSince` older than 30min are evicted
- **LRU cap:** When `templateMap.size > MAX_TEMPLATES` (50), oldest idle templates evicted first
- **Periodic sweep:** Every 5min (lazy-started, `unref()`'d for clean exit)
- **Active protection:** Templates with `refCount > 0` are never evicted
- **Cleanup:** `disposeTemplate()` calls `pgl.release()` + `httpServer.close()`

### 4. `introspection-cache.ts`

**Purpose:** In-memory cache for parsed introspection results + fingerprints.

**Exports:**
- `getOrCreateIntrospection(pool, schemas, connectionKey)` → `Promise<CachedIntrospection>`
- `invalidateIntrospection(connectionKey, schemas?)` — targeted invalidation
- `clearIntrospectionCache()` — full clear + stop sweep timer
- `sweepIntrospectionCache()` — evict expired + over-cap entries
- `getIntrospectionCacheStats()` → `IntrospectionCacheStats`
- `_testSetMaxEntries(n)` — test-only hook
- Types: `CachedIntrospection`, `IntrospectionCacheStats`

**Key:** `connHash:schema1,schema2` (schemas sorted alphabetically)
`connHash` is derived from normalized connection identity:
- `host`, `port`, `database`, `user` (and connection mode such as `sslmode`/socket when relevant)
- Canonicalized + hashed to avoid leaking credentials while preventing cross-environment collisions.

**Eviction policy:** Same pattern as template cache — TTL (30min idle) + LRU cap (100 entries) + periodic sweep (5min).

**Single-flight:** `inflight` Map coalesces concurrent requests. `finally` block guarantees cleanup. Failed entries are NOT cached.

### 5. `utils/fingerprint.ts`

**Purpose:** Schema-name-agnostic structural fingerprinting.

**Exports:**
- `getSchemaFingerprint(introspection, schemaNames?)` → SHA-256 hex string
- `fingerprintsMatch(a, b)` → boolean
- Types: `MinimalIntrospection`, `IntrospectionClass`, `IntrospectionAttribute`, `IntrospectionConstraint`, `IntrospectionType`, `IntrospectionNamespace`, `IntrospectionProc`

**What's included in fingerprint:** Table names, column names, data types, constraints, function signatures.

**What's excluded:** Schema/namespace names, OIDs, instance-specific identifiers. This ensures `t_1_services_public.apis` and `t_2_services_public.apis` produce the same fingerprint.

### 6. `utils/sql-transform.ts`

**Purpose:** SQL remap engine with AST-safe rewrite and cache-backed fast path.

**Exports:**
- `buildSchemaRemapTransform(schemaMap)` → `(text: string) => string`

**How it works:**
1. Computes a cache key from `(sqlTextHash, schemaMapHash)`
2. On cache hit: returns pre-rewritten SQL immediately (hot path)
3. On cache miss: `parse -> rewrite semantic schema nodes -> deparse`
4. Stores rewritten SQL in LRU/TTL cache for subsequent hits
5. Empty schema map → identity function (no-op)

### SQL Remap Safety Contract (v3)

The SQL remap layer MUST follow these rules:

1. **Semantic rewrite only**
- Rewrite schema names via PostgreSQL AST node fields (e.g. relation namespace/schema), not global text substitution.
- Do not rewrite literals, comments, dollar-quoted blocks, aliases, or unqualified identifiers.

2. **Fail-closed by default**
- If parse/rewrite/deparse fails, do not silently pass-through the original SQL.
- Default behavior is request failure with structured error and telemetry.
- Optional rollout mode may fallback to dedicated handler, but must be explicitly enabled and metered.

3. **Cache-backed performance model**
- Hot path is cache lookup only.
- AST parse/rewrite/deparse occurs only on cache miss.
- Cache policy: bounded LRU + TTL.

4. **Observability requirements**
- Emit counters/histograms for hit/miss, rewrite latency, rewrite failures, and fallback usage (if enabled).
- Include tenant key and SQL hash in sampled debug logs.

5. **Validation requirements**
- Tests must prove that schema-qualified identifiers are remapped correctly.
- Tests must prove literals/comments/dollar-quoted content are unchanged.
- Transaction path (`withTransaction`) must apply identical remap behavior.

### 7. `utils/schema-map.ts`

**Purpose:** Schema mapping and pgSettings helpers.

**Exports:**
- `buildSchemaMap(templateSchemas, tenantSchemas)` → `Record<string, string>`
- `buildTenantPgSettings(tenantSchemas)` → `Record<string, string>` (includes `search_path`)
- `remapSchemas(templateSchemas, templatePrefix, tenantPrefix)` → `string[]`
- Type: `SchemaMapping`

### 8. `utils/introspection-query.ts`

**Purpose:** Low-level introspection fetch + parse.

**Exports:**
- `fetchIntrospection(pool, schemas)` → raw JSON string
- `parseIntrospection(text)` → `MinimalIntrospection`
- `fetchAndParseIntrospection(pool, schemas)` → `{ raw, parsed }`

**Connection safety:** Uses `BEGIN` + `SET LOCAL search_path` + `COMMIT` so the search_path never leaks to pooled connections.

---

## Server integration

The server is a thin consumer of the package APIs. It does **not** manage tenant
state, preset wrapping logic, or Express.Request extensions — those responsibilities
belong to the package.

### `graphile.ts` changes

**New function: `multiTenancyHandler(opts)`**
- Selected when `opts.api.useMultiTenancyCache === true`
- Calls `configureMultiTenancyCache({ basePresetBuilder })` once at startup (package owns wrapping)
- Calls `getTenantInstance(key)` for fast-path cache hit
- On miss, calls `getOrCreateTenantInstance(config)` — no preset builder passed from server
- Routes the request to `tenant.handler(req, res, next)` — the package's Grafast context callback handles `pgSqlTextTransform` injection internally (no `req.sqlTextTransform` needed)

**New exports:**
- `isMultiTenancyCacheEnabled(opts)` — boolean check
- `shutdownMultiTenancy()` — calls package's `shutdownMultiTenancyCache()`

**No changes to `types.ts`** — `Express.Request` is NOT extended with `sqlTextTransform`. The transform is injected directly into the Grafast context by the package's preset builder using the existing `req.svc_key`.

### `flush.ts` changes

**New function: `createFlushMiddleware(opts)`**
- Replaces `flush` (deprecated but kept for backwards compat)
- Calls package's `flushTenantInstance(key)` + `invalidateIntrospection(connectionKey)`

**`flushService()` changes:**
- When multi-tenancy enabled: resolves canonical `connectionKey` from `databaseId`, calls `invalidateIntrospection(connectionKey)` + `flushTenantInstance(key)` for each matching domain
- Flush path must also release any tenant-bound fallback dedicated instances immediately.

### `env.ts` + `graphile.ts` (types) changes

- Add `USE_MULTI_TENANCY_CACHE` env var → `api.useMultiTenancyCache: boolean`
- Default: `false` (opt-in)

---

## Activation

```bash
# Enable multi-tenancy cache
USE_MULTI_TENANCY_CACHE=true

# For old (dedicated) mode, enlarge cache to avoid eviction churn:
# GRAPHILE_CACHE_MAX=<K×6> where K = tenant count (min 100)
```

When `useMultiTenancyCache` is `false` (default), the server uses the existing `graphile-cache` (one PostGraphile instance per `svc_key`) — zero behavioral change.

---

## Dependencies

```json
{
  "dependencies": {
    "@pgpmjs/logger": "workspace:^",
    "express": "^5.2.1",
    "grafserv": "1.0.0",
    "graphile-config": "1.0.0",
    "pg": "^8.11.3",
    "pg-env": "workspace:^",
    "pg-introspection": "1.0.0",
    "pgsql-deparser": "^17.18.2",
    "pgsql-parser": "^17.9.14",
    "postgraphile": "5.0.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.6",
    "@types/pg": "^8.10.9",
    "makage": "^0.3.0",
    "ts-node": "^10.9.2"
  }
}
```

No Crystal fork. No `link:` overrides. Works with published Crystal/PostGraphile packages.

---

## Test plan

### Unit tests (in `src/__tests__/`)

| Test file | Coverage |
|---|---|
| `pg-client-wrapper-plugin.test.ts` | Proxy intercepts query/withTransaction, lazy transform read, no-op passthrough, release preservation |
| `registry-template-map.test.ts` | register/deregister refCount, TTL eviction, LRU cap eviction, active-template protection, sweep timer, exact-cap boundary |
| `introspection-cache.test.ts` | Cache hit/miss, single-flight coalescing, failure retry, TTL eviction, LRU cap eviction, invalidation |
| `fingerprint.test.ts` | Same-structure-different-schema → same fingerprint, different-structure → different fingerprint, constraint normalization |
| `sql-transform.test.ts` | AST schema-node rewrite, cache hit/miss path, identity transform, multi-schema remap, literal/comment non-rewrite |
| `schema-map.test.ts` | Schema mapping, pgSettings generation, prefix remapping |
| `single-flight.test.ts` | Concurrent creation coalescing, failure propagation |

### E2E validation

- Start server with `USE_MULTI_TENANCY_CACHE=true`
- Send requests for k tenants with identical schemas
- Assert: 0 errors, template count = 1, all tenants sharing
- Compare QPS/latency/memory vs dedicated mode
- Run a **fresh 3-minute benchmark** on the v3 no-Crystal path; do not reuse v2 data
- Store raw benchmark JSON + environment metadata under `graphql/server/perf/results/`

---

## Historical v2 baseline (reference only, k=20)

| Metric | Dedicated (Old) | Multi-tenant (New) | Improvement |
|---|---|---|---|
| QPS | 706 | 780 | +10.5% |
| p50 latency | 11ms | 11ms | same |
| p99 latency | 42ms | 29ms | -31% |
| Heap growth | +1,276 MB | +334 MB | 73.8% less |
| RSS growth | +1,697 MB | +845 MB | 50.2% less |
| PostGraphile builds | 20 | 0 | eliminated |
| Cold start (2nd+) | 412ms | 7ms | 98.3% faster |

This table is historical context from v2 only; it is **not** acceptance evidence for v3.

## v3 performance acceptance (required, no-Crystal path)

Acceptance MUST be based on fresh v3 benchmark runs using published Crystal/PostGraphile packages (no Crystal fork, no `link:` overrides):

1. Benchmark duration: minimum **3 minutes** continuous load per mode (dedicated vs v3 multi-tenancy cache).
2. Correctness gate: 0 request errors and expected tenant routing behavior.
3. Performance gate: v3 multi-tenancy cache must show measurable improvement vs dedicated mode in at least one primary metric (QPS or p99 latency), without material regressions in stability.
4. Resource gate: memory growth (heap/RSS) in v3 multi-tenancy cache must be no worse than dedicated mode under the same run conditions.
5. Provenance gate: attach raw result files and run metadata (commit SHA, env flags, tenant count, concurrency, duration) in `graphql/server/perf/results/`.

*Old mode given `GRAPHILE_CACHE_MAX=120` (best-case, zero eviction).*

---

## Implementation order

1. **Package scaffolding** — `package.json`, tsconfig, jest config
2. **Utilities** — `utils/fingerprint.ts`, `utils/sql-transform.ts`, `utils/schema-map.ts`, `utils/introspection-query.ts`
3. **Cache layers** — `introspection-cache.ts`, `registry-template-map.ts`
4. **Plugin** — `pg-client-wrapper-plugin.ts`
5. **Orchestrator** — `multi-tenancy-cache.ts`
6. **Public API** — `index.ts`
7. **Server integration** — `middleware/graphile.ts`, `flush.ts`, `env.ts`, `types/graphile.ts`, `server.ts`, `index.ts`
8. **Tests** — unit tests for all modules
9. **Benchmark scripts** — `graphql/server/perf/` (e2e load testing framework)
10. **Validation** — e2e test run
