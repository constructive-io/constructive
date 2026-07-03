/**
 * instanceHeap — per-class instance heap cost (V2 sizing input).
 *
 * Port of `scripts/scale-validate/measure-instance-heap.mjs`. Boots a FRESH
 * server (own child process, own metrics file) via run/server.ts `spawnServer`
 * with the blueprint cache capped at 1, waits for the metrics sampler baseline,
 * cold-builds exactly ONE instance class by hitting a single virtual host, lets
 * the heap settle, and records the delta. Because the server is fresh and only
 * one host is ever hit, the delta IS the marginal cost of the first resident
 * instance of that class (instance + its share of lazily initialized caches).
 *
 * Env: PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE (or --pg-* flags; PG port
 * defaults to 5433, never 5432). The server port + PG port both run through the
 * hub-safety guardrail.
 */
import fs from 'node:fs';
import path from 'node:path';

import { Argv, asBool, asInt, usageExit } from '../core/args';
import {
  assertPortAllowed,
  findRepoRoot,
  PgConfig,
  pgConfigFromArgv,
  resolveOutDir,
  resolveServerCmd
} from '../core/config';
import { ensureParentDir, readJsonl } from '../core/proc';
import { spawnServer, SpawnedServer } from '../run/server';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const MB = (b: number): number => Math.round((b / 1024 / 1024) * 10) / 10;

const USAGE = `measure instance-heap — marginal per-class heap cost on a fresh cap=1 server

Options:
  --label <name>       label for artifacts + result row (default unlabeled)
  --host <vhost>       virtual host to cold-build (required, e.g. api-xxx.localhost)
  --port <n>           server port (default 3344)
  --heap-mb <n>        --max-old-space-size for the child (default 2048)
  --cache-max <n>      GRAPHILE_CACHE_MAX for the child (default 1)
  --settle-sec <n>     settle window after the cold build (default 70)
  --out <file>         result JSONL (default <out-dir>/instance-heap-results.jsonl)
  --out-dir <dir>      artifact directory (default ./perf-out)
  --server-cmd <cmd>   override the server launch command (whitespace-split)
  --pg-host/--pg-port/--pg-user/--pg-password/--pg-database   connection overrides
  --allow-hub          permit a reserved constructive-hub port (danger)
  --help
`;

// Probe a virtual host with a `{ __typename }` query. Kept local (not gqlFetch)
// so the recorded { status, ms, body } shape matches the original exactly.
async function probeTypename(
  host: string,
  port: number,
  timeoutMs: number
): Promise<{ status: number; ms: number; body: string }> {
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

export async function runInstanceHeap(argv: Argv): Promise<number> {
  if (argv.help) return usageExit(USAGE, 0);

  const label = typeof argv.label === 'string' ? argv.label : 'unlabeled';
  const host = typeof argv.host === 'string' ? argv.host : null;
  const port = asInt(argv.port, 3344);
  const heapMb = asInt(argv['heap-mb'], 2048);
  // Keep the raw string for the result field (original stored the string '1');
  // pass a number to spawnServer.
  const cacheMaxRaw = typeof argv['cache-max'] === 'string' ? argv['cache-max'] : '1';
  const cacheMax = asInt(cacheMaxRaw, 1);
  const settleSec = asInt(argv['settle-sec'], 70);
  if (!host) return usageExit('--host is required', 1);

  const allowHub = asBool(argv['allow-hub']);
  let pg: PgConfig;
  try {
    pg = pgConfigFromArgv(argv); // hub guardrail on the PG port
    assertPortAllowed(port, allowHub, 'server-port'); // hub guardrail on the server port
  } catch (e: any) {
    console.error(`[${label}] ${e && e.message ? e.message : e}`);
    return 1;
  }

  const outDir = resolveOutDir(argv);
  const repoRoot = findRepoRoot();
  const serverCmd = resolveServerCmd(argv, repoRoot);
  const serverName = `cap1-${label}`;
  const metricsFile = path.join(outDir, `metrics-${serverName}.jsonl`);
  const out = typeof argv.out === 'string' ? argv.out : path.join(outDir, 'instance-heap-results.jsonl');
  if (fs.existsSync(metricsFile)) fs.rmSync(metricsFile);

  const readMetrics = (): any[] => readJsonl(metricsFile);

  console.error(`[${label}] starting server port=${port} heap=${heapMb}MB cacheMax=${cacheMaxRaw} host=${host}`);
  const result: any = { label, host, heapMb, cacheMax: cacheMaxRaw, ok: false };
  let server: SpawnedServer | null = null;
  try {
    server = await spawnServer({
      name: serverName,
      port,
      heapMb,
      metricsFile,
      pg,
      repoRoot,
      outDir,
      serverCmd,
      cacheMax,
      allowHub
    });
    console.error(`[${label}] listening; waiting for baseline metrics...`);

    // Baseline: at least 2 sampler lines (~20s) so init transients are past.
    let m: any[] = [];
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
    console.error(`[${label}] baseline heapUsed=${result.baseline.heapUsedMB}MB rss=${result.baseline.rssMB}MB`);

    // Cold build: first request to this host builds the instance.
    const cold = await probeTypename(host, port, 420000);
    result.cold = cold;
    console.error(`[${label}] cold request: status=${cold.status} ${cold.ms}ms ${cold.body}`);
    if (cold.status !== 200) throw new Error(`cold request failed: ${cold.status} ${cold.body}`);

    // Settle and sample.
    const targetLines = baselineCount + Math.ceil(settleSec / 10);
    const settleDeadline = Date.now() + settleSec * 1000 + 60000;
    while (Date.now() < settleDeadline) {
      m = readMetrics();
      if (m.length >= targetLines) break;
      await sleep(5000);
    }
    const post = m.slice(baselineCount);
    if (post.length === 0) throw new Error('no post-build metrics samples');
    const last = post[post.length - 1];
    const heaps = post.map((x: any) => x.heapUsed);
    const rsss = post.map((x: any) => x.rss);
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
    const warm = await probeTypename(host, port, 30000);
    result.warm = { status: warm.status, ms: warm.ms };
    result.ok = warm.status === 200;
    console.error(
      `[${label}] deltaHeap=${result.deltaHeapMB}MB deltaRss=${result.deltaRssMB}MB ` +
        `(post last=${result.postBuild.heapUsedLastMB}MB min=${result.postBuild.heapUsedMinMB}MB ` +
        `max=${result.postBuild.heapUsedMaxMB}MB) warm=${warm.ms}ms`
    );
  } catch (e: any) {
    // A startup (port-wait) timeout throws before `server` is assigned, but
    // spawnServer attaches the started child to err.server so we can still tail
    // its log and stop it in the finally.
    if (!server && e && e.server) server = e.server;
    result.error = String(e && e.message ? e.message : e);
    result.serverLogTail = server ? server.logTail(1500) : '';
    console.error(`[${label}] FAILED: ${result.error}`);
  } finally {
    if (server) {
      try {
        await server.stop();
      } catch {
        /* already gone */
      }
    }
  }

  ensureParentDir(out);
  fs.appendFileSync(out, JSON.stringify(result) + '\n');
  console.error(`[${label}] result appended to ${out}`);
  return result.ok ? 0 : 1;
}
