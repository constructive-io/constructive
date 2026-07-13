/**
 * collector — RSS sampler + server metrics tailer.
 *
 * Port of `scripts/scale-validate/collector.mjs`. Samples the server process RSS
 * (`ps -o rss=`) every --interval-sec and tails the server's metrics JSONL. At
 * exit it computes:
 *   - RSS min / max / final (MB)
 *   - linear-regression slope (MB/hour) over the LAST HALF of the RSS samples
 *   - eviction / drain / build totals parsed from the LAST metrics line
 * and writes a summary JSON to --out.
 *
 * The metrics JSONL schema is owned by the server instrumentation; this tailer
 * is intentionally schema-tolerant: it flattens the last JSON object and picks
 * the best numeric field per counter family (evict / drain / build).
 *
 * Exit is triggered by SIGINT/SIGTERM, by --duration-sec, or when the monitored
 * PID disappears. The JSONL protocol lines are written to stdout (machine
 * readable); the summary file goes to --out.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

import { Argv, asInt, usageExit } from '../core/args';
import { ensureParentDir } from '../core/proc';

// Tiny helpers the standalone script imported from _lib.mjs; core does not
// re-export them (histogram folded round2 in privately), so inline them here
// exactly as the original defined them.
const nowIso = (): string => new Date().toISOString();
const round2 = (n: number): number => Math.round(n * 100) / 100;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const HELP = `measure collector — sample RSS + tail metrics.jsonl, summarize at exit

Options:
  --pid <n>            server process id to sample (required)
  --metrics-file <f>   server metrics.jsonl to tail (optional)
  --interval-sec <n>   sample period (default 15)
  --duration-sec <n>   run length (default 0 = until SIGINT or pid exit)
  --out <file>         summary JSON (default collector.json)
  --help
`;

export interface FlatNumeric {
  path: string;
  value: number;
}

export interface CounterCandidate {
  path: string;
  value: number;
}

export interface CounterPick {
  value: number | null;
  path: string | null;
  candidates: CounterCandidate[];
}

function sampleRssMb(pid: number): number | null {
  const res = spawnSync('ps', ['-o', 'rss=', '-p', String(pid)], { encoding: 'utf8' });
  if (res.status !== 0) return null;
  const kb = Number.parseInt((res.stdout || '').trim(), 10);
  if (!Number.isFinite(kb)) return null;
  return round2(kb / 1024);
}

// Least-squares slope of y over x. Returns slope in y-units per x-unit.
export function linregSlope(points: number[][]): number {
  const n = points.length;
  if (n < 2) return 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const [x, y] of points) {
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return 0;
  return (n * sxy - sx * sy) / denom;
}

// Flatten nested object into [{ path, value }] for numeric leaves only.
export function flattenNumeric(obj: any, prefix = '', out: FlatNumeric[] = []): FlatNumeric[] {
  if (obj == null || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'number' && Number.isFinite(v)) out.push({ path, value: v });
    else if (v && typeof v === 'object') flattenNumeric(v, path, out);
  }
  return out;
}

// Pick the best-matching numeric field for a counter family.
export function pickCounter(flat: FlatNumeric[], family: string): CounterPick {
  const re = new RegExp(family, 'i');
  const candidates = flat.filter((f) => re.test(f.path));
  if (candidates.length === 0) return { value: null, path: null, candidates: [] };
  // Prefer explicit totals/counts, then longer (more specific) paths.
  const score = (p: string): number => (/(total|count|sum|cumulative|s$)/i.test(p) ? 2 : 0) + p.length / 1000;
  candidates.sort((a, b) => score(b.path) - score(a.path));
  return {
    value: candidates[0].value,
    path: candidates[0].path,
    candidates: candidates.map((c) => ({ path: c.path, value: c.value }))
  };
}

export async function runCollector(argv: Argv): Promise<number> {
  if (argv.help) return usageExit(HELP, 0);
  if (argv.pid === undefined) return usageExit(HELP, 1);

  const pid = asInt(argv.pid, 0);
  const metricsFile = typeof argv['metrics-file'] === 'string' ? argv['metrics-file'] : null;
  const intervalSec = asInt(argv['interval-sec'], 15);
  const durationSec = asInt(argv['duration-sec'], 0);
  const out = typeof argv.out === 'string' ? argv.out : 'collector.json';

  const startMs = Date.now();
  const samples: { tSec: number; rssMb: number }[] = [];
  let lastMetricsObj: any = null;
  let metricsLinesSeen = 0;
  let metricsOffset = 0;
  let stopping = false;
  let stopReason: string | null = null;

  const readMetricsTail = (): void => {
    if (!metricsFile) return;
    let stat;
    try {
      stat = fs.statSync(metricsFile);
    } catch {
      return;
    }
    if (stat.size < metricsOffset) metricsOffset = 0; // rotated/truncated
    if (stat.size === metricsOffset) return;
    let chunk = '';
    try {
      const fd = fs.openSync(metricsFile, 'r');
      const len = stat.size - metricsOffset;
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, metricsOffset);
      fs.closeSync(fd);
      chunk = buf.toString('utf8');
      metricsOffset = stat.size;
    } catch {
      return;
    }
    for (const line of chunk.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      metricsLinesSeen++;
      try {
        lastMetricsObj = JSON.parse(trimmed);
      } catch {
        /* partial/non-json line — ignore */
      }
    }
  };

  const emit = (obj: any): void => {
    process.stdout.write(`${JSON.stringify({ at: nowIso(), ...obj })}\n`);
  };
  emit({ t: 'start', pid, metricsFile, intervalSec, durationSec });

  const finalize = (): any => {
    const rssValues = samples.map((s) => s.rssMb);
    const rssMin = rssValues.length ? Math.min(...rssValues) : null;
    const rssMax = rssValues.length ? Math.max(...rssValues) : null;
    const rssFinal = rssValues.length ? rssValues[rssValues.length - 1] : null;
    // slope over the last half of samples
    const half = samples.slice(Math.floor(samples.length / 2));
    const slopeMbPerSec = linregSlope(half.map((s) => [s.tSec, s.rssMb]));
    const slopeMbPerHour = round2(slopeMbPerSec * 3600);

    const flat = lastMetricsObj ? flattenNumeric(lastMetricsObj) : [];
    const evictions = pickCounter(flat, 'evict');
    const drains = pickCounter(flat, 'drain');
    const builds = pickCounter(flat, 'build');

    const summary = {
      generatedAt: nowIso(),
      pid,
      stopReason,
      durationSec: round2((Date.now() - startMs) / 1000),
      intervalSec,
      rss: {
        samples: samples.length,
        minMb: rssMin,
        maxMb: rssMax,
        finalMb: rssFinal,
        slopeMbPerHour,
        slopeBasis: `last ${half.length} of ${samples.length} samples`,
        series: samples
      },
      metrics: {
        file: metricsFile,
        linesSeen: metricsLinesSeen,
        evictionsTotal: evictions.value,
        evictionsField: evictions.path,
        drainsTotal: drains.value,
        drainsField: drains.path,
        buildsTotal: builds.value,
        buildsField: builds.path,
        candidates: { evict: evictions.candidates, drain: drains.candidates, build: builds.candidates },
        lastLine: lastMetricsObj
      }
    };
    ensureParentDir(out);
    fs.writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
    emit({
      t: 'summary',
      rssMinMb: rssMin,
      rssMaxMb: rssMax,
      rssFinalMb: rssFinal,
      slopeMbPerHour,
      evictionsTotal: evictions.value,
      drainsTotal: drains.value,
      buildsTotal: builds.value,
      out
    });
    return summary;
  };

  const onSig = (): void => {
    stopping = true;
    stopReason = stopReason || 'signal';
  };
  process.on('SIGINT', onSig);
  process.on('SIGTERM', onSig);

  try {
    // Prime the metrics offset so we start reading from current EOF-ish but
    // still capture the last line: read everything once so lastMetricsObj is
    // populated.
    readMetricsTail();

    while (!stopping) {
      const rssMb = sampleRssMb(pid);
      if (rssMb == null) {
        stopReason = 'pid-exited';
        break;
      }
      samples.push({ tSec: round2((Date.now() - startMs) / 1000), rssMb });
      readMetricsTail();
      emit({ t: 'sample', tSec: round2((Date.now() - startMs) / 1000), rssMb, metricsLines: metricsLinesSeen });
      if (durationSec > 0 && (Date.now() - startMs) / 1000 >= durationSec) {
        stopReason = 'duration';
        break;
      }
      // sleep in small slices so SIGINT is responsive
      const until = Date.now() + intervalSec * 1000;
      while (!stopping && Date.now() < until) await sleep(200);
    }
    readMetricsTail();
    finalize();
    return 0;
  } catch (err: any) {
    process.stderr.write(`[collector] FATAL: ${err && err.stack ? err.stack : err}\n`);
    return 1;
  }
}
