/**
 * Known-good performance baselines.
 *
 * Each baseline captures the measured constants + pass/fail thresholds for one
 * catalog size, so `regression run` can assert a fresh measurement has not
 * regressed against it. The seed entry `catalog61k-2026-07` is the 2026-07
 * blueprint-pooling validation program (see scripts/scale-validate/V2-RESULTS.md
 * and SIZING.md); the numbers below are transcribed from those documents.
 */

export interface Baseline {
  name: string;
  capturedAt: string;
  catalogPgClassRows: number;
  instanceHeapKBPerRow: number;
  pgIntrospectionSpikeKBPerRow: number;
  minViableHeapMB: number;
  baseReserveMB: number;
  buildReserveMB: number;
  zeroMarginal: { tenants: number[]; heapMaxMB: number[] };
  healthy: { rps: number; p99Ms: number; errRate: number };
  capacityByHeapMB: Record<string, number>;
  thresholds: {
    maxInstanceHeapKBPerRow: number;
    maxZeroMarginalDeltaMB: number;
    maxHealthyErrRate: number;
    maxHealthyP99Ms: number;
    maxHeapSlopeMBPerHour: number;
  };
}

export const catalog61k_2026_07: Baseline = {
  name: 'catalog61k-2026-07',
  capturedAt: '2026-07-03',
  catalogPgClassRows: 61238,
  instanceHeapKBPerRow: 21,
  pgIntrospectionSpikeKBPerRow: 37,
  minViableHeapMB: 1536,
  baseReserveMB: 256,
  buildReserveMB: 768,
  zeroMarginal: { tenants: [10, 20, 32], heapMaxMB: [1460.1, 1459.6, 1464.1] },
  healthy: { rps: 188, p99Ms: 21, errRate: 0 },
  capacityByHeapMB: { '2048': 1, '3584': 2 },
  thresholds: {
    maxInstanceHeapKBPerRow: 28,
    maxZeroMarginalDeltaMB: 100,
    maxHealthyErrRate: 0.005,
    maxHealthyP99Ms: 150,
    maxHeapSlopeMBPerHour: 5
  }
};

export const BASELINES: Record<string, Baseline> = {
  [catalog61k_2026_07.name]: catalog61k_2026_07
};

export const DEFAULT_BASELINE = catalog61k_2026_07.name;

export function getBaseline(name: string): Baseline {
  const bl = BASELINES[name];
  if (!bl) {
    throw new Error(`unknown baseline '${name}'. known: ${Object.keys(BASELINES).join(', ')}`);
  }
  return bl;
}

export function listBaselines(): Baseline[] {
  return Object.values(BASELINES);
}
