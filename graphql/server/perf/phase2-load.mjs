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
import {
  buildTargetsFromProfiles,
  ensurePublicAccessForTargets,
  getUnsafeTargets,
} from './public-test-access-lib.mjs';

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
const operationModeArg = getArgValue(args, '--operation-mode', 'auto');
const keyspaceSize = Math.max(1, parseIntArg(getArgValue(args, '--keyspace-size', '1'), 1));
const keyspaceModeArg = getArgValue(args, '--keyspace-mode', 'auto').trim().toLowerCase();

const profileLimit = parseIntArg(getArgValue(args, '--profile-limit', '0'), 0);
const heapPid = parseIntArg(getArgValue(args, '--heap-pid', ''), NaN);
const skipAnalyze = args.includes('--skip-analyze');
const skipRouteProbe = args.includes('--skip-route-probe');
const notePrefix = getArgValue(args, '--note-prefix', 'load-note');

const opWeightCreate = Number.parseFloat(getArgValue(args, '--op-weight-create', '0.2'));
const opWeightGetById = Number.parseFloat(getArgValue(args, '--op-weight-getbyid', '0.4'));
const opWeightUpdateById = Number.parseFloat(getArgValue(args, '--op-weight-updatebyid', '0.2'));
const opWeightListRecent = Number.parseFloat(getArgValue(args, '--op-weight-listrecent', '0.2'));
const failFastEnabled = !args.includes('--disable-fail-fast');
const failFastWarmupSeconds = parseIntArg(getArgValue(args, '--fail-fast-warmup-seconds', '20'), 20);
const failFastMinTotal = parseIntArg(getArgValue(args, '--fail-fast-min-total', '1000'), 1000);
const failFastErrorRate = Math.max(
  0,
  Math.min(1, Number.parseFloat(getArgValue(args, '--fail-fast-error-rate', '0.98'))),
);
const failFastConsecutiveNetworkErrors = parseIntArg(
  getArgValue(args, '--fail-fast-consecutive-network-errors', '120'),
  120,
);
const publicAccessModeArg = getArgValue(args, '--public-access-mode', 'auto').trim().toLowerCase();
const allowPublicAccessNonPerfSchema = args.includes('--allow-public-access-non-perf-schema');
const publicRole = getArgValue(args, '--public-role', 'authenticated').trim();
const publicReadRole = getArgValue(args, '--public-read-role', 'anonymous').trim();
const prewarmEnabled = !args.includes('--disable-prewarm');
const prewarmSampleSize = parseIntArg(getArgValue(args, '--prewarm-sample-size', '0'), 0);
const prewarmConcurrency = parseIntArg(getArgValue(args, '--prewarm-concurrency', '6'), 6);
const prewarmTimeoutMs = parseIntArg(getArgValue(args, '--prewarm-timeout-ms', '30000'), 30000);
const prewarmMaxFailures = parseIntArg(getArgValue(args, '--prewarm-max-failures', '0'), 0);

const pgConfig = {
  host: getArgValue(args, '--pg-host', process.env.PGHOST || 'localhost'),
  port: Number.parseInt(getArgValue(args, '--pg-port', process.env.PGPORT || '5432'), 10),
  database: getArgValue(args, '--pg-database', process.env.PGDATABASE || 'constructive'),
  user: getArgValue(args, '--pg-user', process.env.PGUSER || 'postgres'),
  password: getArgValue(args, '--pg-password', process.env.PGPASSWORD || 'password'),
};

const graphqlPayload = {
  query: getArgValue(args, '--query', '{ __typename }'),
};

const VALID_KEYSPACE_MODES = new Set(['auto', 'schemata', 'none']);
if (!VALID_KEYSPACE_MODES.has(keyspaceModeArg)) {
  throw new Error(`Invalid --keyspace-mode=${keyspaceModeArg}; expected auto|schemata|none`);
}
const VALID_PUBLIC_ACCESS_MODES = new Set(['auto', 'on', 'off']);
if (!VALID_PUBLIC_ACCESS_MODES.has(publicAccessModeArg)) {
  throw new Error(`Invalid --public-access-mode=${publicAccessModeArg}; expected auto|on|off`);
}
if (!publicRole) {
  throw new Error('--public-role cannot be empty');
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

const ABSOLUTE_URL_RE = /^https?:\/\//i;

const resolveProfileGraphqlUrl = (profile) => {
  const profilePathRaw = profile?.graphqlUrl ?? '/graphql';
  if (ABSOLUTE_URL_RE.test(profilePathRaw)) {
    return profilePathRaw;
  }

  const profilePath = profilePathRaw.startsWith('/') ? profilePathRaw : `/${profilePathRaw}`;
  return new URL(profilePath, baseUrl).toString();
};

const quantile = (numbers, q) => {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q)));
  return sorted[index];
};

const asCount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const nonNegativeDelta = (startValue, endValue) => {
  const delta = asCount(endValue) - asCount(startValue);
  return delta >= 0 ? delta : 0;
};

const cacheActivityDelta = (start, end) => {
  if (!start || !end) {
    return null;
  }

  const lookupTotal = nonNegativeDelta(start.lookups?.total, end.lookups?.total);
  const lookupHits = nonNegativeDelta(start.lookups?.hits, end.lookups?.hits);
  const lookupMisses = nonNegativeDelta(start.lookups?.misses, end.lookups?.misses);
  const lookupRecheckHits = nonNegativeDelta(start.lookups?.recheckHits, end.lookups?.recheckHits);

  return {
    lookups: {
      total: lookupTotal,
      hits: lookupHits,
      misses: lookupMisses,
      recheckHits: lookupRecheckHits,
      hitRate: lookupTotal > 0 ? Number((lookupHits / lookupTotal).toFixed(4)) : 0,
      missRate: lookupTotal > 0 ? Number((lookupMisses / lookupTotal).toFixed(4)) : 0,
    },
    builds: {
      sets: nonNegativeDelta(start.builds?.sets, end.builds?.sets),
      replacements: nonNegativeDelta(start.builds?.replacements, end.builds?.replacements),
      coalescedWaits: nonNegativeDelta(start.builds?.coalescedWaits, end.builds?.coalescedWaits),
    },
    evictions: {
      total: nonNegativeDelta(start.evictions?.total, end.evictions?.total),
      lru: nonNegativeDelta(start.evictions?.lru, end.evictions?.lru),
      ttl: nonNegativeDelta(start.evictions?.ttl, end.evictions?.ttl),
      manual: nonNegativeDelta(start.evictions?.manual, end.evictions?.manual),
    },
  };
};

const toMB = (bytes) => Number((bytes / 1024 / 1024).toFixed(2));

const toArray = (setLike) => [...setLike];

const summarizeCacheRedundancy = (
  snapshotJson,
  { topFingerprints = 10, topKeys = 5, topKeyKinds = 5, topTenants = 5 } = {},
) => {
  const entries = Array.isArray(snapshotJson?.graphileCacheEntries) ? snapshotJson.graphileCacheEntries : [];
  // `fingerprint` here comes from old-mode graphile-cache snapshot metadata.
  // It is a perf comparison input, not part of the current buildKey runtime path.
  const cacheSize = asCount(snapshotJson?.graphileCache?.size ?? entries.length);
  const byFingerprint = new Map();
  const byKeyKind = new Map();
  const byTenant = new Map();

  for (const entry of entries) {
    const keyKind = entry?.keyKind ?? 'unknown';
    const tenant = entry?.databaseId ?? entry?.dbname ?? 'unknown';
    let keyKindRow = byKeyKind.get(keyKind);
    if (!keyKindRow) {
      keyKindRow = {
        keyKind,
        entries: 0,
        duplicateEntries: 0,
        redundantEntries: 0,
        duplicateFingerprints: 0,
      };
      byKeyKind.set(keyKind, keyKindRow);
    }
    keyKindRow.entries += 1;

    let tenantRow = byTenant.get(tenant);
    if (!tenantRow) {
      tenantRow = {
        tenant,
        entries: 0,
        duplicateEntries: 0,
        redundantEntries: 0,
        duplicateFingerprints: 0,
        keyKinds: new Set(),
      };
      byTenant.set(tenant, tenantRow);
    }
    tenantRow.entries += 1;
    tenantRow.keyKinds.add(keyKind);

    const fingerprint = entry?.fingerprint;
    if (!fingerprint) continue;

    let row = byFingerprint.get(fingerprint);
    if (!row) {
      row = {
        fingerprint,
        entryCount: 0,
        keyKinds: new Set(),
        keys: [],
        keyKindCounts: new Map(),
        tenantCounts: new Map(),
        dbnames: new Set(),
      };
      byFingerprint.set(fingerprint, row);
    }

    row.entryCount += 1;
    row.keyKinds.add(keyKind);
    row.keyKindCounts.set(keyKind, (row.keyKindCounts.get(keyKind) ?? 0) + 1);
    row.tenantCounts.set(tenant, (row.tenantCounts.get(tenant) ?? 0) + 1);
    if (entry?.dbname) {
      row.dbnames.add(entry.dbname);
    }
    if (row.keys.length < topKeys && entry?.key) {
      row.keys.push(entry.key);
    }
  }

  const duplicateBuckets = [...byFingerprint.values()]
    .filter((row) => row.entryCount > 1)
    .sort((a, b) => b.entryCount - a.entryCount || a.fingerprint.localeCompare(b.fingerprint));

  const duplicateEntries = duplicateBuckets.reduce((acc, row) => acc + row.entryCount, 0);
  const redundantEntries = duplicateBuckets.reduce((acc, row) => acc + Math.max(0, row.entryCount - 1), 0);
  const crossKindDuplicateFingerprints = duplicateBuckets.reduce(
    (acc, row) => acc + (row.keyKinds.size > 1 ? 1 : 0),
    0,
  );
  const sameKindDuplicateFingerprints = duplicateBuckets.length - crossKindDuplicateFingerprints;
  const crossKindDuplicateEntries = duplicateBuckets.reduce(
    (acc, row) => acc + (row.keyKinds.size > 1 ? row.entryCount : 0),
    0,
  );

  for (const row of duplicateBuckets) {
    for (const [keyKind, count] of row.keyKindCounts.entries()) {
      const keyKindRow = byKeyKind.get(keyKind);
      if (!keyKindRow) continue;
      keyKindRow.duplicateEntries += count;
      keyKindRow.redundantEntries += Math.max(0, count - 1);
      keyKindRow.duplicateFingerprints += 1;
    }

    for (const [tenant, count] of row.tenantCounts.entries()) {
      const tenantRow = byTenant.get(tenant);
      if (!tenantRow) continue;
      tenantRow.duplicateEntries += count;
      tenantRow.redundantEntries += Math.max(0, count - 1);
      tenantRow.duplicateFingerprints += 1;
    }
  }

  const amplificationFactor = byFingerprint.size > 0
    ? Number((cacheSize / byFingerprint.size).toFixed(4))
    : 0;
  const redundancyByKeyKind = [...byKeyKind.values()]
    .map((row) => ({
      keyKind: row.keyKind,
      entries: row.entries,
      duplicateEntries: row.duplicateEntries,
      redundantEntries: row.redundantEntries,
      duplicateEntryRatio: row.entries > 0 ? Number((row.duplicateEntries / row.entries).toFixed(4)) : 0,
      redundantEntryRatio: row.entries > 0 ? Number((row.redundantEntries / row.entries).toFixed(4)) : 0,
      duplicateFingerprintRatio: duplicateBuckets.length > 0
        ? Number((row.duplicateFingerprints / duplicateBuckets.length).toFixed(4))
        : 0,
    }))
    .sort((a, b) => b.redundantEntries - a.redundantEntries || b.duplicateEntries - a.duplicateEntries)
    .slice(0, topKeyKinds);

  const topDuplicateTenants = [...byTenant.values()]
    .filter((row) => row.duplicateEntries > 0)
    .map((row) => ({
      tenant: row.tenant,
      entries: row.entries,
      duplicateEntries: row.duplicateEntries,
      redundantEntries: row.redundantEntries,
      duplicateFingerprints: row.duplicateFingerprints,
      keyKinds: toArray(row.keyKinds).sort(),
    }))
    .sort((a, b) => b.redundantEntries - a.redundantEntries || b.duplicateEntries - a.duplicateEntries)
    .slice(0, topTenants);

  return {
    observedEntries: entries.length,
    cacheSize,
    fingerprints: byFingerprint.size,
    duplicateFingerprints: duplicateBuckets.length,
    duplicateEntries,
    redundantEntries,
    duplicateEntryRatio: cacheSize > 0 ? Number((duplicateEntries / cacheSize).toFixed(4)) : 0,
    redundantEntryRatio: cacheSize > 0 ? Number((redundantEntries / cacheSize).toFixed(4)) : 0,
    crossKindDuplicateFingerprints,
    sameKindDuplicateFingerprints,
    crossKindDuplicateEntries,
    crossKindDuplicateEntryRatio: cacheSize > 0 ? Number((crossKindDuplicateEntries / cacheSize).toFixed(4)) : 0,
    amplificationFactor,
    redundancyByKeyKind,
    topDuplicateTenants,
    topDuplicateFingerprints: duplicateBuckets.slice(0, topFingerprints).map((row) => ({
      fingerprint: row.fingerprint,
      entryCount: row.entryCount,
      redundantEntries: Math.max(0, row.entryCount - 1),
      keyKinds: toArray(row.keyKinds).sort(),
      keyKindCounts: Object.fromEntries([...row.keyKindCounts.entries()].sort((a, b) => b[1] - a[1])),
      tenants: Object.fromEntries([...row.tenantCounts.entries()].sort((a, b) => b[1] - a[1])),
      dbnames: toArray(row.dbnames).sort(),
      keys: row.keys,
    })),
  };
};

const getPerEntryHeapCostBytes = ({ startSnapshot, endSnapshot }) => {
  const heapDeltaBytes = asCount(endSnapshot?.memory?.heapUsedBytes) - asCount(startSnapshot?.memory?.heapUsedBytes);
  const cacheDelta = asCount(endSnapshot?.graphileCache?.size) - asCount(startSnapshot?.graphileCache?.size);
  if (heapDeltaBytes <= 0 || cacheDelta <= 0) {
    return null;
  }
  return Math.round(heapDeltaBytes / cacheDelta);
};

const analyzeCacheRedundancyRisk = ({ baselineSnapshot, afterSnapshot, idleSnapshot }) => {
  const baseline = summarizeCacheRedundancy(baselineSnapshot);
  const after = summarizeCacheRedundancy(afterSnapshot);
  const idle = summarizeCacheRedundancy(idleSnapshot);

  const perEntryHeapFromLoadBytes = getPerEntryHeapCostBytes({
    startSnapshot: baselineSnapshot,
    endSnapshot: afterSnapshot,
  });

  const upperBoundPerEntryHeapBytes = (() => {
    const cacheSize = asCount(afterSnapshot?.graphileCache?.size);
    const heapUsed = asCount(afterSnapshot?.memory?.heapUsedBytes);
    if (cacheSize <= 0 || heapUsed <= 0) {
      return null;
    }
    return Math.round(heapUsed / cacheSize);
  })();

  const estimates = {
    perEntryHeapCostFromLoadMb:
      perEntryHeapFromLoadBytes == null ? null : toMB(perEntryHeapFromLoadBytes),
    perEntryHeapCostUpperBoundMb:
      upperBoundPerEntryHeapBytes == null ? null : toMB(upperBoundPerEntryHeapBytes),
    redundantHeapCostFromLoadMb:
      perEntryHeapFromLoadBytes == null ? null : toMB(perEntryHeapFromLoadBytes * after.redundantEntries),
    redundantHeapCostUpperBoundMb:
      upperBoundPerEntryHeapBytes == null ? null : toMB(upperBoundPerEntryHeapBytes * after.redundantEntries),
  };

  const riskSignals = [];
  if (after.redundantEntryRatio >= 0.2) {
    riskSignals.push('after-load redundantEntryRatio >= 20%');
  }
  if (idle.redundantEntryRatio >= 0.2) {
    riskSignals.push('post-idle redundantEntryRatio >= 20%');
  }
  if (after.crossKindDuplicateFingerprints > 0) {
    riskSignals.push('cross-keyKind duplicate fingerprints observed');
  }
  if (after.amplificationFactor >= 1.3) {
    riskSignals.push('cache amplification factor >= 1.3 (same runtime cached under many keys)');
  }
  if (after.sameKindDuplicateFingerprints > 0 && after.redundantEntryRatio >= 0.1) {
    riskSignals.push('same-keyKind duplicates observed with non-trivial redundant ratio');
  }
  if ((estimates.redundantHeapCostFromLoadMb ?? 0) >= 300) {
    riskSignals.push('estimated redundant heap cost from load delta >= 300MB');
  }

  return {
    baseline,
    after,
    idle,
    estimates,
    riskSignals,
  };
};

const extractCacheActivity = (debugPayload) => debugPayload?.json?.graphileCacheActivity ?? null;

const clamp01 = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

const isLikelyNetworkError = (errorMessage) => {
  if (!errorMessage) return false;
  const text = String(errorMessage).toLowerCase();
  return (
    text.includes('fetch failed') ||
    text.includes('econnrefused') ||
    text.includes('connection terminated') ||
    text.includes('connection reset') ||
    text.includes('socket hang up') ||
    text.includes('networkerror') ||
    text.includes('network error') ||
    text.includes('timeout')
  );
};

const isBusinessProfile = (profile) =>
  !!(
    profile?.table?.typeName &&
    profile?.table?.queryField &&
    profile?.table?.createMutation &&
    profile?.table?.updateMutation
  );

const isPublicBusinessProfile = (profile) =>
  isBusinessProfile(profile) &&
  (profile?.routingMode === 'public' || (!profile?.headers?.['X-Schemata'] && !!profile?.headers?.Host));

const normalizeWeights = () => {
  const weights = {
    create: clamp01(opWeightCreate),
    getById: clamp01(opWeightGetById),
    updateById: clamp01(opWeightUpdateById),
    listRecent: clamp01(opWeightListRecent),
  };

  const sum = Object.values(weights).reduce((acc, value) => acc + value, 0);
  if (sum <= 0) {
    return {
      create: 0.25,
      getById: 0.25,
      updateById: 0.25,
      listRecent: 0.25,
    };
  }

  return {
    create: weights.create / sum,
    getById: weights.getById / sum,
    updateById: weights.updateById / sum,
    listRecent: weights.listRecent / sum,
  };
};

const pickOperation = (weights) => {
  const dice = Math.random();
  const edges = [
    ['create', weights.create],
    ['getById', weights.getById],
    ['updateById', weights.updateById],
    ['listRecent', weights.listRecent],
  ];

  let cursor = 0;
  for (const [name, weight] of edges) {
    cursor += weight;
    if (dice <= cursor) return name;
  }
  return 'listRecent';
};

const resolveBusinessKeyspaceMode = (profiles) => {
  if (keyspaceModeArg !== 'auto') {
    return keyspaceModeArg;
  }

  if (keyspaceSize <= 1) {
    return 'none';
  }

  const hasSchemataHeader = profiles.some((profile) => {
    const value = profile?.headers?.['X-Schemata'];
    return typeof value === 'string' && value.trim().length > 0;
  });

  return hasSchemataHeader ? 'schemata' : 'none';
};

const expandBusinessProfilesForKeyspace = ({ profiles, keyspaceMode }) => {
  if (keyspaceMode !== 'schemata' || keyspaceSize <= 1) {
    return profiles;
  }

  const expanded = [];

  for (const profile of profiles) {
    const baseSchema = profile.headers?.['X-Schemata'] || profile.table?.physicalSchema;
    if (!baseSchema) {
      expanded.push(profile);
      continue;
    }

    const schemaPool = Array.isArray(profile.table?.availableSchemas)
      ? profile.table.availableSchemas.filter(Boolean)
      : [];
    const extras = [...new Set(schemaPool.filter((schema) => schema !== baseSchema))];

    for (let i = 0; i < keyspaceSize; i += 1) {
      const keyspaceIndex = i + 1;
      const headers = { ...(profile.headers || {}) };

      if (keyspaceIndex === 1 || extras.length === 0) {
        headers['X-Schemata'] = baseSchema;
      } else {
        const extra = extras[(i - 1) % extras.length];
        headers['X-Schemata'] = `${baseSchema},${extra}`;
      }

      expanded.push({
        ...profile,
        key: `${profile.key}|k${keyspaceIndex}`,
        routeKey: `schemata:${headers['X-Database-Id']}:${headers['X-Schemata']}`,
        headers,
      });
    }
  }

  return expanded.length > 0 ? expanded : profiles;
};

const buildBusinessRequest = ({ profile, operation, rowId }) => {
  const table = profile.table;
  const noteValue = `${notePrefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

  switch (operation) {
    case 'create':
      return {
        operation: 'create',
        payload: {
          query: `mutation($input: ${table.createInputType}!){${table.createMutation}(input:$input){${table.nodeField}{id note}}}`,
          variables: {
            input: {
              [table.nodeField]: {
                note: noteValue,
              },
            },
          },
        },
      };
    case 'getById':
      return {
        operation: 'getById',
        payload: {
          query: `query($id:UUID!){${table.queryField}(condition:{id:$id},first:1){nodes{id note}}}`,
          variables: {
            id: rowId,
          },
        },
      };
    case 'updateById':
      return {
        operation: 'updateById',
        payload: {
          query: `mutation($input: ${table.updateInputType}!){${table.updateMutation}(input:$input){${table.nodeField}{id note}}}`,
          variables: {
            input: {
              id: rowId,
              [table.patchField]: {
                note: noteValue,
              },
            },
          },
        },
      };
    default:
      return {
        operation: 'listRecent',
        payload: {
          query: `query{${table.queryField}(first:10,orderBy:[PRIMARY_KEY_DESC]){nodes{id note}}}`,
        },
      };
  }
};

const extractCreatedRowId = ({ profile, json, operation }) => {
  if (operation === 'create') {
    return json?.data?.[profile.table.createMutation]?.[profile.table.nodeField]?.id ?? null;
  }
  if (operation === 'updateById') {
    return json?.data?.[profile.table.updateMutation]?.[profile.table.nodeField]?.id ?? null;
  }
  if (operation === 'getById') {
    return json?.data?.[profile.table.queryField]?.nodes?.[0]?.id ?? null;
  }
  if (operation === 'listRecent') {
    return json?.data?.[profile.table.queryField]?.nodes?.[0]?.id ?? null;
  }
  return null;
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

  const mode =
    operationModeArg === 'auto'
      ? profiles.some((profile) => isBusinessProfile(profile))
        ? 'business'
        : 'legacy'
      : operationModeArg;

  let resolved = profiles;
  let resolvedKeyspaceMode = 'none';
  if (mode === 'business') {
    resolvedKeyspaceMode = resolveBusinessKeyspaceMode(profiles);
    resolved = expandBusinessProfilesForKeyspace({
      profiles,
      keyspaceMode: resolvedKeyspaceMode,
    });
  }

  if (profileLimit > 0) {
    resolved = resolved.slice(0, profileLimit);
  }

  return { profiles: resolved, mode, sourceCount: profiles.length, keyspaceMode: resolvedKeyspaceMode };
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

const runRouteProbe = async ({ profiles }) => {
  if (skipRouteProbe) {
    return { attempted: false, reason: 'skip route probe enabled' };
  }

  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error('[phase2] route probe cannot run without profiles');
  }

  const profile = profiles[0];
  const result = await postJson({
    url: resolveProfileGraphqlUrl(profile),
    headers: profile.headers ?? {},
    payload: { query: '{ __typename }' },
    timeoutMs: 15000,
  });

  const hasGraphQLErrors = Array.isArray(result.json?.errors) && result.json.errors.length > 0;
  const ok = result.ok && !hasGraphQLErrors && result.json?.data?.__typename === 'Query';

  const probe = {
    attempted: true,
    ok,
    profileKey: profile.key ?? null,
    status: result.status,
    elapsedMs: result.elapsedMs,
    error: result.error ?? null,
    firstError: hasGraphQLErrors ? result.json.errors[0]?.message ?? 'unknown GraphQL error' : null,
  };

  if (!ok) {
    const msg = probe.error || probe.firstError || 'unexpected GraphQL response';
    throw new Error(
      `[phase2] route probe failed for profile=${probe.profileKey ?? 'unknown'} status=${probe.status ?? 0} msg=${msg}`,
    );
  }

  return probe;
};

const pickPrewarmProfiles = (profiles) => {
  if (prewarmSampleSize <= 0 || prewarmSampleSize >= profiles.length) {
    return profiles;
  }

  const selected = [];
  const selectedKeys = new Set();
  const selectedTenantKeys = new Set();

  for (const profile of profiles) {
    const profileKey = profile?.key ?? null;
    if (!profileKey || selectedKeys.has(profileKey)) continue;
    const tenantKey = profile?.tenantKey ?? profileKey;
    if (selectedTenantKeys.has(tenantKey)) continue;

    selected.push(profile);
    selectedKeys.add(profileKey);
    selectedTenantKeys.add(tenantKey);
    if (selected.length >= prewarmSampleSize) {
      return selected;
    }
  }

  for (const profile of profiles) {
    const profileKey = profile?.key ?? null;
    if (!profileKey || selectedKeys.has(profileKey)) continue;
    selected.push(profile);
    selectedKeys.add(profileKey);
    if (selected.length >= prewarmSampleSize) {
      break;
    }
  }

  return selected;
};

const runPrewarm = async ({ profiles }) => {
  if (!prewarmEnabled) {
    return {
      attempted: false,
      enabled: false,
      reason: 'prewarm disabled',
      requestedSampleSize: prewarmSampleSize,
    };
  }

  if (!Array.isArray(profiles) || profiles.length === 0) {
    return {
      attempted: false,
      enabled: true,
      reason: 'no profiles',
      requestedSampleSize: prewarmSampleSize,
    };
  }

  const selectedProfiles = pickPrewarmProfiles(profiles);
  const failures = [];
  let ok = 0;
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(prewarmConcurrency, selectedProfiles.length));
  const startedAt = Date.now();

  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= selectedProfiles.length) {
        return;
      }

      const profile = selectedProfiles[index];
      const result = await postJson({
        url: resolveProfileGraphqlUrl(profile),
        headers: profile.headers ?? {},
        payload: { query: '{ __typename }' },
        timeoutMs: prewarmTimeoutMs,
      });

      const hasGraphQLErrors = Array.isArray(result.json?.errors) && result.json.errors.length > 0;
      const success = result.ok && !hasGraphQLErrors && result.json?.data?.__typename === 'Query';
      if (success) {
        ok += 1;
        continue;
      }

      failures.push({
        profileKey: profile?.key ?? null,
        tenantKey: profile?.tenantKey ?? null,
        status: result.status,
        elapsedMs: result.elapsedMs,
        error:
          result.error ??
          (hasGraphQLErrors ? result.json.errors[0]?.message ?? 'unknown GraphQL error' : 'unexpected GraphQL response'),
      });
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const summary = {
    attempted: true,
    enabled: true,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date().toISOString(),
    requestedSampleSize: prewarmSampleSize,
    targetCount: selectedProfiles.length,
    ok,
    failed: failures.length,
    concurrency: workerCount,
    timeoutMs: prewarmTimeoutMs,
    maxFailures: prewarmMaxFailures,
    failureSamples: failures.slice(0, 10),
  };

  if (summary.failed > prewarmMaxFailures) {
    throw new Error(
      `[phase2] prewarm failed count=${summary.failed}, allowed=${prewarmMaxFailures}; first=${summary.failureSamples[0]?.error ?? 'unknown error'}`,
    );
  }

  return summary;
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

const runLoad = async ({ profiles, mode }) => {
  const startedAt = Date.now();
  const until = startedAt + durationSeconds * 1000;
  const trafficPlan = buildTrafficPlan(profiles);
  const operationWeights = normalizeWeights();
  const rowState = new Map();
  let abortReason = null;
  let consecutiveNetworkErrors = 0;

  const latencies = [];
  const profileStats = new Map();
  const operationStats = new Map();
  let total = 0;
  let ok = 0;
  let failed = 0;

  const recordOperation = (operation, success) => {
    if (!operationStats.has(operation)) {
      operationStats.set(operation, { total: 0, ok: 0, failed: 0 });
    }
    const row = operationStats.get(operation);
    row.total += 1;
    row.ok += success ? 1 : 0;
    row.failed += success ? 0 : 1;
  };

  const record = (profileKey, success, elapsedMs, status, error, operation) => {
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
    if (operation) {
      row.lastOperation = operation;
    }

    if (operation) {
      recordOperation(operation, success);
    }
  };

  const getRowBucket = (profileKey, seedRowId = null) => {
    if (!rowState.has(profileKey)) {
      rowState.set(profileKey, {
        rowIds: seedRowId ? [seedRowId] : [],
      });
    }
    return rowState.get(profileKey);
  };

  const worker = async () => {
    while (Date.now() < until && !abortReason) {
      const elapsedMs = Date.now() - startedAt;
      const activeProfiles = trafficPlan.getActiveProfiles(elapsedMs);
      const profile = chooseProfile(activeProfiles);
      const profileKey = profile.key ?? 'unknown';

      let operation = 'legacy';
      let payload = graphqlPayload;

      if (mode === 'business') {
        const bucket = getRowBucket(profileKey, profile.seed?.rowId ?? null);
        operation = pickOperation(operationWeights);
        if ((operation === 'getById' || operation === 'updateById') && bucket.rowIds.length === 0) {
          operation = 'create';
        }

        const selectedRowId =
          bucket.rowIds.length > 0
            ? bucket.rowIds[Math.floor(Math.random() * bucket.rowIds.length)]
            : null;

        const request = buildBusinessRequest({
          profile,
          operation,
          rowId: selectedRowId,
        });
        operation = request.operation;
        payload = request.payload;
      }

      const result = await postJson({
        url: resolveProfileGraphqlUrl(profile),
        headers: profile.headers ?? {},
        payload,
        timeoutMs: 20000,
      });

      const hasGraphQLErrors = Array.isArray(result.json?.errors) && result.json.errors.length > 0;
      const success = result.ok && !hasGraphQLErrors && result.json?.data != null;
      const errMsg = result.error
        ? result.error
        : result.json?.errors?.[0]?.message ?? (!success ? 'unexpected GraphQL response' : null);

      if (mode === 'business' && success) {
        const bucket = getRowBucket(profileKey, profile.seed?.rowId ?? null);
        const rowId = extractCreatedRowId({ profile, json: result.json, operation });
        if (rowId && !bucket.rowIds.includes(rowId)) {
          bucket.rowIds.push(rowId);
          if (bucket.rowIds.length > 200) {
            bucket.rowIds = bucket.rowIds.slice(bucket.rowIds.length - 200);
          }
        }
      }

      record(profileKey, success, result.elapsedMs, result.status, errMsg, operation);

      if (!failFastEnabled || abortReason) {
        continue;
      }

      if (success) {
        consecutiveNetworkErrors = 0;
      } else if (isLikelyNetworkError(errMsg)) {
        consecutiveNetworkErrors += 1;
      } else {
        consecutiveNetworkErrors = 0;
      }

      if (consecutiveNetworkErrors >= failFastConsecutiveNetworkErrors) {
        abortReason = `consecutive network errors=${consecutiveNetworkErrors} (threshold=${failFastConsecutiveNetworkErrors}), lastError=${errMsg ?? 'n/a'}`;
        continue;
      }

      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      if (elapsedSeconds < failFastWarmupSeconds || total < failFastMinTotal) {
        continue;
      }

      const currentFailRate = failed / Math.max(1, total);
      if (currentFailRate >= failFastErrorRate) {
        abortReason = `error rate=${(currentFailRate * 100).toFixed(2)}% (threshold=${(failFastErrorRate * 100).toFixed(2)}%) after total=${total}, failed=${failed}`;
      }
    }
  };

  await Promise.all(Array.from({ length: workers }, () => worker()));

  if (abortReason) {
    throw new Error(`[phase2] fail-fast triggered: ${abortReason}`);
  }

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
    mode,
    operationWeights: mode === 'business' ? operationWeights : null,
    operationBreakdown: Object.fromEntries(operationStats.entries()),
    trafficPlan: trafficPlan.summary,
    profileBreakdown,
  };
};

const preparePublicAccess = async ({ profiles }) => {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    return { attempted: false, enabled: false, mode: publicAccessModeArg, reason: 'no profiles' };
  }

  const hasPublicBusinessProfiles = profiles.some((profile) => isPublicBusinessProfile(profile));
  const enabled =
    publicAccessModeArg === 'on' ||
    (publicAccessModeArg === 'auto' && hasPublicBusinessProfiles);

  if (!enabled) {
    return {
      attempted: false,
      enabled: false,
      mode: publicAccessModeArg,
      hasPublicBusinessProfiles,
      reason: publicAccessModeArg === 'off' ? 'public access mode disabled' : 'no public business profiles',
    };
  }

  const targets = buildTargetsFromProfiles(profiles);
  if (targets.length === 0) {
    return {
      attempted: false,
      enabled: true,
      mode: publicAccessModeArg,
      hasPublicBusinessProfiles,
      reason: 'no table targets in profiles',
    };
  }

  const unsafeTargets = getUnsafeTargets(targets);
  if (unsafeTargets.length > 0 && !allowPublicAccessNonPerfSchema) {
    throw new Error(
      `[phase2] refusing to prepare non-perf schemas: ${unsafeTargets
        .map((target) => `${target.schemaName}.${target.tableName}`)
        .join(', ')}`,
    );
  }

  const result = await ensurePublicAccessForTargets({
    targets,
    pgConfig,
    dryRun: false,
    publicRole,
    publicReadRole,
  });

  if (result.failures.length > 0) {
    throw new Error(
      `[phase2] public access preparation failed count=${result.failures.length}; first=${result.failures[0]?.error ?? 'unknown error'}`,
    );
  }

  return {
    attempted: true,
    enabled: true,
    mode: publicAccessModeArg,
    hasPublicBusinessProfiles,
    targetCount: targets.length,
    preparedCount: result.prepared.length,
    failureCount: result.failures.length,
    publicRole,
    publicReadRole: publicReadRole || null,
  };
};

const tryCaptureHeap = async () => {
  if (!Number.isFinite(heapPid)) {
    return { attempted: false, reason: 'heap pid not provided' };
  }

  const scriptPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'scripts', 'capture-heap-snapshot.mjs');

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

const analyzeSampler = async ({ windowStart, windowEnd }) => {
  if (skipAnalyze) {
    return { attempted: false, reason: 'skip analyze enabled' };
  }

  const scriptPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'scripts', 'analyze-debug-logs.mjs');
  const childArgs = [scriptPath, '--dir', dirs.samplerDir, '--json', '--start', windowStart, '--end', windowEnd];
  return await new Promise((resolve) => {
    const child = spawn(process.execPath, childArgs, {
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
          const reportPath = path.join(dirs.reportsDir, `analyze-debug-logs-${tier}.json`);
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
  const loadedProfiles = await loadProfiles(requestProfilesFile);
  const profiles = loadedProfiles.profiles;
  const executionMode = loadedProfiles.mode;
  const executionKeyspaceMode = loadedProfiles.keyspaceMode;
  const publicAccessPreparation = await preparePublicAccess({ profiles });
  await validateScaleGate({ profiles });
  const routeProbe = await runRouteProbe({ profiles });
  const prewarm = await runPrewarm({ profiles });

  const baseline = await captureDebug({ suffix: 'baseline' });
  const loadSummary = await runLoad({ profiles, mode: executionMode });
  const after = await captureDebug({ suffix: 'after' });

  await sleep(idleSeconds * 1000);
  const idle = await captureDebug({ suffix: 'idle' });

  const cacheActivity = {
    loadWindow: cacheActivityDelta(
      extractCacheActivity(baseline.memory),
      extractCacheActivity(after.memory),
    ),
    cooldownWindow: cacheActivityDelta(
      extractCacheActivity(after.memory),
      extractCacheActivity(idle.memory),
    ),
    totalWindow: cacheActivityDelta(
      extractCacheActivity(baseline.memory),
      extractCacheActivity(idle.memory),
    ),
  };
  const cacheRedundancy = analyzeCacheRedundancyRisk({
    baselineSnapshot: baseline.memory?.json ?? null,
    afterSnapshot: after.memory?.json ?? null,
    idleSnapshot: idle.memory?.json ?? null,
  });

  const analyzeWindowStart = baseline.memory?.json?.timestamp ?? startedAt;
  const analyzeWindowEnd = idle.memory?.json?.timestamp ?? new Date().toISOString();
  const [heapCapture, analyzeResult] = await Promise.all([
    tryCaptureHeap(),
    analyzeSampler({ windowStart: analyzeWindowStart, windowEnd: analyzeWindowEnd }),
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
    keyspaceSize,
    keyspaceMode: executionKeyspaceMode,
    keyspaceModeRequested: keyspaceModeArg,
    operationMode: executionMode,
    publicAccessPreparation,
    routeProbe,
    prewarmConfig: {
      enabled: prewarmEnabled,
      sampleSize: prewarmSampleSize,
      concurrency: prewarmConcurrency,
      timeoutMs: prewarmTimeoutMs,
      maxFailures: prewarmMaxFailures,
    },
    prewarm,
    profilesFile: requestProfilesFile,
    sourceProfileCount: loadedProfiles.sourceCount,
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
    cacheActivity,
    cacheRedundancy,
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
