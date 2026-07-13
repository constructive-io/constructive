#!/usr/bin/env node
// Summarize v2-ramps result JSONL files: one line per step.
// Usage: node summarize-results.mjs out/v2-2048-tuned-results.jsonl [...more]
import fs from 'node:fs';

for (const file of process.argv.slice(2)) {
  if (!fs.existsSync(file)) {
    console.log(`-- ${file}: missing`);
    continue;
  }
  console.log(`== ${file}`);
  for (const line of fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean)) {
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }
    const s = r.summary || {};
    const lat = s.latency || {};
    const m = r.metrics || {};
    const c = m.lastCounters || {};
    const out = [
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
      r.pgBackends ? `pgConnMax=${r.pgBackends.max}${r.pgBackends.reconnects ? ` reconn=${r.pgBackends.reconnects}` : ''}` : null,
      `wall=${r.wallSec}s`
    ]
      .filter(Boolean)
      .join(' | ');
    console.log('  ' + out);
  }
}
