/**
 * `run ramp` — V2 limits-discovery executor (port of v2-ramps.mjs).
 *
 * Runs a plan of ramp steps. Each step gets a FRESH server (clean cache, fresh
 * cumulative counters, own metrics file), then either:
 *   - drives the workload harness (`load harness`, spawned as a child of THIS
 *     CLI) against a fleet manifest, or
 *   - fires a cold-burst: one concurrent first-hit per tenant in the manifest
 *     (use a 1-tenant-per-blueprint subset so every request is a cold build),
 *     then a second warm wave.
 *
 * Per step it records: harness latency/error summary, metrics-file maxima
 * (rss/heapUsed/buildQueueDepth), final cache+build counters, max PG backend
 * count during the run, and whether the server crashed. A heap OOM is a
 * legitimate FINDING, not a script failure — the step is recorded and the plan
 * continues.
 *
 * Plan file:
 *   { "port": 3345,
 *     "defaults": { "heapMb": 2048, "rps": 10, "durationSec": 420,
 *                   "shape": "uniform", "auth": 1, "mix": "read:0.7,write:0.25,meta:0.05" },
 *     "steps": [ { "name": "div-k3", "fleet": "out/fleet-k3.json" },
 *                { "name": "cold-burst", "fleet": "out/fleet-burst.json", "coldBurst": true } ] }
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { Argv, asBool, asInt } from '../core/args';
import { assertPortAllowed, findRepoRoot, PgConfig, pgConfigFromArgv, resolveOutDir, resolveServerCmd } from '../core/config';
import { loadFleet, Tenant } from '../core/fleetfile';
import { getPg } from '../core/pgc';
import { readJsonl } from '../core/proc';
import { spawnServer, SpawnedServer } from './server';

export const RAMP_USAGE = `perf-harness run ramp — V2 limits-discovery executor (fresh server per step)

Required:
  --plan <file>               ramp plan JSON ({ port?, defaults, steps[] })
Common:
  --port <n>                  server port (overrides plan.port; default plan.port || 3345)
  --out <file>                results JSONL (default <out-dir>/<label>-results.jsonl)
  --label <name>              results-file label (default: plan basename)
  --only step1,step2          run only the named steps
  --out-dir <dir>             artifact dir (default ./perf-out)
  --server-cmd "<cmd>"        server launch command (default: node <repo>/packages/cli/dist/index.js)
  --pg-* / PG*                Postgres connection overrides (default :5433 constructive)
  --allow-hub                 permit reserved hub ports (danger)
  --help

Auth for harness steps uses PERF_PASSWORD from the environment (never argv).
Each step's cfg = { ...plan.defaults, ...step }.`;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const MB = (b: number): number => Math.round((b / 1024 / 1024) * 10) / 10;

// ---------------------------------------------------------------------------
// Plan shape
// ---------------------------------------------------------------------------
export interface RampDefaults {
  heapMb?: number;
  rps?: number;
  durationSec?: number;
  shape?: string;
  auth?: number;
  mix?: string;
  cacheMax?: number;
  instanceHeapBytes?: number;
  sentinelSec?: number;
  seed?: number;
  coldTimeoutMs?: number;
  serverEnv?: Record<string, string>;
  [k: string]: any;
}

export interface RampStep {
  name: string;
  fleet?: string;
  coldBurst?: boolean;
  [k: string]: any;
}

export interface RampPlan {
  port?: number;
  defaults: RampDefaults;
  steps: RampStep[];
}

// The per-step config: plan defaults overlaid by the step's own fields. Exported
// for tests. Pure — never mutates its inputs.
export function mergeStepConfig(defaults: RampDefaults, step: RampStep): RampDefaults & RampStep {
  return { ...defaults, ...step };
}

// ---------------------------------------------------------------------------
// PG backend sampling (server pools + LISTEN connections)
// ---------------------------------------------------------------------------
interface PgBackendSampler {
  max: number;
  last: number;
  samples: number;
  stop: boolean;
  err: string | null;
  reconnects: number;
}

function startPgBackendSampler(pg: PgConfig): PgBackendSampler {
  const { Client } = getPg();
  const state: PgBackendSampler = { max: 0, last: 0, samples: 0, stop: false, err: null, reconnects: 0 };
  void (async () => {
    // PG may crash-recover mid-step (introspection OOM inside its cgroup) —
    // swallow client errors and reconnect rather than killing the executor.
    while (!state.stop) {
      let client: any;
      try {
        client = new Client(pg);
        client.on('error', () => {});
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
      } catch (e: any) {
        state.err = String(e && e.message ? e.message : e);
        state.reconnects++;
      } finally {
        try {
          await client?.end();
        } catch {
          /* recovery window */
        }
      }
      if (!state.stop) await sleep(5000);
    }
  })();
  return state;
}

// ---------------------------------------------------------------------------
// Workloads
// ---------------------------------------------------------------------------
// Invoke the harness as a child of THIS CLI (`perf-harness load harness ...`),
// mirroring the original's per-step process isolation. Credentials flow via the
// inherited environment (PERF_PASSWORD) — never on argv.
function runHarnessChild(flags: string[]): Promise<{ code: number | null; tail: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [process.argv[1], 'load', 'harness', ...flags], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
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
    child.on('error', (err) => resolve({ code: 1, tail: `${tail}\n[spawn error] ${err && err.message ? err.message : err}` }));
  });
}

interface ColdHit {
  dbname: string;
  status: number;
  ms: number;
  err?: string;
}

async function coldBurst(fleetPath: string, port: number, coldTimeoutMs: number): Promise<{ wave1: ColdHit[]; wave2: ColdHit[] }> {
  const { tenants } = loadFleet(fleetPath);
  const one = async (t: Tenant): Promise<ColdHit> => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), coldTimeoutMs);
    const start = performance.now();
    try {
      const res = await fetch(`http://${t.apiHost}:${port}/graphql`, {
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

// Resolve a plan's `step.fleet` (relative to cwd first, then the plan dir).
function resolveFleetPath(planDir: string, fleet: string): string {
  if (path.isAbsolute(fleet)) return fleet;
  const relCwd = path.resolve(process.cwd(), fleet);
  if (fs.existsSync(relCwd)) return relCwd;
  const relPlan = path.resolve(planDir, fleet);
  if (fs.existsSync(relPlan)) return relPlan;
  return relCwd; // loadFleet will throw a clear ENOENT
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
export async function runRamp(argv: Argv): Promise<number> {
  if (asBool(argv.help)) {
    console.log(RAMP_USAGE);
    return 0;
  }
  const planArg = typeof argv.plan === 'string' ? argv.plan : '';
  const planPath = planArg ? path.resolve(process.cwd(), planArg) : '';
  if (!planPath || !fs.existsSync(planPath)) {
    console.error('run ramp: --plan <file> is required');
    return 1;
  }
  const plan: RampPlan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const planDir = path.dirname(planPath);

  const allowHub = asBool(argv['allow-hub']);
  const port = asInt(argv.port, plan.port || 3345);
  assertPortAllowed(port, allowHub, 'server-port');

  const pg = pgConfigFromArgv(argv);
  const outDir = resolveOutDir(argv);
  const repoRoot = findRepoRoot();
  const serverCmd = resolveServerCmd(argv, repoRoot);

  const label = typeof argv.label === 'string' && argv.label ? argv.label : path.basename(planPath).replace(/\.json$/i, '');
  const outFile = typeof argv.out === 'string' && argv.out ? path.resolve(process.cwd(), argv.out) : path.join(outDir, `${label}-results.jsonl`);

  const only = (typeof argv.only === 'string' ? argv.only : '').split(',').filter(Boolean);
  const steps = (plan.steps || []).filter((s) => only.length === 0 || only.includes(s.name));

  console.log(`[ramp] plan=${path.basename(planPath)} steps=${steps.map((s) => s.name).join(',')} port=${port} -> ${outFile}`);

  for (const step of steps) {
    const cfg = mergeStepConfig(plan.defaults || {}, step);
    const name = `${step.name}-h${cfg.heapMb}`;
    const metricsFile = path.join(outDir, `metrics-${name}.jsonl`);
    const harnessOut = path.join(outDir, `harness-${name}.json`);
    if (fs.existsSync(metricsFile)) fs.rmSync(metricsFile);

    console.log(
      `\n===== STEP ${name}: heap=${cfg.heapMb}MB fleet=${step.fleet} ` +
        `${step.coldBurst ? 'COLD-BURST' : `rps=${cfg.rps} dur=${cfg.durationSec}s shape=${cfg.shape}`} =====`
    );

    const record: any = {
      name: step.name,
      heapMb: cfg.heapMb,
      fleet: step.fleet,
      config: cfg,
      startedAt: new Date().toISOString()
    };
    const pgSampler = startPgBackendSampler(pg);
    const t0 = Date.now();
    let server: SpawnedServer | null = null;
    try {
      server = await spawnServer({
        name: `server-${name}`,
        port,
        heapMb: cfg.heapMb,
        metricsFile,
        pg,
        repoRoot,
        outDir,
        serverCmd,
        cacheMax: cfg.cacheMax,
        instanceHeapBytes: cfg.instanceHeapBytes,
        extraEnv: cfg.serverEnv,
        detached: false,
        allowHub
      });

      // metrics baseline so the sampler is known-alive before load
      const bDeadline = Date.now() + 60000;
      while (readJsonl(metricsFile).length < 1 && Date.now() < bDeadline) await sleep(2000);

      if (step.coldBurst) {
        const fleetPath = resolveFleetPath(planDir, step.fleet);
        record.coldBurst = await coldBurst(fleetPath, port, cfg.coldTimeoutMs ?? 420000);
        const w1: ColdHit[] = record.coldBurst.wave1;
        record.summary = {
          coldOk: w1.filter((r) => r.status === 200).length,
          cold503: w1.filter((r) => r.status === 503).length,
          coldErr: w1.filter((r) => r.status !== 200 && r.status !== 503).length,
          coldMsMax: Math.max(...w1.map((r) => r.ms)),
          warmMsMax: Math.max(...record.coldBurst.wave2.map((r: ColdHit) => r.ms))
        };
        await sleep(15000); // let the sampler catch the post-burst state
      } else {
        const fleetPath = resolveFleetPath(planDir, step.fleet);
        const flags = [
          '--fleet', fleetPath,
          '--port', String(port),
          '--duration-sec', String(cfg.durationSec),
          '--rps', String(cfg.rps),
          '--mix', String(cfg.mix),
          '--shape', String(cfg.shape),
          '--auth', String(cfg.auth),
          '--sentinel-interval-sec', String(cfg.sentinelSec ?? 60),
          '--seed', String(cfg.seed ?? 42),
          '--out', harnessOut
        ];
        const h = await runHarnessChild(flags);
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
    } catch (e: any) {
      if (e && e.server) server = e.server as SpawnedServer; // startup crash — recover the handle
      record.error = record.error || String(e && e.message ? e.message : e);
    } finally {
      pgSampler.stop = true;
      const crashed = server ? server.exited() : true;
      const m = readJsonl(metricsFile);
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
      if (server) await server.stop();
      if (crashed) {
        const info = server ? server.exitInfo() : { code: null, signal: null };
        record.serverCrashed = true;
        record.serverExit = { code: info.code, signal: info.signal };
        record.serverLogTail = server ? server.logTail(2500) : '';
        console.error(`[ramp] SERVER CRASHED during ${name}: code=${info.code} signal=${info.signal}`);
      }
      record.pgBackends = { max: pgSampler.max, samples: pgSampler.samples, err: pgSampler.err };
      record.wallSec = Math.round((Date.now() - t0) / 1000);
      record.endedAt = new Date().toISOString();
      fs.appendFileSync(outFile, JSON.stringify(record) + '\n');
      console.log(`[ramp] step ${name} done in ${record.wallSec}s -> ${outFile}`);
    }
  }
  console.log(`\n[ramp] all steps complete -> ${outFile}`);
  return 0;
}
