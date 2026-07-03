#!/usr/bin/env node
/**
 * pg-sampler.mjs — PG-side time series for perf runs (the node side is covered
 * by the server's GRAPHILE_DEBUG_METRICS JSONL; this captures the Postgres half).
 *
 * Every --interval-sec appends one JSONL line to --out with:
 *   - docker container memory (usage/limit bytes) for --container
 *   - pg_stat_activity backend counts by state (+ total)
 *   - pg_class row count (catalog size proxy) and current database size
 *
 * Connection: standard PG* env vars (or --pg-* flags via pgConfigFromArgs).
 * A FRESH client per sample (rig runs idle_session_timeout=120s; a persistent
 * idle client would be reaped mid-run). Sampling errors are recorded on the
 * line ({err}) and never kill the sampler — a PG crash/recovery window is
 * exactly the data we want to keep collecting through.
 *
 * Exit: --duration-sec elapsed, or SIGINT/SIGTERM (JSONL is append-per-line,
 * nothing to flush).
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { asInt, nowIso, parseArgs, pgConfigFromArgs, resolvePg, sleep } from './_lib.mjs';

const { args } = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(`usage: node pg-sampler.mjs [--out out/pg-soak.jsonl] [--interval-sec 30]
       [--duration-sec 0=until signal] [--container constructive-scale-pg]
       PG* env / --pg-* flags        connection overrides`);
  process.exit(0);
}

const OUT = args.out || 'out/pg-soak.jsonl';
const INTERVAL_SEC = asInt(args['interval-sec'], 30);
const DURATION_SEC = asInt(args['duration-sec'], 0);
const CONTAINER = args.container || 'constructive-scale-pg';

const { Client } = resolvePg();
const pgConfig = pgConfigFromArgs(args);

fs.mkdirSync(path.dirname(OUT), { recursive: true });

let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });

function dockerMem(name) {
  return new Promise((resolve) => {
    execFile('docker', ['stats', '--no-stream', '--format', '{{.MemUsage}}', name],
      { timeout: 10_000 }, (err, stdout) => {
        if (err) return resolve({ err: String(err.message || err).slice(0, 200) });
        // e.g. "1.234GiB / 4GiB"
        const m = String(stdout).trim();
        const toBytes = (s) => {
          const mm = /([\d.]+)\s*(B|KiB|MiB|GiB)/.exec(s);
          if (!mm) return null;
          const mult = { B: 1, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3 }[mm[2]];
          return Math.round(parseFloat(mm[1]) * mult);
        };
        const [used, limit] = m.split('/').map((s) => toBytes(s));
        resolve({ raw: m, usedBytes: used, limitBytes: limit });
      });
  });
}

async function pgSample() {
  const client = new Client(pgConfig);
  try {
    await client.connect();
    // sequential on purpose: pg queues concurrent query() on one client (deprecated)
    const act = await client.query('SELECT COALESCE(state, \'null\') AS state, count(*)::int AS n FROM pg_stat_activity GROUP BY 1');
    const cls = await client.query('SELECT count(*)::int AS n FROM pg_class');
    const size = await client.query('SELECT pg_database_size(current_database())::bigint AS b, (SELECT sum(numbackends)::int FROM pg_stat_database) AS backends');
    const byState = {};
    let total = 0;
    for (const r of act.rows) { byState[r.state] = r.n; total += r.n; }
    return {
      backendsByState: byState,
      backendsTotal: total,
      backendsAllDbs: size.rows[0].backends,
      pgClassRows: cls.rows[0].n,
      dbSizeBytes: Number(size.rows[0].b)
    };
  } finally {
    try { await client.end(); } catch { /* recovery window; line already has data or err */ }
  }
}

const startMs = Date.now();
console.log(`[pg-sampler] out=${OUT} interval=${INTERVAL_SEC}s duration=${DURATION_SEC || 'until-signal'}s container=${CONTAINER} pg=${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`);

for (;;) {
  if (stopping) break;
  if (DURATION_SEC && (Date.now() - startMs) / 1000 >= DURATION_SEC) break;
  const line = { t: nowIso() };
  try {
    line.docker = await dockerMem(CONTAINER);
  } catch (e) {
    line.docker = { err: String(e.message || e).slice(0, 200) };
  }
  try {
    Object.assign(line, await pgSample());
  } catch (e) {
    line.err = String(e.message || e).slice(0, 200);
  }
  fs.appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  // sleep in small slices so signals stay responsive
  const until = Date.now() + INTERVAL_SEC * 1000;
  while (Date.now() < until && !stopping) await sleep(500);
}
console.log('[pg-sampler] done');
