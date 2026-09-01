import { Logger } from '@pgpmjs/logger';
import { LRUCache } from 'lru-cache';

const log = new Logger('routing-service-cache');

const ONE_HOUR_IN_MS = 1000 * 60 * 60;
const ONE_DAY = ONE_HOUR_IN_MS * 24;
const ONE_YEAR = ONE_DAY * 366;

export const SVC_CACHE_TTL_MS = ONE_YEAR;
export const DEFAULT_SVC_CACHE_MAX_ENTRIES = 1024;

export type SvcCacheEvictionReason = 'capacity' | 'ttl';

export interface SvcCacheStats {
  size: number;
  max: number;
  ttlMs: number;
  hits: number;
  misses: number;
  evictions: number;
  evictionsByReason: Record<SvcCacheEvictionReason, number>;
  oldestKeyAgeMs: number | null;
  keys: string[];
}

export interface ConfigureSvcCacheOptions {
  /** Exact operator ceiling. Omit to use the safe process default. */
  maxEntries?: number;
  /** Capacity floor imposed by the caller, such as resident Graphile capacity. */
  minimumEntries?: number;
}

const assertPositiveSafeInteger = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive safe integer`);
  }
};

export const resolveSvcCacheMaxEntries = ({
  maxEntries,
  minimumEntries = 1
}: ConfigureSvcCacheOptions = {}): number => {
  assertPositiveSafeInteger(minimumEntries, 'svcCache minimumEntries');
  if (maxEntries === undefined) {
    return Math.max(DEFAULT_SVC_CACHE_MAX_ENTRIES, minimumEntries);
  }

  assertPositiveSafeInteger(maxEntries, 'svcCache maxEntries');
  if (maxEntries < minimumEntries) {
    throw new Error(
      `svcCache maxEntries (${maxEntries}) must be at least the required minimum (${minimumEntries})`
    );
  }
  return maxEntries;
};

/**
 * Process-wide routing-label metadata cache.
 *
 * This cache deliberately owns only resolved routing metadata. Capacity or TTL
 * eviction never disposes a PostGraphile instance; a later request simply
 * resolves the label again and reuses the independently keyed Graphile build.
 */
class RoutingServiceCache<T = unknown> {
  private cache: LRUCache<string, T>;
  private hits = 0;
  private misses = 0;
  private readonly evictionsByReason: Record<SvcCacheEvictionReason, number> = {
    capacity: 0,
    ttl: 0
  };

  constructor(maxEntries: number) {
    this.cache = this.createCache(maxEntries);
  }

  private createCache(maxEntries: number): LRUCache<string, T> {
    return new LRUCache<string, T>({
      max: maxEntries,
      ttl: SVC_CACHE_TTL_MS,
      updateAgeOnGet: true,
      dispose: (_, key, reason) => {
        if (reason === 'evict') {
          this.evictionsByReason.capacity++;
          log.debug(`Evicting routing metadata[${key}] (capacity)`);
        } else if (reason === 'expire') {
          this.evictionsByReason.ttl++;
          log.debug(`Evicting routing metadata[${key}] (ttl)`);
        }
      }
    });
  }

  configure(maxEntries: number): void {
    assertPositiveSafeInteger(maxEntries, 'svcCache maxEntries');
    if (maxEntries === this.cache.max) return;
    if (this.cache.size > 0) {
      throw new Error(
        'svcCache cannot be reconfigured while routing metadata is resident; clear it first'
      );
    }
    this.cache = this.createCache(maxEntries);
  }

  get size(): number {
    return this.cache.size;
  }

  get max(): number {
    return this.cache.max;
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value === undefined) this.misses++;
    else this.hits++;
    return value;
  }

  /** Existence inspection is intentionally not counted as a request lookup. */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /** Non-mutating inspection that does not affect LRU age or lookup counters. */
  peek(key: string): T | undefined {
    return this.cache.peek(key);
  }

  set(key: string, value: T): this {
    this.cache.set(key, value);
    return this;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  entries(): IterableIterator<[string, T]> {
    return this.cache.entries();
  }

  getRemainingTTL(key: string): number {
    return this.cache.getRemainingTTL(key);
  }

  resetCounters(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictionsByReason.capacity = 0;
    this.evictionsByReason.ttl = 0;
  }

  getStats(maxKeys = 200): SvcCacheStats {
    assertPositiveSafeInteger(maxKeys, 'svcCache stats maxKeys');
    let minRemaining = Infinity;
    for (const key of this.cache.keys()) {
      const remaining = this.cache.getRemainingTTL(key);
      if (remaining < minRemaining) minRemaining = remaining;
    }
    const evictionsByReason = { ...this.evictionsByReason };

    return {
      size: this.cache.size,
      max: this.cache.max,
      ttlMs: SVC_CACHE_TTL_MS,
      hits: this.hits,
      misses: this.misses,
      evictions: evictionsByReason.capacity + evictionsByReason.ttl,
      evictionsByReason,
      oldestKeyAgeMs: Number.isFinite(minRemaining)
        ? Math.max(0, SVC_CACHE_TTL_MS - minRemaining)
        : null,
      keys: [...this.cache.keys()].slice(0, maxKeys)
    };
  }
}

export const svcCache = new RoutingServiceCache(
  DEFAULT_SVC_CACHE_MAX_ENTRIES
);

export const configureSvcCache = (
  options: ConfigureSvcCacheOptions = {}
): SvcCacheStats => {
  svcCache.configure(resolveSvcCacheMaxEntries(options));
  return svcCache.getStats();
};

export const getSvcCacheStats = (maxKeys = 200): SvcCacheStats =>
  svcCache.getStats(maxKeys);

export const resetSvcCacheCounters = (): void => {
  svcCache.resetCounters();
};
