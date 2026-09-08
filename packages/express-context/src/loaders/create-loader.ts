/**
 * create-loader — Factory for building cached ModuleLoader instances.
 *
 * Wraps a raw resolve function with an LRU cache keyed by databaseId:apiId.
 * Each loader gets its own independent cache with a configurable hard TTL and
 * maximum size.
 */

import { Logger } from '@pgpmjs/logger';
import { LRUCache } from 'lru-cache';

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

interface PendingResolution<T> {
  databaseId: string;
  invalidated: boolean;
  promise: Promise<T | undefined>;
}

export function createModuleLoader<T>(opts: CreateLoaderOptions<T>): ModuleLoader<T> {
  const log = new Logger(`loader:${opts.name}`);
  const cache = new LRUCache<string, T>({
    max: opts.max ?? DEFAULT_MAX,
    ttl: opts.ttlMs ?? DEFAULT_TTL_MS,
    updateAgeOnGet: false,
    allowStale: false,
  });
  const pending = new Map<string, PendingResolution<T>>();

  return {
    name: opts.name,

    async resolve(ctx: LoaderContext): Promise<T | undefined> {
      const key = ctx.apiId ? `${ctx.databaseId}:${ctx.apiId}` : ctx.databaseId;

      const cached = cache.get(key);
      if (cached !== undefined) {
        log.debug(`Cache HIT databaseId=${key}`);
        return cached;
      }

      const existing = pending.get(key);
      if (existing && !existing.invalidated) {
        log.debug(`Cache COALESCE databaseId=${key}`);
        return existing.promise;
      }

      log.debug(`Cache MISS databaseId=${key}, resolving`);
      // "Not provisioned" is expressed by the loader returning undefined, or
      // by the module's tables not existing at all (42P01 undefined_table).
      // Any other resolution error (bad query, ambiguous config) propagates —
      // never silently coerced into "module absent".
      const resolution: PendingResolution<T> = {
        databaseId: ctx.databaseId,
        invalidated: false,
        promise: Promise.resolve(undefined)
      };
      resolution.promise = Promise.resolve().then(async () => {
        try {
          const value = await opts.resolve(ctx);
          // Keep absence uncached so subsequent calls can discover new config.
          if (!resolution.invalidated && value !== undefined) {
            cache.set(key, value);
          }
          return value;
        } catch (e: any) {
          if (e.code === '42P01') {
            log.debug(
              `Module tables absent for databaseId=${key}: ${e.message}`
            );
            return undefined;
          }
          log.warn(`Failed to resolve databaseId=${key}: ${e.message}`);
          throw e;
        } finally {
          if (pending.get(key) === resolution) {
            pending.delete(key);
          }
        }
      });
      pending.set(key, resolution);
      return resolution.promise;
    },

    invalidate(databaseId?: string): void {
      if (!databaseId) {
        const previousSize = cache.size;
        cache.clear();
        for (const resolution of pending.values()) {
          resolution.invalidated = true;
        }
        log.debug(`Invalidated all entries (was size=${previousSize})`);
        return;
      }

      let cleared = 0;
      for (const key of cache.keys()) {
        if (key === databaseId || key.startsWith(`${databaseId}:`)) {
          if (cache.delete(key)) cleared++;
        }
      }
      for (const resolution of pending.values()) {
        if (resolution.databaseId === databaseId) resolution.invalidated = true;
      }
      log.debug(`Invalidated ${cleared} entries for databaseId=${databaseId}`);
    },

    get cacheSize(): number {
      return cache.size;
    },
  };
}
