import { EventEmitter } from 'events';
import { Logger } from '@pgpmjs/logger';
import { LRUCache } from 'lru-cache';
import { pgCache } from 'pg-cache';
import type { Express } from 'express';
import type { Server as HttpServer } from 'http';
import type { Pool } from 'pg';
import {
  CacheInvalidationConfig,
  CacheInvalidationService,
} from './cache-invalidation';

const log = new Logger('graphile-cache');

// Event emitter for cache events (evictions, etc.)
export type EvictionReason = 'lru' | 'ttl' | 'manual';
export interface CacheEvents {
  eviction: (key: string, reason: EvictionReason) => void;
}

class CacheEventEmitter extends EventEmitter {
  emit<K extends keyof CacheEvents>(event: K, ...args: Parameters<CacheEvents[K]>): boolean {
    return super.emit(event, ...args);
  }
  on<K extends keyof CacheEvents>(event: K, listener: CacheEvents[K]): this {
    return super.on(event, listener);
  }
  off<K extends keyof CacheEvents>(event: K, listener: CacheEvents[K]): this {
    return super.off(event, listener);
  }
}

export const cacheEvents = new CacheEventEmitter();

// Time constants
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

// Cache configuration interface
interface CacheConfig {
  max: number;
  ttl: number;
  updateAgeOnGet: boolean;
}

// Get cache configuration from environment or defaults
function getCacheConfig(): CacheConfig {
  const isDev = process.env.NODE_ENV === 'development';

  const maxEnv = parseInt(process.env.GRAPHILE_CACHE_MAX || '50', 10);
  const max = isNaN(maxEnv) ? 50 : maxEnv;

  const defaultTtl = isDev ? FIVE_MINUTES_MS : ONE_HOUR_MS;
  const ttlEnv = process.env.GRAPHILE_CACHE_TTL_MS
    ? parseInt(process.env.GRAPHILE_CACHE_TTL_MS, 10)
    : defaultTtl;
  const ttl = isNaN(ttlEnv) ? defaultTtl : ttlEnv;

  return {
    max,
    ttl,
    updateAgeOnGet: true,
  };
}

const cacheConfig = getCacheConfig();

/**
 * PostGraphile v5 cached instance
 * 
 * In v5, we cache the entire PostGraphile instance along with its
 * grafserv handler and Express app.
 */
export interface GraphileCacheEntry {
  pgl: { release: () => void | PromiseLike<void> };
  serv: unknown;
  handler: Express;
  httpServer: HttpServer;
  cacheKey: string;
  createdAt: number;
}

// Track keys marked for manual eviction (for metrics tracking)
const manualEvictionKeys = new Set<string>();

/**
 * Mark a key as being manually evicted (for metrics tracking)
 * @internal
 */
export function markManualEviction(key: string): void {
  manualEvictionKeys.add(key);
}

/**
 * Mark all current keys as being manually evicted (for clear operations)
 * @internal
 */
export function markAllManualEvictions(): void {
  for (const key of graphileCache.keys()) {
    manualEvictionKeys.add(key);
  }
}

// --- Graphile Cache ---
export const graphileCache = new LRUCache<string, GraphileCacheEntry>({
  max: cacheConfig.max,
  ttl: cacheConfig.ttl,
  updateAgeOnGet: cacheConfig.updateAgeOnGet,
  dispose: (entry: GraphileCacheEntry, key: string, reason: LRUCache.DisposeReason) => {
    log.debug(`Disposing PostGraphile[${key}] reason=${reason}`);

    // Determine eviction reason for metrics
    let evictionReason: EvictionReason;
    if (manualEvictionKeys.has(key)) {
      evictionReason = 'manual';
      manualEvictionKeys.delete(key);
    } else if (reason === 'expire') {
      evictionReason = 'ttl';
    } else {
      // 'evict' (LRU), 'set' (overwrite)
      evictionReason = 'lru';
    }

    // Emit eviction event for metrics collection
    cacheEvents.emit('eviction', key, evictionReason);

    // Note: dispose is synchronous in lru-cache v11, but we handle async release
    void (async () => {
      try {
        await entry.pgl.release();
      } catch (err) {
        log.error(`Error releasing PostGraphile[${key}]:`, err);
      }
    })();
  },
});

// Cache statistics
export function getCacheStats(): { size: number; max: number; ttl: number; keys: string[] } {
  return {
    size: graphileCache.size,
    max: cacheConfig.max,
    ttl: cacheConfig.ttl,
    keys: [...graphileCache.keys()],
  };
}

// Clear entries matching pattern
export function clearMatchingEntries(pattern: RegExp): number {
  let cleared = 0;
  for (const key of graphileCache.keys()) {
    if (pattern.test(key)) {
      graphileCache.delete(key);
      cleared++;
    }
  }
  return cleared;
}

// Register cleanup callback with pgCache
// When a pg pool is disposed, clean up any graphile instances using it
const unregister = pgCache.registerCleanupCallback((pgPoolKey: string) => {
  graphileCache.forEach((entry, k) => {
    if (entry.cacheKey.includes(pgPoolKey)) {
      log.debug(`Removing graphileCache[${k}] due to pgPool[${pgPoolKey}]`);
      graphileCache.delete(k);
    }
  });
});

// Enhanced close function that handles all caches
const closePromise: { promise: Promise<void> | null } = { promise: null };

export const closeAllCaches = async (verbose = false): Promise<void> => {
  if (closePromise.promise) return closePromise.promise;

  closePromise.promise = (async () => {
    if (verbose) log.info('Closing all server caches...');
    
    // Release all PostGraphile instances
    for (const [key, entry] of graphileCache.entries()) {
      log.debug(`Releasing PostGraphile[${key}]`);
      try {
        await entry.pgl.release();
      } catch (err) {
        log.error(`Error releasing PostGraphile[${key}]:`, err);
      }
    }
    
    graphileCache.clear();
    await pgCache.close();
    if (verbose) log.success('All caches disposed.');
  })();

  return closePromise.promise;
};

// Re-export for backward compatibility
export type GraphileCache = GraphileCacheEntry;

// --- Cross-Node Cache Invalidation ---

/**
 * Singleton cache invalidation service instance.
 * Initialized via initCrossNodeInvalidation().
 */
let invalidationService: CacheInvalidationService | null = null;

/**
 * Initialize cross-node cache invalidation.
 *
 * This sets up a PostgreSQL LISTEN/NOTIFY connection that allows multiple
 * server nodes to coordinate cache invalidation. When a cache entry is
 * deleted on one node, all other nodes will be notified and delete
 * the same entry.
 *
 * @param pool - PostgreSQL connection pool to use for LISTEN/NOTIFY
 * @param config - Optional configuration overrides
 * @returns The CacheInvalidationService instance
 *
 * @example
 * ```typescript
 * import { initCrossNodeInvalidation } from 'graphile-cache';
 * import { getPgPool } from 'pg-cache';
 *
 * const pgPool = getPgPool({ database: 'mydb' });
 * const invalidation = await initCrossNodeInvalidation(pgPool);
 *
 * // Now cache deletions will propagate to all nodes
 * await invalidateCacheKey('my-key'); // Deletes locally and broadcasts
 * ```
 */
export async function initCrossNodeInvalidation(
  pool: Pool,
  config?: CacheInvalidationConfig
): Promise<CacheInvalidationService> {
  // Stop existing service if any
  if (invalidationService) {
    await invalidationService.stop();
  }

  invalidationService = new CacheInvalidationService(pool, config);

  // Register handler for key-based invalidation
  invalidationService.onInvalidate((key: string) => {
    if (graphileCache.has(key)) {
      log.info(`Cross-node invalidation: deleting graphileCache[${key}]`);
      graphileCache.delete(key);
      cacheEvents.emit('eviction', key, 'manual');
    }
  });

  // Register handler for pattern-based invalidation
  invalidationService.onPatternInvalidate((pattern: RegExp): number => {
    const count = clearMatchingEntries(pattern);
    if (count > 0) {
      log.info(`Cross-node invalidation: cleared ${count} entries matching ${pattern}`);
    }
    return count;
  });

  await invalidationService.start();
  return invalidationService;
}

/**
 * Get the current cache invalidation service instance.
 * Returns null if cross-node invalidation has not been initialized.
 */
export function getCacheInvalidationService(): CacheInvalidationService | null {
  return invalidationService;
}

/**
 * Invalidate a cache key locally and broadcast to all nodes.
 *
 * This is the recommended way to delete cache entries when cross-node
 * invalidation is enabled. It ensures all server instances are notified.
 *
 * @param key - The cache key to invalidate
 */
export async function invalidateCacheKey(key: string): Promise<void> {
  // Always delete locally first
  if (graphileCache.has(key)) {
    graphileCache.delete(key);
    cacheEvents.emit('eviction', key, 'manual');
  }

  // Broadcast to other nodes if service is initialized and enabled
  if (invalidationService?.running) {
    await invalidationService.invalidate(key);
  }
}

/**
 * Invalidate cache entries matching a pattern and broadcast to all nodes.
 *
 * @param pattern - Regex pattern string to match cache keys
 * @returns Number of local entries cleared
 */
export async function invalidateCachePattern(pattern: string): Promise<number> {
  // Clear locally first
  const regex = new RegExp(pattern);
  const cleared = clearMatchingEntries(regex);

  // Broadcast to other nodes if service is initialized and enabled
  if (invalidationService?.running) {
    await invalidationService.invalidatePattern(pattern);
  }

  return cleared;
}

/**
 * Stop cross-node cache invalidation.
 * Call this during server shutdown to clean up resources.
 */
export async function stopCrossNodeInvalidation(): Promise<void> {
  if (invalidationService) {
    await invalidationService.stop();
    invalidationService = null;
  }
}
