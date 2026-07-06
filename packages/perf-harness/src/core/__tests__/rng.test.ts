import { makeMixSampler, makeRng, makeZipfSampler } from '../rng';

describe('makeRng (mulberry32)', () => {
  // Golden values guard the exact algorithm — a change here means the sampler
  // sequences are no longer reproducible across harness versions.
  test('seed 42 produces the known sequence', () => {
    const r = makeRng(42);
    expect([r(), r(), r()]).toEqual([
      0.6011037519201636,
      0.44829055899754167,
      0.8524657934904099
    ]);
  });

  test('seed 1 produces the known sequence', () => {
    const r = makeRng(1);
    expect([r(), r(), r()]).toEqual([
      0.6270739405881613,
      0.002735721180215478,
      0.5274470399599522
    ]);
  });

  test('same seed is deterministic; different seeds diverge', () => {
    const a = makeRng(123);
    const b = makeRng(123);
    const c = makeRng(124);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    const seqC = Array.from({ length: 20 }, () => c());
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
  });

  test('all outputs are in [0, 1)', () => {
    const r = makeRng(9999);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('makeZipfSampler', () => {
  test('favours low indices (monotonically decreasing frequency)', () => {
    const n = 5;
    const z = makeZipfSampler(n, makeRng(7));
    const counts = new Array(n).fill(0);
    for (let i = 0; i < 10000; i++) counts[z()]++;
    // hot index 0 dominates the cold tail
    expect(counts[0]).toBeGreaterThan(counts[n - 1] * 3);
    for (let i = 1; i < n; i++) expect(counts[i - 1]).toBeGreaterThan(counts[i]);
  });

  test('every sample is a valid in-range index', () => {
    const n = 8;
    const z = makeZipfSampler(n, makeRng(3));
    for (let i = 0; i < 500; i++) {
      const idx = z();
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(n);
    }
  });
});

describe('makeMixSampler', () => {
  test('weights the keys proportionally', () => {
    const mix = makeMixSampler('read:0.7,write:0.25,meta:0.05', makeRng(11));
    const tally: Record<string, number> = { read: 0, write: 0, meta: 0 };
    const N = 20000;
    for (let i = 0; i < N; i++) tally[mix()]++;
    expect(tally.read / N).toBeCloseTo(0.7, 1);
    expect(tally.write / N).toBeCloseTo(0.25, 1);
    expect(tally.read).toBeGreaterThan(tally.write);
    expect(tally.write).toBeGreaterThan(tally.meta);
  });

  test('empty / invalid mix falls back to read:1', () => {
    const mix = makeMixSampler('', makeRng(1));
    for (let i = 0; i < 50; i++) expect(mix()).toBe('read');
  });

  test('trims keys and ignores non-positive weights', () => {
    const mix = makeMixSampler(' write : 1 , bad:0 , junk', makeRng(5));
    for (let i = 0; i < 50; i++) expect(mix()).toBe('write');
  });
});
