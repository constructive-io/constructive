import { computeCycleTiming, recoverCreatedName } from '../soakOps';

describe('computeCycleTiming', () => {
  test('waits the remaining interval when a cycle finishes early', () => {
    const now = 1_000_000;
    const t = computeCycleTiming({ intervalSec: 7200, elapsedMs: 5000, now, deadline: now + 100_000_000 });
    expect(t.waitMs).toBe(7200 * 1000 - 5000);
    expect(t.stop).toBe(false);
  });

  test('never waits a negative amount when a cycle overran the interval', () => {
    const now = 1_000_000;
    const t = computeCycleTiming({ intervalSec: 60, elapsedMs: 95_000, now, deadline: now + 10_000_000 });
    expect(t.waitMs).toBe(0);
    expect(t.stop).toBe(false);
  });

  test('signals stop when the wait would reach or cross the deadline', () => {
    const now = 1_000_000;
    // Only 1s left, but a full interval wait is required -> stop.
    const t = computeCycleTiming({ intervalSec: 7200, elapsedMs: 0, now, deadline: now + 1000 });
    expect(t.stop).toBe(true);
  });

  test('stop is inclusive at the deadline boundary (>=)', () => {
    const now = 1_000_000;
    const waitMs = 7200 * 1000;
    // now + waitMs === deadline exactly -> the original breaks (>=).
    expect(computeCycleTiming({ intervalSec: 7200, elapsedMs: 0, now, deadline: now + waitMs }).stop).toBe(true);
    // one ms of slack -> keep going.
    expect(computeCycleTiming({ intervalSec: 7200, elapsedMs: 0, now, deadline: now + waitMs + 1 }).stop).toBe(false);
  });
});

describe('recoverCreatedName', () => {
  test('recovers a name from the "[name] OK db=" marker', () => {
    expect(recoverCreatedName('noise\n[soak7] OK db=marketplace_db_soak7 host=api-...\n', 'soak')).toBe('soak7');
  });

  test('prefixes a bare index from the "indices=N.." marker', () => {
    expect(recoverCreatedName('provisioning indices=7.. and more', 'soak')).toBe('soak7');
  });

  test('a name already carrying the prefix is used as-is', () => {
    expect(recoverCreatedName('[soak12] OK db=x', 'soak')).toBe('soak12');
  });

  test('prefers the "[name] OK db=" marker over the indices marker', () => {
    expect(recoverCreatedName('indices=3.. then [soak9] OK db=y', 'soak')).toBe('soak9');
  });

  test('returns null when no marker is present', () => {
    expect(recoverCreatedName('nothing useful here', 'soak')).toBeNull();
  });
});
