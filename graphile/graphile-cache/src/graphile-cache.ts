import { Logger } from '@pgpmjs/logger';
import { LRUCache } from 'lru-cache';
import { pgCache } from 'pg-cache';
import type { Express } from 'express';
import type { Server as HttpServer } from 'http';

const log = new Logger('graphile-cache');

const ONE_HOUR_IN_MS = 1000 * 60 * 60;
const ONE_DAY = ONE_HOUR_IN_MS * 24;
const ONE_YEAR = ONE_DAY * 366;

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
  max: 15,
  ttl: ONE_YEAR,
  updateAgeOnGet: true,
  dispose: async (entry, key) => {
    log.debug(`Disposing PostGraphile[${key}]`);
    try {
      await entry.pgl.release();
    } catch (err) {
      log.error(`Error releasing PostGraphile[${key}]:`, err);
    }
  }
});

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
