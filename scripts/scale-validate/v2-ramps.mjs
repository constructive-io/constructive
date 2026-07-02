#!/usr/bin/env node
// =============================================================================
// v2-ramps.mjs — V2 limits-discovery executor.
//
// Runs a plan of ramp steps. Each step gets a FRESH server (clean cache, fresh
// cumulative counters, own metrics file), then either:
//   - drives the workload harness (harness.mjs) against a fleet manifest, or
//   - fires a cold-burst: one concurrent first-hit per tenant in the manifest
//     (use a 1-tenant-per-blueprint subset so every request is a cold build).
//
// Per step it records: harness latency/error summary, metrics-file maxima
// (rss/heapUsed/buildQueueDepth), final cache+build counters, max PG backend
// count during the run, and whether the server crashed (an 896MB-heap OOM is a
// legitimate FINDING, not a script failure — steps continue).
//
// Usage:
//   node scripts/scale-validate/v2-ramps.mjs --plan plans/v2-2048.json \
//     [--out out/v2-2048-results.jsonl] [--only step1,step2]
//
// Plan file:
//   { "port": 3345,
//     "defaults": { "heapMb": 2048, "rps": 10, "durationSec": 420,
//                   "shape": "uniform", "auth": 1, "mix": "read:0.7,write:0.25,meta:0.05" },
//     "steps": [ { "name": "div-k3", "fleet": "out/fleet-k3.json" },
//                { "name": "cold-burst", "fleet": "out/fleet-burst.json", "coldBurst": true } ] }
//
// Env: PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE (defaults :5433 constructive)
// =============================================================================
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadFleet, resolvePg, sleep } from './_lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKTREE = path.resolve(__dirname, '..', '..');
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};

const PLAN_FILE = path.resolve(__dirname, arg('plan', ''));
const OUT = path.resolve(__dirname, arg('out', 'out/v2-results.jsonl'));
const ONLY = (arg('only', '') || '').split(',').filter(Boolean);
if (!PLAN_FILE || !fs.existsSync(PLAN_FILE)) {
  console.error('--plan <file> is required');
  process.exit(1);
}
const plan = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));
const PORT = plan.port || 3345;
const MB = (b) => Math.round((b / 1024 / 1024) * 10) / 10;

const PG = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5433', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'password',
  database: process.env.PGDATABASE || 'constructive'
};

// ---------------------------------------------------------------------------
// server lifecycle
// ---------------------------------------------------------------------------
function waitForPort(port, timeoutMs) {
  const hosts = ['127.0.0.1', '::1'];
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    let i = 0;
    const tryOnce = () => {
      const sock = net.connect({ host: hosts[i++ % hosts.length], port }, () => {
        sock.destroy();
        resolve();
      });
      sock.on('error', () => {
        sock.destroy();
        if (Date.now() > deadline) reject(new Error(`port ${port} not listening after ${timeoutMs}ms`));
        else setTimeout(tryOnce, 300);
      });
    };
    tryOnce();
  });
}

function readMetrics(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function startServer({ heapMb, cacheMax, metricsFile, serverEnv }) {
  const child = spawn(
    'node',
    ['packages/cli/dist/index.js', 'server', '--port', String(PORT), '--origin', '*', '--simpleInflection', '--postgis', '--servicesApi'],
    {
      cwd: WORKTREE,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NODE_OPTIONS: `--max-old-space-size=${heapMb}`,
        GRAPHILE_DEBUG_METRICS: '1',
        GRAPHILE_DEBUG_METRICS_FILE: metricsFile,
        GRAPHILE_BLUEPRINT_POOLING: '1',
        ...(cacheMax ? { GRAPHILE_CACHE_MAX: String(cacheMax) } : {}),
        ...(serverEnv || {}),
        PGHOST: PG.host,
        PGPORT: String(PG.port),
        PGUSER: PG.user,
        PGPASSWORD: PG.password,
        PGDATABASE: PG.database
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  const state = { child, log: '', exited: false, exitCode: null, exitSignal: null };
  child.stdout.on('data', (d) => (state.log = (state.log + d).slice(-8000)));
  child.stderr.on('data', (d) => (state.log = (state.log + d).slice(-8000)));
  child.on('exit', (code, signal) => {
    state.exited = true;
    state.exitCode = code;
    state.exitSignal = signal;
  });
  return state;
}

async function stopServer(state) {
  if (state.exited) return;
  state.child.kill('SIGTERM');
  const deadline = Date.now() + 15000;
  while (!state.exited && Date.now() < deadline) await sleep(300);
  if (!state.exited) {
    state.child.kill('SIGKILL');
    while (!state.exited) await sleep(200);
  }
}

// ---------------------------------------------------------------------------
// pg backend sampling (server pools + LISTEN connections)
// ---------------------------------------------------------------------------
function startPgSampler() {
  const { Client } = resolvePg();
  const state = { max: 0, last: 0, samples: 0, stop: false, err: null };
  (async () => {
    const client = new Client(PG);
    try {
      await client.connect();
      while (!state.stop) {
        const r = await client.query(
          `SELECT count(*)::int AS c FROM pg_stat_activity
            WHERE datname = current_database() AND pid <> pg_backend_pid()`
        );
        state.last = r.rows[0].c;
        state.max = Math.max(state.max, state.last);
        state.samples++;
        await sleep(5000);
      }
    } catch (e) {
      state.err = String(e && e.message ? e.message : e);
    } finally {
      try {
        await client.end();
      } catch {}
    }
  })();
  return state;
}

// ---------------------------------------------------------------------------
// workloads
// ---------------------------------------------------------------------------
function runHarness(step, cfg, harnessOut) {
  return new Promise((resolve) => {
    const args = [
      path.join(__dirname, 'harness.mjs'),
      '--fleet', path.resolve(__dirname, step.fleet),
      '--port', String(PORT),
      '--duration-sec', String(cfg.durationSec),
      '--rps', String(cfg.rps),
      '--mix', cfg.mix,
      '--shape', cfg.shape,
      '--auth', String(cfg.auth),
      '--sentinel-interval-sec', String(cfg.sentinelSec ?? 60),
      '--seed', String(cfg.seed ?? 42),
      '--out', harnessOut
    ];
    const child = spawn('node', args, { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '';
    child.stdout.on('data', (d) => {
      process.stdout.write(d);
      tail = (tail + d).slice(-4000);
    });
    child.stderr.on('data', (d) => {
      process.stderr.write(d);
      tail = (tail + d).slice(-4000);
    });
    child.on('exit', (code) => resolve({ code, tail }));
  });
}

async function coldBurst(step, cfg) {
  const { tenants } = loadFleet(path.resolve(__dirname, step.fleet));
  const one = async (t) => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), cfg.coldTimeoutMs ?? 420000);
    const start = performance.now();
    try {
      const res = await fetch(`http://${t.apiHost}:${PORT}/graphql`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'query { __typename }' }),
        signal: ac.signal
      });
      await res.text();
      return { dbname: t.dbname, status: res.status, ms: Math.round(performance.now() - start) };
    } catch (e) {
      return { dbname: t.dbname, status: 0, ms: Math.round(performance.now() - start), err: String(e).slice(0, 120) };
    } finally {
      clearTimeout(timer);
    }
  };
  console.log(`[cold-burst] firing ${tenants.length} concurrent first-hits...`);
  const wave1 = await Promise.all(tenants.map(one));
  const wave2 = await Promise.all(tenants.map(one)); // warm check
  return { wave1, wave2 };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
const main = async () => {
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  const steps = plan.steps.filter((s) => ONLY.length === 0 || ONLY.includes(s.name));
  console.log(`[v2-ramps] plan=${path.basename(PLAN_FILE)} steps=${steps.map((s) => s.name).join(',')} port=${PORT}`);

  for (const step of steps) {
    const cfg = { ...plan.defaults, ...step };
    const name = `${step.name}-h${cfg.heapMb}`;
    const metricsFile = path.join(__dirname, 'out', `metrics-${name}.jsonl`);
    const harnessOut = path.join(__dirname, 'out', `harness-${name}.json`);
    if (fs.existsSync(metricsFile)) fs.rmSync(metricsFile);

    console.log(`\n===== STEP ${name}: heap=${cfg.heapMb}MB fleet=${step.fleet} ${step.coldBurst ? 'COLD-BURST' : `rps=${cfg.rps} dur=${cfg.durationSec}s shape=${cfg.shape}`} =====`);
    const record = { name: step.name, heapMb: cfg.heapMb, fleet: step.fleet, config: cfg, startedAt: new Date().toISOString() };
    const server = startServer({ heapMb: cfg.heapMb, cacheMax: cfg.cacheMax, metricsFile, serverEnv: cfg.serverEnv });
    const pgSampler = startPgSampler();
    const t0 = Date.now();
    try {
      await waitForPort(PORT, 120000);
      // metrics baseline so the sampler is known-alive before load
      const bDeadline = Date.now() + 60000;
      while (readMetrics(metricsFile).length < 1 && Date.now() < bDeadline) await sleep(2000);

      if (step.coldBurst) {
        record.coldBurst = await coldBurst(step, cfg);
        const w1 = record.coldBurst.wave1;
        record.summary = {
          coldOk: w1.filter((r) => r.status === 200).length,
          cold503: w1.filter((r) => r.status === 503).length,
          coldErr: w1.filter((r) => r.status !== 200 && r.status !== 503).length,
          coldMsMax: Math.max(...w1.map((r) => r.ms)),
          warmMsMax: Math.max(...record.coldBurst.wave2.map((r) => r.ms))
        };
        await sleep(15000); // let the sampler catch the post-burst state
      } else {
        const h = await runHarness(step, cfg, harnessOut);
        record.harnessExit = h.code; // 2 = bleed sentinel violation
        if (fs.existsSync(harnessOut)) {
          const rep = JSON.parse(fs.readFileSync(harnessOut, 'utf8'));
          record.summary = {
            achievedRps: rep.totals?.achievedRps,
            completed: rep.totals?.completed,
            errRate: rep.totals?.errRate,
            latency: rep.latencyOverall,
            readLatency: rep.byClass?.read?.latency,
            http: rep.http,
            netErrors: rep.netErrors,
            sentinelOk: rep.sentinel?.ok,
            verdict: rep.verdict
          };
        } else {
          record.error = `harness produced no report (exit ${h.code})`;
          record.harnessTail = h.tail;
        }
      }
    } catch (e) {
      record.error = String(e && e.message ? e.message : e);
    } finally {
      pgSampler.stop = true;
      const crashed = server.exited;
      const m = readMetrics(metricsFile);
      if (m.length) {
        const last = m[m.length - 1];
        record.metrics = {
          samples: m.length,
          rssMaxMB: MB(Math.max(...m.map((x) => x.rss))),
          heapUsedMaxMB: MB(Math.max(...m.map((x) => x.heapUsed))),
          heapUsedLastMB: MB(last.heapUsed),
          buildQueueDepthMax: Math.max(...m.map((x) => x.counters?.buildQueueDepth ?? 0)),
          lastCache: last.cache,
          lastCounters: last.counters
        };
      }
      await stopServer(server);
      if (crashed) {
        record.serverCrashed = true;
        record.serverExit = { code: server.exitCode, signal: server.exitSignal };
        record.serverLogTail = server.log.slice(-2500);
        console.error(`[v2-ramps] SERVER CRASHED during ${name}: code=${server.exitCode} signal=${server.exitSignal}`);
      }
      record.pgBackends = { max: pgSampler.max, samples: pgSampler.samples, err: pgSampler.err };
      record.wallSec = Math.round((Date.now() - t0) / 1000);
      record.endedAt = new Date().toISOString();
      fs.appendFileSync(OUT, JSON.stringify(record) + '\n');
      console.log(`[v2-ramps] step ${name} done in ${record.wallSec}s -> ${OUT}`);
    }
  }
  console.log(`\n[v2-ramps] all steps complete -> ${OUT}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
