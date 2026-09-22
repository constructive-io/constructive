import {
  cacheEvents,
  clearGraphileCache,
  configureGraphileAdmission,
  getCacheConfig,
  getCacheStats,
  graphileCache,
  reserveGraphileCapacity,
  type GraphileCacheEntry,
  waitForActiveDisposals
} from '../graphile-cache';

const entry = (key: string): GraphileCacheEntry => ({
  cacheKey: key,
  createdAt: Date.now(),
  pgl: { release: async (): Promise<void> => undefined },
  httpServer: { listening: false }
} as unknown as GraphileCacheEntry);

afterEach(async () => {
  jest.restoreAllMocks();
  await clearGraphileCache();
});

it('lets the first owner raise the fallback ceiling and actually retain more than 50 entries', () => {
  configureGraphileAdmission({ max: 60, ttl: 10000, buildReserveBytes: 0 });
  for (let i = 0; i < 51; i++) graphileCache.set(String(i), entry(String(i)));
  expect(getCacheStats()).toMatchObject({ max: 60, size: 51, ttl: 10000 });
  expect(graphileCache.has('0')).toBe(true);
});

it('enforces the configured resident count using the same LRU store', async () => {
  for (let i = 0; i < 61; i++) graphileCache.set(String(i), entry(String(i)));
  expect(graphileCache.size).toBe(60);
  expect(graphileCache.has('0')).toBe(false);
  expect(graphileCache.has('60')).toBe(true);
  await waitForActiveDisposals();
});

it('rejects a TTL change with live residents without partially changing capacity', () => {
  graphileCache.set('live', entry('live'));
  expect(() => configureGraphileAdmission({ max: 40, ttl: 5000 })).toThrow();
  expect(getCacheConfig()).toEqual({ max: 60, ttl: 10000 });
});

it('reclaims expired residents before admission and reports the actual LRU expiry reason', async () => {
  const events: string[] = [];
  const onEviction = (event: { reason: string }) => events.push(event.reason);
  cacheEvents.onEviction(onEviction);
  try {
    // Use LRU's public start-time option so expiry is deterministic without
    // depending on its internal clock-resolution timer.
    graphileCache.set('expired', entry('expired'), { start: graphileCache.perf.now() - 20000 });
    const reservation = await reserveGraphileCapacity();
    expect(graphileCache.size).toBe(0);
    expect(events).toEqual(['ttl']);
    reservation.release();
    await waitForActiveDisposals();
  } finally {
    cacheEvents.off('eviction', onEviction);
  }
});

it('combines later owners conservatively and rejects invalid TTL values', () => {
  configureGraphileAdmission({ max: 40, ttl: 5000 });
  configureGraphileAdmission({ max: 80, ttl: 20000 });
  expect(getCacheConfig()).toEqual({ max: 40, ttl: 5000 });
  for (const ttl of [0, -1, NaN, Infinity, 1.5]) {
    expect(() => configureGraphileAdmission({ ttl })).toThrow();
  }
  expect(getCacheConfig()).toEqual({ max: 40, ttl: 5000 });
});
