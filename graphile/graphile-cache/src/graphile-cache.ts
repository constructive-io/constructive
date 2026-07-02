import { EventEmitter } from 'events';
import { getHeapStatistics } from 'node:v8';
import { Logger } from '@pgpmjs/logger';
import { LRUCache } from 'lru-cache';
import { pgCache } from 'pg-cache';
import type {
  Express,
  NextFunction as ExpressNextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import type { Server as HttpServer } from 'http';
import type { PostGraphileInstance } from 'postgraphile';
import type { GrafservBase } from 'grafserv';

const log = new Logger('graphile-cache');

// --- Time Constants ---
export const ONE_HOUR_MS = 1000 * 60 * 60;
export const FIVE_MINUTES_MS = 1000 * 60 * 5;
const SIX_HOURS_MS = ONE_HOUR_MS * 6;

// --- Eviction Types ---
export type EvictionReason = 'lru' | 'ttl' | 'manual';

// --- Cache Counters (in-process metrics) ---
export interface CacheCounters {
  evictions: { lru: number; ttl: number; manual: number };
  disposals: number;
  drainTimeouts: number;
}

/**
 * Cumulative in-process cache counters for the metrics sampler. Mutated in the LRU
 * dispose callback (by eviction reason), in disposeEntry (each distinct disposal), and
 * in the drain-timeout warning branch. Zero overhead when the sampler is disabled — the
 * increments are a handful of integer bumps on paths that already do real teardown work.
 * Read a stable snapshot via getCacheCounters().
 */
export const cacheCounters: CacheCounters = {
  evictions: { lru: 0, ttl: 0, manual: 0 },
  disposals: 0,
  drainTimeouts: 0
};

/**
 * Snapshot the cache counters. Returns a deep copy so callers cannot mutate the live
 * counters through the returned object.
 */
export function getCacheCounters(): CacheCounters {
  return {
    evictions: { ...cacheCounters.evictions },
    disposals: cacheCounters.disposals,
    drainTimeouts: cacheCounters.drainTimeouts
  };
}

// --- Cache Event Emitter ---
export interface CacheEvictionEvent {
  key: string;
  reason: EvictionReason;
  entry: GraphileCacheEntry;
}

export class CacheEventEmitter extends EventEmitter {
  emitEviction(event: CacheEvictionEvent): void {
    this.emit('eviction', event);
  }

  onEviction(handler: (event: CacheEvictionEvent) => void): void {
    this.on('eviction', handler);
  }
}

export const cacheEvents = new CacheEventEmitter();

// --- Cache Configuration ---
export interface CacheConfig {
  max: number;
  ttl: number;
}

/**
 * Empirically, a PostGraphile v5 instance that has served at least one GraphQL
 * request retains ~0.5 GB of V8 heap (the fully-materialised GraphQL schema plus
 * grafast's per-schema plan machinery; a build-only instance is far smaller, but
 * every *cached* instance is, by definition, one that serves requests). The cache
 * therefore CANNOT be bounded by entry count alone: `max` heavy instances need
 * `max * ~0.5GB` of resident heap, and once that exceeds the V8 old-space limit the
 * process OOMs as distinct hosts fill the cache. A fixed default of 50 implies
 * ~24 GB of resident schemas — far beyond any normal heap — which is the root cause
 * of the schema-builder OOM. We derive a heap-aware default that budgets a fraction
 * of the heap for cached instances. Override explicitly with GRAPHILE_CACHE_MAX, and
 * tune the per-instance estimate with GRAPHILE_CACHE_INSTANCE_HEAP_BYTES.
 */
// ~0.5 GB retained per query-serving instance (measured against real provisioned apps).
const DEFAULT_INSTANCE_HEAP_BYTES = 512 * 1024 * 1024;
// Fraction of the V8 heap budgeted for cached instances; the remainder is headroom
// for transient schema builds (each build briefly allocates hundreds of MB) and
// request processing.
const CACHE_HEAP_FRACTION = 0.5;
const MIN_CACHE_MAX = 3;
const MAX_CACHE_MAX = 50;

const parseEnvInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Heap-aware default for the maximum number of cached PostGraphile instances.
 * cache_heap_budget = heap_size_limit * CACHE_HEAP_FRACTION
 * max = clamp(floor(cache_heap_budget / per_instance_bytes), MIN, MAX)
 */
function computeHeapAwareMax(): number {
  try {
    const heapLimit = getHeapStatistics().heap_size_limit; // reflects --max-old-space-size
    const perInstance = parseEnvInt(
      process.env.GRAPHILE_CACHE_INSTANCE_HEAP_BYTES,
      DEFAULT_INSTANCE_HEAP_BYTES,
    );
    const budgeted = Math.floor((heapLimit * CACHE_HEAP_FRACTION) / perInstance);
    return Math.min(MAX_CACHE_MAX, Math.max(MIN_CACHE_MAX, budgeted));
  } catch {
    return MIN_CACHE_MAX;
  }
}

/**
 * Get cache configuration from environment variables
 *
 * Supports:
 * - GRAPHILE_CACHE_MAX: Maximum number of entries. Default is heap-aware
 *   (see computeHeapAwareMax) rather than a fixed 50, because each cached
 *   instance retains ~0.5 GB and a count-only cap OOMs the process.
 * - GRAPHILE_CACHE_INSTANCE_HEAP_BYTES: per-instance heap estimate for the
 *   heap-aware default (default ~512 MB).
 * - GRAPHILE_CACHE_TTL_MS: idle TTL in milliseconds (updateAgeOnGet refreshes it
 *   on every hit, so this is an idle-expiry, not an absolute lifetime)
 *   - Production default: SIX_HOURS_MS — an idle tenant's ~0.5 GB instance is
 *     reclaimed within hours instead of pinned for a year; a later request
 *     simply rebuilds it
 *   - Development default: FIVE_MINUTES_MS
 *
 * NOTE: This value should be <= PG_CACHE_MAX so that every cached PostGraphile
 * instance has a live pool backing it.
 */
export function getCacheConfig(): CacheConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const max = process.env.GRAPHILE_CACHE_MAX
    ? parseEnvInt(process.env.GRAPHILE_CACHE_MAX, computeHeapAwareMax())
    : computeHeapAwareMax();

  const ttl = process.env.GRAPHILE_CACHE_TTL_MS
    ? parseInt(process.env.GRAPHILE_CACHE_TTL_MS, 10)
    : isDevelopment
      ? FIVE_MINUTES_MS
      : SIX_HOURS_MS;

  return { max, ttl };
}

/**
 * Cache entry for PostGraphile v5 instances
 *
 * Each entry contains:
 * - pgl: The PostGraphile instance (manages schema, plugins, etc.)
 * - serv: The Grafserv server instance (handles HTTP/WS)
 * - handler: Express app for routing requests
 * - httpServer: Node HTTP server (required by grafserv)
 * - cacheKey: Unique identifier for this entry
 * - createdAt: Timestamp when this entry was created
 */
export interface GraphileCacheEntry {
  pgl: PostGraphileInstance;
  serv: GrafservBase;
  handler: Express;
  httpServer: HttpServer;
  cacheKey: string;
  createdAt: number;
  /**
   * Database name backing this instance's pg pool. Used to evict the entry when its
   * pool is disposed (see the pgCache cleanup callback). Distinct from cacheKey, which
   * on the public server is the request HOST, not the database.
   */
  dbname?: string;
  /** Optional RealtimeManager for cursor-tracked subscription delivery */
  realtimeManager?: { stop(): Promise<void> } | null;
  /**
   * Number of requests currently executing against this entry's handler.
   * Maintained by invokeEntryHandler; disposeEntry drains to 0 (bounded by
   * GRAPHILE_CACHE_DRAIN_TIMEOUT_MS) before releasing the instance so eviction
   * cannot tear down a schema mid-request.
   */
  inflight?: number;
  /** Set at the start of disposal; routing must treat the entry as a cache miss. */
  disposing?: boolean;
}

// Track disposed entries to prevent double-disposal. Keyed by ENTRY IDENTITY (a WeakSet),
// NOT by the cache key. A key-scoped guard caused a same-key disposal race: while entry A
// for key K was mid `pgl.release()` (K parked in the guard), a rebuilt entry B for the SAME
// key K could be evicted and its disposeEntry would short-circuit, silently skipping
// B.pgl.release(). Guarding by entry identity disposes every distinct entry exactly once
// while still allowing a rebuilt entry on the same key to be released.
const disposedEntries = new WeakSet<GraphileCacheEntry>();

// Track keys that are being manually evicted for accurate eviction reason
const manualEvictionKeys = new Set<string>();

/**
 * Dispose a PostGraphile v5 cache entry
 *
 * Properly releases resources by:
 * 1. Closing the HTTP server if listening
 * 2. Releasing the PostGraphile instance (which internally releases grafserv)
 *
 * Uses the disposedEntries WeakSet to prevent double-disposal of the same entry when
 * closeAllCaches() explicitly disposes entries and then clear() triggers the dispose
 * callback for the same entry.
 */
const disposeEntry = async (entry: GraphileCacheEntry, key: string): Promise<void> => {
  // Prevent double-disposal of the SAME entry (guard by identity, not by key — see the
  // disposedEntries declaration for why).
  if (disposedEntries.has(entry)) {
    return;
  }
  disposedEntries.add(entry);
  cacheCounters.disposals += 1;
  entry.disposing = true;

  // Drain in-flight requests before tearing the instance down. The entry is already
  // out of the cache (dispose fires post-removal), so no NEW requests can route here —
  // invokeEntryHandler also refuses entries with `disposing` set. Bounded wait: a wedged
  // request must not pin ~0.5 GB forever.
  const drainTimeoutMs = parseEnvInt(process.env.GRAPHILE_CACHE_DRAIN_TIMEOUT_MS, 30_000);
  const drainStart = Date.now();
  while ((entry.inflight ?? 0) > 0 && Date.now() - drainStart < drainTimeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if ((entry.inflight ?? 0) > 0) {
    cacheCounters.drainTimeouts += 1;
    log.warn(
      `Disposing PostGraphile[${key}] with ${entry.inflight} request(s) still in flight after ${drainTimeoutMs}ms drain timeout`,
    );
  }

  log.debug(`Disposing PostGraphile[${key}]`);
  try {
    // Close the HTTP server. create-instance builds it via createServer() but never
    // .listen()s it, so `.listening` is always false — the old guard meant close() never
    // ran. Closing unconditionally detaches grafserv's 'upgrade' listener; when the server
    // was never listening, close() simply invokes the callback with ERR_SERVER_NOT_RUNNING
    // (a harmless no-op here), so the Promise always resolves.
    if (entry.httpServer) {
      await new Promise<void>((resolve) => {
        entry.httpServer.close(() => resolve());
      });
    }
    // Stop RealtimeManager if present (before releasing PostGraphile)
    if (entry.realtimeManager) {
      try {
        await entry.realtimeManager.stop();
      } catch (err) {
        log.error(`Error stopping RealtimeManager for PostGraphile[${key}]:`, err);
      }
    }
    // Release PostGraphile instance (this also releases grafserv internally)
    if (entry.pgl) {
      await entry.pgl.release();
    }
  } catch (err) {
    log.error(`Error disposing PostGraphile[${key}]:`, err);
  }
  // No key cleanup needed: the WeakSet entry is reclaimed together with the entry by GC.
};

/**
 * Determine the eviction reason for a cache entry
 */
const getEvictionReason = (key: string, entry: GraphileCacheEntry): EvictionReason => {
  if (manualEvictionKeys.has(key)) {
    manualEvictionKeys.delete(key);
    return 'manual';
  }

  // Check if TTL expired
  const age = Date.now() - entry.createdAt;
  const config = getCacheConfig();
  if (age >= config.ttl) {
    return 'ttl';
  }

  return 'lru';
};

// Get initial cache configuration
const initialConfig = getCacheConfig();

// Surface the resolved instance cap once at startup. Because each cached PostGraphile
// instance retains ~0.5 GB, an oversized cap (relative to the heap) is the primary cause
// of schema-builder OOM — make the chosen value visible to operators.
try {
  const heapLimitMb = Math.round(getHeapStatistics().heap_size_limit / (1024 * 1024));
  const source = process.env.GRAPHILE_CACHE_MAX ? 'GRAPHILE_CACHE_MAX' : 'heap-aware default';
  log.info(
    `graphileCache max=${initialConfig.max} instances (${source}); heap limit ~${heapLimitMb}MB. ` +
      `Each query-serving instance retains ~0.5GB; raise --max-old-space-size or lower GRAPHILE_CACHE_MAX if memory-constrained.`,
  );
} catch {
  // ignore — logging is best-effort
}

// --- Graphile Cache ---
export const graphileCache = new LRUCache<string, GraphileCacheEntry>({
  max: initialConfig.max,
  ttl: initialConfig.ttl,
  updateAgeOnGet: true,
  dispose: (entry, key) => {
    // Determine eviction reason before disposal
    const reason = getEvictionReason(key, entry);
    cacheCounters.evictions[reason] += 1;

    // Emit eviction event
    cacheEvents.emitEviction({ key, reason, entry });

    log.debug(`Evicting PostGraphile[${key}] (reason: ${reason})`);

    // LRU dispose is synchronous, but v5 disposal is async
    // Fire and forget the async cleanup
    disposeEntry(entry, key).catch((err) => {
      log.error(`Failed to dispose PostGraphile[${key}]:`, err);
    });
  }
});

/**
 * Invoke an entry's Express handler with in-flight refcounting.
 *
 * Returns false WITHOUT invoking when the entry is already being disposed —
 * callers must treat that as a cache miss (rebuild) or retry. On invocation,
 * the refcount is incremented and released exactly once when the response
 * finishes or the connection closes, which is what disposeEntry drains on.
 */
export function invokeEntryHandler(
  entry: GraphileCacheEntry,
  req: ExpressRequest,
  res: ExpressResponse,
  next: ExpressNextFunction,
): boolean {
  if (entry.disposing) {
    return false;
  }
  entry.inflight = (entry.inflight ?? 0) + 1;
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      entry.inflight = Math.max(0, (entry.inflight ?? 1) - 1);
    }
  };
  // 'close' fires after 'finish' and also on aborted connections; release is idempotent.
  res.once('finish', release);
  res.once('close', release);
  entry.handler(req, res, next);
  return true;
}

/**
 * Evict least-recently-used entries until there is room for `slots` new entries
 * under the configured max. Called BEFORE building a new instance so the build's
 * transient allocation (hundreds of MB) lands on a cache that has already shed
 * an instance, instead of stacking a full cache + a build peak (the OOM shape).
 */
export function ensureCacheHeadroom(slots = 1): number {
  const { max } = getCacheConfig();
  let evicted = 0;
  while (graphileCache.size > Math.max(0, max - slots)) {
    // rkeys() iterates least-recently-used first
    const oldestKey = graphileCache.rkeys().next().value as string | undefined;
    if (oldestKey === undefined) break;
    graphileCache.delete(oldestKey);
    evicted++;
  }
  if (evicted > 0) {
    log.info(`Evicted ${evicted} instance(s) before build to keep heap headroom (max=${max})`);
  }
  return evicted;
}

// --- Cache Stats ---
export interface CacheStats {
  size: number;
  max: number;
  ttl: number;
  keys: string[];
}

/**
 * Get current cache statistics
 */
export function getCacheStats(): CacheStats {
  const config = getCacheConfig();
  return {
    size: graphileCache.size,
    max: config.max,
    ttl: config.ttl,
    keys: [...graphileCache.keys()]
  };
}

// --- Clear Matching Entries ---
/**
 * Clear cache entries matching a regex pattern
 *
 * @param pattern - RegExp to match against cache keys
 * @returns Number of entries cleared
 */
export function clearMatchingEntries(pattern: RegExp): number {
  let cleared = 0;

  for (const key of graphileCache.keys()) {
    if (pattern.test(key)) {
      // Mark as manual eviction before deleting
      manualEvictionKeys.add(key);
      graphileCache.delete(key);
      cleared++;
    }
  }

  return cleared;
}

// Register cleanup callback with pgCache
// When a pg pool is disposed, clean up any graphile instances using it
const unregister = pgCache.registerCleanupCallback((pgPoolKey: string) => {
  log.debug(`pgPool[${pgPoolKey}] disposed - checking graphile entries`);

  // Remove graphile entries backed by this pool. Match on the entry's dbname (the pool is
  // keyed by database name), NOT on cacheKey: on the public server cacheKey is the request
  // HOST, which never contains the database name, so the old `cacheKey.includes(pgPoolKey)`
  // test never matched and this safety valve was dead.
  graphileCache.forEach((entry, k) => {
    if (entry.dbname === pgPoolKey) {
      log.debug(`Removing graphileCache[${k}] due to pgPool[${pgPoolKey}] disposal`);
      manualEvictionKeys.add(k);
      graphileCache.delete(k);
    }
  });
});

// Enhanced close function that handles all caches
const closePromise: { promise: Promise<void> | null } = { promise: null };

/**
 * Close all caches and release resources
 *
 * This function:
 * 1. Disposes all PostGraphile v5 instances (async)
 * 2. Clears the graphile cache
 * 3. Closes all pg pools via pgCache
 *
 * The function is idempotent - calling it multiple times
 * returns the same promise.
 */
export const closeAllCaches = async (verbose = false): Promise<void> => {
  if (closePromise.promise) return closePromise.promise;

  closePromise.promise = (async () => {
    try {
      if (verbose) log.info('Closing all server caches...');

      // Collect all entries and dispose them properly
      const entries = [...graphileCache.entries()];

      // Mark all as manual evictions
      for (const [key] of entries) {
        manualEvictionKeys.add(key);
      }

      const disposePromises = entries.map(([key, entry]) =>
        disposeEntry(entry, key)
      );

      // Wait for all disposals to complete
      await Promise.allSettled(disposePromises);

      // Clear the cache after disposal (dispose callback no-ops: each entry is already
      // in the disposedEntries WeakSet from the explicit disposeEntry above).
      graphileCache.clear();

      // The disposedEntries WeakSet needs no explicit clearing — entries are reclaimed by
      // GC once the cache no longer references them.
      manualEvictionKeys.clear();

      // Close pg pools
      await pgCache.close();

      if (verbose) log.success('All caches disposed.');
    } finally {
      closePromise.promise = null;
    }
  })();

  return closePromise.promise;
};
