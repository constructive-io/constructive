import { cacheEvents, type EvictionReason } from 'graphile-cache';

interface CacheLookupStats {
  total: number;
  hits: number;
  misses: number;
  recheckHits: number;
}

interface CacheBuildStats {
  sets: number;
  replacements: number;
  coalescedWaits: number;
}

interface CacheEvictionStats {
  total: number;
  lru: number;
  ttl: number;
  manual: number;
}

export interface GraphileCacheActivityStats {
  lookups: CacheLookupStats;
  builds: CacheBuildStats;
  evictions: CacheEvictionStats;
  hitRate: number;
  missRate: number;
}

const cacheActivityStats: GraphileCacheActivityStats = {
  lookups: {
    total: 0,
    hits: 0,
    misses: 0,
    recheckHits: 0,
  },
  builds: {
    sets: 0,
    replacements: 0,
    coalescedWaits: 0,
  },
  evictions: {
    total: 0,
    lru: 0,
    ttl: 0,
    manual: 0,
  },
  hitRate: 0,
  missRate: 0,
};

let evictionListenerAttached = false;

const updateRates = (): void => {
  const total = cacheActivityStats.lookups.total;
  if (total <= 0) {
    cacheActivityStats.hitRate = 0;
    cacheActivityStats.missRate = 0;
    return;
  }
  cacheActivityStats.hitRate = cacheActivityStats.lookups.hits / total;
  cacheActivityStats.missRate = cacheActivityStats.lookups.misses / total;
};

const bumpEviction = (reason: EvictionReason): void => {
  cacheActivityStats.evictions.total += 1;
  cacheActivityStats.evictions[reason] += 1;
};

const ensureEvictionListener = (): void => {
  if (evictionListenerAttached) {
    return;
  }

  cacheEvents.onEviction(({ reason }) => {
    bumpEviction(reason);
  });
  evictionListenerAttached = true;
};

ensureEvictionListener();

export const recordCacheLookupHit = (): void => {
  cacheActivityStats.lookups.total += 1;
  cacheActivityStats.lookups.hits += 1;
  updateRates();
};

export const recordCacheLookupMiss = (): void => {
  cacheActivityStats.lookups.total += 1;
  cacheActivityStats.lookups.misses += 1;
  updateRates();
};

export const recordCacheRecheckHit = (): void => {
  cacheActivityStats.lookups.recheckHits += 1;
};

export const recordCacheCoalescedWait = (): void => {
  cacheActivityStats.builds.coalescedWaits += 1;
};

export const recordCacheSet = (replaced: boolean): void => {
  cacheActivityStats.builds.sets += 1;
  if (replaced) {
    cacheActivityStats.builds.replacements += 1;
  }
};

export const resetGraphileCacheActivityStats = (): void => {
  cacheActivityStats.lookups.total = 0;
  cacheActivityStats.lookups.hits = 0;
  cacheActivityStats.lookups.misses = 0;
  cacheActivityStats.lookups.recheckHits = 0;
  cacheActivityStats.builds.sets = 0;
  cacheActivityStats.builds.replacements = 0;
  cacheActivityStats.builds.coalescedWaits = 0;
  cacheActivityStats.evictions.total = 0;
  cacheActivityStats.evictions.lru = 0;
  cacheActivityStats.evictions.ttl = 0;
  cacheActivityStats.evictions.manual = 0;
  updateRates();
};

export const getGraphileCacheActivityStats = (): GraphileCacheActivityStats => {
  return {
    lookups: { ...cacheActivityStats.lookups },
    builds: { ...cacheActivityStats.builds },
    evictions: { ...cacheActivityStats.evictions },
    hitRate: cacheActivityStats.hitRate,
    missRate: cacheActivityStats.missRate,
  };
};
