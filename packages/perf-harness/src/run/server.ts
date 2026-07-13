/**
 * Server child management — shared by `run ramp`, `run soak`, and
 * `measure instance-heap`.
 *
 * Boots the built cnc server with the validated soak recipe env (heap cap,
 * blueprint pooling, metrics JSONL + optional /metrics endpoint, optional
 * instance-heap estimate) and the fixed server flags, then waits for the port
 * to accept a loopback connection before resolving.
 *
 * Two modes:
 *   - managed (default): the child stays a direct child of this process. The
 *     returned handle exposes live crash introspection (exited/exitInfo/logTail)
 *     and a `stop()` that does SIGTERM -> 15s -> SIGKILL. This is what `run ramp`
 *     uses so an 896MB-heap OOM mid-step is a recorded FINDING, not an abort.
 *   - detached (`detached: true`): the child outlives this CLI (core/proc
 *     spawnDetached — own process group, log file, pid file). This is what
 *     `run soak start` uses.
 *
 * Return shape is a structural superset of the DESIGN `{ pid, stop }` contract.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { assertPortAllowed, PgConfig } from '../core/config';
import { isAlive, spawnDetached, stopPid, waitForPort } from '../core/proc';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export interface ServerSpawnOpts {
  name: string;
  port: number;
  heapMb: number;
  metricsFile: string;
  pg: PgConfig;
  repoRoot: string;
  outDir: string;
  serverCmd?: string[];
  cacheMax?: number;
  instanceHeapBytes?: number;
  metricsEndpoint?: boolean;
  extraEnv?: Record<string, string>;
  detached?: boolean;
  allowHub?: boolean;
}

export interface SpawnedServer {
  pid: number;
  stop: () => Promise<void>;
  // Live crash introspection (used by ramp's crash-tolerated-and-recorded path).
  exited: () => boolean;
  exitInfo: () => { code: number | null; signal: string | null };
  logTail: (maxChars?: number) => string;
  // Set only in detached mode.
  logPath: string | null;
  pidPath: string | null;
}

// Build the child env from the validated soak recipe. extraEnv is applied
// BEFORE PG* (matching v2-ramps startServer ordering) so PgConfig is always the
// single source of truth for the DB connection — extraEnv can tune GRAPHILE_*
// but must never redirect the server to a different database.
function buildServerEnv(o: ServerSpawnOpts): Record<string, string> {
  const env: Record<string, string> = {
    NODE_ENV: 'production',
    NODE_OPTIONS: `--max-old-space-size=${o.heapMb}`,
    GRAPHILE_DEBUG_METRICS: '1',
    GRAPHILE_DEBUG_METRICS_FILE: o.metricsFile,
    GRAPHILE_BLUEPRINT_POOLING: '1'
  };
  if (o.metricsEndpoint) env.GRAPHILE_METRICS_ENDPOINT = '1';
  if (o.cacheMax) env.GRAPHILE_CACHE_MAX = String(o.cacheMax);
  if (o.instanceHeapBytes) env.GRAPHILE_CACHE_INSTANCE_HEAP_BYTES = String(o.instanceHeapBytes);
  if (o.extraEnv) Object.assign(env, o.extraEnv);
  env.PGHOST = o.pg.host;
  env.PGPORT = String(o.pg.port);
  env.PGUSER = o.pg.user;
  env.PGPASSWORD = o.pg.password;
  env.PGDATABASE = o.pg.database;
  return env;
}

function resolveServerArgv(o: ServerSpawnOpts): { cmd: string; args: string[] } {
  const serverCmd = o.serverCmd && o.serverCmd.length
    ? o.serverCmd
    : ['node', path.join(o.repoRoot, 'packages', 'cli', 'dist', 'index.js')];
  const cmd = serverCmd[0];
  const baseArgs = serverCmd.slice(1);
  const serverArgs = ['server', '--port', String(o.port), '--origin', '*', '--simpleInflection', '--postgis', '--servicesApi'];
  return { cmd, args: [...baseArgs, ...serverArgs] };
}

export async function spawnServer(o: ServerSpawnOpts): Promise<SpawnedServer> {
  // Guardrail: refuse to bind a reserved hub port unless explicitly allowed.
  assertPortAllowed(o.port, !!o.allowHub, 'server-port');

  const { cmd, args } = resolveServerArgv(o);
  const overrides = buildServerEnv(o);

  if (o.detached) {
    const { pid, logPath, pidPath } = spawnDetached({
      name: o.name,
      cmd,
      args,
      env: overrides,
      cwd: o.repoRoot,
      outDir: o.outDir
    });
    const handle: SpawnedServer = {
      pid,
      stop: async (): Promise<void> => {
        await stopPid(pid, 15000);
      },
      exited: () => !isAlive(pid),
      exitInfo: () => ({ code: null, signal: null }),
      logTail: (maxChars = 8000) => {
        try {
          return fs.readFileSync(logPath, 'utf8').slice(-maxChars);
        } catch {
          return '';
        }
      },
      logPath,
      pidPath
    };
    try {
      await waitForPort(o.port, 120000);
    } catch (err: any) {
      // Hand the started child back so the caller can record/stop it.
      if (err) err.server = handle;
      throw err;
    }
    return handle;
  }

  // Managed mode: keep the child handle so the caller can observe a crash.
  const state: { log: string; exited: boolean; exitCode: number | null; exitSignal: string | null } = {
    log: '',
    exited: false,
    exitCode: null,
    exitSignal: null
  };
  const child = spawn(cmd, args, {
    cwd: o.repoRoot,
    env: { ...process.env, ...overrides },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const append = (d: any): void => {
    state.log = (state.log + d).slice(-8000);
  };
  if (child.stdout) child.stdout.on('data', append);
  if (child.stderr) child.stderr.on('data', append);
  child.on('exit', (code, signal) => {
    state.exited = true;
    state.exitCode = code;
    state.exitSignal = signal;
  });
  child.on('error', (err) => {
    state.exited = true;
    state.exitCode = state.exitCode == null ? 1 : state.exitCode;
    append(`\n[spawn error] ${err && err.message ? err.message : err}`);
  });

  const stop = async (): Promise<void> => {
    if (state.exited) return;
    try {
      child.kill('SIGTERM');
    } catch {
      return;
    }
    const deadline = Date.now() + 15000;
    while (!state.exited && Date.now() < deadline) await sleep(300);
    if (!state.exited) {
      try {
        child.kill('SIGKILL');
      } catch {
        return;
      }
      const killDeadline = Date.now() + 2000;
      while (!state.exited && Date.now() < killDeadline) await sleep(100);
    }
  };

  const handle: SpawnedServer = {
    pid: child.pid as number,
    stop,
    exited: () => state.exited,
    exitInfo: () => ({ code: state.exitCode, signal: state.exitSignal }),
    logTail: (maxChars = 8000) => state.log.slice(-maxChars),
    logPath: null,
    pidPath: null
  };
  try {
    await waitForPort(o.port, 120000);
  } catch (err: any) {
    if (err) err.server = handle;
    throw err;
  }
  return handle;
}
