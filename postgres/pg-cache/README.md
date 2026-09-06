# pg-cache

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/pg-cache"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=postgres%2Fpg-cache%2Fpackage.json"/></a>
</p>

PostgreSQL connection pool LRU cache manager with zero PostGraphile dependencies.

## Installation

```bash
npm install pg-cache
```

## Features

- Lease-aware LRU registry for PostgreSQL connection pools
- Fail-closed capacity admission for long-lived production consumers
- Automatic pool cleanup and disposal
- Pool identity, lease, and disposal observability
- Checkout queue/sanitation timing and fast-path counters
- Extensible cleanup callback system
- Service cache for general use
- Graceful shutdown handling
- TypeScript support

## Usage

### Basic Pool Management

```typescript
import { pgCache, getPgPool } from 'pg-cache';

// Get or create a cached pool
const pool = getPgPool({
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'postgres',
  password: 'password'
});

// Use the pool
const result = await pool.query('SELECT NOW()');

// Pool is automatically cached and reused
const samePool = getPgPool({ database: 'mydb' }); // Returns cached pool
```

`getPgPool()` remains the synchronous compatibility API. A component that keeps
a pool across requests or asynchronous lifecycle boundaries should hold a lease:

```typescript
import { acquirePgPool, PgPoolCapacityError } from 'pg-cache';

try {
  const lease = acquirePgPool(
    { database: 'tenant_a', user: 'graphql_runtime' },
    { purpose: 'runtime', sanitizeOnCheckout: true }
  );

  // Retain lease.pool for the owning handler or request lifecycle.
  // release() is idempotent and must run only after the owner has drained.
  lease.release();
} catch (error) {
  if (error instanceof PgPoolCapacityError) {
    // Map error.code === 'PG_POOL_CAPACITY' to HTTP 503 and Retry-After.
  }
}
```

Acquisition is synchronous and atomic. Reusing an existing exact identity costs
no new slot; a new identity evicts only an unleased pool. If every slot is
leased, admission throws before constructing a pool or ending an existing one.

Sanitized default-driver pools issue `DISCARD ALL` before every reused checkout
and clear node-postgres/Graphile prepared-statement bookkeeping. The first
checkout of a brand-new factory-owned connection skips that redundant round
trip only when its trusted startup baseline is pinned and no other `connect`
listener could have changed the session. `getPgCheckoutSanitizerStats()` exposes
checkout wait, queue, sanitation, failure, and virgin-fast-path counters.
For alternate pool factories, pg-cache replaces direct `pool.query()` calls
with a sanitized checkout/query/release cycle; a custom sanitized pool must
therefore provide a replaceable `query()` method and Promise-based client
queries. Query failures destroy the checked-out client before the error is
returned through either the Promise or callback API.

Pool sizing accepts `max`, `idleTimeoutMillis`, `connectionTimeoutMillis`,
`allowExitOnIdle`, and native pg-pool `maxUses`. Set `maxUses: 1` to retire a
client after every checkout, or leave it unset/use `0` for unlimited reuse.
The equivalent environment setting is `PG_POOL_MAX_USES`; it accepts only a
canonical decimal integer, so alternate numeric spellings, negative,
fractional, and unsafe-integer values fail before a pool identity is published.
Because `maxUses` changes connection lifecycle and latency, it participates in
the opaque exact-pool identity and should be benchmarked under the real request
rate before production use.

Exact-pool and physical-target identities use a process-random keyed HMAC. They
are stable for the lifetime of one pool registry, but intentionally differ in
another process; this prevents an emitted identity from becoming an offline
password verifier. Connection and pool identity inputs must be primitive,
canonical data, and node-postgres password callbacks are rejected because a
callback's captured credential cannot be represented without risking an alias.

### Shared Notification Broker

`acquirePgNotificationBroker(listenerPgConfig, { topics })` leases one
process-local LISTEN connection per opaque, versioned pool identity. The
identity includes the canonical connection, credentials, pool, driver,
sanitation, and data-only TLS settings. The broker LISTENs only to each lease's
exact channel allowlist, rejects identifiers PostgreSQL would truncate past 63
UTF-8 bytes, and awaits UNLISTEN plus connection and pool-lease release.
The final lease destroys its listener client after UNLISTEN, so an inactive
database does not retain an idle PostgreSQL backend until the pool timeout.

Production broker acquisition performs a fresh, read-only catalog audit on the
same pinned client before each listener lease is admitted, so a pool with
`max: 1` cannot deadlock waiting for a second checkout. The attested lease's
narrow `revalidateRole()` capability serializes TTL audits on that client and
never exposes general SQL access. A conforming login may
CONNECT only to that exact database and has no role memberships, privileged
role attributes, database CREATE/TEMP, or effective privileges on non-system
schemas, relations, routines, and sequences. The returned audit contains only
the role, database, stable violation codes, and audit version; callers must keep
the separate `PgConfig` credentials in their secret store. Use
`normalizePgNotificationRoleContracts()` to reject one login spanning physical
databases or multiple listener logins targeting one physical database.
The live contract test is opt-in with
`PG_CACHE_RUN_NOTIFICATION_ROLE_INTEGRATION=1` and uses the standard `PG*`
connection settings for a pre-provisioned conforming notification login.

Every role-audit, `LISTEN`, and `UNLISTEN` command has the same bounded deadline
as the listener pool's `connectionTimeoutMillis`. Configure it through the
listener's `pool.connectionTimeoutMillis`, or through
`PG_POOL_CONNECTION_TIMEOUT_MS` when the pool setting is omitted; the default is
5 seconds. The broker rejects zero, fractional, negative, or setTimeout-unsafe
values before publishing an identity. A command that exceeds the deadline
fatally closes every lease and destroys the pinned client, so TTL refresh and
shutdown cannot wait forever on an abandoned driver query.

Each GraphQL subscriber has a fixed 256-message queue. A slow subscriber that
overflows is failed independently; a listener connection error fails every
lease and is never reconnected while any failed owner remains. The caller must
provide a dedicated least-privilege listener login and remains responsible for
the deployment's certificate and role policy. `lease.terminated` and
`getPgNotificationBrokerStats()` expose failure and lifecycle state without
revealing connection credentials.

### Direct Cache Access

```typescript
import { pgCache } from 'pg-cache';
import { Pool } from 'pg';

// Create and cache a pool manually
const pool = new Pool({ connectionString: 'postgres://...' });
pgCache.set('my-pool-key', pool);

// Retrieve it later
const cachedPool = pgCache.get('my-pool-key');

// Remove from cache (also disposes the pool)
pgCache.delete('my-pool-key');
```

### Cleanup Callbacks

Register callbacks to be notified when pools are disposed:

```typescript
import { pgCache } from 'pg-cache';

// Register a cleanup callback
const unregister = pgCache.registerCleanupCallback((poolKey: string) => {
  console.log(`Pool ${poolKey} was disposed`);
  // Clean up any resources associated with this pool
});

// Later, unregister if needed
unregister();
```

### Service Cache

A general-purpose cache is also provided:

```typescript
import { svcCache } from 'pg-cache';

// Cache any service or object
svcCache.set('my-service', myServiceInstance);
const service = svcCache.get('my-service');
```

### Graceful Shutdown

```typescript
import { close, teardownPgPools } from 'pg-cache';

// The executable owns process signals; importing pg-cache never installs one.
process.on('SIGTERM', async () => {
  await close(); // or teardownPgPools()
  process.exit(0);
});
```

## API Reference

### pgCache

The main PostgreSQL pool cache instance.

- `get(key: string): Pool | undefined` - Get a cached pool
- `set(key: string, pool: Pool): void` - Cache a pool
- `has(key: string): boolean` - Check if a pool is cached
- `delete(key: string): void` - Remove an unleased pool
- `clear(): void` - Remove all currently unleased pools
- `acquire(key: string, factory: () => Pool): PgPoolLease` - Atomically acquire a lease
- `getStats(): PgPoolCacheStats` - Read capacity and lifecycle counters
- `registerCleanupCallback(callback: (key: string) => void): () => void` - Register a cleanup callback

### getPgPool(config: Partial<PgConfig>): Pool

Get or create a cached PostgreSQL pool using the provided configuration.

### acquirePgPool(config, options): PgPoolLease

Get or create the exact pool identity and protect it from TTL/LRU disposal until
the returned idempotent `release()` is called.

### Capacity

`PG_CACHE_MAX` limits lazy pool identities, not eagerly allocated connections.
The default is 2064: two identities for each of 1024 database-per-tenant Graphile
contracts plus a 16-identity operational reserve. `PG_CACHE_TTL_MS` applies only
while an identity has zero leases.

### svcCache

A general-purpose LRU cache for services and objects.

### close() / teardownPgPools()

Gracefully close all cached pools and wait for disposal.

## Integration with Other Packages

This package is designed to be extended. For example, `graphile-cache` uses the cleanup callback system to automatically clean up PostGraphile instances when their associated pools are disposed.
