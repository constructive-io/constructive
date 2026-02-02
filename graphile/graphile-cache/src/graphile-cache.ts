import { EventEmitter } from 'events';
import { Logger } from '@pgpmjs/logger';
import { LRUCache } from 'lru-cache';
import { pgCache } from 'pg-cache';
import type { Express } from 'express';
import type { Server as HttpServer } from 'http';

const log = new Logger('graphile-cache');

// Time constants
const ONE_HOUR_MS = 1000 * 60 * 60;
const FIVE_MINUTES_MS = 1000 * 60 * 5;

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
  /** Flag to track if this entry has been released to prevent double-release */
  released?: boolean;
}

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  /** Maximum number of entries in cache */
  max: number;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Whether to reset TTL on cache access */
  updateAgeOnGet: boolean;
}

/**
 * Eviction reason type for metrics differentiation
 */
export type EvictionReason = 'lru' | 'ttl' | 'manual';

/**
 * Cache events interface for type-safe event emitter
 */
interface CacheEvents {
  eviction: (key: string, reason: EvictionReason) => void;
}

/**
 * Type-safe event emitter for cache events
 */
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

/**
 * Event emitter for observing cache evictions
 */
export const cacheEvents = new CacheEventEmitter();

/**
 * Track keys that are being manually evicted (for accurate metrics)
 */
const manualEvictionKeys = new Set<string>();

/**
 * Get cache configuration from environment variables with sensible defaults.
 *
 * Environment variables:
 * - GRAPHILE_CACHE_MAX: Maximum number of cache entries (default: 50)
 * - GRAPHILE_CACHE_TTL_MS: Cache entry TTL in milliseconds
 *   - Production default: 1 hour (3600000ms)
 *   - Development default: 5 minutes (300000ms)
 * - NODE_ENV: Controls TTL preset selection ('development' uses shorter TTL)
 */
export function getCacheConfig(): CacheConfig {
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

// Load configuration at module initialization
const cacheConfig = getCacheConfig();

// --- Graphile Cache ---
export const graphileCache = new LRUCache<string, GraphileCacheEntry>({
  max: cacheConfig.max,
  ttl: cacheConfig.ttl,
  updateAgeOnGet: cacheConfig.updateAgeOnGet,
  dispose: (entry: GraphileCacheEntry, key: string, reason: LRUCache.DisposeReason) => {
    // Skip if already released (prevents double-release during closeAllCaches)
    if (entry.released) {
      log.debug(`PostGraphile[${key}] already released, skipping dispose`);
      return;
    }
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
        entry.released = true;
        await entry.pgl.release();
      } catch (err) {
        log.error(`Error releasing PostGraphile[${key}]:`, err);
      }
    })();
  }
});

/**
 * Get current cache statistics for monitoring and debugging.
 *
 * @returns Object containing cache size, max capacity, TTL, and current keys
 */
export function getCacheStats(): {
  size: number;
  max: number;
  ttl: number;
  keys: string[];
} {
  return {
    size: graphileCache.size,
    max: cacheConfig.max,
    ttl: cacheConfig.ttl,
    keys: [...graphileCache.keys()],
  };
}

/**
 * Clear all cache entries matching a regex pattern.
 * Useful for invalidating related entries (e.g., all entries for a specific database).
 *
 * @param pattern - RegExp to match against cache keys
 * @returns Number of entries cleared
 */
export function clearMatchingEntries(pattern: RegExp): number {
  let cleared = 0;
  for (const key of graphileCache.keys()) {
    if (pattern.test(key)) {
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
  graphileCache.forEach((entry, k) => {
    if (entry.cacheKey.includes(pgPoolKey)) {
      log.debug(`Removing graphileCache[${k}] due to pgPool[${pgPoolKey}]`);
      manualEvictionKeys.add(k);
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

    // Release all PostGraphile instances and mark them as released
    for (const [key, entry] of graphileCache.entries()) {
      if (entry.released) continue;
      log.debug(`Releasing PostGraphile[${key}]`);
      try {
        entry.released = true;
        await entry.pgl.release();
      } catch (err) {
        log.error(`Error releasing PostGraphile[${key}]:`, err);
      }
    }

    // Clear the cache (dispose callbacks will skip already-released entries)
    graphileCache.clear();
    await pgCache.close();
    if (verbose) log.success('All caches disposed.');
  })();

  return closePromise.promise;
};

// Re-export for backward compatibility
export type GraphileCache = GraphileCacheEntry;

// Export time constants for external use
export { ONE_HOUR_MS, FIVE_MINUTES_MS };
