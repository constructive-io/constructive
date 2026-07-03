/**
 * `run soak start|status|stop` — the soak orchestrator.
 *
 * NEW in the package port: replaces the hand-written out/run-soak-*.sh scripts.
 * A soak is six long-lived components launched detached (own process group, log
 * file, pid file) under --out-dir, tagged by --label:
 *
 *   server      cnc server: heap 3584, blueprint pooling, instance-heap
 *               estimate, /metrics endpoint, metrics JSONL
 *   harness     `load harness`  rps 30, zipf, authenticated, canary sentinel 60s
 *   churn       `load churn`    schema:update NOTIFY every 3600s
 *   soak-ops    `run soak-ops`  provision/drop cycle every 7200s
 *   collector   `measure collector`  RSS + metrics tail on the server pid
 *   pg-sampler  `measure pg`    docker + pg_stat_activity every 30s
 *
 * Recipe distilled from run-soak-server.sh / run-soak-load.sh / run-pg-sampler.sh.
 * Credentials reach the harness child via the PERF_PASSWORD env var, never argv.
 *
 *   start   boots the server (waits for the port), then the load stack; prints a
 *           JSON summary of pids + artifact paths.
 *   status  pid liveness + last harness progress line + a /metrics snapshot
 *           (loopback only, if the port answers).
 *   stop    SIGTERM fan-out IN ORDER harness -> collector -> churn -> soak-ops ->
 *           pg-sampler -> server (each waited on), then writes <label>.done.
 */
import fs from 'node:fs';
import path from 'node:path';

import { Argv, asBool, asInt, usageExit } from '../core/args';
import { assertPortAllowed, findRepoRoot, pgConfigFromArgv, resolveCreds, resolveOutDir, resolveServerCmd } from '../core/config';
import { isAlive, readJsonl, readPid, spawnDetached, stopPid, writeDone } from '../core/proc';
import { spawnServer, SpawnedServer } from './server';

export const SOAK_USAGE = `perf-harness run soak <start|status|stop> — long-running soak orchestrator

Common:
  --label <name>              soak label / file prefix (default soak)
  --out-dir <dir>             artifact dir (default ./perf-out)

start:
  --fleet <file>              fleet manifest (required)
  --duration-sec <n>          soak length (default 86400)
  --heap-mb <n>               server heap cap MB (default 3584)
  --port <n>                  server port (default 3333)
  --instance-heap-bytes <n>   GRAPHILE_CACHE_INSTANCE_HEAP_BYTES (default 1450000000)
  --rps <n>                   harness target rps (default 30)
  --container <name>          docker container for pg-sampler (default constructive-scale-pg)
  --server-cmd "<cmd>"        server launch command
  --pg-* / PG*                Postgres connection overrides (default :5433 constructive)
  --email <addr>              seeder email (default seeder@gmail.com)
  --password <pw>             seeder password (or PERF_PASSWORD env; required for auth)
  --allow-hub                 permit reserved hub ports (danger)

status | stop:
  (uses --label / --out-dir to locate the running soak)`;

// Component keys. Pid/log files are <label>-<key>.{pid,log} under --out-dir.
const COMPONENTS = ['server', 'harness', 'churn', 'soak-ops', 'collector', 'pg-sampler'] as const;
type ComponentKey = (typeof COMPONENTS)[number];

// SIGTERM fan-out order: load components flush FIRST, the server dies LAST.
export const SOAK_STOP_ORDER: ComponentKey[] = ['harness', 'collector', 'churn', 'soak-ops', 'pg-sampler', 'server'];

// Per-component SIGTERM grace before SIGKILL. soak-ops gets a generous window so
// an in-flight cycle child + the final drop can finish cleanly.
const STOP_TERM_TIMEOUT_MS: Record<ComponentKey, number> = {
  harness: 30000,
  collector: 15000,
  churn: 15000,
  'soak-ops': 1200000,
  'pg-sampler': 15000,
  server: 30000
};

const err = (...a: any[]): void => {
  process.stderr.write(`${a.join(' ')}\n`);
};
const out = (obj: any): void => {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
};
const compName = (label: string, key: ComponentKey): string => `${label}-${key}`;

// ---------------------------------------------------------------------------
export async function runSoak(argv: Argv): Promise<number> {
  if (asBool(argv.help)) {
    console.log(SOAK_USAGE);
    return 0;
  }
  // Locate the action among the command-path positionals. Scanning (rather than
  // indexing a fixed slot) keeps this correct whether the top-level router
  // passes the full argv (`_ = ['run','soak','start']`) or a stripped one.
  const action = argv._.find((p) => p === 'start' || p === 'status' || p === 'stop');
  if (action === 'start') return soakStart(argv);
  if (action === 'status') return soakStatus(argv);
  if (action === 'stop') return soakStop(argv);
  return usageExit(SOAK_USAGE);
}

// ---------------------------------------------------------------------------
// start
// ---------------------------------------------------------------------------
async function soakStart(argv: Argv): Promise<number> {
  const allowHub = asBool(argv['allow-hub']);
  const pg = pgConfigFromArgv(argv);
  const outDir = resolveOutDir(argv);
  const repoRoot = findRepoRoot();
  const serverCmd = resolveServerCmd(argv, repoRoot);

  const label = typeof argv.label === 'string' && argv.label ? argv.label : 'soak';
  const port = asInt(argv.port, 3333);
  assertPortAllowed(port, allowHub, 'server-port');
  const heapMb = asInt(argv['heap-mb'], 3584);
  const durationSec = asInt(argv['duration-sec'], 86400);
  const instanceHeapBytes = asInt(argv['instance-heap-bytes'], 1450000000);
  const rps = asInt(argv.rps, 30);
  const container = typeof argv.container === 'string' && argv.container ? argv.container : 'constructive-scale-pg';

  const fleetArg = typeof argv.fleet === 'string' ? argv.fleet : '';
  const fleetPath = fleetArg ? path.resolve(process.cwd(), fleetArg) : '';
  if (!fleetPath || !fs.existsSync(fleetPath)) {
    err('run soak start: --fleet <file> is required (harness + churn drive it)');
    return 1;
  }

  const creds = resolveCreds(argv);
  if (!creds.password) {
    err('run soak start: no password — set --password or PERF_PASSWORD (the soak harness authenticates)');
    return 1;
  }

  // Refuse to stack a second soak on top of a live one.
  const existing = readPid(outDir, compName(label, 'server'));
  if (existing && isAlive(existing)) {
    err(`run soak start: a soak labelled "${label}" is already running (server pid ${existing}). Stop it first or pick a new --label.`);
    return 1;
  }

  const metricsFile = path.join(outDir, `metrics-${label}.jsonl`);
  const harnessOut = path.join(outDir, `harness-${label}.json`);
  const collectorOut = path.join(outDir, `collector-${label}.json`);
  const pgFile = path.join(outDir, `pg-${label}.jsonl`);

  const pgEnv: Record<string, string> = {
    PGHOST: pg.host,
    PGPORT: String(pg.port),
    PGUSER: pg.user,
    PGPASSWORD: pg.password,
    PGDATABASE: pg.database
  };

  // 1) server (detached; waits for the port before returning).
  err(`[soak] ${new Date().toISOString()} starting server on :${port} (heap=${heapMb}MB instanceHeap=${instanceHeapBytes})`);
  let server: SpawnedServer;
  try {
    server = await spawnServer({
      name: compName(label, 'server'),
      port,
      heapMb,
      metricsFile,
      pg,
      repoRoot,
      outDir,
      serverCmd,
      instanceHeapBytes,
      metricsEndpoint: true,
      detached: true,
      allowHub
    });
  } catch (e: any) {
    if (e && e.server) {
      try {
        await e.server.stop();
      } catch {
        /* best effort */
      }
    }
    err(`[soak] server never came up: ${e && e.message ? e.message : e}`);
    writeDone(outDir, label, `server-never-came-up ${new Date().toISOString()}`);
    return 1;
  }
  err(`[soak] server up (pid ${server.pid}); starting load stack`);

  const self = process.argv[1];
  const pids: Record<ComponentKey, number> = { server: server.pid } as any;

  // 2) harness — creds via env PERF_PASSWORD, never argv.
  pids.harness = spawnDetached({
    name: compName(label, 'harness'),
    cmd: process.execPath,
    args: [
      self, 'load', 'harness',
      '--fleet', fleetPath,
      '--port', String(port),
      '--duration-sec', String(durationSec),
      '--rps', String(rps),
      '--mix', 'read:0.7,write:0.25,meta:0.05',
      '--shape', 'zipf',
      '--auth', '1',
      '--sentinel-interval-sec', '60',
      '--email', creds.email,
      '--out', harnessOut
    ],
    env: { PERF_PASSWORD: creds.password },
    cwd: repoRoot,
    outDir
  }).pid;

  // 3) churn — NOTE: run-soak-load.sh omitted --fleet, which churn-driver
  // requires and would reject; the orchestrator passes it.
  pids.churn = spawnDetached({
    name: compName(label, 'churn'),
    cmd: process.execPath,
    args: [
      self, 'load', 'churn',
      '--fleet', fleetPath,
      '--interval-notify-sec', '3600',
      '--provision-every-sec', '0',
      '--duration-sec', String(durationSec)
    ],
    env: pgEnv,
    cwd: repoRoot,
    outDir
  }).pid;

  // 4) soak-ops — provision/drop cycles (PG via env, creds via PERF_PASSWORD).
  pids['soak-ops'] = spawnDetached({
    name: compName(label, 'soak-ops'),
    cmd: process.execPath,
    args: [self, 'run', 'soak-ops', '--interval-sec', '7200', '--duration-sec', String(durationSec)],
    env: { ...pgEnv, PERF_PASSWORD: creds.password },
    cwd: repoRoot,
    outDir
  }).pid;

  // 5) collector — RSS + metrics tail on the server pid (runs until pid exits).
  pids.collector = spawnDetached({
    name: compName(label, 'collector'),
    cmd: process.execPath,
    args: [self, 'measure', 'collector', '--pid', String(server.pid), '--metrics-file', metricsFile, '--out', collectorOut],
    cwd: repoRoot,
    outDir
  }).pid;

  // 6) pg-sampler — docker + pg_stat_activity every 30s for the full soak.
  pids['pg-sampler'] = spawnDetached({
    name: compName(label, 'pg-sampler'),
    cmd: process.execPath,
    args: [
      self, 'measure', 'pg',
      '--out', pgFile,
      '--interval-sec', '30',
      '--duration-sec', String(durationSec),
      '--container', container
    ],
    env: pgEnv,
    cwd: repoRoot,
    outDir
  }).pid;

  err(`[soak] started: ${COMPONENTS.map((k) => `${k}=${pids[k]}`).join(' ')}`);
  out({
    t: 'soak-start',
    label,
    port,
    durationSec,
    heapMb,
    instanceHeapBytes,
    pids,
    artifacts: {
      outDir,
      metricsFile,
      harnessOut,
      collectorOut,
      pgFile,
      logs: Object.fromEntries(COMPONENTS.map((k) => [k, path.join(outDir, `${compName(label, k)}.log`)]))
    }
  });
  return 0;
}

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------
async function soakStatus(argv: Argv): Promise<number> {
  const allowHub = asBool(argv['allow-hub']);
  const outDir = resolveOutDir(argv);
  const label = typeof argv.label === 'string' && argv.label ? argv.label : 'soak';
  const port = asInt(argv.port, 3333);
  assertPortAllowed(port, allowHub, 'server-port');

  const components = COMPONENTS.map((key) => {
    const pid = readPid(outDir, compName(label, key));
    return { name: key, pid, alive: pid ? isAlive(pid) : false };
  });
  const serverAlive = components.find((c) => c.name === 'server')?.alive === true;

  // Last harness progress line from its log (JSON lines; stderr noise skipped).
  const harnessLog = path.join(outDir, `${compName(label, 'harness')}.log`);
  const lines = readJsonl(harnessLog);
  const progress = lines.filter((l) => l && l.t === 'progress');
  const lastHarnessProgress = progress.length ? progress[progress.length - 1] : lines.length ? lines[lines.length - 1] : null;

  // /metrics snapshot — loopback only, only if the server pid is alive.
  const metrics = serverAlive ? await fetchMetrics(port) : null;

  out({
    t: 'soak-status',
    label,
    running: components.some((c) => c.alive),
    components,
    lastHarnessProgress,
    metrics
  });
  return 0;
}

async function fetchMetrics(port: number): Promise<any> {
  for (const host of ['127.0.0.1', '[::1]']) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 2000);
    try {
      const res = await fetch(`http://${host}:${port}/metrics`, { signal: ac.signal });
      const text = await res.text();
      try {
        return { host, status: res.status, json: JSON.parse(text) };
      } catch {
        return { host, status: res.status, text: text.slice(0, 4000) };
      }
    } catch {
      /* try the next loopback family */
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// stop
// ---------------------------------------------------------------------------
async function soakStop(argv: Argv): Promise<number> {
  const outDir = resolveOutDir(argv);
  const label = typeof argv.label === 'string' && argv.label ? argv.label : 'soak';

  const results: Array<{ name: ComponentKey; pid: number | null; result: string }> = [];
  for (const key of SOAK_STOP_ORDER) {
    const pid = readPid(outDir, compName(label, key));
    if (!pid || !isAlive(pid)) {
      results.push({ name: key, pid, result: pid ? 'gone' : 'absent' });
      err(`[soak] stop ${key}: ${pid ? 'already gone' : 'no pid file'}`);
      continue;
    }
    err(`[soak] stopping ${key} (pid ${pid})...`);
    const result = await stopPid(pid, STOP_TERM_TIMEOUT_MS[key]);
    results.push({ name: key, pid, result });
    err(`[soak] ${key} -> ${result}`);
  }

  const doneBody = `stopped ${new Date().toISOString()} :: ${results.map((r) => `${r.name}=${r.result}`).join(' ')}`;
  writeDone(outDir, label, doneBody);
  out({ t: 'soak-stop', label, order: SOAK_STOP_ORDER, results, done: path.join(outDir, `${label}.done`) });
  return 0;
}
