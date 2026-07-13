#!/usr/bin/env node
// =============================================================================
// measure-instance-heap.mjs — per-class instance heap cost (V2 sizing input)
//
// Boots a FRESH cnc server (own child process, own metrics file), waits for the
// metrics sampler baseline, cold-builds exactly ONE instance class by hitting a
// single virtual host, lets the heap settle, and records the delta. Because the
// server is fresh and only one host is ever hit, the delta IS the marginal cost
// of the first resident instance of that class (instance + its share of lazily
// initialized caches).
//
// Usage:
//   node scripts/scale-validate/measure-instance-heap.mjs \
//     --label tenant-api --host api-factory1-26c6da94.localhost \
//     [--port 3344] [--heap-mb 2048] [--cache-max 1] [--settle-sec 70] \
//     [--out scripts/scale-validate/out/instance-heap.jsonl]
//
// Env: PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE (defaults :5433 constructive)
// =============================================================================
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKTREE = path.resolve(__dirname, '..', '..');

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const LABEL = arg('label', 'unlabeled');
const HOST = arg('host', null);
const PORT = parseInt(arg('port', '3344'), 10);
const HEAP_MB = parseInt(arg('heap-mb', '2048'), 10);
const CACHE_MAX = arg('cache-max', '1');
const SETTLE_SEC = parseInt(arg('settle-sec', '70'), 10);
const OUT = path.resolve(WORKTREE, arg('out', 'scripts/scale-validate/out/instance-heap.jsonl'));
if (!HOST) {
  console.error('--host is required');
  process.exit(1);
}

const METRICS_FILE = path.resolve(
  WORKTREE,
  'scripts/scale-validate/out',
  `metrics-cap1-${LABEL}.jsonl`
);
mkdirSync(path.dirname(METRICS_FILE), { recursive: true });
if (existsSync(METRICS_FILE)) rmSync(METRICS_FILE);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MB = (b) => Math.round((b / 1024 / 1024) * 10) / 10;

function readMetrics() {
  if (!existsSync(METRICS_FILE)) return [];
  return readFileSync(METRICS_FILE, 'utf8')
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

function waitForPort(port, timeoutMs) {
  // The server binds "localhost", which on macOS may resolve to ::1 only —
  // probe both families.
  const hosts = ['127.0.0.1', '::1'];
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    let i = 0;
    const tryOnce = () => {
      const host = hosts[i++ % hosts.length];
      const sock = net.connect({ host, port }, () => {
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

async function gql(host, port, timeoutMs) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const start = performance.now();
  try {
    const res = await fetch(`http://${host}:${port}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query: 'query { __typename }' }),
      signal: ac.signal
    });
    const body = await res.text();
    return { status: res.status, ms: Math.round(performance.now() - start), body: body.slice(0, 200) };
  } catch (e) {
    return { status: 0, ms: Math.round(performance.now() - start), body: String(e).slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}

const main = async () => {
  console.log(`[${LABEL}] starting server port=${PORT} heap=${HEAP_MB}MB cacheMax=${CACHE_MAX} host=${HOST}`);
  const child = spawn(
    'node',
    [
      'packages/cli/dist/index.js',
      'server',
      '--port',
      String(PORT),
      '--origin',
      '*',
      '--simpleInflection',
      '--postgis',
      '--servicesApi'
    ],
    {
      cwd: WORKTREE,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NODE_OPTIONS: `--max-old-space-size=${HEAP_MB}`,
        GRAPHILE_DEBUG_METRICS: '1',
        GRAPHILE_DEBUG_METRICS_FILE: METRICS_FILE,
        GRAPHILE_BLUEPRINT_POOLING: '1',
        GRAPHILE_CACHE_MAX: CACHE_MAX,
        PGHOST: process.env.PGHOST || 'localhost',
        PGPORT: process.env.PGPORT || '5433',
        PGUSER: process.env.PGUSER || 'postgres',
        PGPASSWORD: process.env.PGPASSWORD || 'password',
        PGDATABASE: process.env.PGDATABASE || 'constructive'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  let serverLog = '';
  child.stdout.on('data', (d) => (serverLog += d));
  child.stderr.on('data', (d) => (serverLog += d));
  let exited = false;
  child.on('exit', () => (exited = true));

  const result = { label: LABEL, host: HOST, heapMb: HEAP_MB, cacheMax: CACHE_MAX, ok: false };
  try {
    await waitForPort(PORT, 120000);
    console.log(`[${LABEL}] listening; waiting for baseline metrics...`);

    // Baseline: at least 2 sampler lines (20s) so init transients are past.
    let m = [];
    const baseDeadline = Date.now() + 90000;
    while (Date.now() < baseDeadline) {
      m = readMetrics();
      if (m.length >= 2) break;
      await sleep(2000);
    }
    if (m.length < 2) throw new Error(`no metrics baseline (${m.length} lines): sampler not writing?`);
    const baseline = m[m.length - 1];
    const baselineCount = m.length;
    result.baseline = { heapUsedMB: MB(baseline.heapUsed), rssMB: MB(baseline.rss) };
    console.log(`[${LABEL}] baseline heapUsed=${result.baseline.heapUsedMB}MB rss=${result.baseline.rssMB}MB`);

    // Cold build: first request to this host builds the instance.
    const cold = await gql(HOST, PORT, 420000);
    result.cold = cold;
    console.log(`[${LABEL}] cold request: status=${cold.status} ${cold.ms}ms ${cold.body}`);
    if (cold.status !== 200) throw new Error(`cold request failed: ${cold.status} ${cold.body}`);

    // Settle and sample.
    const targetLines = baselineCount + Math.ceil(SETTLE_SEC / 10);
    const settleDeadline = Date.now() + SETTLE_SEC * 1000 + 60000;
    while (Date.now() < settleDeadline) {
      m = readMetrics();
      if (m.length >= targetLines) break;
      await sleep(5000);
    }
    const post = m.slice(baselineCount);
    if (post.length === 0) throw new Error('no post-build metrics samples');
    const last = post[post.length - 1];
    const heaps = post.map((x) => x.heapUsed);
    const rsss = post.map((x) => x.rss);
    result.postBuild = {
      samples: post.length,
      heapUsedLastMB: MB(last.heapUsed),
      heapUsedMinMB: MB(Math.min(...heaps)),
      heapUsedMaxMB: MB(Math.max(...heaps)),
      rssLastMB: MB(last.rss),
      rssMaxMB: MB(Math.max(...rsss)),
      cache: last.cache,
      counters: last.counters
    };
    result.deltaHeapMB = Math.round((result.postBuild.heapUsedLastMB - result.baseline.heapUsedMB) * 10) / 10;
    result.deltaRssMB = Math.round((result.postBuild.rssLastMB - result.baseline.rssMB) * 10) / 10;

    // Warm request: instance resident, should be fast.
    const warm = await gql(HOST, PORT, 30000);
    result.warm = { status: warm.status, ms: warm.ms };
    result.ok = warm.status === 200;
    console.log(
      `[${LABEL}] deltaHeap=${result.deltaHeapMB}MB deltaRss=${result.deltaRssMB}MB ` +
        `(post last=${result.postBuild.heapUsedLastMB}MB min=${result.postBuild.heapUsedMinMB}MB ` +
        `max=${result.postBuild.heapUsedMaxMB}MB) warm=${warm.ms}ms`
    );
  } catch (e) {
    result.error = String(e && e.message ? e.message : e);
    result.serverLogTail = serverLog.slice(-1500);
    console.error(`[${LABEL}] FAILED: ${result.error}`);
  } finally {
    if (!exited) {
      child.kill('SIGTERM');
      const killDeadline = Date.now() + 15000;
      while (!exited && Date.now() < killDeadline) await sleep(500);
      if (!exited) child.kill('SIGKILL');
    }
  }

  appendFileSync(OUT, JSON.stringify(result) + '\n');
  console.log(`[${LABEL}] result appended to ${OUT}`);
  if (!result.ok) process.exitCode = 1;
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
