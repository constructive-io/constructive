/**
 * report summarize — one line per ramp step record.
 *
 * Port of `scripts/scale-validate/summarize-results.mjs`. Reads one or more
 * `*-results.jsonl` files (each line is a `run ramp` step record) and prints a
 * compact single-line digest per step: crash state, error rate, achieved rps,
 * latency percentiles, HTTP code histogram, bleed-sentinel status, heap/rss
 * maxima, build-queue depth, eviction/build counters, connection-guard counts,
 * peak PG backends, and wall time.
 *
 * `formatStepRecord` is exported so a fixture test can assert the exact field
 * formatting without touching the filesystem.
 */
import fs from 'node:fs';

import { Argv } from '../core/args';

const USAGE = `perf-harness report summarize <results.jsonl> [more.jsonl ...]

Summarize run-ramp step-result JSONL files (one digest line per step).`;

// Format a single step record into the pipe-joined digest line (no indent —
// callers add their own). Verbatim field set + ordering from the original.
export function formatStepRecord(r: any): string {
  const s = r.summary || {};
  const lat = s.latency || {};
  const m = r.metrics || {};
  const c = m.lastCounters || {};
  return [
    r.name,
    `crashed=${r.serverCrashed ? JSON.stringify(r.serverExit) : false}`,
    `err=${r.error || '-'}`,
    s.errRate !== undefined ? `errRate=${s.errRate}` : null,
    s.achievedRps !== undefined ? `rps=${s.achievedRps}` : null,
    lat.p50 !== undefined ? `p50/p95/p99=${lat.p50}/${lat.p95}/${lat.p99}` : null,
    s.http ? `http=${JSON.stringify(s.http)}` : null,
    s.sentinelOk !== undefined ? `sentinelOk=${s.sentinelOk}` : null,
    r.coldBurst ? `cold=${JSON.stringify(s)}` : null,
    m.heapUsedMaxMB !== undefined ? `heapMax=${m.heapUsedMaxMB}MB` : null,
    m.rssMaxMB !== undefined ? `rssMax=${m.rssMaxMB}MB` : null,
    m.buildQueueDepthMax !== undefined ? `queueMax=${m.buildQueueDepthMax}` : null,
    c.evictions ? `evict=${JSON.stringify(c.evictions)}` : null,
    c.builds !== undefined ? `builds=${c.builds}` : null,
    c.connGuard ? `connGuard=${JSON.stringify(c.connGuard)}` : null,
    r.pgBackends
      ? `pgConnMax=${r.pgBackends.max}${r.pgBackends.reconnects ? ` reconn=${r.pgBackends.reconnects}` : ''}`
      : null,
    `wall=${r.wallSec}s`
  ]
    .filter(Boolean)
    .join(' | ');
}

export async function runSummarize(argv: Argv): Promise<number> {
  // Positionals are the result files. Depending on how the top-level router
  // populates `_`, the leading routing tokens may or may not have been sliced
  // off — drop them defensively so `report summarize a.jsonl` works either way
  // (a real results-file path is never literally 'report'/'summarize').
  const files = (argv._ || []).slice();
  while (files.length && (files[0] === 'report' || files[0] === 'summarize')) files.shift();
  if (files.length === 0) {
    console.error(USAGE);
    return 1;
  }
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.log(`-- ${file}: missing`);
      continue;
    }
    console.log(`== ${file}`);
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
    for (const line of lines) {
      let r: any;
      try {
        r = JSON.parse(line);
      } catch {
        continue;
      }
      console.log('  ' + formatStepRecord(r));
    }
  }
  return 0;
}
