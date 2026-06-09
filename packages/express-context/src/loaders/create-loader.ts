/**
 * create-loader — Factory for building cached ModuleLoader instances.
 *
 * Wraps a raw resolve function with an LRU cache keyed by databaseId:apiId.
 * Each loader gets its own independent cache with configurable TTL and
 * max entries.
 */

import { LRUCache } from 'lru-cache';
import { Logger } from '@pgpmjs/logger';

import type { LoaderContext, ModuleLoader } from './types';

export interface CreateLoaderOptions<T> {
  /** Unique loader name (used in log prefix and modules map key) */
  name: string;
  /** TTL in milliseconds (default: 60_000 — 1 minute) */
  ttlMs?: number;
  /** Max cache entries before LRU eviction (default: 100) */
  max?: number;
  /** The actual resolution function. Called on cache miss. */
  resolve: (ctx: LoaderContext) => Promise<T | undefined>;
}

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_MAX = 100;

export function createModuleLoader<T>(opts: CreateLoaderOptions<T>): ModuleLoader<T> {
  const log = new Logger(`loader:${opts.name}`);
  const cache = new LRUCache<string, T | undefined>({
    max: opts.max ?? DEFAULT_MAX,
    ttl: opts.ttlMs ?? DEFAULT_TTL_MS,
    updateAgeOnGet: false, // TTL from first set, not refreshed on read
    allowStale: false,
  });

  return {
    name: opts.name,

    async resolve(ctx: LoaderContext): Promise<T | undefined> {
      const key = ctx.apiId ? `${ctx.databaseId}:${ctx.apiId}` : ctx.databaseId;

      if (cache.has(key)) {
        log.debug(`Cache HIT databaseId=${key}`);
        return cache.get(key);
      }

      log.debug(`Cache MISS databaseId=${key}, resolving`);
      try {
        const value = await opts.resolve(ctx);
        cache.set(key, value);
        return value;
      } catch (e: any) {
        log.warn(`Failed to resolve databaseId=${key}: ${e.message}`);
        return undefined;
      }
    },

    invalidate(databaseId?: string): void {
      if (databaseId) {
        // Clear the plain databaseId key and any composite databaseId:apiId keys
        let cleared = 0;
        for (const k of cache.keys()) {
          if (k === databaseId || k.startsWith(`${databaseId}:`)) {
            cache.delete(k);
            cleared++;
          }
        }
        log.debug(`Invalidated ${cleared} entries for databaseId=${databaseId}`);
      } else {
        cache.clear();
        log.debug(`Invalidated all entries (was size=${cache.size})`);
      }
    },

    get cacheSize(): number {
      return cache.size;
    },
  };
}
