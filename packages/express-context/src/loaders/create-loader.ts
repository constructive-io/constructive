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
  /**
   * Whether cache hits refresh the TTL.
   * Defaults to false so ttlMs is a bounded staleness window.
   * Set true only for intentionally sliding caches.
   */
  updateAgeOnGet?: boolean;
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
    updateAgeOnGet: opts.updateAgeOnGet ?? false,
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
      // "Not provisioned" is expressed by the loader returning undefined, or
      // by the module's tables not existing at all (42P01 undefined_table).
      // Any other resolution error (bad query, ambiguous config) propagates —
      // never silently coerced into "module absent".
      try {
        const value = await opts.resolve(ctx);
        cache.set(key, value);
        return value;
      } catch (e: any) {
        if (e.code === '42P01') {
          log.debug(`Module tables absent for databaseId=${key}: ${e.message}`);
          cache.set(key, undefined);
          return undefined;
        }
        log.warn(`Failed to resolve databaseId=${key}: ${e.message}`);
        throw e;
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
