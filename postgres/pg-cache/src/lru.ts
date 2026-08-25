import { Logger } from '@pgpmjs/logger';
import { parseEnvNumber } from '12factor-env';
import { LRUCache } from 'lru-cache';
import pg from 'pg';

const log = new Logger('pg-cache');

const ONE_HOUR_IN_MS = 1000 * 60 * 60;
const ONE_DAY = ONE_HOUR_IN_MS * 24;
const ONE_YEAR = ONE_DAY * 366;

// Kubernetes sends only SIGTERM on pod shutdown
const SYS_EVENTS = ['SIGTERM'];

export type PgPoolKey = string;

// Cleanup callback type - called when a pg pool is disposed
export type PoolCleanupCallback = (pgPoolKey: string) => void | Promise<void>;

// --- Cache Configuration ---

export interface PgCacheConfig {
  /** Maximum number of pools in the LRU cache (env: PG_CACHE_MAX, default: 50) */
  max: number;
  /** TTL for cached pools in ms (default: ONE_YEAR) */
  ttl: number;
}

/**
 * Read cache configuration from environment variables.
 *
 * Supports:
 * - PG_CACHE_MAX: Maximum number of pools (default: 50)
 * - PG_CACHE_TTL_MS: TTL in milliseconds (default: ONE_YEAR)
 */
export function getPgCacheConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env
): PgCacheConfig {
  return {
    max: parseEnvNumber(environment.PG_CACHE_MAX) ?? 50,
    ttl: parseEnvNumber(environment.PG_CACHE_TTL_MS) ?? ONE_YEAR,
  };
}

class ManagedPgPool {
  public isDisposed = false;
  private disposePromise: Promise<void> | null = null;

  constructor(
    public readonly pool: pg.Pool,
    public readonly key: string
  ) {}

  async dispose(): Promise<void> {
    if (this.isDisposed) return this.disposePromise;

    this.isDisposed = true;
    this.disposePromise = (async () => {
      try {
        if (!this.pool.ended) {
          await this.pool.end();
          log.success(`pg.Pool ${this.key} ended.`);
        } else {
          log.info(`pg.Pool ${this.key} already ended.`);
        }
      } catch (err) {
        log.error(
          `Error ending pg.Pool ${this.key}: ${(err as Error).message}`
        );
        throw err;
      }
    })();

    return this.disposePromise;
  }
}

export class PgPoolCacheManager {
  private cleanupTasks = new Set<Promise<void>>();
  private scheduledPools = new WeakSet<ManagedPgPool>();
  private closed = false;
  private closePromise: Promise<void> | null = null;
  private cleanupCallbacks: Set<PoolCleanupCallback> = new Set();
  readonly config: PgCacheConfig;

  private readonly pgCache: LRUCache<PgPoolKey, ManagedPgPool>;

  constructor(
    config?: Partial<PgCacheConfig>,
    environment: Readonly<Record<string, string | undefined>> = process.env
  ) {
    const defaults = getPgCacheConfig(environment);
    this.config = { ...defaults, ...config };

    this.pgCache = new LRUCache<PgPoolKey, ManagedPgPool>({
      max: this.config.max,
      ttl: this.config.ttl,
      updateAgeOnGet: true,
      dispose: (managedPool, key, reason) => {
        log.debug(`Disposing pg pool [${key}] (${reason})`);
        this.scheduleDisposal(key, managedPool);
      },
    });
  }

  // Register a cleanup callback to be called when pools are disposed
  registerCleanupCallback(callback: PoolCleanupCallback): () => void {
    this.cleanupCallbacks.add(callback);
    // Return unregister function
    return () => {
      this.cleanupCallbacks.delete(callback);
    };
  }

  get(key: PgPoolKey): pg.Pool | undefined {
    if (this.closed) {
      log.warn(`Cache is closed, ignoring get(${key})`);
      return undefined;
    }
    return this.pgCache.get(key)?.pool;
  }

  has(key: PgPoolKey): boolean {
    return this.pgCache.has(key);
  }

  set(key: PgPoolKey, pool: pg.Pool): void {
    if (this.closed)
      throw new Error(
        `Cannot add to cache after it has been closed (key: ${key})`
      );
    this.pgCache.set(key, new ManagedPgPool(pool, key));
  }

  delete(key: PgPoolKey): void {
    this.pgCache.delete(key);
  }

  clear(): void {
    this.pgCache.clear();
  }

  keys(): IterableIterator<PgPoolKey> {
    return this.pgCache.keys();
  }

  async closeMatching(predicate: (key: PgPoolKey) => boolean): Promise<number> {
    const keys = [...this.pgCache.keys()].filter(predicate);
    for (const key of keys) this.pgCache.delete(key);
    await this.waitForDisposals();
    return keys.length;
  }

  async close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.closePromise = (async () => {
      this.closed = true;
      try {
        this.clear();
        await this.waitForDisposals();
      } finally {
        // Re-open the cache so it can accept new entries if the process
        // survives shutdown (for example during provisioning or restart).
        this.closed = false;
        this.closePromise = null;
      }
    })();
    return this.closePromise;
  }

  async waitForDisposals(): Promise<void> {
    while (this.cleanupTasks.size > 0) {
      await Promise.allSettled([...this.cleanupTasks]);
    }
  }

  private async notifyCleanup(pgPoolKey: string): Promise<void> {
    const results = await Promise.allSettled(
      [...this.cleanupCallbacks].map((callback) => callback(pgPoolKey))
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        log.error(
          `Error in cleanup callback for pool ${pgPoolKey}: ${
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason)
          }`
        );
      }
    }
  }

  private scheduleDisposal(key: PgPoolKey, managedPool: ManagedPgPool): void {
    if (this.scheduledPools.has(managedPool)) return;
    this.scheduledPools.add(managedPool);

    const task = (async () => {
      await this.notifyCleanup(key);
      await managedPool.dispose();
    })();
    this.cleanupTasks.add(task);
    void task.catch((): void => {});
    void task.then(
      (): void => {
        this.cleanupTasks.delete(task);
      },
      (): void => {
        this.cleanupTasks.delete(task);
      }
    );
  }
}

// Create the singleton instance
export const pgCache = new PgPoolCacheManager();

// --- Graceful Shutdown ---
const closePromise: { promise: Promise<void> | null } = { promise: null };

export const close = async (verbose = false): Promise<void> => {
  if (closePromise.promise) return closePromise.promise;

  closePromise.promise = (async () => {
    try {
      if (verbose) log.info('Closing pg cache...');
      await pgCache.close();
      if (verbose) log.success('PG cache disposed.');
    } finally {
      // Reset so close() can be called again if the process survives.
      closePromise.promise = null;
    }
  })();

  return closePromise.promise;
};

SYS_EVENTS.forEach((event) => {
  process.on(event, () => {
    log.info(`Received ${event}`);
    close();
  });
});

export const teardownPgPools = async (verbose = false): Promise<void> => {
  return close(verbose);
};
