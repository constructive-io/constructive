import {
  configureSvcCache,
  DEFAULT_SVC_CACHE_MAX_ENTRIES,
  getSvcCacheStats,
  resetSvcCacheCounters,
  resolveSvcCacheMaxEntries,
  svcCache
} from '../lru';

describe('routing service cache', () => {
  beforeEach(() => {
    svcCache.clear();
    configureSvcCache({ maxEntries: DEFAULT_SVC_CACHE_MAX_ENTRIES });
    resetSvcCacheCounters();
  });

  afterEach(() => {
    svcCache.clear();
    configureSvcCache({ maxEntries: DEFAULT_SVC_CACHE_MAX_ENTRIES });
    resetSvcCacheCounters();
  });

  it('uses at least the required resident capacity by default', () => {
    expect(resolveSvcCacheMaxEntries({ minimumEntries: 8 })).toBe(
      DEFAULT_SVC_CACHE_MAX_ENTRIES
    );
    expect(resolveSvcCacheMaxEntries({ minimumEntries: 2048 })).toBe(2048);
  });

  it('rejects an explicit capacity below the required resident floor', () => {
    expect(() => resolveSvcCacheMaxEntries({
      maxEntries: 63,
      minimumEntries: 64
    })).toThrow('must be at least the required minimum (64)');
  });

  it.each([0, -1, 1.5, Number.NaN])(
    'rejects invalid capacity %s',
    (maxEntries) => {
      expect(() => resolveSvcCacheMaxEntries({ maxEntries })).toThrow(
        'must be a positive safe integer'
      );
    }
  );

  it('reports lookups, capacity eviction, and current residency', () => {
    configureSvcCache({ maxEntries: 2 });
    svcCache.set('label-a', { apiId: 'api-a' });
    svcCache.set('label-b', { apiId: 'api-b' });

    expect(svcCache.get('label-a')).toEqual({ apiId: 'api-a' });
    expect(svcCache.get('missing')).toBeUndefined();
    svcCache.set('label-c', { apiId: 'api-c' });

    expect(svcCache.has('label-a')).toBe(true);
    expect(svcCache.has('label-b')).toBe(false);
    expect(svcCache.has('label-c')).toBe(true);
    expect(getSvcCacheStats()).toMatchObject({
      size: 2,
      max: 2,
      hits: 1,
      misses: 1,
      evictions: 1,
      evictionsByReason: {
        capacity: 1,
        ttl: 0
      }
    });
  });

  it('does not classify explicit invalidation as cache pressure eviction', () => {
    configureSvcCache({ maxEntries: 2 });
    svcCache.set('label-a', { apiId: 'api-a' });
    svcCache.delete('label-a');
    svcCache.set('label-b', { apiId: 'api-b' });
    svcCache.clear();

    expect(getSvcCacheStats()).toMatchObject({
      size: 0,
      evictions: 0,
      evictionsByReason: {
        capacity: 0,
        ttl: 0
      }
    });
  });

  it('refuses to resize a live process cache instead of silently evicting metadata', () => {
    svcCache.set('label-a', { apiId: 'api-a' });

    expect(() => configureSvcCache({ maxEntries: 2048 })).toThrow(
      'cannot be reconfigured while routing metadata is resident'
    );
    expect(svcCache.peek('label-a')).toEqual({ apiId: 'api-a' });
    expect(svcCache.max).toBe(DEFAULT_SVC_CACHE_MAX_ENTRIES);
  });
});
