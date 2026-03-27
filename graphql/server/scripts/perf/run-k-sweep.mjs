#!/usr/bin/env node

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_BASE_URL,
  DEFAULT_TMP_ROOT,
  ensureRunDirs,
  getArgValue,
  hasFlag,
  makeRunId,
  postJson,
  writeJson,
} from './common.mjs';

const args = process.argv.slice(2);

const runId = getArgValue(args, '--run-id', makeRunId('graphile-cache-k-sweep'));
const runDir = path.resolve(getArgValue(args, '--run-dir', path.join(DEFAULT_TMP_ROOT, runId)));
const baseUrl = getArgValue(args, '--base-url', DEFAULT_BASE_URL);
const profilesPath = path.resolve(
  getArgValue(args, '--profiles', path.join(runDir, 'data', 'business-op-profiles.json')),
);

const workers = Number.parseInt(getArgValue(args, '--workers', '16'), 10);
const durationSeconds = Number.parseInt(getArgValue(args, '--duration-seconds', '600'), 10);
const idleSeconds = Number.parseInt(getArgValue(args, '--idle-seconds', '120'), 10);
const minTenantCount = Number.parseInt(getArgValue(args, '--min-tenant-count', '10'), 10);
const churnRatio = getArgValue(args, '--churn-ratio', '0.4');
const churnWarmSeconds = getArgValue(args, '--churn-warm-seconds', '120');
const churnCoolSeconds = getArgValue(args, '--churn-cool-seconds', '240');
const churnCohorts = getArgValue(args, '--churn-cohorts', '2');
const kValuesRaw = getArgValue(args, '--k-values', '3,7');
const continueOnError = hasFlag(args, '--continue-on-error');
const apiIsPublicRaw = getArgValue(args, '--api-is-public', 'false').trim().toLowerCase();
const routingMode = getArgValue(
  args,
  '--routing-mode',
  apiIsPublicRaw === 'true' ? 'public' : 'private',
)
  .trim()
  .toLowerCase();
const tierMode = getArgValue(
  args,
  '--tier-mode',
  routingMode === 'public' ? 'active-tenants' : 'keyspace',
)
  .trim()
  .toLowerCase();
const keyspaceMode = getArgValue(
  args,
  '--keyspace-mode',
  tierMode === 'keyspace' ? 'auto' : 'none',
)
  .trim()
  .toLowerCase();
const publicRole = getArgValue(args, '--public-role', 'authenticated').trim();
const publicReadRole = getArgValue(args, '--public-read-role', 'anonymous').trim();
const ensurePublicTestAccess = hasFlag(args, '--ensure-public-test-access') || apiIsPublicRaw === 'true';

const servicePort = Number.parseInt(getArgValue(args, '--service-port', '3000'), 10);
const serviceOrigin = getArgValue(args, '--service-origin', '*');
const serviceReadyTimeoutMs = Number.parseInt(getArgValue(args, '--service-ready-timeout-ms', '45000'), 10);
const routeProbeTimeoutMs = Number.parseInt(getArgValue(args, '--route-probe-timeout-ms', '15000'), 10);
const samplerMemoryIntervalMs = getArgValue(args, '--sampler-memory-interval-ms', '10000');
const samplerDbIntervalMs = getArgValue(args, '--sampler-db-interval-ms', '30000');
const graphileCacheMaxRaw = getArgValue(args, '--graphile-cache-max', process.env.GRAPHILE_CACHE_MAX || '').trim();
const graphileSchemaWaitTimeMsRaw = getArgValue(
  args,
  '--graphile-schema-wait-time-ms',
  process.env.GRAPHILE_SCHEMA_WAIT_TIME_MS || '',
).trim();
const prewarmDisabled = hasFlag(args, '--disable-prewarm');
const prewarmSampleSize = Number.parseInt(getArgValue(args, '--prewarm-sample-size', '0'), 10);
const prewarmConcurrency = Number.parseInt(getArgValue(args, '--prewarm-concurrency', '6'), 10);
const prewarmTimeoutMs = Number.parseInt(getArgValue(args, '--prewarm-timeout-ms', '30000'), 10);
const prewarmMaxFailures = Number.parseInt(getArgValue(args, '--prewarm-max-failures', '0'), 10);
const maxOldSpaceSizeMb = Math.max(
  1024,
  Number.parseInt(getArgValue(args, '--max-old-space-size-mb', '15360'), 10) || 15360,
);
const nodeOptionsRaw = getArgValue(
  args,
  '--node-options',
  process.env.NODE_OPTIONS || '--heapsnapshot-signal=SIGUSR2 --expose-gc',
);

const ensureMaxOldSpaceSize = (options, sizeMb) => {
  const text = String(options || '').trim();
  const hasMaxOldSpace = /--max-old-space-size(?:=|\s+)/.test(text);
  if (hasMaxOldSpace) {
    return text;
  }
  return `--max-old-space-size=${sizeMb}${text.length > 0 ? ` ${text}` : ''}`;
};

const nodeOptions = ensureMaxOldSpaceSize(nodeOptionsRaw, maxOldSpaceSizeMb);
const graphileCacheMax =
  graphileCacheMaxRaw.length > 0 ? Number.parseInt(graphileCacheMaxRaw, 10) : null;
const graphileSchemaWaitTimeMs =
  graphileSchemaWaitTimeMsRaw.length > 0 ? Number.parseInt(graphileSchemaWaitTimeMsRaw, 10) : null;

if (apiIsPublicRaw !== 'true' && apiIsPublicRaw !== 'false') {
  throw new Error(`Invalid --api-is-public=${apiIsPublicRaw}; expected true|false`);
}
const apiIsPublic = apiIsPublicRaw === 'true';

const VALID_ROUTING_MODES = new Set(['private', 'public']);
if (!VALID_ROUTING_MODES.has(routingMode)) {
  throw new Error(`Invalid --routing-mode=${routingMode}; expected private|public`);
}
if ((apiIsPublic && routingMode !== 'public') || (!apiIsPublic && routingMode !== 'private')) {
  throw new Error(
    `Inconsistent mode: --api-is-public=${apiIsPublicRaw} requires --routing-mode=${apiIsPublic ? 'public' : 'private'}`,
  );
}

const VALID_TIER_MODES = new Set(['keyspace', 'active-tenants']);
if (!VALID_TIER_MODES.has(tierMode)) {
  throw new Error(`Invalid --tier-mode=${tierMode}; expected keyspace|active-tenants`);
}
if (routingMode === 'public' && tierMode === 'keyspace') {
  throw new Error('Public routing does not support keyspace tier mode; use --tier-mode active-tenants');
}

const VALID_KEYSPACE_MODES = new Set(['auto', 'schemata', 'none']);
if (!VALID_KEYSPACE_MODES.has(keyspaceMode)) {
  throw new Error(`Invalid --keyspace-mode=${keyspaceMode}; expected auto|schemata|none`);
}
if (ensurePublicTestAccess && publicRole.length === 0) {
  throw new Error('--public-role cannot be empty when --ensure-public-test-access is enabled');
}
if (graphileCacheMaxRaw.length > 0 && (!Number.isFinite(graphileCacheMax) || graphileCacheMax <= 0)) {
  throw new Error(`Invalid --graphile-cache-max=${graphileCacheMaxRaw}; expected positive integer`);
}
if (
  graphileSchemaWaitTimeMsRaw.length > 0 &&
  (!Number.isFinite(graphileSchemaWaitTimeMs) || graphileSchemaWaitTimeMs <= 0)
) {
  throw new Error(
    `Invalid --graphile-schema-wait-time-ms=${graphileSchemaWaitTimeMsRaw}; expected positive integer`,
  );
}
if (!Number.isFinite(prewarmSampleSize) || prewarmSampleSize < 0) {
  throw new Error(`Invalid --prewarm-sample-size=${prewarmSampleSize}; expected non-negative integer`);
}
if (!Number.isFinite(prewarmConcurrency) || prewarmConcurrency <= 0) {
  throw new Error(`Invalid --prewarm-concurrency=${prewarmConcurrency}; expected positive integer`);
}
if (!Number.isFinite(prewarmTimeoutMs) || prewarmTimeoutMs <= 0) {
  throw new Error(`Invalid --prewarm-timeout-ms=${prewarmTimeoutMs}; expected positive integer`);
}
if (!Number.isFinite(prewarmMaxFailures) || prewarmMaxFailures < 0) {
  throw new Error(`Invalid --prewarm-max-failures=${prewarmMaxFailures}; expected non-negative integer`);
}

const pgConfig = {
  host: getArgValue(args, '--pg-host', process.env.PGHOST || 'localhost'),
  port: getArgValue(args, '--pg-port', process.env.PGPORT || '5432'),
  database: getArgValue(args, '--pg-database', process.env.PGDATABASE || 'constructive'),
  user: getArgValue(args, '--pg-user', process.env.PGUSER || 'postgres'),
  password: getArgValue(args, '--pg-password', process.env.PGPASSWORD || 'password'),
};

const __filename = fileURLToPath(import.meta.url);
const perfDir = path.dirname(__filename);
const serverDir = path.resolve(perfDir, '..', '..');
const repoRoot = path.resolve(serverDir, '..', '..');
const phase2Script = path.join(perfDir, 'phase2-load.mjs');
const resetScript = path.join(perfDir, 'reset-business-test-data.mjs');
const cliServerEntry = path.join(repoRoot, 'packages/cli/dist/index.js');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ABSOLUTE_URL_RE = /^https?:\/\//i;

const parseKValues = (raw) => {
  const values = String(raw)
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (values.length === 0) {
    throw new Error(`No valid k values from --k-values=${raw}`);
  }

  return [...new Set(values)];
};

const readJson = async (filePath) => {
  const raw = await fsp.readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const extractProfiles = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.profiles)) return payload.profiles;
  return [];
};

const isProcessAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const getListeningPids = async (port) => {
  return await new Promise((resolve) => {
    execFile('lsof', ['-tiTCP:' + String(port), '-sTCP:LISTEN'], (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }

      const pids = String(stdout)
        .split('\n')
        .map((line) => Number.parseInt(line.trim(), 10))
        .filter((pid) => Number.isFinite(pid));
      resolve([...new Set(pids)]);
    });
  });
};

const stopPortListeners = async (port) => {
  const pids = await getListeningPids(port);
  if (pids.length === 0) return;

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // ignore stale pid
    }
  }

  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    const alive = pids.filter((pid) => isProcessAlive(pid));
    if (alive.length === 0) return;
    await sleep(200);
  }

  for (const pid of pids) {
    if (!isProcessAlive(pid)) continue;
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // ignore stale pid
    }
  }
};

const resolveProfileGraphqlUrl = (profile) => {
  const profilePathRaw = profile?.graphqlUrl ?? '/graphql';
  if (ABSOLUTE_URL_RE.test(profilePathRaw)) {
    return profilePathRaw;
  }

  const profilePath = profilePathRaw.startsWith('/') ? profilePathRaw : `/${profilePathRaw}`;
  return new URL(profilePath, baseUrl).toString();
};

const runNodeScriptWithLog = async ({
  scriptPath,
  scriptArgs,
  cwd,
  env,
  logPath,
  abortOnExitProcess = null,
  abortProcessLabel = 'watched process',
}) => {
  await fsp.mkdir(path.dirname(logPath), { recursive: true });
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  return await new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...scriptArgs], {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let abortedByGuard = null;

    const terminateChild = (reason) => {
      if (abortedByGuard || child.exitCode !== null || child.killed) {
        return;
      }

      abortedByGuard = reason;
      child.kill('SIGTERM');
      const timer = setTimeout(() => {
        if (child.exitCode === null && !child.killed) {
          child.kill('SIGKILL');
        }
      }, 3000);
      timer.unref?.();
    };

    let onAbortProcessExit = null;
    if (abortOnExitProcess) {
      onAbortProcessExit = (code, signal) => {
        terminateChild(
          `${abortProcessLabel} exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`,
        );
      };
      abortOnExitProcess.once('exit', onAbortProcessExit);
    }

    child.stdout.on('data', (chunk) => {
      const text = String(chunk);
      stdout += text;
      logStream.write(text);
      process.stdout.write(text);
    });

    child.stderr.on('data', (chunk) => {
      const text = String(chunk);
      stderr += text;
      logStream.write(text);
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      if (abortOnExitProcess && onAbortProcessExit) {
        abortOnExitProcess.off('exit', onAbortProcessExit);
      }
      logStream.end();
      resolve({
        code: Number.isFinite(code) ? code : -1,
        stdout,
        stderr,
        abortedByGuard,
      });
    });
  });
};

const waitForServerReady = async ({ url, timeoutMs }) => {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        return;
      }
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await sleep(500);
  }

  throw new Error(`Server ready check timed out for ${url}; lastError=${lastError ?? 'n/a'}`);
};

const runRouteProbe = async ({ profile }) => {
  const result = await postJson({
    url: resolveProfileGraphqlUrl(profile),
    headers: profile.headers || {},
    payload: { query: '{ __typename }' },
    timeoutMs: routeProbeTimeoutMs,
  });
  const hasGraphQLErrors = Array.isArray(result.json?.errors) && result.json.errors.length > 0;
  const ok = result.ok && !hasGraphQLErrors && result.json?.data?.__typename === 'Query';
  if (!ok) {
    const firstError = hasGraphQLErrors ? result.json.errors[0]?.message ?? 'unknown GraphQL error' : null;
    throw new Error(
      `Route probe failed status=${result.status} profile=${profile.key ?? 'unknown'} msg=${result.error ?? firstError ?? 'unexpected GraphQL response'}`,
    );
  }
};

const stopServiceChild = async (child) => {
  if (!child) return;
  if (child.exitCode !== null || child.killed) return;

  child.kill('SIGINT');

  const closed = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 8000);
    child.once('close', () => {
      clearTimeout(timer);
      resolve(true);
    });
  });

  if (!closed && child.exitCode === null) {
    child.kill('SIGKILL');
  }
};

const startServiceForK = async ({ k, serviceLogPath, samplerDir, firstProfile }) => {
  await fsp.mkdir(path.dirname(serviceLogPath), { recursive: true });
  await fsp.mkdir(samplerDir, { recursive: true });
  const logStream = fs.createWriteStream(serviceLogPath, { flags: 'a' });

  const child = spawn(
    process.execPath,
    [cliServerEntry, 'server', `--port=${servicePort}`, `--origin=${serviceOrigin}`],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        GRAPHILE_ENV: 'development',
        GRAPHQL_OBSERVABILITY_ENABLED: 'true',
        GRAPHQL_DEBUG_SAMPLER_ENABLED: 'true',
        GRAPHQL_DEBUG_SAMPLER_MEMORY_INTERVAL_MS: String(samplerMemoryIntervalMs),
        GRAPHQL_DEBUG_SAMPLER_DB_INTERVAL_MS: String(samplerDbIntervalMs),
        GRAPHQL_DEBUG_SAMPLER_DIR: samplerDir,
        API_IS_PUBLIC: apiIsPublic ? 'true' : 'false',
        PGHOST: String(pgConfig.host),
        PGPORT: String(pgConfig.port),
        PGDATABASE: String(pgConfig.database),
        PGUSER: String(pgConfig.user),
        PGPASSWORD: String(pgConfig.password),
        NODE_OPTIONS: String(nodeOptions),
        ...(graphileCacheMax != null ? { GRAPHILE_CACHE_MAX: String(graphileCacheMax) } : {}),
        ...(graphileSchemaWaitTimeMs != null
          ? { GRAPHILE_SCHEMA_WAIT_TIME_MS: String(graphileSchemaWaitTimeMs) }
          : {}),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  child.stdout.on('data', (chunk) => {
    const text = String(chunk);
    logStream.write(text);
    process.stdout.write(text);
  });

  child.stderr.on('data', (chunk) => {
    const text = String(chunk);
    logStream.write(text);
    process.stderr.write(text);
  });

  const readyUrl = `${baseUrl}/debug/memory`;

  try {
    await waitForServerReady({ url: readyUrl, timeoutMs: serviceReadyTimeoutMs });
    await runRouteProbe({ profile: firstProfile });
    return { child, logStream };
  } catch (error) {
    await stopServiceChild(child);
    logStream.end();
    throw new Error(`[k=${k}] failed to start usable service: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const main = async () => {
  const dirs = await ensureRunDirs(runDir);
  const kValues = parseKValues(kValuesRaw);
  const profilesPayload = await readJson(profilesPath);
  const profiles = extractProfiles(profilesPayload);
  if (profiles.length === 0) {
    throw new Error(`No profiles found in ${profilesPath}`);
  }

  const firstProfile = profiles[0];
  const startedAt = new Date().toISOString();
  const sweepResults = [];
  const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
  let abortError = null;

  const buildTierLabel = (k) => {
    if (routingMode === 'private' && tierMode === 'keyspace') {
      return `business-k${k}-${durationMinutes}m-sweep`;
    }
    if (tierMode === 'active-tenants') {
      return `business-${routingMode}-t${k}-${durationMinutes}m-sweep`;
    }
    return `business-${routingMode}-k${k}-${durationMinutes}m-sweep`;
  };

  for (const k of kValues) {
    const tier = buildTierLabel(k);
    const serviceLogPath = path.join(dirs.logsDir, 'service', `service-k${k}.log`);
    const resetLogPath = path.join(dirs.logsDir, 'k-sweep', `reset-k${k}.log`);
    const phase2LogPath = path.join(dirs.logsDir, 'k-sweep', `phase2-k${k}.log`);
    const samplerDir = path.join(dirs.samplerDir, `k${k}`);
    const phase2ProfileLimit = tierMode === 'active-tenants' ? Math.max(1, k) : 0;
    const phase2KeyspaceSize = tierMode === 'keyspace' ? Math.max(1, k) : 1;
    const phase2MinTenantCount = Math.max(
      1,
      tierMode === 'active-tenants' ? Math.min(minTenantCount, phase2ProfileLimit) : minTenantCount,
    );

    const result = {
      k,
      tier,
      routingMode,
      tierMode,
      apiIsPublic,
      startedAt: new Date().toISOString(),
      status: 'running',
      serviceLogPath,
      resetLogPath,
      phase2LogPath,
      samplerDir,
      loadPath: path.join(dirs.dataDir, `load-${tier}.json`),
      phase2ProfileLimit,
      phase2KeyspaceSize,
      phase2MinTenantCount,
      error: null,
    };
    sweepResults.push(result);

    let service = null;
    try {
      await stopPortListeners(servicePort);
      service = await startServiceForK({ k, serviceLogPath, samplerDir, firstProfile });

      const resetExecution = await runNodeScriptWithLog({
        scriptPath: resetScript,
        scriptArgs: [
          '--run-dir',
          runDir,
          '--profiles',
          profilesPath,
          '--tag',
          `k${k}`,
          ...(ensurePublicTestAccess
            ? [
                '--ensure-public-test-access',
                '--public-role',
                publicRole,
                ...(publicReadRole.length > 0 ? ['--public-read-role', publicReadRole] : []),
              ]
            : []),
        ],
        cwd: serverDir,
        env: process.env,
        logPath: resetLogPath,
      });
      if (resetExecution.code !== 0) {
        throw new Error(`[k=${k}] reset script failed with code=${resetExecution.code}`);
      }

      const phase2Args = [
          '--run-dir',
          runDir,
          '--profiles',
          profilesPath,
          '--workers',
          String(workers),
          '--duration-seconds',
          String(durationSeconds),
          '--idle-seconds',
          String(idleSeconds),
          '--min-tenant-count',
          String(phase2MinTenantCount),
          '--tier',
          tier,
          '--keyspace-mode',
          keyspaceMode,
          '--keyspace-size',
          String(phase2KeyspaceSize),
          '--churn-ratio',
          String(churnRatio),
          '--churn-warm-seconds',
          String(churnWarmSeconds),
          '--churn-cool-seconds',
          String(churnCoolSeconds),
          '--churn-cohorts',
          String(churnCohorts),
          '--prewarm-concurrency',
          String(prewarmConcurrency),
          '--prewarm-timeout-ms',
          String(prewarmTimeoutMs),
          '--prewarm-max-failures',
          String(prewarmMaxFailures),
        ];
      if (prewarmDisabled) {
        phase2Args.push('--disable-prewarm');
      }
      if (prewarmSampleSize > 0) {
        phase2Args.push('--prewarm-sample-size', String(prewarmSampleSize));
      }
      if (phase2ProfileLimit > 0) {
        phase2Args.push('--profile-limit', String(phase2ProfileLimit));
      }

      const phase2Execution = await runNodeScriptWithLog({
        scriptPath: phase2Script,
        scriptArgs: phase2Args,
        cwd: serverDir,
        env: process.env,
        logPath: phase2LogPath,
        abortOnExitProcess: service.child,
        abortProcessLabel: `service[k=${k}]`,
      });
      if (phase2Execution.code !== 0) {
        const guardHint = phase2Execution.abortedByGuard
          ? `; aborted=${phase2Execution.abortedByGuard}`
          : '';
        throw new Error(`[k=${k}] phase2 failed with code=${phase2Execution.code}${guardHint}`);
      }

      await fsp.access(result.loadPath);
      const loadPayload = await readJson(result.loadPath);
      result.status = 'ok';
      result.summary = {
        total: loadPayload?.load?.total ?? 0,
        failed: loadPayload?.load?.failed ?? 0,
        requestsPerSecond: loadPayload?.load?.requestsPerSecond ?? 0,
        p95: loadPayload?.load?.latencyMs?.p95 ?? null,
      };
      result.endedAt = new Date().toISOString();
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
      result.endedAt = new Date().toISOString();
      if (!continueOnError) {
        abortError = error;
      }
    } finally {
      if (service?.child) {
        await stopServiceChild(service.child);
      }
      if (service?.logStream) {
        service.logStream.end();
      }
      await stopPortListeners(servicePort);
    }

    if (abortError) {
      break;
    }
  }

  const summary = {
    createdAt: new Date().toISOString(),
    startedAt,
    endedAt: new Date().toISOString(),
    runDir,
    profilesPath,
    baseUrl,
    options: {
      apiIsPublic,
      routingMode,
      tierMode,
      keyspaceMode,
      ensurePublicTestAccess,
      publicRole: ensurePublicTestAccess ? publicRole : null,
      publicReadRole: ensurePublicTestAccess ? publicReadRole || null : null,
      workers,
      durationSeconds,
      idleSeconds,
      minTenantCount,
      samplerMemoryIntervalMs,
      samplerDbIntervalMs,
      graphileCacheMax,
      graphileSchemaWaitTimeMs,
      prewarm: {
        enabled: !prewarmDisabled,
        sampleSize: prewarmSampleSize,
        concurrency: prewarmConcurrency,
        timeoutMs: prewarmTimeoutMs,
        maxFailures: prewarmMaxFailures,
      },
      maxOldSpaceSizeMb,
      nodeOptions,
      kValues,
      continueOnError,
    },
    results: sweepResults,
  };

  const summaryPath = path.join(dirs.reportsDir, 'k-sweep-summary.json');
  await writeJson(summaryPath, summary);

  console.log(
    JSON.stringify(
      {
        summaryPath,
        totalRuns: sweepResults.length,
        failedRuns: sweepResults.filter((row) => row.status !== 'ok').length,
      },
      null,
      2,
    ),
  );

  if (abortError) {
    throw abortError;
  }
};

main().catch(async (error) => {
  try {
    await stopPortListeners(servicePort);
  } catch {
    // ignore cleanup failure
  }
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
