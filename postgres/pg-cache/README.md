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

- LRU cache for PostgreSQL connection pools
- Checkout sanitation for reused node-postgres clients
- Automatic pool cleanup and disposal
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

// In your shutdown handler
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
- `delete(key: string): void` - Remove and dispose a pool
- `clear(): void` - Remove and dispose all pools
- `registerCleanupCallback(callback: (key: string) => void): () => void` - Register a cleanup callback

### getPgPool(config: Partial<PgConfig>): Pool

Get or create a cached PostgreSQL pool using the provided configuration.
Clients from the default node-postgres factory run `DISCARD ALL` before every
checkout, and stale client-side prepared-statement bookkeeping is cleared to
match the server. If sanitation fails, the client is destroyed and the checkout
fails. Alternate registered pool factories retain ownership of backend-specific
checkout sanitation.

### svcCache

A general-purpose LRU cache for services and objects.

### close() / teardownPgPools()

Gracefully close all cached pools and wait for disposal.

## Integration with Other Packages

This package is designed to be extended. For example, `graphile-cache` uses the cleanup callback system to automatically clean up PostGraphile instances when their associated pools are disposed.

### Checkout sanitation performance

The default sanitizer adds a database round trip and invalidates prepared statements on every checkout. See the [reproducible benchmark and measured tradeoff](../pg-query-context/benchmarks/README.md) before setting a production throughput budget. The benchmark does not weaken the default sanitation contract.

### Dedicated notification listener validation

The broker accepts only an audited, dedicated login and exact channel allowlists. Its two real PostgreSQL integration suites require `PG_CACHE_RUN_NOTIFICATION_ROLE_INTEGRATION=1`. CI provisions `src/__tests__/fixtures/notification-role.sql` and runs both suites after the `pg-postgres` batch. Run this fixture only in a disposable cluster: it revokes PUBLIC cross-database CONNECT to test the listener isolation contract. The normal unit run keeps these environment-specific suites gated.
