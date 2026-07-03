/**
 * Pure regression comparator.
 *
 * `compareToBaseline` maps a set of fresh measurements against a `Baseline`'s
 * thresholds and returns one `CheckResult` per assertion it can evaluate (a
 * measurement that was not taken produces no check). `verdictFromChecks`
 * collapses the checks into the suite's tri-state exit code: a failed `bleed`
 * check is exit 2 (cross-tenant data bleed — the one violation that is never
 * "just slow"), any other failure is exit 1, all-pass is exit 0.
 *
 * No IO, no process — this is the unit-tested heart of `regression run`.
 */
import { Baseline } from './baselines';

export interface CheckResult {
  name: string;
  pass: boolean;
  value: number | boolean | null;
  threshold: number | boolean | null;
  note: string;
}

export interface MeasuredRegression {
  instanceHeapKBPerRow?: number;
  healthy?: { errRate?: number; p99Ms?: number };
  zeroMarginalDeltaMB?: number;
  thrashCrashed?: boolean;
  bleedViolations?: number;
  heapSlopeMBPerHour?: number;
}

const has = (v: any): boolean => v !== undefined && v !== null;

export function compareToBaseline(measured: MeasuredRegression, baseline: Baseline): CheckResult[] {
  const t = baseline.thresholds;
  const checks: CheckResult[] = [];

  if (has(measured.instanceHeapKBPerRow)) {
    const value = measured.instanceHeapKBPerRow;
    checks.push({
      name: 'instance-heap',
      value,
      threshold: t.maxInstanceHeapKBPerRow,
      pass: value <= t.maxInstanceHeapKBPerRow,
      note: `KB retained heap per pg_class row (baseline ${baseline.instanceHeapKBPerRow})`
    });
  }

  if (measured.healthy && has(measured.healthy.errRate)) {
    const value = measured.healthy.errRate;
    checks.push({
      name: 'healthy-single-bp:errRate',
      value,
      threshold: t.maxHealthyErrRate,
      pass: value <= t.maxHealthyErrRate,
      note: 'error rate on a single-blueprint subset at capacity'
    });
  }
  if (measured.healthy && has(measured.healthy.p99Ms)) {
    const value = measured.healthy.p99Ms;
    checks.push({
      name: 'healthy-single-bp:p99',
      value,
      threshold: t.maxHealthyP99Ms,
      pass: value <= t.maxHealthyP99Ms,
      note: 'p99 latency (ms) on a single-blueprint subset at capacity'
    });
  }

  if (has(measured.zeroMarginalDeltaMB)) {
    const value = measured.zeroMarginalDeltaMB;
    checks.push({
      name: 'zero-marginal-tenants',
      value,
      threshold: t.maxZeroMarginalDeltaMB,
      pass: value <= t.maxZeroMarginalDeltaMB,
      note: 'heapMax delta (MB) between low and high tenant-count steps (same blueprint)'
    });
  }

  if (has(measured.thrashCrashed)) {
    checks.push({
      name: 'thrash-not-crash',
      value: measured.thrashCrashed,
      threshold: false,
      pass: measured.thrashCrashed === false,
      note: 'server must SURVIVE over-capacity diversity; degraded latency/errors are expected, not failures'
    });
  }

  if (has(measured.heapSlopeMBPerHour)) {
    const value = measured.heapSlopeMBPerHour;
    checks.push({
      name: 'heap-slope',
      value,
      threshold: t.maxHeapSlopeMBPerHour,
      pass: value <= t.maxHeapSlopeMBPerHour,
      note: 'last-half heap growth (MB/hour) — the soak leak signal'
    });
  }

  // Bleed is evaluated last and is the exit-2 trigger. Always emit it when a
  // measurement exists (0 violations is the healthy, common case).
  if (has(measured.bleedViolations)) {
    const value = measured.bleedViolations;
    checks.push({
      name: 'bleed',
      value,
      threshold: 0,
      pass: value === 0,
      note: 'cross-tenant sentinel violations across all steps (must be zero)'
    });
  }

  return checks;
}

export interface Verdict {
  pass: boolean;
  bleed: boolean;
  exitCode: 0 | 1 | 2;
  failed: string[];
}

export function verdictFromChecks(checks: CheckResult[]): Verdict {
  const failed = checks.filter((c) => !c.pass).map((c) => c.name);
  const bleed = checks.some((c) => c.name === 'bleed' && !c.pass);
  const pass = failed.length === 0;
  const exitCode: 0 | 1 | 2 = bleed ? 2 : pass ? 0 : 1;
  return { pass, bleed, exitCode, failed };
}
