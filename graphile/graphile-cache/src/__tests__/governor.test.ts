import {
  computeCapacityFromBudget,
  getCacheCounters,
  getMemoryPressure,
  shouldRefuseBuild
} from '../graphile-cache';

const MB = 1024 * 1024;

describe('computeCapacityFromBudget (two-constraint capacity model)', () => {
  it('matches the live capacity-2 proof: 3584MB heap with 1.45GB instances', () => {
    // r2-div-k1: two ~1.35GB instances resident (heapMax 2750MB), rebuild safe
    // because evict-before-build frees a slot ahead of the transient peak.
    expect(computeCapacityFromBudget(3584 * MB, 1450 * MB, 256 * MB, 768 * MB)).toBe(2);
  });

  it('gives capacity 1 on a 2GB heap with measured 1.45GB instances', () => {
    expect(computeCapacityFromBudget(2048 * MB, 1450 * MB, 256 * MB, 768 * MB)).toBe(1);
  });

  it('never returns less than 1 even when nothing fits', () => {
    expect(computeCapacityFromBudget(896 * MB, 1450 * MB, 256 * MB, 768 * MB)).toBe(1);
  });

  it('caps at 50 for tiny instances on big heaps', () => {
    expect(computeCapacityFromBudget(64 * 1024 * MB, 4 * MB, 256 * MB, 768 * MB)).toBe(50);
  });

  it('applies the rebuild constraint when it is the binding one', () => {
    // Residency alone would allow 3 (3*1000+256 <= 3500), but a rebuild with
    // 2 residents (2*1000 + 256 + 900 = 3156 <= 3500) is the binding bound:
    // byResidency = floor((3500-256)/1000) = 3
    // byRebuild   = floor((3500-256-900)/1000) + 1 = 2 + 1 = 3
    expect(computeCapacityFromBudget(3500 * MB, 1000 * MB, 256 * MB, 900 * MB)).toBe(3);
    // Shrink the heap so the rebuild constraint bites:
    // byResidency = floor((3300-256)/1000) = 3
    // byRebuild   = floor((3300-256-900)/1000) + 1 = 2 + 1 = 3 -> still 3;
    // push harder:
    // byResidency(3256) = 3, byRebuild(3256) = floor(2100/1000)+1 = 3
    // byResidency(3200) = 2 — residency binds again. Use a bigger reserve:
    expect(computeCapacityFromBudget(3300 * MB, 1000 * MB, 256 * MB, 1500 * MB)).toBe(2);
  });
});

describe('memory governor pressure gate', () => {
  const cleanup: Array<() => void> = [];
  afterEach(() => {
    while (cleanup.length) cleanup.pop()!();
  });

  const setEnv = (key: string, value: string) => {
    const prev = process.env[key];
    process.env[key] = value;
    cleanup.push(() => {
      if (prev === undefined) delete process.env[key];
      else process.env[key] = prev;
    });
  };

  it('reports ok at normal test-process heap levels', () => {
    expect(getMemoryPressure().level).toBe('ok');
  });

  it('refuses builds and counts them at critical pressure', () => {
    // Force the critical watermark below any real process usage.
    setEnv('GRAPHILE_MEMORY_GOVERNOR_CRITICAL', '0.0001');
    setEnv('GRAPHILE_MEMORY_GOVERNOR_ELEVATED', '0.00005');
    const before = getCacheCounters().buildRefusals;
    const verdict = shouldRefuseBuild();
    expect(verdict.level).toBe('critical');
    expect(verdict.refuseBuild).toBe(true);
    expect(getCacheCounters().buildRefusals).toBe(before + 1);
  });

  it('does not refuse builds at elevated pressure', () => {
    setEnv('GRAPHILE_MEMORY_GOVERNOR_ELEVATED', '0.0001');
    const before = getCacheCounters().buildRefusals;
    const verdict = shouldRefuseBuild();
    expect(verdict.level).toBe('elevated');
    expect(verdict.refuseBuild).toBe(false);
    expect(getCacheCounters().buildRefusals).toBe(before);
  });
});
