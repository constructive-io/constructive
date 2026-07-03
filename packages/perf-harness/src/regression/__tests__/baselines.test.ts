import { BASELINES, DEFAULT_BASELINE, getBaseline, listBaselines } from '../baselines';

describe('baselines catalog', () => {
  test('DEFAULT_BASELINE is the 2026-07 catalog entry', () => {
    expect(DEFAULT_BASELINE).toBe('catalog61k-2026-07');
    expect(BASELINES[DEFAULT_BASELINE]).toBeDefined();
    expect(listBaselines().length).toBeGreaterThanOrEqual(1);
  });

  test('catalog61k-2026-07 has the exact measured constants + thresholds', () => {
    const b = getBaseline('catalog61k-2026-07');
    expect(b.catalogPgClassRows).toBe(61238);
    expect(b.instanceHeapKBPerRow).toBe(21);
    expect(b.pgIntrospectionSpikeKBPerRow).toBe(37);
    expect(b.minViableHeapMB).toBe(1536);
    expect(b.baseReserveMB).toBe(256);
    expect(b.buildReserveMB).toBe(768);
    expect(b.zeroMarginal.tenants).toEqual([10, 20, 32]);
    expect(b.zeroMarginal.heapMaxMB).toEqual([1460.1, 1459.6, 1464.1]);
    expect(b.healthy).toEqual({ rps: 188, p99Ms: 21, errRate: 0 });
    expect(b.capacityByHeapMB['2048']).toBe(1);
    expect(b.capacityByHeapMB['3584']).toBe(2);
    expect(b.thresholds).toEqual({
      maxInstanceHeapKBPerRow: 28,
      maxZeroMarginalDeltaMB: 100,
      maxHealthyErrRate: 0.005,
      maxHealthyP99Ms: 150,
      maxHeapSlopeMBPerHour: 5
    });
  });

  test('getBaseline throws on an unknown name', () => {
    expect(() => getBaseline('does-not-exist')).toThrow(/unknown baseline/);
  });
});
