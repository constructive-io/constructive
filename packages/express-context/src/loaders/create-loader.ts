/**
 * create-loader — Factory for building cached ModuleLoader instances.
 *
 * Wraps a raw resolve function with an LRU cache keyed by the physical routing
 * and tenant pools, routing schema, databaseId, and apiId. Each loader gets its
 * own independent cache with a configurable hard TTL and maximum size.
 */

import { Logger } from '@pgpmjs/logger';
import { LRUCache } from 'lru-cache';

import {
  type LoaderContext,
  type ModuleLoader,
  routingSchemaOf
} from './types';

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

let nextPoolIdentity = 0;
const poolIdentities = new WeakMap<object, number>();

const poolIdentity = (pool: object): number => {
  let identity = poolIdentities.get(pool);
  if (identity === undefined) {
    identity = ++nextPoolIdentity;
    poolIdentities.set(pool, identity);
  }
  return identity;
};

interface LoaderCacheContract {
  databaseId: string;
  routingSchema: string;
  routingPoolIdentity: number;
  tenantPoolIdentity: number;
}

const cacheContract = (ctx: LoaderContext): LoaderCacheContract => ({
  databaseId: ctx.databaseId,
  routingSchema: routingSchemaOf(ctx),
  routingPoolIdentity: poolIdentity(ctx.routingPool),
  tenantPoolIdentity: poolIdentity(ctx.tenantPool)
});

const cacheKey = (ctx: LoaderContext, contract: LoaderCacheContract): string =>
  JSON.stringify([
    contract.routingPoolIdentity,
    contract.tenantPoolIdentity,
    contract.routingSchema,
    contract.databaseId,
    ctx.apiId ?? null
  ]);

interface LoaderCacheEntry<T> {
  contract: LoaderCacheContract;
  value: T | undefined;
}

interface PendingResolution<T> {
  contract: LoaderCacheContract;
  invalidated: boolean;
  promise: Promise<T | undefined>;
}

const samePhysicalContract = (
  left: LoaderCacheContract,
  right: LoaderCacheContract
): boolean =>
  left.routingPoolIdentity === right.routingPoolIdentity
  && left.tenantPoolIdentity === right.tenantPoolIdentity
  && left.routingSchema === right.routingSchema;

export function createModuleLoader<T>(opts: CreateLoaderOptions<T>): ModuleLoader<T> {
  const log = new Logger(`loader:${opts.name}`);
  const cache = new LRUCache<string, LoaderCacheEntry<T>>({
    max: opts.max ?? DEFAULT_MAX,
    ttl: opts.ttlMs ?? DEFAULT_TTL_MS,
    ttlResolution: 0,
    updateAgeOnGet: false,
    allowStale: false,
  });
  const pending = new Map<string, PendingResolution<T>>();

  return {
    name: opts.name,

    async resolve(ctx: LoaderContext): Promise<T | undefined> {
      const logicalKey = ctx.apiId
        ? `${ctx.databaseId}:${ctx.apiId}`
        : ctx.databaseId;
      const contract = cacheContract(ctx);
      const key = cacheKey(ctx, contract);

      const cached = cache.get(key);
      if (cached !== undefined) {
        log.debug(`Cache HIT databaseId=${logicalKey}`);
        return cached.value;
      }

      const existing = pending.get(key);
      if (existing && !existing.invalidated) {
        log.debug(`Cache COALESCE databaseId=${logicalKey}`);
        return existing.promise;
      }

      log.debug(`Cache MISS databaseId=${logicalKey}, resolving`);
      // "Not provisioned" is expressed by the loader returning undefined, or
      // by the module's tables not existing at all (42P01 undefined_table).
      // Any other resolution error (bad query, ambiguous config) propagates —
      // never silently coerced into "module absent".
      const resolution: PendingResolution<T> = {
        contract,
        invalidated: false,
        promise: Promise.resolve(undefined)
      };
      resolution.promise = Promise.resolve().then(async () => {
        try {
          const value = await opts.resolve(ctx);
          if (!resolution.invalidated) {
            cache.set(key, { contract, value });
          }
          return value;
        } catch (e: any) {
          if (e.code === '42P01') {
            log.debug(
              `Module tables absent for databaseId=${logicalKey}: ${e.message}`
            );
            if (!resolution.invalidated) {
              cache.set(key, { contract, value: undefined });
            }
            return undefined;
          }
          log.warn(`Failed to resolve databaseId=${logicalKey}: ${e.message}`);
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

    invalidate(databaseId?: string, context?: LoaderContext): void {
      if (!databaseId && !context) {
        const previousSize = cache.size;
        cache.clear();
        for (const resolution of pending.values()) {
          resolution.invalidated = true;
        }
        log.debug(`Invalidated all entries (was size=${previousSize})`);
        return;
      }

      const exact = context ? cacheContract(context) : null;
      const matches = (contract: LoaderCacheContract): boolean =>
        (!databaseId || contract.databaseId === databaseId)
        && (!exact || samePhysicalContract(contract, exact));
      let cleared = 0;
      for (const [key, entry] of cache.entries()) {
        if (!matches(entry.contract)) continue;
        if (cache.delete(key)) cleared++;
      }
      for (const resolution of pending.values()) {
        if (matches(resolution.contract)) resolution.invalidated = true;
      }
      log.debug(
        `Invalidated ${cleared} entries${databaseId ? ` for databaseId=${databaseId}` : ''}`
      );
    },

    get cacheSize(): number {
      return cache.size;
    },
  };
}
