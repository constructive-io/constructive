import { getBaseline } from '../baselines';
import { CheckResult, compareToBaseline, MeasuredRegression, verdictFromChecks } from '../compare';

const bl = getBaseline('catalog61k-2026-07');
const find = (checks: CheckResult[], name: string): CheckResult => checks.find((c) => c.name === name);
const cmp = (m: MeasuredRegression): CheckResult[] => compareToBaseline(m, bl);

describe('compareToBaseline boundaries', () => {
  test('instance-heap passes at the threshold and fails just above', () => {
    expect(find(cmp({ instanceHeapKBPerRow: 28 }), 'instance-heap').pass).toBe(true);
    expect(find(cmp({ instanceHeapKBPerRow: 28.1 }), 'instance-heap').pass).toBe(false);
  });

  test('healthy errRate passes at 0.005 and fails at 0.006', () => {
    expect(find(cmp({ healthy: { errRate: 0.005 } }), 'healthy-single-bp:errRate').pass).toBe(true);
    expect(find(cmp({ healthy: { errRate: 0.006 } }), 'healthy-single-bp:errRate').pass).toBe(false);
  });

  test('healthy p99 passes at 150ms and fails at 151ms', () => {
    expect(find(cmp({ healthy: { p99Ms: 150 } }), 'healthy-single-bp:p99').pass).toBe(true);
    expect(find(cmp({ healthy: { p99Ms: 151 } }), 'healthy-single-bp:p99').pass).toBe(false);
  });

  test('zero-marginal passes at 100MB delta and fails at 101MB', () => {
    expect(find(cmp({ zeroMarginalDeltaMB: 100 }), 'zero-marginal-tenants').pass).toBe(true);
    expect(find(cmp({ zeroMarginalDeltaMB: 101 }), 'zero-marginal-tenants').pass).toBe(false);
  });

  test('thrash-not-crash passes when the server survives and fails on crash', () => {
    expect(find(cmp({ thrashCrashed: false }), 'thrash-not-crash').pass).toBe(true);
    expect(find(cmp({ thrashCrashed: true }), 'thrash-not-crash').pass).toBe(false);
  });

  test('heap-slope passes at threshold and fails above', () => {
    expect(find(cmp({ heapSlopeMBPerHour: 5 }), 'heap-slope').pass).toBe(true);
    expect(find(cmp({ heapSlopeMBPerHour: 6 }), 'heap-slope').pass).toBe(false);
  });

  test('only measurements that were taken produce checks', () => {
    expect(cmp({}).length).toBe(0);
    const partial = cmp({ healthy: { errRate: 0 } });
    expect(partial.map((c) => c.name)).toEqual(['healthy-single-bp:errRate']);
  });
});

describe('verdictFromChecks', () => {
  test('all-pass is exit 0', () => {
    const checks = cmp({ healthy: { errRate: 0, p99Ms: 21 }, zeroMarginalDeltaMB: 4, bleedViolations: 0 });
    expect(verdictFromChecks(checks)).toMatchObject({ pass: true, bleed: false, exitCode: 0 });
  });

  test('a non-bleed failure is exit 1', () => {
    const checks = cmp({ healthy: { errRate: 0.9 }, bleedViolations: 0 });
    const v = verdictFromChecks(checks);
    expect(v.pass).toBe(false);
    expect(v.bleed).toBe(false);
    expect(v.exitCode).toBe(1);
    expect(v.failed).toContain('healthy-single-bp:errRate');
  });

  test('any bleed violation forces exit 2 even if everything else passes', () => {
    const clean = cmp({ bleedViolations: 0 });
    expect(find(clean, 'bleed').pass).toBe(true);
    expect(verdictFromChecks(clean).exitCode).toBe(0);

    const bled = cmp({ healthy: { errRate: 0, p99Ms: 21 }, bleedViolations: 2 });
    expect(find(bled, 'bleed').pass).toBe(false);
    const v = verdictFromChecks(bled);
    expect(v.bleed).toBe(true);
    expect(v.exitCode).toBe(2);
  });
});
