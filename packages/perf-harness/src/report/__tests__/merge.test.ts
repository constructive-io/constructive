import { mergeReport, MergeSources, parseOpsLine, renderMarkdown } from '../merge';

const T0 = Date.parse('2026-07-03T00:00:00.000Z');
const iso = (offsetSec: number): string => new Date(T0 + offsetSec * 1000).toISOString();
const MB = 1048576;

function counters(builds: number, lru: number, governor: number, absorbedExceptions: number, buildRefusals: number): any {
  return {
    evictions: { lru, ttl: 0, manual: 0, governor },
    disposals: 0,
    drainTimeouts: 0,
    buildRefusals,
    builds,
    poolingAttaches: 0,
    poolingBuilds: 0,
    buildWaitTimeouts: 0,
    buildQueueDepth: 0,
    connGuard: { absorbedExceptions, absorbedRejections: 0 }
  };
}

function sources(): MergeSources {
  const metrics = [
    { ts: iso(0), rss: 150 * MB, heapUsed: 60 * MB, cache: { size: 0, keys: 0 }, counters: counters(0, 0, 0, 0, 0), gc: {} },
    { ts: iso(10), rss: 160 * MB, heapUsed: 70 * MB, cache: { size: 1, keys: 1 }, counters: counters(1, 1, 0, 0, 0), gc: {} },
    { ts: iso(20), rss: 170 * MB, heapUsed: 80 * MB, cache: { size: 1, keys: 1 }, counters: counters(2, 2, 1, 3, 1), gc: {} },
    { ts: iso(30), rss: 180 * MB, heapUsed: 90 * MB, cache: { size: 1, keys: 1 }, counters: counters(3, 2, 1, 5, 1), gc: {} }
  ];
  const harness = [
    { hello: 'banner-non-progress-line' }, // must be filtered out
    { t: 'progress', at: iso(5), elapsedSec: 5, windowErrRate: 0, latencyWindow: { p50: 13, p95: 21, p99: 21 }, sent: 50, completed: 50, ok: 50, err: 0 },
    { t: 'progress', at: iso(15), elapsedSec: 15, windowErrRate: 0.01, latencyWindow: { p50: 14, p95: 22, p99: 30 }, sent: 150, completed: 150, ok: 148, err: 2 },
    { t: 'progress', at: iso(28), elapsedSec: 28, windowErrRate: 0, latencyWindow: { p50: 13, p95: 21, p99: 25 }, sent: 280, completed: 280, ok: 278, err: 2 }
  ];
  const churn = [
    { t: 'start', at: iso(1), channel: 'schema:update', tenants: 5 },
    { t: 'notify', at: iso(12), dbname: 'factory1', databaseId: 'db-1', seq: 1 },
    { t: 'stop', at: iso(30), reason: 'signal', notifies: 1, provisions: 0 }
  ];
  const ops = [
    `[soak-ops] ${iso(2)} start: interval=7200s duration=86400s prefix=soak`,
    `[soak-ops] ${iso(18)} cycle=1 provision status=0 created=soak5 :: some tail`,
    `[soak-ops] ${iso(29)} cycle=1 drop soak4 status=0`
  ];
  const pg = [
    { t: iso(8), docker: { usedBytes: 800 * MB, limitBytes: 4000 * MB }, backendsTotal: 12 },
    { t: iso(22), docker: { usedBytes: 900 * MB, limitBytes: 4000 * MB }, backendsTotal: 15 }
  ];
  return { metrics, harness, churn, ops, pg };
}

describe('mergeReport', () => {
  test('series arrays are all aligned to the metrics clock length', () => {
    const rd = mergeReport(sources());
    const s = rd.series;
    expect(s.t).toHaveLength(4);
    expect(s.heapUsedMB).toHaveLength(4);
    expect(s.rssMB).toHaveLength(4);
    expect(s.cacheSize).toHaveLength(4);
    expect(s.windowErrRate).toHaveLength(4);
    expect(s.p99).toHaveLength(4);
    expect(s.pgContainerMB).toHaveLength(4);
    expect(s.pgBackends).toHaveLength(4);
    expect(s.t).toEqual([0, 10, 20, 30]);
    expect(s.heapUsedMB).toEqual([60, 70, 80, 90]);
  });

  test('nearest-sample alignment pulls harness + pg values onto metrics ticks', () => {
    const s = mergeReport(sources()).series;
    // p99: metric@20 -> progress@15 (=30), metric@30 -> progress@28 (=25)
    expect(s.p99[2]).toBe(30);
    expect(s.p99[3]).toBe(25);
    expect(s.windowErrRate[2]).toBe(0.01);
    // pg: metric@20 -> pg@22 (900MB / 15), metric@0 -> pg@8 (800MB / 12)
    expect(s.pgContainerMB[0]).toBe(800);
    expect(s.pgContainerMB[3]).toBe(900);
    expect(s.pgBackends[3]).toBe(15);
  });

  test('extracts churn + ops events sorted by time', () => {
    const rd = mergeReport(sources());
    expect(rd.events).toHaveLength(6); // 3 churn + 3 ops
    const types = rd.events.map((e) => e.type);
    expect(types).toContain('churn:start');
    expect(types).toContain('churn:notify');
    expect(types).toContain('churn:stop');
    expect(types).toContain('ops:start');
    expect(types).toContain('ops:provision');
    expect(types).toContain('ops:drop');
    // sorted ascending by `at`
    const ats = rd.events.map((e) => Date.parse(e.at));
    expect(ats).toEqual([...ats].sort((a, b) => a - b));
    const notify = rd.events.find((e) => e.type === 'churn:notify');
    expect(notify.detail).toContain('factory1');
    const provision = rd.events.find((e) => e.type === 'ops:provision');
    expect(provision.detail).toContain('cycle=1 provision');
    // the `:: tail` suffix is trimmed off
    expect(provision.detail).not.toContain('some tail');
  });

  test('computes counter first/last/delta', () => {
    const rd = mergeReport(sources());
    expect(rd.counters.delta.builds).toBe(3);
    expect(rd.counters.delta.evictions.lru).toBe(2);
    expect(rd.counters.delta.evictions.governor).toBe(1);
    expect(rd.counters.delta.connGuard.absorbedExceptions).toBe(5);
    expect(rd.counters.delta.buildRefusals).toBe(1);
    expect(rd.counters.first.builds).toBe(0);
    expect(rd.counters.last.builds).toBe(3);
  });

  test('heap slope is positive for a rising heap', () => {
    const rd = mergeReport(sources());
    // 60 -> 90 MB over 30s == 1 MB/s == 3600 MB/h
    expect(rd.slopes.heapMBPerHourFull).toBeGreaterThan(0);
    expect(rd.slopes.heapMBPerHourLastHalf).toBeGreaterThan(0);
    expect(Math.round(rd.slopes.heapMBPerHourFull)).toBe(3600);
  });

  test('meta aggregates requests, latency, heap and pg maxima', () => {
    const rd = mergeReport(sources());
    expect(rd.meta.requests.sent).toBe(280);
    expect(rd.meta.requests.completed).toBe(280);
    expect(rd.meta.requests.err).toBe(2);
    expect(rd.meta.latency.p99).toBe(30); // worst window p99
    expect(rd.meta.latency.p50).toBe(13); // median of window p50s [13,14,13]
    expect(rd.meta.heap.startMB).toBe(60);
    expect(rd.meta.heap.maxMB).toBe(90);
    expect(rd.meta.heap.finalMB).toBe(90);
    expect(rd.meta.pgContainerMaxMB).toBe(900);
    expect(rd.meta.counts.events).toBe(6);
  });

  test('renderMarkdown produces a table with the key rows', () => {
    const md = renderMarkdown(mergeReport(sources()));
    expect(md).toContain('| metric | value |');
    expect(md).toContain('duration');
    expect(md).toContain('| builds Δ | 3 |');
    expect(md).toContain('| conn-guard absorbed Δ | 5 |');
    expect(md).toContain('| pg container max | 900 MB |');
  });

  test('tolerates empty inputs without throwing', () => {
    const rd = mergeReport({ metrics: [], harness: [] });
    expect(rd.series.t).toHaveLength(0);
    expect(rd.events).toHaveLength(0);
    expect(rd.counters.delta).toBeNull();
    expect(rd.slopes.heapMBPerHourFull).toBe(0);
  });
});

describe('parseOpsLine', () => {
  test('parses a provision cycle line', () => {
    const ev = parseOpsLine('[soak-ops] 2026-07-03T00:00:18.000Z cycle=1 provision status=0 created=soak5 :: tail');
    expect(ev.type).toBe('ops:provision');
    expect(ev.at).toBe('2026-07-03T00:00:18.000Z');
    expect(ev.detail).toBe('cycle=1 provision status=0 created=soak5');
  });

  test('returns null for a non-soak-ops line', () => {
    expect(parseOpsLine('[harness] seed=42 shape=zipf')).toBeNull();
    expect(parseOpsLine('')).toBeNull();
  });
});
