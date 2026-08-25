import { EventEmitter } from 'events';
import { parseEnvNumber } from '12factor-env';
import { Logger } from '@pgpmjs/logger';
import { LRUCache } from 'lru-cache';
import { pgCache, PgPoolCacheManager } from 'pg-cache';
import type { Express } from 'express';
import type { Server as HttpServer } from 'http';
import type { PostGraphileInstance } from 'postgraphile';
import type { GrafservBase } from 'grafserv';

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

/**
 * Get cache configuration from environment variables
 *
 * Supports:
 * - GRAPHILE_CACHE_MAX: Maximum number of entries (default: 50)
 * - GRAPHILE_CACHE_TTL_MS: TTL in milliseconds
 *   - Production default: ONE_YEAR
 *   - Development default: FIVE_MINUTES_MS
 *
 * NOTE: This value should be <= PG_CACHE_MAX (also default: 50) so that
 * every cached PostGraphile instance has a live pool backing it.
 */
export function getCacheConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env
): CacheConfig {
  const isDevelopment = environment.NODE_ENV === 'development';

  const max = parseEnvNumber(environment.GRAPHILE_CACHE_MAX) ?? 50;

  const ttl =
    parseEnvNumber(environment.GRAPHILE_CACHE_TTL_MS) ??
    (isDevelopment ? FIVE_MINUTES_MS : ONE_YEAR);

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
  /** Exact pg-cache key backing this instance. */
  pgPoolKey?: string;
  createdAt: number;
  /** Optional RealtimeManager for cursor-tracked subscription delivery */
  realtimeManager?: { stop(): Promise<void> } | null;
}

const disposeEntry = async (
  entry: GraphileCacheEntry,
  key: string
): Promise<void> => {
  log.debug(`Disposing PostGraphile[${key}]`);
  try {
    // Close HTTP server if it's listening
    if (entry.httpServer?.listening) {
      await new Promise<void>((resolve) => {
        entry.httpServer.close(() => resolve());
      });
    }
    // Stop RealtimeManager if present (before releasing PostGraphile)
    if (entry.realtimeManager) {
      try {
        await entry.realtimeManager.stop();
      } catch (err) {
        log.error(
          `Error stopping RealtimeManager for PostGraphile[${key}]:`,
          err
        );
      }
    }
    // Release PostGraphile instance (this also releases grafserv internally)
    if (entry.pgl) {
      await entry.pgl.release();
    }
  } catch (err) {
    log.error(`Error disposing PostGraphile[${key}]:`, err);
  }
};

export interface GraphileCacheManagerOptions {
  config?: Partial<CacheConfig>;
  environment?: Readonly<Record<string, string | undefined>>;
  pgCache?: PgPoolCacheManager;
  events?: CacheEventEmitter;
}

/** An owned PostGraphile cache whose teardown cannot affect another server. */
export class GraphileCacheManager {
  private readonly cache: LRUCache<string, GraphileCacheEntry>;
  private readonly manualEvictionKeys = new Set<string>();
  private readonly disposalPromises = new Map<
    GraphileCacheEntry,
    Promise<void>
  >();
  private closePromise: Promise<void> | null = null;
  private readonly pgPoolCache: PgPoolCacheManager;
  readonly events: CacheEventEmitter;
  readonly config: CacheConfig;

  constructor(options: GraphileCacheManagerOptions = {}) {
    this.config = {
      ...getCacheConfig(options.environment),
      ...options.config,
    };
    this.pgPoolCache = options.pgCache ?? pgCache;
    this.events = options.events ?? new CacheEventEmitter();
    this.cache = new LRUCache<string, GraphileCacheEntry>({
      max: this.config.max,
      ttl: this.config.ttl,
      updateAgeOnGet: true,
      dispose: (entry, key) => {
        const reason = this.getEvictionReason(key, entry);
        this.events.emitEviction({ key, reason, entry });
        log.debug(`Evicting PostGraphile[${key}] (reason: ${reason})`);
        this.scheduleDisposal(entry, key);
      },
    });

    this.pgPoolCache.registerCleanupCallback(async (pgPoolKey) => {
      const keys = [...this.cache.entries()]
        .filter(([, entry]) => entry.pgPoolKey === pgPoolKey)
        .map(([key]) => key);
      for (const key of keys) this.delete(key);
      await this.waitForDisposals();
    });
  }

  get size(): number {
    return this.cache.size;
  }

  get max(): number {
    return this.cache.max;
  }

  get(key: string): GraphileCacheEntry | undefined {
    return this.cache.get(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  set(key: string, entry: GraphileCacheEntry): this {
    this.cache.set(key, entry);
    return this;
  }

  delete(key: string): boolean {
    if (!this.cache.has(key)) return false;
    this.manualEvictionKeys.add(key);
    return this.cache.delete(key);
  }

  clear(): void {
    for (const key of this.cache.keys()) this.manualEvictionKeys.add(key);
    this.cache.clear();
  }

  entries(): IterableIterator<[string, GraphileCacheEntry]> {
    return this.cache.entries();
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  forEach(callback: (entry: GraphileCacheEntry, key: string) => void): void {
    this.cache.forEach(callback);
  }

  getRemainingTTL(key: string): number {
    return this.cache.getRemainingTTL(key);
  }

  async close(options: { closePools?: boolean } = {}): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.closePromise = (async () => {
      try {
        this.clear();
        await this.waitForDisposals();
        if (options.closePools) await this.pgPoolCache.close();
      } finally {
        this.closePromise = null;
      }
    })();
    return this.closePromise;
  }

  async closeMatching(
    predicate: (key: string, entry: GraphileCacheEntry) => boolean
  ): Promise<number> {
    const entries = [...this.cache.entries()].filter(([key, entry]) =>
      predicate(key, entry)
    );
    for (const [key] of entries) this.delete(key);
    await this.waitForDisposals();
    return entries.length;
  }

  async waitForDisposals(): Promise<void> {
    while (this.disposalPromises.size > 0) {
      await Promise.allSettled([...this.disposalPromises.values()]);
    }
  }

  private getEvictionReason(
    key: string,
    entry: GraphileCacheEntry
  ): EvictionReason {
    if (this.manualEvictionKeys.delete(key)) return 'manual';
    return Date.now() - entry.createdAt >= this.config.ttl ? 'ttl' : 'lru';
  }

  private scheduleDisposal(entry: GraphileCacheEntry, key: string): void {
    if (this.disposalPromises.has(entry)) return;
    const promise = disposeEntry(entry, key);
    this.disposalPromises.set(entry, promise);
    void promise.catch((): void => {});
    void promise.then(
      (): void => {
        this.disposalPromises.delete(entry);
      },
      (): void => {
        this.disposalPromises.delete(entry);
      }
    );
  }
}

export const graphileCache = new GraphileCacheManager({
  pgCache,
  events: cacheEvents,
});

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
export function getCacheStats(
  cache: GraphileCacheManager = graphileCache
): CacheStats {
  return {
    size: cache.size,
    max: cache.max,
    ttl: cache.config.ttl,
    keys: [...cache.keys()],
  };
}

// --- Clear Matching Entries ---
/**
 * Clear cache entries matching a regex pattern
 *
 * @param pattern - RegExp to match against cache keys
 * @returns Number of entries cleared
 */
export function clearMatchingEntries(
  pattern: RegExp,
  cache: GraphileCacheManager = graphileCache
): number {
  let cleared = 0;

  for (const key of cache.keys()) {
    if (pattern.test(key)) {
      cache.delete(key);
      cleared++;
    }
  }

  return cleared;
}

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

      await graphileCache.close({ closePools: true });

      if (verbose) log.success('All caches disposed.');
    } finally {
      closePromise.promise = null;
    }
  })();

  return closePromise.promise;
};
