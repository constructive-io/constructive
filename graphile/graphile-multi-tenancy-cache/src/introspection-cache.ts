import crypto from 'node:crypto';
import { Logger } from '@pgpmjs/logger';
import type { Pool } from 'pg';
import { fetchAndParseIntrospection } from './utils/introspection-query';
import { getSchemaFingerprint, type MinimalIntrospection } from './utils/fingerprint';

const log = new Logger('introspection-cache');

// --- Configuration ---
const MAX_ENTRIES = 100;
const TTL_MS = 30 * 60 * 1000; // 30 minutes idle
const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Test-only hook
let maxEntries = MAX_ENTRIES;

// --- Types ---

export interface CachedIntrospection {
  parsed: MinimalIntrospection;
  fingerprint: string;
  raw: string;
  createdAt: number;
  lastUsedAt: number;
}

export interface IntrospectionCacheStats {
  size: number;
  maxSize: number;
  inflightCount: number;
}

// --- Internal state ---

const cache = new Map<string, CachedIntrospection>();
const inflight = new Map<string, Promise<CachedIntrospection>>();
let sweepTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Compute a connection hash from pool options.
 * Canonicalized + hashed to avoid leaking credentials while
 * preventing cross-environment collisions.
 */
function computeConnectionHash(pool: Pool): string {
  const opts = (pool as any).options || {};
  const parts = [
    opts.host || 'localhost',
    String(opts.port || 5432),
    opts.database || '',
    opts.user || '',
    opts.ssl ? 'ssl' : 'nossl',
  ];
  return crypto.createHash('sha256').update(parts.join(':')).digest('hex').slice(0, 16);
}

/**
 * Build the cache key: connHash:schema1,schema2 (sorted alphabetically).
 */
function buildCacheKey(connectionKey: string, schemas: string[]): string {
  const sorted = [...schemas].sort();
  return `${connectionKey}:${sorted.join(',')}`;
}

/**
 * Derive a connection key from a pool.
 */
export function getConnectionKey(pool: Pool): string {
  return computeConnectionHash(pool);
}

function ensureSweepTimer(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    sweepIntrospectionCache();
  }, SWEEP_INTERVAL_MS);
  if (sweepTimer.unref) sweepTimer.unref();
}

// --- Public API ---

/**
 * Get or create a cached introspection result.
 *
 * Single-flight: concurrent requests for the same key coalesce.
 * Failed entries are NOT cached.
 *
 * @param pool - PostgreSQL connection pool
 * @param schemas - Schema names to introspect
 * @param connectionKey - Pre-computed connection key (use getConnectionKey())
 * @returns Cached introspection with fingerprint
 */
export async function getOrCreateIntrospection(
  pool: Pool,
  schemas: string[],
  connectionKey: string,
): Promise<CachedIntrospection> {
  const cacheKey = buildCacheKey(connectionKey, schemas);

  // Cache hit
  const existing = cache.get(cacheKey);
  if (existing) {
    existing.lastUsedAt = Date.now();
    return existing;
  }

  // Single-flight coalesce
  const pending = inflight.get(cacheKey);
  if (pending) {
    return pending;
  }

  // Cache miss — create
  const promise = doIntrospect(pool, schemas, cacheKey);
  inflight.set(cacheKey, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    inflight.delete(cacheKey);
  }
}

async function doIntrospect(
  pool: Pool,
  schemas: string[],
  cacheKey: string,
): Promise<CachedIntrospection> {
  const { raw, parsed } = await fetchAndParseIntrospection(pool, schemas);
  const fingerprint = getSchemaFingerprint(parsed, schemas);

  const entry: CachedIntrospection = {
    parsed,
    fingerprint,
    raw,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
  };

  cache.set(cacheKey, entry);
  ensureSweepTimer();

  log.debug(`Cached introspection key=${cacheKey} fingerprint=${fingerprint.slice(0, 12)}…`);
  return entry;
}

/**
 * Targeted invalidation by connection key and optional schemas.
 */
export function invalidateIntrospection(
  connectionKey: string,
  schemas?: string[],
): void {
  if (schemas) {
    const cacheKey = buildCacheKey(connectionKey, schemas);
    cache.delete(cacheKey);
    log.debug(`Invalidated introspection key=${cacheKey}`);
  } else {
    // Invalidate all entries matching this connection key
    const prefix = `${connectionKey}:`;
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
    log.debug(`Invalidated all introspection entries for connKey=${connectionKey}`);
  }
}

/**
 * Full cache clear + stop sweep timer.
 */
export function clearIntrospectionCache(): void {
  cache.clear();
  inflight.clear();
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
  log.debug('Introspection cache cleared');
}

/**
 * Evict expired + over-cap entries.
 */
export function sweepIntrospectionCache(): void {
  const now = Date.now();
  const expired: string[] = [];

  for (const [key, entry] of cache) {
    if (now - entry.lastUsedAt > TTL_MS) {
      expired.push(key);
    }
  }

  for (const key of expired) {
    cache.delete(key);
  }

  // LRU cap
  if (cache.size > maxEntries) {
    const sorted = [...cache.entries()].sort(
      (a, b) => a[1].lastUsedAt - b[1].lastUsedAt,
    );
    const toEvict = sorted.slice(0, cache.size - maxEntries);
    for (const [key] of toEvict) {
      cache.delete(key);
    }
  }

  if (expired.length > 0 || cache.size > maxEntries) {
    log.debug(`Introspection cache sweep: evicted=${expired.length} size=${cache.size}`);
  }
}

/**
 * Get diagnostic stats.
 */
export function getIntrospectionCacheStats(): IntrospectionCacheStats {
  return {
    size: cache.size,
    maxSize: maxEntries,
    inflightCount: inflight.size,
  };
}

/**
 * Test-only hook to set max entries.
 */
export function _testSetMaxEntries(n: number): void {
  maxEntries = n;
}
