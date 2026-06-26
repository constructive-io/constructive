import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { getNumberFlag, getStringFlag, hasFlag, parseArgs, parseCsv } from '../lib/args';
import { DEFAULT_BASE_URL, serverEnv, withLocalhostNoProxy, redactEnv } from '../lib/config';
import { getJson, waitForJsonOk } from '../lib/http';
import { defaultRunDir, ensureRunDirs, writeJson } from '../lib/run-dir';
import { runProcess } from '../lib/process';
import { nowIso, summarizeError } from '../lib/reports';
import type {
  CacheMode,
  CommandContext,
  E2eMatrixCaseResult,
  E2eMatrixResetResult,
  RoutingMode,
} from '../types';

type ServerHandle = {
  stop: () => Promise<void>;
};

type MatrixDirs = Awaited<ReturnType<typeof ensureRunDirs>>;

type JsonRecord = Record<string, unknown>;

function asRoutingMode(value: string): RoutingMode {
  if (value === 'private' || value === 'public') return value;
  throw new Error(`Invalid routing mode ${value}; expected private|public`);
}

function asCacheMode(value: string): CacheMode {
  if (value === 'old' || value === 'new') return value;
  throw new Error(`Invalid cache mode ${value}; expected old|new`);
}

function isRecord(value: unknown): value is JsonRecord {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function getRecord(value: unknown, key: string): JsonRecord | undefined {
  if (!isRecord(value)) return undefined;
  const child = value[key];
  return isRecord(child) ? child : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as unknown;
}

async function removeIfExists(filePath: string): Promise<void> {
  try {
    await fs.rm(filePath, { force: true });
  } catch {
    // Best-effort stale artifact cleanup only.
  }
}

function pushGateFailure(result: E2eMatrixCaseResult, message: string): void {
  result.hardGateFailures = [...(result.hardGateFailures ?? []), message];
}

async function startManagedServer({
  ctx,
  routingMode,
  cacheMode,
  port,
  k,
  logsDir,
}: {
  ctx: CommandContext;
  routingMode: RoutingMode;
  cacheMode: CacheMode;
  port: number;
  k: number;
  logsDir: string;
}): Promise<ServerHandle> {
  const env = serverEnv({ routingMode, cacheMode, port, k });
  await fs.mkdir(logsDir, { recursive: true });
  const logPath = path.join(logsDir, `server-${routingMode}-${cacheMode}.log`);
  console.log(`[e2e-matrix] starting managed server ${routingMode}/${cacheMode}`);
  console.log(`[e2e-matrix] env ${JSON.stringify(redactEnv(env))}`);
  console.log(`[e2e-matrix] server log ${logPath}`);

  if (ctx.dryRun) {
    return { stop: async () => undefined };
  }

  const log = await fs.open(logPath, 'a');
  const requireFromServer = createRequire(path.join(ctx.paths.serverDir, 'package.json'));
  const tsNodeBin = requireFromServer.resolve('ts-node/dist/bin.js');
  const child = spawn(process.execPath, [tsNodeBin, 'src/run.ts'], {
    cwd: ctx.paths.serverDir,
    env,
    stdio: ['ignore', log.fd, log.fd],
    detached: true,
  });

  let stopped = false;
  const killChildTree = (signal: NodeJS.Signals) => {
    if (!child.pid) return;
    try {
      process.kill(-child.pid, signal);
    } catch {
      try {
        child.kill(signal);
      } catch {
        // Already gone.
      }
    }
  };
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    killChildTree('SIGTERM');
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        killChildTree('SIGKILL');
        resolve();
      }, 10_000);
      child.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    await log.close();
  };

  child.on('exit', (code, signal) => {
    if (!stopped && code !== 0) {
      console.error(`[e2e-matrix] managed server exited code=${code} signal=${signal ?? ''}; see ${logPath}`);
    }
  });

  try {
    await waitForJsonOk(`http://localhost:${port}/debug/memory`, 90_000, 1_000);
  } catch (error) {
    await stop();
    throw error;
  }

  return { stop };
}

async function captureMemory(baseUrl: string, outputPath: string, dryRun: boolean): Promise<boolean> {
  console.log(`[e2e-matrix] capture memory ${outputPath}`);
  if (dryRun) {
    return true;
  }
  const payload = await getJson(`${baseUrl}/debug/memory`, 15_000);
  await writeJson(outputPath, payload);
  return payload.ok;
}

async function runPrivateCase({
  ctx,
  cacheMode,
  k,
  durationSeconds,
  workers,
  port,
  dirs,
}: {
  ctx: CommandContext;
  cacheMode: CacheMode;
  k: number;
  durationSeconds: number;
  workers: number;
  port: number;
  dirs: MatrixDirs;
}): Promise<string> {
  const tmpResultPath = `/tmp/e2e-benchmark-${cacheMode}-k${k}.json`;
  const legacyResultPath = path.join(ctx.paths.perfDir, 'results', `e2e-benchmark-${cacheMode}-k${k}.json`);
  const matrixResultPath = path.join(dirs.reportsDir, `private-${cacheMode}-result.json`);

  if (!ctx.dryRun) {
    await Promise.all([removeIfExists(tmpResultPath), removeIfExists(legacyResultPath), removeIfExists(matrixResultPath)]);
  }

  const env = withLocalhostNoProxy({
    ...process.env,
    MODE: cacheMode,
    K: String(k),
    DURATION: String(durationSeconds),
    WORKERS: String(workers),
    SERVER_PORT: String(port),
    API_IS_PUBLIC: 'false',
  });
  await runProcess('npx', ['ts-node', path.join(ctx.paths.perfDir, 'e2e-benchmark.ts')], {
    cwd: ctx.paths.serverDir,
    env,
    dryRun: ctx.dryRun,
    label: `private-${cacheMode}`,
  });

  if (ctx.dryRun) {
    return matrixResultPath;
  }

  const sourcePath = (await pathExists(tmpResultPath)) ? tmpResultPath : legacyResultPath;
  if (!(await pathExists(sourcePath))) {
    throw new Error(`private ${cacheMode} result report not found; checked ${tmpResultPath} and ${legacyResultPath}`);
  }

  await fs.mkdir(path.dirname(matrixResultPath), { recursive: true });
  await fs.copyFile(sourcePath, matrixResultPath);
  return matrixResultPath;
}

async function runPublicCase({
  ctx,
  cacheMode,
  runDir,
  baseUrl,
  durationSeconds,
  workers,
  minTenantCount,
}: {
  ctx: CommandContext;
  cacheMode: CacheMode;
  runDir: string;
  baseUrl: string;
  durationSeconds: number;
  workers: number;
  minTenantCount: number;
}): Promise<string> {
  const tier = `public-${cacheMode}-k${minTenantCount}-${durationSeconds}s`;
  const resultPath = path.join(runDir, 'data', `load-${tier}.json`);
  if (!ctx.dryRun) {
    await removeIfExists(resultPath);
  }
  await runProcess(
    process.execPath,
    [
      path.join(ctx.paths.perfDir, 'phase2-load.mjs'),
      '--run-dir',
      runDir,
      '--base-url',
      baseUrl,
      '--profiles',
      path.join(runDir, 'data', 'business-op-profiles.json'),
      '--workers',
      String(workers),
      '--duration-seconds',
      String(durationSeconds),
      '--idle-seconds',
      '0',
      '--min-tenant-count',
      String(minTenantCount),
      '--public-role',
      'anonymous',
      '--tier',
      tier,
    ],
    {
      cwd: ctx.paths.repoRoot,
      env: withLocalhostNoProxy(process.env),
      dryRun: ctx.dryRun,
      label: `public-${cacheMode}`,
    },
  );
  return resultPath;
}

async function resetPublicBusinessData({
  ctx,
  runDir,
  before,
  after,
}: {
  ctx: CommandContext;
  runDir: string;
  before: string;
  after: string;
}): Promise<E2eMatrixResetResult> {
  const tag = `between-${before}-and-${after}`.replace(/[^a-zA-Z0-9_-]+/g, '-');
  const reportPath = path.join(runDir, 'reports', `reset-business-test-data-${tag}.json`);

  try {
    await runProcess(
      'npx',
      [
        'ts-node',
        path.join(ctx.paths.perfDir, 'src', 'cli.ts'),
        'reset-business-data',
        '--run-dir',
        runDir,
        '--profiles',
        path.join(runDir, 'data', 'business-op-profiles.json'),
        '--public-role',
        'anonymous',
        '--tag',
        tag,
      ],
      {
        cwd: ctx.paths.serverDir,
        env: withLocalhostNoProxy(process.env),
        dryRun: ctx.dryRun,
        label: `reset-${tag}`,
      },
    );

    if (ctx.dryRun) {
      return { before, after, ok: true, reportPath, failureCount: 0 };
    }

    const payload = await readJsonFile(reportPath);
    const totals = getRecord(payload, 'totals');
    const failureCount = getNumber(totals?.failureCount) ?? 0;
    return { before, after, ok: failureCount === 0, reportPath, failureCount };
  } catch (error) {
    return { before, after, ok: false, reportPath, error: summarizeError(error) };
  }
}

async function provisionPublicIfRequested({
  ctx,
  runDir,
  baseUrl,
  k,
  keyspaceMinRouteKeys,
  skipPublicPreflight,
}: {
  ctx: CommandContext;
  runDir: string;
  baseUrl: string;
  k: number;
  keyspaceMinRouteKeys: number;
  skipPublicPreflight: boolean;
}): Promise<void> {
  if (skipPublicPreflight) {
    console.log('[e2e-matrix] skipping public preflight; expecting existing business-op-profiles.json');
    return;
  }
  await runProcess(
    process.execPath,
    [
      path.join(ctx.paths.perfDir, 'phase1-preflight.mjs'),
      '--run-dir',
      runDir,
      '--base-url',
      baseUrl,
      '--dbpm-tenant-count',
      String(k),
      '--min-tenant-count',
      String(k),
      '--dbpm-shape-variants',
      '1',
      '--auth-host',
      'auth.localhost',
      '--provision-host',
      'modules.localhost',
      '--business-routing-mode',
      'public',
      '--business-compat-routing-mode',
      'public',
      '--business-public-api-name',
      'api',
      '--business-public-subdomain-prefix',
      'api-dbpm-',
      '--min-token-tenants',
      String(k),
      '--keyspace-min-route-keys',
      String(keyspaceMinRouteKeys),
    ],
    {
      cwd: ctx.paths.repoRoot,
      env: withLocalhostNoProxy(process.env),
      dryRun: ctx.dryRun,
      label: 'public-preflight',
    },
  );
}

async function summarizePrivateResult(result: E2eMatrixCaseResult, resultPath: string, dryRun: boolean): Promise<void> {
  result.resultPath = resultPath;
  if (dryRun) {
    result.reportExists = true;
    result.errors = 0;
    result.failed = 0;
    return;
  }

  result.reportExists = await pathExists(resultPath);
  if (!result.reportExists) {
    pushGateFailure(result, `result report missing: ${resultPath}`);
    return;
  }

  const payload = await readJsonFile(resultPath);
  if (!isRecord(payload)) {
    pushGateFailure(result, `result report is not an object: ${resultPath}`);
    return;
  }

  const errors = getNumber(payload.errors);
  if (errors == null) {
    pushGateFailure(result, `private benchmark report missing numeric errors field: ${resultPath}`);
    return;
  }
  result.errors = errors;
  result.failed = errors;
  result.totalRequests = getNumber(payload.totalQueries);
  result.qps = getNumber(payload.qps);
  result.p95Ms = getNumber(payload.p95) ?? null;
  result.p99Ms = getNumber(payload.p99) ?? null;
  result.heapDeltaMb = getNumber(payload.heapDelta);

  if (errors !== 0) {
    pushGateFailure(result, `private benchmark errors=${errors}`);
  }
}

async function summarizePublicResult(result: E2eMatrixCaseResult, resultPath: string, dryRun: boolean): Promise<void> {
  result.resultPath = resultPath;
  if (dryRun) {
    result.reportExists = true;
    result.errors = 0;
    result.failed = 0;
    return;
  }

  result.reportExists = await pathExists(resultPath);
  if (!result.reportExists) {
    pushGateFailure(result, `result report missing: ${resultPath}`);
    return;
  }

  const payload = await readJsonFile(resultPath);
  if (!isRecord(payload)) {
    pushGateFailure(result, `result report is not an object: ${resultPath}`);
    return;
  }

  const load = getRecord(payload, 'load');
  if (!load) {
    pushGateFailure(result, `public load report missing load object: ${resultPath}`);
    return;
  }
  const latency = getRecord(load, 'latencyMs');
  const failed = getNumber(load.failed);
  if (failed == null) {
    pushGateFailure(result, `public load report missing numeric load.failed field: ${resultPath}`);
    return;
  }

  result.failed = failed;
  result.errors = failed;
  result.totalRequests = getNumber(load?.total);
  result.qps = getNumber(load?.requestsPerSecond);
  result.p95Ms = getNumber(latency?.p95) ?? null;
  result.p99Ms = getNumber(latency?.p99) ?? null;

  if (failed !== 0) {
    pushGateFailure(result, `public load failed=${failed}`);
  }

  const routeProbe = getRecord(payload, 'routeProbe');
  if (routeProbe && routeProbe.ok === false) {
    pushGateFailure(result, 'public routeProbe.ok=false');
  }

  const prewarm = getRecord(payload, 'prewarm');
  const prewarmFailed = getNumber(prewarm?.failed) ?? 0;
  if (prewarmFailed !== 0) {
    pushGateFailure(result, `public prewarm failed=${prewarmFailed}`);
  }
}

function shouldResetAfterPublicCase({
  routingModes,
  cacheModes,
  routingMode,
  cacheMode,
  resetBetweenPublicCacheModes,
}: {
  routingModes: RoutingMode[];
  cacheModes: CacheMode[];
  routingMode: RoutingMode;
  cacheMode: CacheMode;
  resetBetweenPublicCacheModes: boolean;
}): boolean {
  if (!resetBetweenPublicCacheModes || routingMode !== 'public' || !routingModes.includes('public')) {
    return false;
  }
  return cacheModes.indexOf(cacheMode) < cacheModes.length - 1;
}

export async function e2eMatrix(ctx: CommandContext): Promise<void> {
  const parsed = parseArgs(ctx.args);
  const routingModes = parseCsv(getStringFlag(parsed.flags, '--routing-modes'), ['private', 'public']).map(asRoutingMode);
  const cacheModes = parseCsv(getStringFlag(parsed.flags, '--cache-modes'), ['old', 'new']).map(asCacheMode);
  const k = getNumberFlag(parsed.flags, '--k', 10);
  const durationSeconds = getNumberFlag(parsed.flags, '--duration-seconds', 300);
  const workers = getNumberFlag(parsed.flags, '--workers', 4);
  const port = getNumberFlag(parsed.flags, '--port', 3000);
  const keyspaceMinRouteKeys = getNumberFlag(parsed.flags, '--keyspace-min-route-keys', k);
  const baseUrl = getStringFlag(parsed.flags, '--base-url', DEFAULT_BASE_URL) || DEFAULT_BASE_URL;
  const runDir = path.resolve(getStringFlag(parsed.flags, '--run-dir', defaultRunDir('e2e-matrix')) || defaultRunDir('e2e-matrix'));
  const manageServer = hasFlag(parsed.flags, '--manage-server');
  const skipPublicPreflight = hasFlag(parsed.flags, '--skip-public-preflight');
  const resetBetweenPublicCacheModes = !hasFlag(parsed.flags, '--no-reset-between-public-cache-modes');
  const dirs = await ensureRunDirs(runDir);
  const results: E2eMatrixCaseResult[] = [];
  const runOrder: string[] = [];

  const config = {
    routingModes,
    cacheModes,
    k,
    durationSeconds,
    workers,
    port,
    keyspaceMinRouteKeys,
    baseUrl,
    runDir,
    manageServer,
    skipPublicPreflight,
    resetBetweenPublicCacheModes,
  };
  console.log('[e2e-matrix] config', JSON.stringify(config, null, 2));

  if (routingModes.includes('public')) {
    if (manageServer) {
      const server = await startManagedServer({ ctx, routingMode: 'public', cacheMode: 'new', port, k, logsDir: dirs.logsDir });
      try {
        await provisionPublicIfRequested({ ctx, runDir, baseUrl, k, keyspaceMinRouteKeys, skipPublicPreflight });
      } finally {
        await server.stop();
      }
    } else {
      await provisionPublicIfRequested({ ctx, runDir, baseUrl, k, keyspaceMinRouteKeys, skipPublicPreflight });
    }
  }

  for (const routingMode of routingModes) {
    for (const cacheMode of cacheModes) {
      const startedAt = nowIso();
      const result: E2eMatrixCaseResult = { routingMode, cacheMode, ok: false, startedAt, finishedAt: startedAt };
      runOrder.push(`${routingMode}/${cacheMode}`);
      let server: ServerHandle | undefined;
      try {
        if (manageServer) {
          server = await startManagedServer({ ctx, routingMode, cacheMode, port, k, logsDir: dirs.logsDir });
        }
        const memoryBeforePath = path.join(dirs.reportsDir, `memory-${routingMode}-${cacheMode}-before.json`);
        const memoryAfterPath = path.join(dirs.reportsDir, `memory-${routingMode}-${cacheMode}-after.json`);
        result.memoryBeforePath = memoryBeforePath;
        result.memoryBeforeOk = await captureMemory(baseUrl, memoryBeforePath, ctx.dryRun);
        if (!result.memoryBeforeOk) {
          pushGateFailure(result, `memory before capture failed: ${memoryBeforePath}`);
        }

        if (routingMode === 'private') {
          const resultPath = await runPrivateCase({ ctx, cacheMode, k, durationSeconds, workers, port, dirs });
          await summarizePrivateResult(result, resultPath, ctx.dryRun);
        } else {
          const resultPath = await runPublicCase({ ctx, cacheMode, runDir, baseUrl, durationSeconds, workers, minTenantCount: k });
          await summarizePublicResult(result, resultPath, ctx.dryRun);
        }

        result.memoryAfterPath = memoryAfterPath;
        result.memoryAfterOk = await captureMemory(baseUrl, memoryAfterPath, ctx.dryRun);
        if (!result.memoryAfterOk) {
          pushGateFailure(result, `memory after capture failed: ${memoryAfterPath}`);
        }
      } catch (error) {
        result.error = summarizeError(error);
        pushGateFailure(result, result.error);
        console.error(`[e2e-matrix] case failed ${routingMode}/${cacheMode}: ${result.error}`);
      } finally {
        if (server) await server.stop();

        if (shouldResetAfterPublicCase({ routingModes, cacheModes, routingMode, cacheMode, resetBetweenPublicCacheModes })) {
          const nextCacheMode = cacheModes[cacheModes.indexOf(cacheMode) + 1];
          const reset = await resetPublicBusinessData({
            ctx,
            runDir,
            before: `public/${cacheMode}`,
            after: `public/${nextCacheMode}`,
          });
          result.resetAfter = reset;
          if (!reset.ok) {
            pushGateFailure(result, reset.error ? `reset failed: ${reset.error}` : `reset failed: failureCount=${reset.failureCount ?? 'unknown'}`);
          }
        }

        result.ok = (result.hardGateFailures ?? []).length === 0;
        result.finishedAt = nowIso();
        results.push(result);
        await writeJson(path.join(dirs.reportsDir, 'e2e-matrix-summary.json'), {
          matrix: config,
          runOrder,
          results,
          pass: results.every((item) => item.ok),
        });
      }
    }
  }

  const pass = results.every((item) => item.ok);
  console.log(JSON.stringify({ runDir, pass, runOrder, results }, null, 2));
  if (!pass) process.exitCode = 1;
}
