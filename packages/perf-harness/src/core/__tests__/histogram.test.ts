import { DEFAULT_BUCKETS, Histogram } from '../histogram';

describe('Histogram', () => {
  test('empty histogram: zero percentiles and summary', () => {
    const h = new Histogram();
    expect(h.percentile(50)).toBe(0);
    expect(h.summary()).toEqual({
      count: 0,
      min: 0,
      mean: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      max: 0
    });
  });

  test('summary has the exact field set and basic stats', () => {
    const h = new Histogram();
    [10, 20, 30].forEach((v) => h.record(v));
    const s = h.summary();
    expect(Object.keys(s).sort()).toEqual(['count', 'max', 'mean', 'min', 'p50', 'p95', 'p99'].sort());
    expect(s.count).toBe(3);
    expect(s.min).toBe(10);
    expect(s.max).toBe(30);
    expect(s.mean).toBe(20);
  });

  test('percentiles land on bucket boundaries', () => {
    const h = new Histogram();
    for (let i = 0; i < 100; i++) h.record(5); // 5 is a bucket edge
    expect(h.percentile(50)).toBe(5);
    expect(h.percentile(95)).toBe(5);
    expect(h.percentile(99)).toBe(5);
  });

  test('values beyond the top bucket fall into the overflow bucket (rounded max)', () => {
    const h = new Histogram();
    h.record(100000); // > 60000, the last configured bucket
    expect(h.percentile(99)).toBe(100000);
    expect(h.summary().max).toBe(100000);
  });

  test('mean is rounded to 2 decimals', () => {
    const h = new Histogram();
    [1, 2, 2].forEach((v) => h.record(v)); // 5/3 = 1.666...
    expect(h.summary().mean).toBe(1.67);
  });

  test('DEFAULT_BUCKETS is the fibonacci-ish ladder up to 60000', () => {
    expect(DEFAULT_BUCKETS[0]).toBe(1);
    expect(DEFAULT_BUCKETS[DEFAULT_BUCKETS.length - 1]).toBe(60000);
    expect(DEFAULT_BUCKETS.length).toBe(23);
  });
});
