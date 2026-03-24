#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import {
  DEFAULT_BASE_URL,
  DEFAULT_TMP_ROOT,
  ensureRunDirs,
  getArgValue,
  getJson,
  parseIntArg,
  postJson,
  sleep,
  writeJson,
} from './common.mjs';

const args = process.argv.slice(2);

const runDir = path.resolve(
  getArgValue(
    args,
    '--run-dir',
    path.join(DEFAULT_TMP_ROOT, getArgValue(args, '--run-id', 'graphile-cache-leak-manual-run')),
  ),
);
const dirs = await ensureRunDirs(runDir);

const baseUrl = getArgValue(args, '--base-url', DEFAULT_BASE_URL);
const workers = parseIntArg(getArgValue(args, '--workers', '16'), 16);
const durationSeconds = parseIntArg(getArgValue(args, '--duration-seconds', '1200'), 1200);
const idleSeconds = parseIntArg(getArgValue(args, '--idle-seconds', '45'), 45);
const requireTenants = parseIntArg(getArgValue(args, '--min-tenant-count', '10'), 10);
const enforceTenantScale = !args.includes('--allow-underprovisioned');
const tier = getArgValue(args, '--tier', 'tier-default');
const hotRatio = Number.parseFloat(getArgValue(args, '--hot-ratio', '0.8'));
const churnRatioRaw = Number.parseFloat(getArgValue(args, '--churn-ratio', '0'));
const churnWarmSeconds = parseIntArg(getArgValue(args, '--churn-warm-seconds', '120'), 120);
const churnCoolSeconds = parseIntArg(getArgValue(args, '--churn-cool-seconds', '360'), 360);
const churnCohorts = Math.max(1, parseIntArg(getArgValue(args, '--churn-cohorts', '2'), 2));
const requestProfilesFileArg = getArgValue(args, '--profiles', null);

const profileLimit = parseIntArg(getArgValue(args, '--profile-limit', '0'), 0);
const heapPid = parseIntArg(getArgValue(args, '--heap-pid', ''), NaN);
const skipAnalyze = args.includes('--skip-analyze');

const graphqlPayload = {
  query: getArgValue(args, '--query', '{ __typename }'),
};

const resolveProfilesFile = async () => {
  if (requestProfilesFileArg) {
    return path.resolve(requestProfilesFileArg);
  }

  const keyspacePath = path.join(dirs.dataDir, 'tokens.keyspace.json');
  try {
    await fs.access(keyspacePath);
    return keyspacePath;
  } catch {
    return path.join(dirs.dataDir, 'tokens.json');
  }
};

const quantile = (numbers, q) => {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q)));
  return sorted[index];
};

const clamp01 = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

const captureDebug = async ({ suffix }) => {
  const tierDir = path.join(dirs.dataDir, 'snapshots', tier);
  await fs.mkdir(tierDir, { recursive: true });

  const [memory, db] = await Promise.all([
    getJson({ url: `${baseUrl}/debug/memory`, timeoutMs: 15000 }),
    getJson({ url: `${baseUrl}/debug/db`, timeoutMs: 15000 }),
  ]);

  const memoryPath = path.join(tierDir, `memory-${suffix}.json`);
  const dbPath = path.join(tierDir, `db-${suffix}.json`);

  await writeJson(memoryPath, memory);
  await writeJson(dbPath, db);

  return { memoryPath, dbPath, memory, db };
};

const loadProfiles = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const profiles = Array.isArray(parsed) ? parsed : parsed?.profiles;
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error(`No request profiles found in ${filePath}`);
  }
  return profileLimit > 0 ? profiles.slice(0, profileLimit) : profiles;
};

const validateScaleGate = async ({ profiles }) => {
  const distinctTenantKeys = new Set(
    profiles.map((profile) => profile.tenantKey || profile.key).filter(Boolean),
  ).size;

  const profileMsg = `token tenant coverage=${distinctTenantKeys}, required>=${requireTenants}`;
  if (distinctTenantKeys < requireTenants) {
    if (enforceTenantScale) {
      throw new Error(`Scale gate failed: ${profileMsg}`);
    }
    console.warn(`[phase2] ${profileMsg}; continuing due to --allow-underprovisioned`);
  }

  const preflightPath = path.join(runDir, 'reports', 'preflight.json');
  try {
    const preflightRaw = await fs.readFile(preflightPath, 'utf8');
    const preflight = JSON.parse(preflightRaw);
    const phase1Ready = !!preflight?.readiness?.phase1Ready;
    const tenantReady = !!preflight?.readiness?.tenantReadyForPhase2;

    if (!phase1Ready || !tenantReady) {
      const msg = `preflight readiness not satisfied (phase1Ready=${phase1Ready}, tenantReadyForPhase2=${tenantReady})`;
      if (enforceTenantScale) {
        throw new Error(`Scale gate failed: ${msg}`);
      }
      console.warn(`[phase2] ${msg}; continuing due to --allow-underprovisioned`);
    }
  } catch (error) {
    const msg = `preflight report missing or unreadable at ${preflightPath}`;
    if (enforceTenantScale) {
      throw new Error(`Scale gate failed: ${msg}`);
    }
    console.warn(`[phase2] ${msg}; continuing due to --allow-underprovisioned`);
    if (error instanceof Error) {
      console.warn(`[phase2] detail: ${error.message}`);
    }
  }
};

const chooseProfile = (profiles) => {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error('No active profiles available for selection');
  }
  if (profiles.length === 1) return profiles[0];

  const hotCount = Math.max(1, Math.floor(profiles.length * 0.2));
  const hot = profiles.slice(0, hotCount);
  const cold = profiles.slice(hotCount);

  const hotPick = Math.random() < hotRatio || cold.length === 0;
  const target = hotPick ? hot : cold;
  return target[Math.floor(Math.random() * target.length)];
};

const buildTrafficPlan = (profiles) => {
  const churnRatio = clamp01(churnRatioRaw);
  const churnEnabled = churnRatio > 0 && churnCoolSeconds > 0;
  const maxChurnCount = Math.max(0, profiles.length - 1);
  const churnCount = churnEnabled ? Math.min(Math.floor(profiles.length * churnRatio), maxChurnCount) : 0;
  const alwaysOnProfiles = profiles.slice(0, profiles.length - churnCount);
  const churnProfiles = profiles.slice(profiles.length - churnCount);
  const cooldownWindowsByKey = new Map();

  for (let i = 0; i < churnProfiles.length; i += 1) {
    const profile = churnProfiles[i];
    const key = profile.key ?? `profile-${i}`;
    const cohort = i % churnCohorts;
    const cohortOffsetSeconds = Math.floor((cohort * churnCoolSeconds) / churnCohorts);
    const coolStartSeconds = Math.max(0, churnWarmSeconds + cohortOffsetSeconds);
    const coolEndSeconds = coolStartSeconds + churnCoolSeconds;
    cooldownWindowsByKey.set(key, { cohort, coolStartSeconds, coolEndSeconds });
  }

  let lastElapsedSecond = -1;
  let cachedActiveProfiles = profiles;

  const getActiveProfiles = (elapsedMs) => {
    if (!churnEnabled || churnCount === 0) {
      return profiles;
    }

    const elapsedSecond = Math.max(0, Math.floor(elapsedMs / 1000));
    if (elapsedSecond === lastElapsedSecond) {
      return cachedActiveProfiles;
    }
    lastElapsedSecond = elapsedSecond;

    const activeFromChurn = churnProfiles.filter((profile) => {
      const window = cooldownWindowsByKey.get(profile.key ?? '');
      if (!window) return true;
      return elapsedSecond < window.coolStartSeconds || elapsedSecond >= window.coolEndSeconds;
    });

    const active = [...alwaysOnProfiles, ...activeFromChurn];
    cachedActiveProfiles = active.length > 0 ? active : alwaysOnProfiles.length > 0 ? alwaysOnProfiles : profiles;
    return cachedActiveProfiles;
  };

  return {
    getActiveProfiles,
    summary: {
      enabled: churnEnabled && churnCount > 0,
      ratio: churnRatio,
      warmSeconds: churnWarmSeconds,
      coolSeconds: churnCoolSeconds,
      cohorts: churnCohorts,
      churnProfileCount: churnCount,
      alwaysOnProfileCount: alwaysOnProfiles.length,
      windows: Object.fromEntries(cooldownWindowsByKey.entries()),
    },
  };
};

const runLoad = async ({ profiles }) => {
  const startedAt = Date.now();
  const until = startedAt + durationSeconds * 1000;
  const trafficPlan = buildTrafficPlan(profiles);

  const latencies = [];
  const profileStats = new Map();
  let total = 0;
  let ok = 0;
  let failed = 0;

  const record = (profileKey, success, elapsedMs, status, error) => {
    total += 1;
    if (success) {
      ok += 1;
    } else {
      failed += 1;
    }

    if (latencies.length < 20000) {
      latencies.push(elapsedMs);
    }

    if (!profileStats.has(profileKey)) {
      profileStats.set(profileKey, {
        total: 0,
        ok: 0,
        failed: 0,
        maxMs: 0,
        minMs: Number.POSITIVE_INFINITY,
        statuses: {},
        lastError: null,
      });
    }

    const row = profileStats.get(profileKey);
    row.total += 1;
    row.ok += success ? 1 : 0;
    row.failed += success ? 0 : 1;
    row.maxMs = Math.max(row.maxMs, elapsedMs);
    row.minMs = Math.min(row.minMs, elapsedMs);
    row.statuses[String(status)] = (row.statuses[String(status)] ?? 0) + 1;
    if (error) {
      row.lastError = error;
    }
  };

  const worker = async () => {
    while (Date.now() < until) {
      const elapsedMs = Date.now() - startedAt;
      const activeProfiles = trafficPlan.getActiveProfiles(elapsedMs);
      const profile = chooseProfile(activeProfiles);
      const result = await postJson({
        url: `${baseUrl}${profile.graphqlUrl ?? '/graphql'}`,
        headers: profile.headers ?? {},
        payload: graphqlPayload,
        timeoutMs: 20000,
      });

      const hasGraphQLErrors = Array.isArray(result.json?.errors) && result.json.errors.length > 0;
      const success = result.ok && !hasGraphQLErrors && result.json?.data != null;
      const errMsg = result.error
        ? result.error
        : result.json?.errors?.[0]?.message ?? (!success ? 'unexpected GraphQL response' : null);

      record(profile.key ?? 'unknown', success, result.elapsedMs, result.status, errMsg);
    }
  };

  await Promise.all(Array.from({ length: workers }, () => worker()));

  const elapsedMs = Date.now() - startedAt;
  const profileBreakdown = Object.fromEntries(profileStats.entries());

  for (const key of Object.keys(profileBreakdown)) {
    const stats = profileBreakdown[key];
    if (!Number.isFinite(stats.minMs)) stats.minMs = 0;
  }

  return {
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date().toISOString(),
    elapsedMs,
    total,
    ok,
    failed,
    requestsPerSecond: elapsedMs > 0 ? Number((total / (elapsedMs / 1000)).toFixed(2)) : 0,
    latencyMs: {
      min: latencies.length > 0 ? Math.min(...latencies) : null,
      p50: quantile(latencies, 0.5),
      p95: quantile(latencies, 0.95),
      p99: quantile(latencies, 0.99),
      max: latencies.length > 0 ? Math.max(...latencies) : null,
      sampleCount: latencies.length,
    },
    trafficPlan: trafficPlan.summary,
    profileBreakdown,
  };
};

const tryCaptureHeap = async () => {
  if (!Number.isFinite(heapPid)) {
    return { attempted: false, reason: 'heap pid not provided' };
  }

  const scriptPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'capture-heap-snapshot.mjs');

  return await new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, '--pid', String(heapPid), '--dir', dirs.heapDir, '--timeout-ms', '60000'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('close', (code) => {
      resolve({
        attempted: true,
        ok: code === 0,
        code,
        output: stdout.trim(),
        error: stderr.trim() || null,
      });
    });
  });
};

const analyzeSampler = async () => {
  if (skipAnalyze) {
    return { attempted: false, reason: 'skip analyze enabled' };
  }

  const scriptPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'analyze-debug-logs.mjs');
  return await new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, '--dir', dirs.samplerDir, '--json'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('close', async (code) => {
      if (code === 0) {
        try {
          const parsed = JSON.parse(stdout);
          const reportPath = path.join(dirs.reportsDir, 'analyze-debug-logs.json');
          await writeJson(reportPath, parsed);
          resolve({ attempted: true, ok: true, reportPath, stderr: stderr.trim() || null });
          return;
        } catch {
          resolve({ attempted: true, ok: false, error: 'analyze output is not valid JSON', stderr: stderr.trim() || null });
          return;
        }
      }

      resolve({ attempted: true, ok: false, code, error: stderr.trim() || 'analyze script failed' });
    });
  });
};

const main = async () => {
  const startedAt = new Date().toISOString();
  const requestProfilesFile = await resolveProfilesFile();
  const profiles = await loadProfiles(requestProfilesFile);
  await validateScaleGate({ profiles });

  const baseline = await captureDebug({ suffix: 'baseline' });
  const loadSummary = await runLoad({ profiles });
  const after = await captureDebug({ suffix: 'after' });

  await sleep(idleSeconds * 1000);
  const idle = await captureDebug({ suffix: 'idle' });

  const [heapCapture, analyzeResult] = await Promise.all([
    tryCaptureHeap(),
    analyzeSampler(),
  ]);

  const result = {
    startedAt,
    endedAt: new Date().toISOString(),
    runDir,
    tier,
    baseUrl,
    workers,
    durationSeconds,
    idleSeconds,
    hotRatio,
    profilesFile: requestProfilesFile,
    profileCount: profiles.length,
    snapshots: {
      baseline: {
        memoryPath: baseline.memoryPath,
        dbPath: baseline.dbPath,
        memoryOk: baseline.memory.ok,
        dbOk: baseline.db.ok,
      },
      after: {
        memoryPath: after.memoryPath,
        dbPath: after.dbPath,
        memoryOk: after.memory.ok,
        dbOk: after.db.ok,
      },
      idle: {
        memoryPath: idle.memoryPath,
        dbPath: idle.dbPath,
        memoryOk: idle.memory.ok,
        dbOk: idle.db.ok,
      },
    },
    load: loadSummary,
    heapCapture,
    analyzeResult,
  };

  const outPath = path.join(dirs.dataDir, `load-${tier}.json`);
  await writeJson(outPath, result);
  console.log(JSON.stringify({ outPath, profileCount: profiles.length, totalRequests: loadSummary.total, failed: loadSummary.failed }, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
