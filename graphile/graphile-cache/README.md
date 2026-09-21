# graphile-cache

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/graphile-cache"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-cache%2Fpackage.json"/></a>
</p>


PostGraphile instance LRU cache with automatic cleanup when PostgreSQL pools are disposed.

## Installation

```bash
npm install graphile-cache pg-cache
```

Note: This package depends on `pg-cache` for the PostgreSQL pool management.

## Features

- LRU cache for PostGraphile instances
- Automatic cleanup when associated PostgreSQL pools are disposed
- Integrates seamlessly with `pg-cache`
- Service cache re-exported for convenience
- TypeScript support

## How It Works

When you import this package, it automatically registers a cleanup callback with `pg-cache`. When a PostgreSQL pool is disposed, any PostGraphile instances using that pool are automatically removed from the cache.

## Usage

### Exact build identity

The GraphQL server and Explorer cache by `createGraphileBuildCacheKey(domain,
snapshot)`. A key includes the effective build inputs, the exact pool reference,
and the configuration owner. Server and Explorer use separate domains. Plain
data is copied with `snapshotGraphileBuildValue` before it is used for both the
fingerprint and the preset; opaque objects and functions retain reference
identity. Keys are HMAC fingerprints with a process-local secret and must not be
persisted or compared across processes.

Entries carry `serviceKey`, `databaseId` (when known), and `poolKey` separately
from the fingerprint. Use `clearGraphileEntriesForService`,
`clearGraphileEntriesForDatabase`, or `clearGraphileEntriesForPool` to invalidate
all build variants for that owner. Pool cleanup matches `poolKey` exactly.

### Resident admission

Server and Explorer builds use `buildAdmittedGraphileInstance(metadata, factory)`.
It reserves capacity before the factory allocates services, waits for an evicted
entry's public release interfaces, and publishes only after the ready result passes its heap check.
Upstream background UNLISTEN/client return is outside that public release boundary.
The count includes reservations, residents, and disposal in progress. A disposal
failure blocks further admission instead of treating uncertain resources as free.
This process-wide fence requires a process restart. Disposal counters track pending
work and can reach zero after a rejected release; neither emptying the cache nor
reconfiguring limits proves that the failed release reclaimed its resources.
The public release interfaces provide no verified retry-completion signal, so
automatically reopening admission would abandon the capacity guarantee.

`configureGraphileAdmission` accepts `max`, `heapMaxBytes`, and
`buildReserveBytes`. The server exposes these as `graphile.cache` options and
`GRAPHILE_CACHE_MAX`, `GRAPHILE_CACHE_HEAP_MAX_BYTES`, and
`GRAPHILE_CACHE_BUILD_RESERVE_BYTES`. Defaults retain the existing LRU ceiling,
use 85% of the V8 heap limit as a watermark, and reserve 64 MiB per pending build.
Multiple owners in one process use the strictest limits. This is a conservative
process-heap admission check, not an exact per-instance memory measurement or an
RSS limit; garbage collection may delay admission after eviction. Raw
`graphileCache.set` is a low-level API and does not reserve capacity.

### Exact-key build flights

Server and Explorer use the shared `graphileBuildFlights.getOrCreate` owner.
It registers a flight synchronously, shares its promise for an exact build key,
and publishes through resident admission only after readiness. A failed flight
is shared with its current callers; a later request may start a new attempt.
There is no implicit retry by joined callers.

Preparation scopes fence asynchronous metadata lookup before the exact key is
known. Service/database/pool invalidation, key deletion, and cache clear fence
old work before removing residents. Late results are disposed instead of
published, and cannot erase a replacement flight. Closing caches rejects callers
promptly while draining the underlying work and its cleanup before pool close.
`reopenGraphileBuilds` only reopens a fully drained registry.

### Global build coordination

Every unique admitted build runs through one process-wide coordinator. It uses
one active permit and a bounded FIFO queue (default 16); same-key callers join
the existing flight without consuming another queue slot. The permit covers
capacity admission and eviction waits, preset allocation, readiness, publication,
and failed-generation cleanup. Overflow refuses work before admission.

`graphile.build` / `configureGraphileBuilds` configure `queueMax`, `watchdogMs`
(default 300000), and `shutdownTimeoutMs` (default 30000). Corresponding environment
variables are `GRAPHILE_BUILD_QUEUE_MAX`, `GRAPHILE_BUILD_WATCHDOG_MS`, and
`GRAPHILE_BUILD_SHUTDOWN_TIMEOUT_MS`. Multiple owners retain the strictest limits;
active work cannot have its watchdog policy changed.

The watchdog fences publication before rejecting active and queued callers. It
cannot cancel JavaScript work: the permit and any reservation remain owned until
the actual task and cleanup settle. Watchdog, drain timeout, or failed cleanup
permanently makes the coordinator unavailable; process restart is required.
`closeGraphileBuilds` returns false if its single deadline expires, and
`closeAllCaches` throws without closing pools in that case. Server cache shutdown
fences builds before waiting for HTTP requests that may be awaiting those builds.
This is build drain; full request and WebSocket retirement is a separate concern.

### Basic Usage

```typescript
import { graphileCache, GraphileCache } from 'graphile-cache';
import { getPgPool } from 'pg-cache';
import { postgraphile } from 'postgraphile';

// Create a PostGraphile instance
const pgPool = getPgPool({ database: 'mydb' });
const handler = postgraphile(pgPool, 'public', {
  // PostGraphile options
});

// Cache it
const cacheEntry: GraphileCache = {
  pgPool,
  pgPoolKey: 'mydb',
  handler
};

graphileCache.set('mydb.public', cacheEntry);

// Retrieve it later
const cached = graphileCache.get('mydb.public');
if (cached) {
  // Use cached.handler
}
```

### Automatic Cleanup

The cleanup happens automatically:

```typescript
import { pgCache } from 'pg-cache';
import { graphileCache } from 'graphile-cache';

// Add entries
graphileCache.set('mydb.public', { pgPoolKey: 'mydb', ... });
graphileCache.set('mydb.private', { pgPoolKey: 'mydb', ... });

// When the pool is removed...
pgCache.delete('mydb');

// Both graphile entries are automatically cleaned up!
console.log(graphileCache.has('mydb.public')); // false
console.log(graphileCache.has('mydb.private')); // false
```

### Complete Example

```typescript
import { graphileCache, GraphileCache } from 'graphile-cache';
import { getPgPool } from 'pg-cache';
import { postgraphile } from 'postgraphile';

function getGraphileInstance(database: string, schema: string): GraphileCache {
  const key = `${database}.${schema}`;
  
  // Check cache first
  const cached = graphileCache.get(key);
  if (cached) {
    return cached;
  }
  
  // Create new instance
  const pgPool = getPgPool({ database });
  const handler = postgraphile(pgPool, schema, {
    graphqlRoute: '/graphql',
    graphiqlRoute: '/graphiql',
    // other options...
  });
  
  const entry: GraphileCache = {
    pgPool,
    pgPoolKey: database,
    handler
  };
  
  // Cache it
  graphileCache.set(key, entry);
  return entry;
}

// Use in Express
app.use((req, res, next) => {
  const { handler } = getGraphileInstance('mydb', 'public');
  handler(req, res, next);
});
```

### Graceful Shutdown

```typescript
import { closeAllCaches } from 'graphile-cache';

// This closes all caches including pg pools
process.on('SIGTERM', async () => {
  await closeAllCaches();
  process.exit(0);
});
```

## API Reference

### graphileCache

The main PostGraphile instance cache.

- `get(key: string): GraphileCache | undefined` - Get a cached instance
- `set(key: string, value: GraphileCache): void` - Cache an instance
- `has(key: string): boolean` - Check if an instance is cached
- `delete(key: string): void` - Remove an instance
- `clear(): void` - Remove all instances

### GraphileCache Interface

```typescript
interface GraphileCache {
  pgPool: pg.Pool;
  pgPoolKey: string;
  handler: HttpRequestHandler;
}
```

### closeAllCaches()

Closes all caches including the service cache, graphile cache, and all PostgreSQL pools.

### svcCache

Re-exported from `pg-cache` for convenience.

## Integration Details

The integration with `pg-cache` happens automatically when this module is imported. The cleanup callback is registered immediately, ensuring that PostGraphile instances are cleaned up whenever their associated PostgreSQL pools are disposed.

This design ensures:
- No memory leaks from orphaned PostGraphile instances
- Automatic cleanup without manual intervention
- Loose coupling between packages
