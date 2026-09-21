import {
  clearGraphileCache,
  clearGraphileEntriesForDatabase,
  clearGraphileEntriesForPool,
  clearGraphileEntriesForService,
  graphileCache,
  type GraphileCacheEntry
} from '../graphile-cache';

const makeEntry = (
  cacheKey: string,
  metadata: Pick<GraphileCacheEntry, 'serviceKey' | 'databaseId' | 'poolKey'>
): GraphileCacheEntry => ({
  pgl: { release: jest.fn().mockResolvedValue(undefined) } as any,
  serv: {} as any,
  handler: {} as any,
  httpServer: { listening: false } as any,
  cacheKey,
  createdAt: Date.now(),
  ...metadata
});

describe('Graphile cache identity invalidation', () => {
  afterEach(async () => {
    await clearGraphileCache();
  });

  it('clears every exact-key variant for only the matching service', () => {
    const variants = [
      makeEntry('graphile:server:one', { serviceKey: 'service-a', databaseId: 'db-a', poolKey: 'pool-a' }),
      makeEntry('graphile:server:two', { serviceKey: 'service-a', databaseId: 'db-a', poolKey: 'pool-a' }),
      makeEntry('graphile:explorer:three', { serviceKey: 'service-b', databaseId: 'db-a', poolKey: 'pool-a' })
    ];
    for (const entry of variants) graphileCache.set(entry.cacheKey, entry);

    expect(clearGraphileEntriesForService('service-a')).toBe(2);
    expect(graphileCache.has('graphile:server:one')).toBe(false);
    expect(graphileCache.has('graphile:server:two')).toBe(false);
    expect(graphileCache.has('graphile:explorer:three')).toBe(true);
  });

  it('clears every service variant for only the matching database', () => {
    const variants = [
      makeEntry('graphile:server:one', { serviceKey: 'service-a', databaseId: 'db-a', poolKey: 'pool-a' }),
      makeEntry('graphile:server:two', { serviceKey: 'service-b', databaseId: 'db-a', poolKey: 'pool-a' }),
      makeEntry('graphile:explorer:three', { serviceKey: 'service-a', databaseId: 'db-b', poolKey: 'pool-b' })
    ];
    for (const entry of variants) graphileCache.set(entry.cacheKey, entry);

    expect(clearGraphileEntriesForDatabase('db-a')).toBe(2);
    expect(graphileCache.has('graphile:server:one')).toBe(false);
    expect(graphileCache.has('graphile:server:two')).toBe(false);
    expect(graphileCache.has('graphile:explorer:three')).toBe(true);
  });

  it('clears every Graphile variant backed by only the disposed pool key', () => {
    const variants = [
      makeEntry('graphile:server:one', { serviceKey: 'service-a', databaseId: 'db-a', poolKey: 'pool-a' }),
      makeEntry('graphile:explorer:two', { serviceKey: 'service-b', databaseId: null, poolKey: 'pool-a' }),
      makeEntry('graphile:server:three', { serviceKey: 'service-a', databaseId: 'db-a', poolKey: 'pool-ab' })
    ];
    for (const entry of variants) graphileCache.set(entry.cacheKey, entry);

    expect(clearGraphileEntriesForPool('pool-a')).toBe(2);
    expect(graphileCache.has('graphile:server:one')).toBe(false);
    expect(graphileCache.has('graphile:explorer:two')).toBe(false);
    expect(graphileCache.has('graphile:server:three')).toBe(true);
  });
});
