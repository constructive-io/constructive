/**
 * report merge — fuse the artifacts of one perf run into a single report.
 *
 * A soak (or ramp) leaves four independent time series behind, each on its own
 * clock and cadence:
 *   --metrics     server GRAPHILE_DEBUG_METRICS JSONL (rss/heap/cache/counters/gc)
 *   --harness-log harness stdout JSONL (t:"progress" windows: rps/errRate/latency)
 *   --churn-log   churn-driver stdout JSONL (start/notify/provision-marker/stop)
 *   --ops-log     soak-ops stdout TEXT ([soak-ops] <iso> cycle=N provision|drop ...)
 *   --pg          pg-sampler JSONL (docker mem + pg_stat_activity backends)
 *
 * `merge` aligns them onto the server-metrics clock (nearest-sample hold),
 * extracts churn/ops timeline events, computes counter first/last/delta and the
 * heap-growth slope (full run + last half), and writes `report-data.json`. A
 * compact markdown summary table is printed to stdout for eyeballing.
 *
 * The alignment + aggregation live in the pure `mergeReport(sources)` so tests
 * can drive it from small in-memory fixtures.
 */
import fs from 'node:fs';
import path from 'node:path';

import { Argv } from '../core/args';
import { resolveOutDir } from '../core/config';
import { ensureParentDir, readJsonl } from '../core/proc';
import { linregSlope } from '../measure/collector';

const USAGE = `perf-harness report merge --metrics <metrics.jsonl> --harness-log <harness.jsonl> \\
  [--churn-log <churn.jsonl>] [--ops-log <soak-ops.log>] [--pg <pg.jsonl>] [--out-dir ./perf-out]

Fuse server metrics + harness progress + churn/ops events + pg-sampler into
report-data.json (aligned series, events, counter deltas, heap slope) and print
a markdown summary.`;

const MB = (b: number): number => Math.round((b / 1048576) * 10) / 10;
const r2 = (x: number): number => Math.round(x * 100) / 100;
const nowIso = (): string => new Date().toISOString();
const ms = (iso: string): number => Date.parse(iso);

export interface MergeSources {
  metrics: any[];
  harness: any[]; // raw harness stdout objects; progress lines are filtered here
  churn?: any[];
  ops?: string[]; // raw text lines from the soak-ops stdout log
  pg?: any[];
  sourcePaths?: Record<string, string | null>;
}

export interface ReportEvent {
  at: string;
  type: string;
  detail: string;
}

export interface ReportData {
  meta: any;
  series: {
    t: number[];
    heapUsedMB: number[];
    rssMB: number[];
    cacheSize: number[];
    windowErrRate: number[];
    p99: number[];
    pgContainerMB: number[];
    pgBackends: number[];
  };
  events: ReportEvent[];
  counters: { first: any; last: any; delta: any };
  slopes: { heapMBPerHourFull: number; heapMBPerHourLastHalf: number };
}

// ---------------------------------------------------------------------------
// event extraction
// ---------------------------------------------------------------------------

function churnEvents(churn: any[]): ReportEvent[] {
  const out: ReportEvent[] = [];
  for (const e of churn || []) {
    if (!e || !e.at) continue;
    switch (e.t) {
      case 'start':
        out.push({ at: e.at, type: 'churn:start', detail: `channel=${e.channel} tenants=${e.tenants}` });
        break;
      case 'notify':
        out.push({ at: e.at, type: 'churn:notify', detail: `db=${e.dbname ?? e.databaseId} seq=${e.seq}` });
        break;
      case 'notify-error':
        out.push({ at: e.at, type: 'churn:notify-error', detail: `db=${e.dbname ?? e.databaseId} ${e.error || ''}`.trim() });
        break;
      case 'provision-marker':
        out.push({ at: e.at, type: 'churn:provision-marker', detail: `seq=${e.seq}` });
        break;
      case 'stop':
        out.push({ at: e.at, type: 'churn:stop', detail: `reason=${e.reason} notifies=${e.notifies} provisions=${e.provisions}` });
        break;
      default:
        break;
    }
  }
  return out;
}

// soak-ops lines are plain text: `[soak-ops] <iso> <body>`. Parse leniently.
export function parseOpsLine(line: string): ReportEvent | null {
  const m = /^\[soak-ops\]\s+(\S+)\s+(.+)$/.exec(line.trim());
  if (!m) return null;
  const at = m[1];
  const body = m[2].trim();
  let type = 'ops:other';
  if (/^start\b/.test(body)) type = 'ops:start';
  else if (/^cycle=\d+\s+provision\b/.test(body)) type = 'ops:provision';
  else if (/^cycle=\d+\s+drop\b/.test(body)) type = 'ops:drop';
  else if (/^final cleanup\b/.test(body)) type = 'ops:cleanup';
  else if (/^done\b/.test(body)) type = 'ops:done';
  // Trim the noisy `:: <tail>` suffix and cap length.
  const detail = body.split(' :: ')[0].slice(0, 200);
  return { at, type, detail };
}

function opsEvents(ops: string[]): ReportEvent[] {
  const out: ReportEvent[] = [];
  for (const line of ops || []) {
    if (!line || !line.trim()) continue;
    const ev = parseOpsLine(line);
    if (ev) out.push(ev);
  }
  return out;
}

// ---------------------------------------------------------------------------
// nearest-sample alignment (sample-and-hold onto the metrics clock)
// ---------------------------------------------------------------------------

// Index of the source sample whose time is closest to target `t`.
function nearestIndex(sortedTimes: number[], t: number): number {
  const n = sortedTimes.length;
  if (n === 0) return -1;
  let lo = 0;
  let hi = n - 1;
  if (t <= sortedTimes[0]) return 0;
  if (t >= sortedTimes[n - 1]) return n - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sortedTimes[mid] === t) return mid;
    if (sortedTimes[mid] < t) lo = mid + 1;
    else hi = mid - 1;
  }
  // lo is the first index with time > t; hi = lo - 1.
  const after = lo;
  const before = hi;
  return t - sortedTimes[before] <= sortedTimes[after] - t ? before : after;
}

// ---------------------------------------------------------------------------
// counter deltas (recursive numeric diff)
// ---------------------------------------------------------------------------

export function numericDelta(a: any, b: any): any {
  if (typeof b === 'number') return typeof a === 'number' ? b - a : b;
  if (b && typeof b === 'object') {
    const out: any = {};
    const keys = new Set<string>([...Object.keys(a || {}), ...Object.keys(b)]);
    for (const k of keys) out[k] = numericDelta((a || {})[k], b[k]);
    return out;
  }
  return b;
}

// ---------------------------------------------------------------------------
// main merge
// ---------------------------------------------------------------------------

export function mergeReport(sources: MergeSources): ReportData {
  const metrics = (sources.metrics || []).filter((x) => x && x.ts).slice().sort((a, b) => ms(a.ts) - ms(b.ts));
  const progress = (sources.harness || []).filter((x) => x && x.t === 'progress' && x.at).slice().sort((a, b) => ms(a.at) - ms(b.at));
  const pg = (sources.pg || []).filter((x) => x && x.t).slice().sort((a, b) => ms(a.t) - ms(b.t));

  const events = [...churnEvents(sources.churn || []), ...opsEvents(sources.ops || [])].sort(
    (a, b) => ms(a.at) - ms(b.at)
  );

  const progressTimes = progress.map((p) => ms(p.at));
  const pgTimes = pg.map((p) => ms(p.t));

  const series = {
    t: [] as number[],
    heapUsedMB: [] as number[],
    rssMB: [] as number[],
    cacheSize: [] as number[],
    windowErrRate: [] as number[],
    p99: [] as number[],
    pgContainerMB: [] as number[],
    pgBackends: [] as number[]
  };

  const t0 = metrics.length ? ms(metrics[0].ts) : (progressTimes[0] ?? pgTimes[0] ?? Date.now());

  for (const mline of metrics) {
    const t = ms(mline.ts);
    series.t.push(r2((t - t0) / 1000));
    series.heapUsedMB.push(MB(mline.heapUsed));
    series.rssMB.push(MB(mline.rss));
    series.cacheSize.push(mline.cache?.size ?? null);

    const pi = nearestIndex(progressTimes, t);
    if (pi >= 0) {
      series.windowErrRate.push(progress[pi].windowErrRate ?? null);
      series.p99.push(progress[pi].latencyWindow?.p99 ?? null);
    } else {
      series.windowErrRate.push(null);
      series.p99.push(null);
    }

    const gi = nearestIndex(pgTimes, t);
    if (gi >= 0) {
      const used = pg[gi].docker?.usedBytes;
      series.pgContainerMB.push(typeof used === 'number' ? MB(used) : null);
      series.pgBackends.push(pg[gi].backendsTotal ?? null);
    } else {
      series.pgContainerMB.push(null);
      series.pgBackends.push(null);
    }
  }

  // Counter first/last/delta.
  const firstCounters = metrics.length ? metrics[0].counters ?? null : null;
  const lastCounters = metrics.length ? metrics[metrics.length - 1].counters ?? null : null;
  const delta = firstCounters && lastCounters ? numericDelta(firstCounters, lastCounters) : null;

  // Heap-growth slope (MB/hour) over the full run and the last half.
  const heapPoints: [number, number][] = metrics.map((m) => [(ms(m.ts) - t0) / 1000, MB(m.heapUsed)]);
  const half = heapPoints.slice(Math.floor(heapPoints.length / 2));
  const slopes = {
    heapMBPerHourFull: r2(linregSlope(heapPoints) * 3600),
    heapMBPerHourLastHalf: r2(linregSlope(half) * 3600)
  };

  // Requests + errRate from the final progress window (sent/completed/ok/err
  // are cumulative in a progress line; windowRps/windowErrRate are per-window).
  const lastProg = progress.length ? progress[progress.length - 1] : null;
  const requests = lastProg
    ? {
        sent: lastProg.sent ?? null,
        completed: lastProg.completed ?? null,
        ok: lastProg.ok ?? null,
        err: lastProg.err ?? null,
        errRate: lastProg.completed ? r2((lastProg.err || 0) / lastProg.completed) : 0
      }
    : { sent: null, completed: null, ok: null, err: null, errRate: null };

  // Aggregate latency: typical median (median of window p50s) + worst tail
  // (max window p99). Windowed data has no raw samples for a true overall pctl.
  const p50s = progress.map((p) => p.latencyWindow?.p50).filter((v) => typeof v === 'number');
  const p99s = progress.map((p) => p.latencyWindow?.p99).filter((v) => typeof v === 'number');
  const median = (arr: number[]): number => {
    if (!arr.length) return null;
    const s = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : r2((s[mid - 1] + s[mid]) / 2);
  };
  const latency = { p50: median(p50s), p99: p99s.length ? Math.max(...p99s) : null };

  const startedAt = metrics.length ? metrics[0].ts : lastProg ? progress[0].at : null;
  const endedAt = metrics.length ? metrics[metrics.length - 1].ts : lastProg ? lastProg.at : null;
  const durationSec = lastProg?.elapsedSec ?? (metrics.length ? r2((ms(endedAt) - t0) / 1000) : null);

  const heapMBs = series.heapUsedMB;
  const heap = {
    startMB: heapMBs.length ? heapMBs[0] : null,
    maxMB: heapMBs.length ? Math.max(...heapMBs) : null,
    finalMB: heapMBs.length ? heapMBs[heapMBs.length - 1] : null
  };

  const pgContainerMaxMB = series.pgContainerMB.filter((v) => typeof v === 'number').length
    ? Math.max(...(series.pgContainerMB.filter((v) => typeof v === 'number') as number[]))
    : null;

  const meta = {
    generatedAt: nowIso(),
    sources: sources.sourcePaths || {},
    counts: {
      metricsSamples: metrics.length,
      harnessProgress: progress.length,
      churnEvents: (sources.churn || []).length,
      opsLines: (sources.ops || []).length,
      pgSamples: pg.length,
      events: events.length
    },
    startedAt,
    endedAt,
    durationSec,
    requests,
    latency,
    heap,
    pgContainerMaxMB
  };

  return { meta, series, events, counters: { first: firstCounters, last: lastCounters, delta }, slopes };
}

// ---------------------------------------------------------------------------
// markdown summary
// ---------------------------------------------------------------------------

export function renderMarkdown(rd: ReportData): string {
  const m = rd.meta;
  const d = rd.counters.delta || {};
  const ev = d.evictions || {};
  const evictionsDelta = (ev.lru || 0) + (ev.ttl || 0) + (ev.manual || 0) + (ev.governor || 0);
  const governorDelta = ev.governor || 0;
  const buildsDelta = d.builds || 0;
  const refusalsDelta = d.buildRefusals || 0;
  const guardDelta = (d.connGuard?.absorbedExceptions || 0) + (d.connGuard?.absorbedRejections || 0);
  const req = m.requests || {};
  const heap = m.heap || {};
  const lat = m.latency || {};

  const rows: [string, string][] = [
    ['duration', m.durationSec != null ? `${m.durationSec}s` : '-'],
    ['requests', req.sent != null ? `${req.sent} sent / ${req.completed} done (ok ${req.ok} / err ${req.err})` : '-'],
    ['errRate', req.errRate != null ? String(req.errRate) : '-'],
    ['latency p50 / p99', `${lat.p50 ?? '-'} / ${lat.p99 ?? '-'} ms`],
    ['heap start / max / final', `${heap.startMB ?? '-'} / ${heap.maxMB ?? '-'} / ${heap.finalMB ?? '-'} MB`],
    ['heap slope full / lastHalf', `${rd.slopes.heapMBPerHourFull} / ${rd.slopes.heapMBPerHourLastHalf} MB/h`],
    ['evictions Δ', String(evictionsDelta)],
    ['builds Δ', String(buildsDelta)],
    ['governor evictions Δ', String(governorDelta)],
    ['conn-guard absorbed Δ', String(guardDelta)],
    ['build refusals Δ', String(refusalsDelta)],
    ['pg container max', m.pgContainerMaxMB != null ? `${m.pgContainerMaxMB} MB` : '-'],
    ['events', String((rd.events || []).length)]
  ];

  const lines = ['| metric | value |', '| --- | --- |'];
  for (const [k, v] of rows) lines.push(`| ${k} | ${v} |`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export async function runMerge(argv: Argv): Promise<number> {
  const metricsFile = typeof argv.metrics === 'string' ? argv.metrics : null;
  const harnessFile = typeof argv['harness-log'] === 'string' ? argv['harness-log'] : null;
  if (!metricsFile || !harnessFile) {
    console.error(USAGE);
    return 1;
  }
  const churnFile = typeof argv['churn-log'] === 'string' ? argv['churn-log'] : null;
  const opsFile = typeof argv['ops-log'] === 'string' ? argv['ops-log'] : null;
  const pgFile = typeof argv.pg === 'string' ? argv.pg : null;
  const outDir = resolveOutDir(argv);

  const sources: MergeSources = {
    metrics: readJsonl(metricsFile),
    harness: readJsonl(harnessFile),
    churn: churnFile ? readJsonl(churnFile) : [],
    ops: opsFile ? readTextLines(opsFile) : [],
    pg: pgFile ? readJsonl(pgFile) : [],
    sourcePaths: {
      metrics: metricsFile,
      harnessLog: harnessFile,
      churnLog: churnFile,
      opsLog: opsFile,
      pg: pgFile
    }
  };

  const rd = mergeReport(sources);
  const outFile = path.join(outDir, 'report-data.json');
  ensureParentDir(outFile);
  fs.writeFileSync(outFile, JSON.stringify(rd, null, 2) + '\n');

  // Machine artifact path to stderr; the human summary table to stdout.
  console.error(`[merge] wrote ${outFile}`);
  console.log(renderMarkdown(rd));
  return 0;
}

function readTextLines(file: string): string[] {
  try {
    return fs.readFileSync(file, 'utf8').split('\n');
  } catch {
    return [];
  }
}
