import { Logger } from '@pgpmjs/logger';
import { LRUCache } from 'lru-cache';
import { pgCache } from 'pg-cache';
import type { Express } from 'express';
import type { Server as HttpServer } from 'http';

const log = new Logger('graphile-cache');

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

// --- Graphile Cache ---
export const graphileCache = new LRUCache<string, GraphileCacheEntry>({
  max: cacheConfig.max,
  ttl: cacheConfig.ttl,
  updateAgeOnGet: cacheConfig.updateAgeOnGet,
  dispose: (entry: GraphileCacheEntry, key: string) => {
    log.debug(`Disposing PostGraphile[${key}]`);
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
