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


Heap-budgeted PostGraphile v5 instance cache with request draining, serialized
build admission, and explicit PostgreSQL pool ownership.

## Installation

```bash
npm install graphile-cache pg-cache
```

`graphile-cache` uses `pg-cache` leases to keep each resident instance's exact
runtime pool alive until the instance has fully drained and shut down.

## Features

- Heap-derived residency limits plus an optional process-RSS admission ceiling
- Request-aware eviction that never tears down an instance in use
- Awaited HTTP, realtime, PostGraphile, and pool-lease teardown
- Memory-pressure refusal and eviction counters
- Exact pool identities protected by reference-counted `pg-cache` leases

## How It Works

Long-lived callers acquire a `PgPoolLease`, configure PostGraphile with the
lease's pool, and pass the same lease to `createGraphileInstance()`. Ownership
transfers to the returned entry only when that promise resolves. If creation
rejects, the caller still owns the lease and must release it.

Eviction marks the entry as disposing, waits for its requests to drain, closes
the HTTP server, stops realtime delivery, attempts `pgl.release()`, and finally
releases the pool lease. Every teardown stage is attempted even when an earlier
stage fails, and duplicate disposal calls share one promise.

## Usage

### Creating a leased instance

```typescript
import {
  createGraphileInstance,
  disposeUncachedEntry,
  graphileCache
} from 'graphile-cache';
import { acquirePgPool } from 'pg-cache';

const cacheKey = 'tenant-id:api-id:build-contract-hash';
const lease = acquirePgPool(
  { database: 'tenant_database' },
  { purpose: 'runtime', sanitizeOnCheckout: true }
);

// Application code builds this preset with makePgService({ pool: lease.pool,
// schemas: ['tenant_api'] }) and its exact plugin/settings contract.
const preset = makePreset(lease.pool);
let entry;
try {
  entry = await createGraphileInstance({
    preset,
    cacheKey,
    poolLease: lease,
    poolIdentity: lease.identity,
    enableRealtime: true,
    realtimeSchema: 'tenant_a_realtime',
    realtimeSourceSchemas: ['tenant_api']
  });
} catch (error) {
  // Creation rejected before ownership transfer.
  lease.release();
  throw error;
}

// Creation resolved, so disposal must now release the entry-owned lease if
// admission or publication fails.
try {
  graphileCache.set(cacheKey, entry);
} catch (error) {
  await disposeUncachedEntry(entry, cacheKey);
  throw error;
}
```

`poolIdentity` is optional when `poolLease` is present because the lease identity
becomes the entry's authoritative identity. Supplying both with different values
fails before ownership transfers.

### Serving and eviction

```typescript
import {
  deleteGraphileCacheEntry,
  graphileCache,
  invokeEntryHandler
} from 'graphile-cache';

const entry = graphileCache.get(cacheKey);
if (entry && invokeEntryHandler(entry, req, res, next)) {
  return;
}

// Resolves only after teardown and pool-lease release complete.
await deleteGraphileCacheEntry(cacheKey, 'manual');
```

Use `invokeEntryHandler()` for resident traffic so disposal can observe in-flight
requests. A false return means the entry has started draining; route the request
through normal cache-miss/build admission instead.

### Shared exact-topic realtime

`sharedRealtime` is an opt-in build-time seam. The caller installs one
`ActivatableGenerationScopedRealtimeSubscriber` in the PostGraphile service,
collects the exact physical `@realtime` topics during schema construction, and
supplies a dedicated least-privilege listener login. Instance creation audits
that login on the broker's pinned client, acquires only those topics, and
activates the subscriber before the entry can be published. Audit and LISTEN
therefore remain safe when the notification pool has `max: 1`.

One canonical host/port/database target may have only one active opaque listener
identity and role. TLS remains part of that listener identity, so a TLS,
credential, or pool-contract change fails closed while the old generation is
resident instead of opening a second listener and silently reducing density;
rotate by invalidating and draining the old generations first. Resolver output
must use stable canonical connection target values, because two DNS aliases for
the same server cannot be proven to name one physical database in-process.

Successful role audits have an explicit TTL. One unref'ed timer per exact
listener identity proactively re-audits idle subscriptions, while HTTP and
WebSocket operation boundaries use the same coalesced refresh as an immediate
gate. Broker termination and privilege drift latch every affected generation
unavailable. The timer is cancelled after the last generation releases. The
default realtime mode remains the dedicated PostGraphile subscriber.

### Graceful Shutdown

```typescript
import { closeAllCaches } from 'graphile-cache';

// Drains Graphile entries first, then closes the remaining pg-cache pools.
process.on('SIGTERM', async () => {
  await closeAllCaches();
  process.exit(0);
});
```

## API Reference

### Main lifecycle APIs

- `createGraphileInstance(options)` creates a ready PostGraphile entry and
  accepts an optional retained `PgPoolLease`. Realtime callers may provide the
  exact cursor-function schema through `realtimeSchema`; omission preserves the
  `realtime_public` compatibility default. Realtime also requires exact
  `realtimeSourceSchemas`; a foreign cursor row stops delivery before any row
  in that batch is emitted. Cursor node IDs combine a process-unique replica
  identity with the exact cache contract so replicas cannot share cursor state.
  A fatal delivery-integrity failure latches that exact generation unhealthy;
  the next request receives `503 GRAPHILE_REALTIME_UNAVAILABLE`, never enters
  its Graphile handler, and identity-checks the generation before retiring it
  so a later request can rebuild without risking a healthy replacement.
- `invokeEntryHandler(entry, req, res, next)` tracks a request against an exact
  resident entry.
- `deleteGraphileCacheEntry(key, reason)` evicts and awaits teardown.
- `clearGraphileCache()` evicts and awaits every resident entry.
- `closeAllCaches()` drains Graphile entries, then closes `pg-cache`.

### Capacity and observability

- `prepareCacheForBuild()` serializes admission with awaited eviction.
- `getCacheConfig()` reports the heap-derived capacity and calibration sources.
- `getCacheStats()` reports residency, realtime-unhealthy generations,
  aggregate credential-free listener-role attestation health, unique active
  broker identities, and monotonic catalog-audit attempts/failures. Generation
  references are reported separately, so three API surfaces sharing one role
  audit don't triple-count its database QPS.
- `getCacheCounters()` reports monotonic admitted/completed HTTP and WebSocket
  lifecycles alongside evictions, disposal failures, and build refusals. The
  lifecycle counters make short-lived work observable even when both ends fall
  between two state snapshots.
- `startMemoryGovernor()` starts pressure-driven idle eviction and returns an
  idempotent stop callback.

`GRAPHILE_CACHE_MAX` caps Graphile build contracts by heap budget.
`GRAPHILE_CACHE_ADMISSION_MODE=preserve-resident` makes that ceiling a strict
admission boundary: a new contract receives `resident_capacity` without
evicting an existing resident. The default, `evict-idle`, retains the ordinary
LRU replacement behavior.
`GRAPHILE_CACHE_RSS_LIMIT_BYTES` adds a fail-closed process-RSS ceiling, and
admission reserves `GRAPHILE_CACHE_RSS_BUILD_RESERVE_BYTES` (768 MiB by
default) above current RSS before starting a build. When the RSS ceiling is not
set, RSS remains present in cache pressure telemetry but does not constrain
admission. `PG_CACHE_MAX`
caps PostgreSQL connection identities, which may include runtime, control-plane,
listener, and diagnostic pools. They are independent limits: a resident entry's
lease prevents ordinary pool LRU or TTL eviction, and acquiring a new identity
fails closed when every registry slot is leased.

The LRU's internal ceiling scales with the configured V8 heap (one sparse slot
per 256 KiB, bounded from 1,024 to 65,536). It is only a backing-structure
limit; measured instance cost, server/build reserves, and live pressure still
decide how many entries may become resident.

## Pool disposal integration

The package still registers a `pg-cache` cleanup callback as a fail-safe for
legacy unleased entries and explicit process-wide shutdown. Normal resident
lifetime is lease-driven: Graphile disposal releases the lease, after which
`pg-cache` may evict or expire the now-idle pool identity.
