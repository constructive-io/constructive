import { errors } from '@constructive-io/errors';
import { Logger } from '@pgpmjs/logger';
import { EventEmitter } from 'events';
import type { Express } from 'express';
import type { GrafservBase } from 'grafserv';
import type { Server as HttpServer } from 'http';
import { LRUCache } from 'lru-cache';
import { pgCache } from 'pg-cache';
import type { PostGraphileInstance } from 'postgraphile';

import { GraphileAdmission, type GraphileAdmissionOptions, type GraphileAdmissionReservation } from './admission';

import { buildAdmittedGraphileInstance } from './admitted-build';
import { GraphileBuildFlights } from './build-flights';
import { graphileBuildCoordinator, type GraphileBuildOptions } from './build-coordinator';

const log = new Logger('graphile-cache');

// --- Time Constants ---
export const ONE_HOUR_MS = 1000 * 60 * 60;
export const FIVE_MINUTES_MS = 1000 * 60 * 5;
const ONE_DAY = ONE_HOUR_MS * 24;
const ONE_YEAR = ONE_DAY * 366;

// --- Eviction Types ---
export type EvictionReason = 'lru' | 'ttl' | 'manual';

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

// Environment parsing and deployment defaults belong to graphql-env. Direct
// consumers receive a finite fallback until the first owner configures it.
let cacheConfig: CacheConfig = { max: 50, ttl: ONE_YEAR };
let cacheConfigured = false;
export function getCacheConfig(): CacheConfig {
  return { ...cacheConfig };
}

export interface GraphileCacheConfiguration extends GraphileAdmissionOptions {
  ttl?: number;
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
  /** Logical service that owns this build (for example an API key or explorer route). */
  serviceKey?: string;
  /** Resolved database identifier, when the serving surface has one. */
  databaseId?: string | null;
  /** pg-cache's physical pool key (currently the resolved database name). */
  poolKey?: string;
  /** Idempotent release for pgServices owned by this exact preset generation. */
  releasePresetServices?: () => Promise<void>;
  /** Optional RealtimeManager for cursor-tracked subscription delivery */
  realtimeManager?: { stop(): Promise<void> } | null;
}

const disposalPromises = new WeakMap<GraphileCacheEntry, Promise<void>>();
const activeDisposals = new Set<Promise<void>>();
// Retain failed generations until a bulk drain observes them. Successful work
// is removed immediately; exact-entry outcomes remain in the WeakMap above.
const disposalRecords = new Map<number, Promise<void>>();
let disposalSequence = 0;

// Track keys that are being manually evicted for accurate eviction reason
const manualEvictionKeys = new Set<string>();

/**
 * Dispose a PostGraphile v5 cache entry
 *
 * Properly releases resources by:
 * 1. Closing the HTTP server if listening
 * 2. Stopping the realtime manager
 * 3. Releasing PostGraphile/Grafserv and preset services
 */
const releaseEntry = async (
  entry: GraphileCacheEntry,
  key: string
): Promise<void> => {
  log.debug(`Disposing PostGraphile[${key}]`);
  const failures: unknown[] = [];
  try {
    if (entry.httpServer?.listening) {
      await new Promise<void>((resolve, reject) => {
        entry.httpServer.close((error) => error ? reject(error) : resolve());
      });
    }
  } catch (error) {
    failures.push(error);
  }
  try {
    if (entry.realtimeManager) {
      await entry.realtimeManager.stop();
    }
  } catch (error) {
    failures.push(error);
  }
  try {
    await entry.pgl.release();
  } catch (error) {
    failures.push(error);
  }
  try {
    await entry.releasePresetServices?.();
  } catch (error) {
    failures.push(error);
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, 'Graphile resource cleanup failed');
};

/**
 * Coalesce teardown by exact entry identity, not by its reusable cache key.
 */
const scheduleDisposal = (
  entry: GraphileCacheEntry,
  key: string
): Promise<void> => {
  const existing = disposalPromises.get(entry);
  if (existing) return existing;

  const pending = releaseEntry(entry, key);

  disposalPromises.set(entry, pending);
  activeDisposals.add(pending);
  const sequence = ++disposalSequence;
  disposalRecords.set(sequence, pending);
  void pending
    .then(() => { disposalRecords.delete(sequence); }, (error) => {
      markGraphileCapacityUnavailable(error);
      log.error('Graphile resource cleanup failed', { generation: sequence });
    })
    .finally(() => activeDisposals.delete(pending));
  return pending;
};

/** Dispose a generation that was built but never published in the cache. */
export const disposeUncachedEntry = (
  entry: GraphileCacheEntry,
  key = entry.cacheKey
): Promise<void> => scheduleDisposal(entry, key);

/** Await disposal calls, not background connection cleanup inside upstream. */
export const waitForEntryDisposal = (
  entry: GraphileCacheEntry
): Promise<void> => disposalPromises.get(entry) ?? Promise.resolve();

/**
 * Await disposals scheduled before this call, including failures that already
 * settled. Later generations belong to the next drain. Concurrent callers hold
 * their own snapshot, so acknowledging a failure cannot hide it from a peer.
 */
export const waitForActiveDisposals = async (): Promise<void> => {
  const records = [...disposalRecords];
  const outcomes = await Promise.allSettled(records.map(([, pending]) => pending));
  const failures: unknown[] = [];
  outcomes.forEach((outcome, index) => {
    disposalRecords.delete(records[index][0]);
    if (outcome.status === 'rejected') failures.push(outcome.reason);
  });
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, 'Graphile disposal drain failed');
};

/**
 * Determine the eviction reason for a cache entry
 */
const getEvictionReason = (key: string, reason: LRUCache.DisposeReason): EvictionReason => {
  if (manualEvictionKeys.has(key)) {
    manualEvictionKeys.delete(key);
    return 'manual';
  }

  return reason === 'expire' ? 'ttl' : 'lru';
};

// Get initial cache configuration
const initialConfig = getCacheConfig();

// Fence pending work even when callers use the existing low-level delete/clear API.
let activeBuildFlights: GraphileBuildFlights | undefined;
class GraphileResidentCache extends LRUCache<string, GraphileCacheEntry> {
  override delete(key: string): boolean {
    activeBuildFlights?.invalidate((metadata) => metadata.cacheKey === key);
    return super.delete(key);
  }

  override clear(): void {
    activeBuildFlights?.invalidateAll();
    super.clear();
  }

  // LRU's constructor max is immutable; enforce the owner's finite count here.
  override set(
    key: string,
    value: GraphileCacheEntry,
    options?: LRUCache.SetOptions<string, GraphileCacheEntry, unknown>
  ): this {
    this.purgeStale();
    if (!this.has(key)) {
      while (this.size >= cacheConfig.max) this.pop();
    }
    return super.set(key, value, options);
  }
}

// --- Graphile Cache ---
export const graphileCache = new GraphileResidentCache({
  max: 0,
  maxSize: Number.MAX_SAFE_INTEGER,
  sizeCalculation: () => 1,
  ttlAutopurge: false,
  ttl: initialConfig.ttl,
  updateAgeOnGet: true,
  dispose: (entry, key, disposalReason) => {
    // Determine eviction reason before disposal
    const reason = getEvictionReason(key, disposalReason);

    // Teardown must be scheduled even if an eviction listener throws.
    scheduleDisposal(entry, key);

    // Emit eviction event
    cacheEvents.emitEviction({ key, reason, entry });

    log.debug(`Evicting PostGraphile[${key}] (reason: ${reason})`);
  }
});

const admission = new GraphileAdmission({
  occupied: () => {
    graphileCache.purgeStale();
    return graphileCache.size + activeDisposals.size;
  },
  evict: async () => {
    const entry = graphileCache.pop();
    if (entry) {
      await waitForEntryDisposal(entry);
      return true;
    }
    if (activeDisposals.size > 0) {
      await waitForActiveDisposals();
      return true;
    }
    return false;
  }
}, initialConfig.max);

export const configureGraphileAdmission = (options: GraphileCacheConfiguration = {}): void => {
  if (Object.values(options).every((value) => value === undefined)) return;
  if (options.ttl !== undefined && (!Number.isSafeInteger(options.ttl) || options.ttl <= 0)) {
    throw errors.INTERNAL_FAILURE({ details: 'Invalid schema cache TTL' });
  }
  const ttl = cacheConfigured
    ? Math.min(cacheConfig.ttl, options.ttl ?? cacheConfig.ttl)
    : options.ttl ?? cacheConfig.ttl;
  if (ttl !== cacheConfig.ttl && graphileCache.size > 0) {
    throw errors.INTERNAL_FAILURE({ details: 'Schema cache TTL cannot change while residents exist' });
  }
  admission.configure({
    max: options.max,
    heapMaxBytes: options.heapMaxBytes,
    buildReserveBytes: options.buildReserveBytes
  });
  cacheConfig = { max: admission.stats.max, ttl };
  graphileCache.ttl = ttl;
  cacheConfigured = true;
};
export const reserveGraphileCapacity = (): Promise<GraphileAdmissionReservation> => admission.reserve();
// Rejected cleanup can finish bookkeeping without releasing resources. Keep
// both owners fenced until process restart, even after pending work reaches zero.
export const markGraphileCapacityUnavailable = (error: unknown): void => {
  admission.fail(error);
  graphileBuildCoordinator.fail();
};

/** Shared by all cached Server and Explorer producers in this process. */
export const graphileBuildFlights = new GraphileBuildFlights({
  assertCanBuild: () => graphileBuildCoordinator.assertAccepting(),
  get: (key) => graphileCache.get(key),
  // Delay binding to avoid a circular initialization dependency with the owner.
  build: (metadata, create, assertCurrent) =>
    buildAdmittedGraphileInstance(metadata, create, assertCurrent)
});
activeBuildFlights = graphileBuildFlights;

/** Reopening cannot abandon a prior generation's work or preparation. */
export const reopenGraphileBuilds = (): void => {
  if (graphileBuildCoordinator.stats.state === 'stuck') throw errors.SCHEMA_BUILD_STUCK();
  if (graphileBuildCoordinator.stats.state === 'closed' &&
      (graphileBuildCoordinator.stats.active > 0 || graphileBuildFlights.activeTaskCount > 0 || graphileBuildFlights.activeScopeCount > 0)) {
    throw errors.SCHEMA_BUILDS_CLOSED();
  }
  if (!graphileBuildCoordinator.reopen() || !graphileBuildFlights.reopen()) throw errors.SCHEMA_BUILDS_CLOSED();
};

export const configureGraphileBuilds = (options?: GraphileBuildOptions): void => {
  graphileBuildCoordinator.configure(options);
  reopenGraphileBuilds();
};

/** Fence builds before waiting for HTTP requests that may be awaiting them. */
export const beginGraphileBuildShutdown = (): void => {
  graphileBuildFlights.close();
  graphileBuildCoordinator.close();
};

/** One deadline covers flights, actual builds, reservations, and build cleanup. */
export const closeGraphileBuilds = async (timeoutMs?: number): Promise<boolean> => {
  beginGraphileBuildShutdown();
  return graphileBuildCoordinator.closeAndDrain(timeoutMs, graphileBuildFlights.drain());
};

export const getGraphileBuildStats = () => graphileBuildCoordinator.stats;

// --- Cache Stats ---
export interface CacheStats {
  size: number;
  max: number;
  ttl: number;
  keys: string[];
  reserved: number;
  disposing: number;
  heapMaxBytes: number;
  buildReserveBytes: number;
  admissionFailed: boolean;
}

/**
 * Get current cache statistics
 */
export function getCacheStats(): CacheStats {
  const config = getCacheConfig();
  return {
    size: graphileCache.size,
    max: admission.stats.max,
    ttl: config.ttl,
    keys: [...graphileCache.keys()],
    reserved: admission.stats.reserved,
    disposing: activeDisposals.size,
    heapMaxBytes: admission.stats.heapMaxBytes,
    buildReserveBytes: admission.stats.buildReserveBytes,
    admissionFailed: admission.stats.failed
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
  const matches = (key: string): boolean => {
    pattern.lastIndex = 0;
    return pattern.test(key);
  };
  graphileBuildFlights.invalidate((metadata) => metadata.cacheKey !== undefined && matches(metadata.cacheKey));
  let cleared = 0;

  for (const key of graphileCache.keys()) {
    if (matches(key)) {
      // Mark as manual eviction before deleting
      manualEvictionKeys.add(key);
      graphileCache.delete(key);
      cleared++;
    }
  }

  return cleared;
}

const clearEntries = (matches: (key: string, entry: GraphileCacheEntry) => boolean): number => {
  let cleared = 0;
  for (const [key, entry] of graphileCache.entries()) {
    if (!matches(key, entry)) continue;
    manualEvictionKeys.add(key);
    graphileCache.delete(key);
    cleared++;
  }
  return cleared;
};

/** Clear all cached build variants owned by one logical service. */
export const clearGraphileEntriesForService = (serviceKey: string): number => {
  if (typeof serviceKey !== 'string' || serviceKey.length === 0) return 0;
  graphileBuildFlights.invalidate((metadata) => metadata.serviceKey === serviceKey);
  return clearEntries((key, entry) => entry.serviceKey === serviceKey || (!entry.serviceKey && key === serviceKey));
};

/** Clear all cached build variants for one resolved database identifier. */
export const clearGraphileEntriesForDatabase = (databaseId: string): number => {
  graphileBuildFlights.invalidate((metadata) => metadata.databaseId === databaseId);
  return clearEntries((_key, entry) => entry.databaseId === databaseId);
};

/** Clear all cached build variants backed by one pg-cache pool key. */
export const clearGraphileEntriesForPool = (poolKey: string): number => {
  graphileBuildFlights.invalidate((metadata) => metadata.poolKey === poolKey);
  return clearEntries((_key, entry) => entry.poolKey === poolKey);
};


// Register cleanup callback with pgCache
// When a pg pool is disposed, clean up any graphile instances using it
const unregister = pgCache.registerCleanupCallback((pgPoolKey: string) => {
  log.debug(`pgPool[${pgPoolKey}] disposed - checking graphile entries`);
  const cleared = clearGraphileEntriesForPool(pgPoolKey);
  if (cleared > 0) log.debug(`Removed ${cleared} graphile entries for pgPool[${pgPoolKey}]`);
});

// Enhanced close function that handles all caches
const closePromise: { promise: Promise<void> | null } = { promise: null };

/** Clear all resident entries and await every exact-generation disposal. */
export const clearGraphileCache = async (): Promise<void> => {
  for (const key of graphileCache.keys()) {
    manualEvictionKeys.add(key);
  }
  graphileCache.clear();
  try {
    await graphileBuildFlights.drain();
    await graphileBuildCoordinator.drain();
    await waitForActiveDisposals();
  } finally {
    manualEvictionKeys.clear();
  }
};

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

      if (!await closeGraphileBuilds()) throw errors.SCHEMA_BUILD_DRAIN_TIMEOUT();
      const failures: unknown[] = [];
      try {
        await clearGraphileCache();
      } catch (error) {
        failures.push(error);
      }
      // Attempt pool cleanup even when a generation's release rejected.
      try {
        await pgCache.close();
      } catch (error) {
        failures.push(error);
      }
      if (failures.length === 1) throw failures[0];
      if (failures.length > 1) throw new AggregateError(failures, 'Server cache cleanup failed');

      if (verbose) log.success('All caches disposed.');
    } finally {
      closePromise.promise = null;
    }
  })();

  return closePromise.promise;
};
