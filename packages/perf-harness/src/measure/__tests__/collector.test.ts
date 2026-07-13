import { flattenNumeric, linregSlope, pickCounter } from '../collector';

describe('linregSlope', () => {
  test('perfect line through the origin recovers the slope', () => {
    expect(linregSlope([[0, 0], [1, 2], [2, 4], [3, 6]])).toBeCloseTo(2, 10);
  });

  test('fractional slope', () => {
    expect(linregSlope([[0, 1], [2, 2]])).toBeCloseTo(0.5, 10);
  });

  test('flat series has zero slope', () => {
    expect(linregSlope([[0, 5], [1, 5], [2, 5]])).toBe(0);
  });

  test('fewer than two points returns 0', () => {
    expect(linregSlope([])).toBe(0);
    expect(linregSlope([[3, 3]])).toBe(0);
  });

  test('degenerate x (zero denominator) returns 0', () => {
    expect(linregSlope([[5, 1], [5, 9]])).toBe(0);
  });

  test('last-half behavior: slope tracks only the recent (second-half) trend', () => {
    // First half flat at 500, second half rising +10 MB/sec. finalize() regresses
    // over samples.slice(floor(len/2)) — the last half — so the reported slope is
    // the recent trend, not the whole-run average.
    const samples = [
      { tSec: 0, rssMb: 500 },
      { tSec: 1, rssMb: 500 },
      { tSec: 2, rssMb: 500 },
      { tSec: 3, rssMb: 500 },
      { tSec: 4, rssMb: 500 },
      { tSec: 5, rssMb: 510 },
      { tSec: 6, rssMb: 520 },
      { tSec: 7, rssMb: 530 }
    ];
    const full = linregSlope(samples.map((s) => [s.tSec, s.rssMb]));
    const lastHalf = samples.slice(Math.floor(samples.length / 2));
    const halfSlope = linregSlope(lastHalf.map((s) => [s.tSec, s.rssMb]));

    expect(halfSlope).toBeCloseTo(10, 10); // MB/sec over the last half only
    expect(full).toBeGreaterThan(0);
    expect(full).toBeLessThan(halfSlope); // whole-run average is diluted by the flat first half

    // and the MB/hour conversion finalize() applies
    const slopeMbPerHour = Math.round(halfSlope * 3600 * 100) / 100;
    expect(slopeMbPerHour).toBe(36000);
  });
});

// A representative server metrics line (schema owned by the server
// instrumentation; the tailer must stay schema-tolerant).
const METRICS_LINE = {
  ts: '2026-07-03T00:00:00.000Z',
  heapUsed: 123456789,
  rss: 234567890,
  cache: { size: 2, max: 64 },
  counters: {
    evictions: { total: 12, lru: 8, ttl: 4 },
    drains: 3,
    builds: 7,
    connGuard: { blocked: 0 }
  }
};

describe('flattenNumeric', () => {
  const flat = flattenNumeric(METRICS_LINE);
  const byPath = Object.fromEntries(flat.map((f) => [f.path, f.value]));

  test('flattens nested numeric leaves with dotted paths', () => {
    expect(byPath['heapUsed']).toBe(123456789);
    expect(byPath['rss']).toBe(234567890);
    expect(byPath['cache.size']).toBe(2);
    expect(byPath['cache.max']).toBe(64);
    expect(byPath['counters.evictions.total']).toBe(12);
    expect(byPath['counters.evictions.lru']).toBe(8);
    expect(byPath['counters.builds']).toBe(7);
    expect(byPath['counters.connGuard.blocked']).toBe(0);
  });

  test('excludes non-numeric fields', () => {
    expect(byPath['ts']).toBeUndefined();
    expect(flat.every((f) => typeof f.value === 'number')).toBe(true);
  });
});

describe('pickCounter', () => {
  const flat = flattenNumeric(METRICS_LINE);

  test('prefers an explicit total over sibling numeric fields', () => {
    const evict = pickCounter(flat, 'evict');
    expect(evict.value).toBe(12);
    expect(evict.path).toBe('counters.evictions.total');
    expect(evict.candidates).toHaveLength(3); // total + lru + ttl
  });

  test('picks a lone scalar counter', () => {
    const build = pickCounter(flat, 'build');
    expect(build.value).toBe(7);
    expect(build.path).toBe('counters.builds');

    const drain = pickCounter(flat, 'drain');
    expect(drain.value).toBe(3);
    expect(drain.path).toBe('counters.drains');
  });

  test('no match yields a null pick with no candidates', () => {
    const none = pickCounter(flat, 'zzz-nope');
    expect(none.value).toBeNull();
    expect(none.path).toBeNull();
    expect(none.candidates).toEqual([]);
  });
});
