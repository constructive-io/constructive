# graphile-multi-tenancy-cache

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/graphile-multi-tenancy-cache"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-multi-tenancy-cache%2Fpackage.json"/></a>
</p>

Multi-tenancy cache utilities for PostGraphile. This package implements exact-match buildKey-based handler reuse for Constructive's GraphQL server runtime.

The runtime model is intentionally conservative:

- reuse handlers only when build inputs match exactly
- no template sharing
- no SQL rewrite
- no fingerprint-based handler reuse

## Table of contents

- [Installation](#installation)
- [Usage](#usage)
- [Features](#features)
- [Core concepts](#core-concepts)
- [How the handler cache works](#how-the-handler-cache-works)
- [API](#api)
- [License](#license)

## Installation

```bash
npm install graphile-multi-tenancy-cache
```

## Usage

This package is a runtime orchestrator, not a schema plugin. You configure it with a preset builder, then resolve handlers per request.

```typescript
import {
  configureMultiTenancyCache,
  getTenantInstance,
  getOrCreateTenantInstance,
  flushTenantInstance,
  shutdownMultiTenancyCache,
} from 'graphile-multi-tenancy-cache';

configureMultiTenancyCache({
  basePresetBuilder(pool, schemas, anonRole, roleName) {
    return {
      extends: [],
      grafast: {
        context: () => ({})
      },
      pgServices: [],
    };
  },
});

async function handleGraphql(req, res) {
  const svcKey = req.svc_key;

  let tenant = getTenantInstance(svcKey);
  if (!tenant) {
    tenant = await getOrCreateTenantInstance({
      svcKey,
      pool: req.pgPool,
      schemas: req.api.schema,
      anonRole: req.api.anonRole,
      roleName: req.api.roleName,
      databaseId: req.api.databaseId,
    });
  }

  tenant.handler(req, res);
}

process.on('SIGTERM', async () => {
  await shutdownMultiTenancyCache();
});
```

## Features

- **Exact-match buildKey reuse** — handlers are shared only when connection identity, schema set, and role inputs match exactly
- **Request-key indirection** — `svc_key` remains the routing and flush key while `buildKey` becomes the handler identity
- **Single-flight creation** — concurrent requests for the same `buildKey` coalesce onto one in-flight handler build
- **Safe rebinding** — reassigning a `svc_key` to a new `buildKey` cleans up unreachable handlers and stale indexes
- **Targeted flush APIs** — evict by `svc_key` or by `databaseId`
- **Handler lifecycle management** — graceful disposal and full shutdown support
- **Diagnostics-friendly** — exposes cache stats and `svc_key -> buildKey` lookup helpers

## Core concepts

| Concept | Meaning |
|--------|---------|
| `svc_key` | Request routing key. Used to look up which cached handler the current request should hit. |
| `buildKey` | Handler identity. A canonical string computed from the inputs that materially affect Graphile instance construction. |
| `databaseId` | Metadata/flush key. Used to evict all handlers associated with a database. |

### What goes into the buildKey

`buildKey` is computed from:

- connection identity
- schema list
- `anonRole`
- `roleName`

It does **not** include:

- `svc_key`
- `databaseId`
- request host/domain
- auth tokens or transient headers

The value is stored as a canonical plain-text key rather than a truncated hash, so different build inputs cannot collide onto the same handler key.

Schema order is preserved. `['a', 'b']` and `['b', 'a']` intentionally produce different buildKeys.

## How the handler cache works

At runtime the cache maintains three main indexes:

- `buildKey -> TenantInstance`
- `svc_key -> buildKey`
- `databaseId -> Set<buildKey>`

The flow is:

1. Compute the `buildKey` from pool identity, schemas, and role inputs.
2. Check the handler cache for an existing `buildKey`.
3. If another request is already building that handler, await the shared promise.
4. If no handler exists, create a fresh PostGraphile instance.
5. Register the `svc_key -> buildKey` mapping only after creation succeeds.

This means:

- different request keys can share one handler when build inputs are identical
- failed in-flight creation does not leave orphaned mappings
- stale `svc_key` rebindings can be evicted cleanly

### Fast path vs slow path

- **Fast path**: `svc_key -> buildKey -> TenantInstance`
- **Slow path**: compute `buildKey`, create/coalesce handler, then register mapping

### Flush and shutdown

The package supports:

- flushing one routed tenant by `svc_key`
- flushing all handlers associated with a `databaseId`
- full shutdown and disposal of cached handlers

## API

| Export | Purpose |
|--------|---------|
| `configureMultiTenancyCache(config)` | Registers the base preset builder. Must be called before handler creation. |
| `getTenantInstance(svcKey)` | Fast-path lookup via `svc_key`. |
| `getOrCreateTenantInstance(config)` | Resolve or create a handler for a request. |
| `flushTenantInstance(svcKey)` | Evict the handler currently mapped to a route key. |
| `flushByDatabaseId(databaseId)` | Evict all handlers associated with a database. |
| `getMultiTenancyCacheStats()` | Return cache/index counts for diagnostics. |
| `shutdownMultiTenancyCache()` | Dispose handlers and clear all internal state. |
| `computeBuildKey(pool, schemas, anonRole, roleName)` | Compute the exact-match handler identity. |
| `getBuildKeyForSvcKey(svcKey)` | Resolve the buildKey currently mapped to a route key. |

## License

MIT
