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
export type EvictionReason = 'lru' | 'ttl' | 'manual' | 'governor';

// --- Cache Counters (in-process metrics) ---
export interface CacheCounters {
  evictions: { lru: number; ttl: number; manual: number; governor: number };
  disposals: number;
  drainTimeouts: number;
  buildRefusals: number;
}

/**
 * Cumulative in-process cache counters for the metrics sampler. Mutated in the LRU
 * dispose callback (by eviction reason), in disposeEntry (each distinct disposal), and
 * in the drain-timeout warning branch. Zero overhead when the sampler is disabled — the
 * increments are a handful of integer bumps on paths that already do real teardown work.
 * Read a stable snapshot via getCacheCounters().
 */
export const cacheCounters: CacheCounters = {
  evictions: { lru: 0, ttl: 0, manual: 0, governor: 0 },
  disposals: 0,
  drainTimeouts: 0,
  buildRefusals: 0
};

/**
 * Snapshot the cache counters. Returns a deep copy so callers cannot mutate the live
 * counters through the returned object.
 */
export function getCacheCounters(): CacheCounters {
  return {
    evictions: { ...cacheCounters.evictions },
    disposals: cacheCounters.disposals,
    drainTimeouts: cacheCounters.drainTimeouts,
    buildRefusals: cacheCounters.buildRefusals
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
// ~0.5 GB retained per query-serving instance (measured against real provisioned apps
// on a small catalog). NOTE: instance heap scales with the TOTAL pg catalog
// (~21 KB per pg_class row measured) — on large multi-tenant catalogs set
// GRAPHILE_CACHE_INSTANCE_HEAP_BYTES to a measured value (e.g. ~1.45 GB at 61k rows).
const DEFAULT_INSTANCE_HEAP_BYTES = 512 * 1024 * 1024;
// Heap reserved for the server itself: express, pools, request working set
// (~+250 MB was measured at 200 rps on top of the resident instance).
const DEFAULT_BASE_RESERVE_BYTES = 256 * 1024 * 1024;
// Heap reserved for ONE in-flight schema build's transient allocations
// (introspection payload + gather + schema construction; >700 MB measured at a
// 61k-pg_class catalog). Builds are serialized by the server's BuildSemaphore,
// and ensureCacheHeadroom evicts down to (max - 1) residents before each build,
// so exactly one transient of this size coexists with (max - 1) residents.
const DEFAULT_BUILD_RESERVE_BYTES = 768 * 1024 * 1024;
// At least one instance must be admitted or nothing can ever build — but never
// more than the heap budget says fit. A floor of 3 admitted two extra builds
// the heap could not hold and aborted the process (V8 heap-limit SIGABRT)
// before eviction ever ran.
const MIN_CACHE_MAX = 1;
const MAX_CACHE_MAX = 50;

const parseEnvInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Pure capacity math (exported for tests and diagnostics).
 *
 * Two constraints bound how many instances fit:
 *   residency: max * perInstance + baseReserve            <= heapLimit
 *   rebuild:   (max - 1) * perInstance + baseReserve
 *              + buildReserve                             <= heapLimit
 * (the rebuild constraint has (max - 1) residents because evict-before-build
 * frees one slot before the transient allocation peaks — validated live: a
 * 3584 MB heap holds TWO ~1.35 GB instances and still rebuilds safely).
 */
export function computeCapacityFromBudget(
  heapLimit: number,
  perInstance: number,
  baseReserve: number = DEFAULT_BASE_RESERVE_BYTES,
  buildReserve: number = DEFAULT_BUILD_RESERVE_BYTES,
): number {
  const byResidency = Math.floor((heapLimit - baseReserve) / perInstance);
  const byRebuild = Math.floor((heapLimit - baseReserve - buildReserve) / perInstance) + 1;
  const budgeted = Math.min(byResidency, byRebuild);
  return Math.min(MAX_CACHE_MAX, Math.max(MIN_CACHE_MAX, budgeted));
}

/**
 * Heap-aware default for the maximum number of cached PostGraphile instances.
 * See computeCapacityFromBudget for the model. Tunables:
 *   GRAPHILE_CACHE_INSTANCE_HEAP_BYTES — measured per-instance retained heap
 *   GRAPHILE_CACHE_BASE_RESERVE_BYTES  — server base + request working set
 *   GRAPHILE_CACHE_BUILD_RESERVE_BYTES — one build's transient peak
 */
function computeHeapAwareMax(): number {
  try {
    const heapLimit = getHeapStatistics().heap_size_limit; // reflects --max-old-space-size
    const perInstance = parseEnvInt(
      process.env.GRAPHILE_CACHE_INSTANCE_HEAP_BYTES,
      DEFAULT_INSTANCE_HEAP_BYTES,
    );
    const baseReserve = parseEnvInt(
      process.env.GRAPHILE_CACHE_BASE_RESERVE_BYTES,
      DEFAULT_BASE_RESERVE_BYTES,
    );
    const buildReserve = parseEnvInt(
      process.env.GRAPHILE_CACHE_BUILD_RESERVE_BYTES,
      DEFAULT_BUILD_RESERVE_BYTES,
    );
    return computeCapacityFromBudget(heapLimit, perInstance, baseReserve, buildReserve);
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

// Track keys evicted by the memory governor for accurate eviction reason
const governorEvictionKeys = new Set<string>();

// Number of entries currently DRAINING (evicted from the cache but their ~GB of
// heap still live until in-flight requests finish and pgl.release() completes).
// Invisible to ensureCacheHeadroom (they are no longer cache entries), so build
// admission must consult it: a build transient stacked on undrained instances is
// what OOMed the soak (flush -> rebuild race).
let drainingCount = 0;

export const getDrainingCount = (): number => drainingCount;

/**
 * Hold a build until evicted instances have actually released their memory —
 * or heap pressure is comfortable anyway, or the bounded wait expires (drains
 * are themselves bounded by GRAPHILE_CACHE_DRAIN_TIMEOUT_MS).
 */
export async function waitForDrainSettle(timeoutMs = 20_000): Promise<void> {
  const start = Date.now();
  while (drainingCount > 0 && Date.now() - start < timeoutMs) {
    if (getMemoryPressure().level === 'ok') return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

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
  drainingCount += 1;
  try {
    await disposeEntryInner(entry, key);
  } finally {
    drainingCount -= 1;
  }
};

const disposeEntryInner = async (entry: GraphileCacheEntry, key: string): Promise<void> => {

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
  if (governorEvictionKeys.has(key)) {
    governorEvictionKeys.delete(key);
    return 'governor';
  }
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

// --- Memory Governor ---
export type MemoryPressureLevel = 'ok' | 'elevated' | 'critical';

export interface MemoryPressure {
  level: MemoryPressureLevel;
  heapUsed: number;
  heapLimit: number;
  ratio: number;
}

const parseEnvFloat = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 && n < 1 ? n : fallback;
};

/**
 * Current heap pressure against V8's actually-exhaustible headroom
 * (used / (used + total_available_size)).
 *
 * elevated (default >=85%): proactively evict idle instances ahead of the LRU
 * schedule. critical (default >=92%): additionally REFUSE to start new schema
 * builds (the caller responds 503; resident instances keep serving). A build's
 * transient allocations are the largest single spike the process makes — at
 * critical pressure admitting one converts degraded service into a V8
 * heap-limit abort for every tenant on the box.
 * Tunables: GRAPHILE_MEMORY_GOVERNOR_ELEVATED / GRAPHILE_MEMORY_GOVERNOR_CRITICAL.
 */
export function getMemoryPressure(): MemoryPressure {
  const stats = getHeapStatistics();
  const heapLimit = stats.heap_size_limit;
  const heapUsed = process.memoryUsage().heapUsed;
  // Ratio denominator is used + V8's own remaining-allocatable estimate, NOT
  // heap_size_limit: the limit includes young-generation and reserved space the
  // old space can never use, so with --max-old-space-size=512 the limit reads
  // ~738MB while the process aborts near ~508MB used — a 0.69 "ratio" at the
  // moment of death, leaving 0.85/0.92 watermarks unreachable exactly when they
  // matter. used/(used+available) approaches 1.0 as the abort nears at every
  // heap size.
  const available = stats.total_available_size ?? Math.max(0, heapLimit - heapUsed);
  const exhaustible = heapUsed + available;
  const ratio = exhaustible > 0 ? heapUsed / exhaustible : 0;
  const elevated = parseEnvFloat(process.env.GRAPHILE_MEMORY_GOVERNOR_ELEVATED, 0.85);
  const critical = parseEnvFloat(process.env.GRAPHILE_MEMORY_GOVERNOR_CRITICAL, 0.92);
  const level: MemoryPressureLevel = ratio >= critical ? 'critical' : ratio >= elevated ? 'elevated' : 'ok';
  return { level, heapUsed, heapLimit, ratio };
}

/**
 * Gate for new schema builds. Returns the pressure snapshot; when
 * `refuseBuild` is true the caller must not start a build (respond 503 and
 * count it). Cheap enough for the request path: one memoryUsage() call.
 */
export function shouldRefuseBuild(): MemoryPressure & { refuseBuild: boolean } {
  const pressure = getMemoryPressure();
  const refuseBuild = pressure.level === 'critical';
  if (refuseBuild) {
    cacheCounters.buildRefusals += 1;
    log.warn(
      `Refusing new schema build at critical heap pressure ` +
        `(${Math.round(pressure.ratio * 100)}% of ${Math.round(pressure.heapLimit / 1048576)}MB)`,
    );
  }
  return { ...pressure, refuseBuild };
}

let governorTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Periodic proactive eviction: at elevated/critical pressure, evict the
 * least-recently-used instance (skipping in-flight ones) each tick until
 * pressure clears. Disabled with GRAPHILE_MEMORY_GOVERNOR=0.
 */
export function startMemoryGovernor(intervalMs = 10_000): () => void {
  if (process.env.GRAPHILE_MEMORY_GOVERNOR === '0') return () => {};
  if (governorTimer) return stopMemoryGovernor;
  governorTimer = setInterval(() => {
    const pressure = getMemoryPressure();
    if (pressure.level === 'ok') return;
    // Evict ONE entry per tick, LRU first, preferring idle entries.
    let victim: string | undefined;
    for (const key of graphileCache.rkeys()) {
      const entry = graphileCache.peek(key);
      if (entry && !entry.disposing && (entry.inflight ?? 0) === 0) {
        victim = key;
        break;
      }
      if (victim === undefined) victim = key; // fall back to LRU even if busy
    }
    if (victim === undefined) return;
    governorEvictionKeys.add(victim);
    log.warn(
      `Memory governor evicting PostGraphile[${victim}] at ${pressure.level} pressure ` +
        `(heap ${Math.round(pressure.ratio * 100)}%)`,
    );
    graphileCache.delete(victim);
  }, intervalMs);
  if (typeof governorTimer.unref === 'function') governorTimer.unref();
  return stopMemoryGovernor;
}

export function stopMemoryGovernor(): void {
  if (governorTimer) {
    clearInterval(governorTimer);
    governorTimer = null;
  }
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
