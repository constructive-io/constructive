#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);

const getArgValue = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return fallback;
  }
  return args[index + 1];
};

const requestedLogDir = path.resolve(getArgValue('--dir', path.join(packageDir, 'logs')));
const jsonMode = args.includes('--json');
const requestedWindowStart = getArgValue('--start', null);
const requestedWindowEnd = getArgValue('--end', null);

const pathExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const resolveLogDir = async (baseDir) => {
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const candidates = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const candidateDir = path.join(baseDir, entry.name);
        const hasMemory = await pathExists(path.join(candidateDir, 'debug-memory.ndjson'));
        const hasDb = await pathExists(path.join(candidateDir, 'debug-db.ndjson'));
        if (!hasMemory && !hasDb) {
          return null;
        }

        const stat = await fs.stat(candidateDir);
        return { dir: candidateDir, mtimeMs: stat.mtimeMs };
      }),
  );

  const latest = candidates.filter(Boolean).sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
  return latest?.dir ?? baseDir;
};

const readNdjson = async (filePath) => {
  if (!(await pathExists(filePath))) {
    return [];
  }

  const content = await fs.readFile(filePath, 'utf8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
};

const getLastSessionEntries = (entries) => {
  let lastStartIndex = -1;
  for (let i = 0; i < entries.length; i += 1) {
    if (entries[i]?.event === 'sampler_started') {
      lastStartIndex = i;
    }
  }

  return lastStartIndex === -1
    ? entries.filter((entry) => entry?.timestamp)
    : entries.slice(lastStartIndex + 1).filter((entry) => entry?.timestamp);
};

const first = (entries) => (entries.length > 0 ? entries[0] : null);
const last = (entries) => (entries.length > 0 ? entries[entries.length - 1] : null);
const maxBy = (entries, getter, fallback = 0) =>
  entries.reduce((max, entry) => Math.max(max, getter(entry) ?? fallback), fallback);
const toMB = (bytes) => Number((bytes / 1024 / 1024).toFixed(1));
const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const diff = (startValue, endValue) => {
  const delta = toNumber(endValue) - toNumber(startValue);
  return delta >= 0 ? delta : 0;
};

const percentDelta = (start, end) => {
  if (!Number.isFinite(start) || start <= 0 || !Number.isFinite(end)) {
    return null;
  }
  return Number((((end - start) / start) * 100).toFixed(1));
};

const parseIso = (raw, flagName) => {
  if (!raw) return null;
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) {
    throw new Error(`Invalid ${flagName} value: ${raw}`);
  }
  return new Date(ts).toISOString();
};

const windowStartIso = parseIso(requestedWindowStart, '--start');
const windowEndIso = parseIso(requestedWindowEnd, '--end');

const isInWindow = (entry, startIso, endIso) => {
  const ts = entry?.timestamp;
  if (!ts) return false;
  if (startIso && ts < startIso) return false;
  if (endIso && ts > endIso) return false;
  return true;
};

const toArray = (setLike) => [...setLike];

const summarizeCacheRedundancy = (
  memoryEntry,
  { topFingerprints = 10, topKeys = 5, topKeyKinds = 5, topTenants = 5 } = {},
) => {
  const entries = Array.isArray(memoryEntry?.graphileCacheEntries) ? memoryEntry.graphileCacheEntries : [];
  const cacheSize = toNumber(memoryEntry?.graphileCache?.size ?? entries.length);
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

const perEntryHeapCostBytes = (startEntry, endEntry) => {
  const heapDelta = toNumber(endEntry?.memory?.heapUsedBytes) - toNumber(startEntry?.memory?.heapUsedBytes);
  const cacheDelta = toNumber(endEntry?.graphileCache?.size) - toNumber(startEntry?.graphileCache?.size);
  if (heapDelta <= 0 || cacheDelta <= 0) {
    return null;
  }
  return Math.round(heapDelta / cacheDelta);
};

const summarizeCacheRedundancyRisk = ({ startEntry, endEntry, idleEntry }) => {
  const start = summarizeCacheRedundancy(startEntry);
  const end = summarizeCacheRedundancy(endEntry);
  const idle = summarizeCacheRedundancy(idleEntry);

  const estimatedPerEntryFromWindowBytes = perEntryHeapCostBytes(startEntry, endEntry);
  const upperBoundPerEntryBytes = (() => {
    const heapUsed = toNumber(endEntry?.memory?.heapUsedBytes);
    const cacheSize = toNumber(endEntry?.graphileCache?.size);
    if (heapUsed <= 0 || cacheSize <= 0) {
      return null;
    }
    return Math.round(heapUsed / cacheSize);
  })();

  const estimates = {
    perEntryHeapFromWindowMb:
      estimatedPerEntryFromWindowBytes == null ? null : toMB(estimatedPerEntryFromWindowBytes),
    perEntryHeapUpperBoundMb:
      upperBoundPerEntryBytes == null ? null : toMB(upperBoundPerEntryBytes),
    redundantHeapFromWindowMb:
      estimatedPerEntryFromWindowBytes == null ? null : toMB(estimatedPerEntryFromWindowBytes * end.redundantEntries),
    redundantHeapUpperBoundMb:
      upperBoundPerEntryBytes == null ? null : toMB(upperBoundPerEntryBytes * end.redundantEntries),
  };

  const riskSignals = [];
  if (end.redundantEntryRatio >= 0.2) {
    riskSignals.push('end-window redundantEntryRatio >= 20%');
  }
  if (idle.redundantEntryRatio >= 0.2) {
    riskSignals.push('idle-tail redundantEntryRatio >= 20%');
  }
  if (end.crossKindDuplicateFingerprints > 0) {
    riskSignals.push('cross-keyKind duplicate fingerprints observed');
  }
  if (end.amplificationFactor >= 1.3) {
    riskSignals.push('cache amplification factor >= 1.3 (same runtime cached under many keys)');
  }
  if (end.sameKindDuplicateFingerprints > 0 && end.redundantEntryRatio >= 0.1) {
    riskSignals.push('same-keyKind duplicates observed with non-trivial redundant ratio');
  }
  if ((estimates.redundantHeapFromWindowMb ?? 0) >= 300) {
    riskSignals.push('estimated redundant heap from window delta >= 300MB');
  }

  return {
    start,
    end,
    idleTail: idle,
    estimates,
    riskSignals,
  };
};

const getCacheActivityDelta = (start, end) => {
  if (!start || !end) {
    return null;
  }

  const lookupsTotal = diff(start.lookups?.total, end.lookups?.total);
  const lookupsHits = diff(start.lookups?.hits, end.lookups?.hits);
  const lookupsMisses = diff(start.lookups?.misses, end.lookups?.misses);
  const lookupsRecheckHits = diff(start.lookups?.recheckHits, end.lookups?.recheckHits);
  const buildSets = diff(start.builds?.sets, end.builds?.sets);
  const buildReplacements = diff(start.builds?.replacements, end.builds?.replacements);
  const buildCoalescedWaits = diff(start.builds?.coalescedWaits, end.builds?.coalescedWaits);
  const evictionsTotal = diff(start.evictions?.total, end.evictions?.total);
  const evictionsLru = diff(start.evictions?.lru, end.evictions?.lru);
  const evictionsTtl = diff(start.evictions?.ttl, end.evictions?.ttl);
  const evictionsManual = diff(start.evictions?.manual, end.evictions?.manual);

  return {
    lookups: {
      total: lookupsTotal,
      hits: lookupsHits,
      misses: lookupsMisses,
      recheckHits: lookupsRecheckHits,
      hitRate: lookupsTotal > 0 ? Number((lookupsHits / lookupsTotal).toFixed(4)) : 0,
      missRate: lookupsTotal > 0 ? Number((lookupsMisses / lookupsTotal).toFixed(4)) : 0,
    },
    builds: {
      sets: buildSets,
      replacements: buildReplacements,
      coalescedWaits: buildCoalescedWaits,
    },
    evictions: {
      total: evictionsTotal,
      lru: evictionsLru,
      ttl: evictionsTtl,
      manual: evictionsManual,
    },
  };
};

const summarize = async () => {
  const logDir = await resolveLogDir(requestedLogDir);
  const memoryPath = path.join(logDir, 'debug-memory.ndjson');
  const dbPath = path.join(logDir, 'debug-db.ndjson');

  const [memoryLines, dbLines] = await Promise.all([readNdjson(memoryPath), readNdjson(dbPath)]);
  const memoryEntries = getLastSessionEntries(memoryLines)
    .filter((entry) => entry.memory)
    .filter((entry) => isInWindow(entry, windowStartIso, windowEndIso));
  const dbEntries = getLastSessionEntries(dbLines)
    .filter((entry) => entry.database !== undefined)
    .filter((entry) => isInWindow(entry, windowStartIso, windowEndIso));

  if (memoryEntries.length === 0 && dbEntries.length === 0) {
    throw new Error(`No debug snapshot entries found in ${logDir}`);
  }

  const memoryStart = first(memoryEntries);
  const memoryEnd = last(memoryEntries);
  const dbStart = first(dbEntries);
  const dbEnd = last(dbEntries);
  const startedAt = new Date((memoryStart ?? dbStart).timestamp);
  const endedAt = new Date((memoryEnd ?? dbEnd).timestamp);
  const idleTail = memoryEntries.slice(-6);
  const idleTailStart = first(idleTail);
  const idleTailEnd = last(idleTail);
  const graphileCacheRedundancy = memoryEntries.length > 0
    ? summarizeCacheRedundancyRisk({
      startEntry: memoryStart,
      endEntry: memoryEnd,
      idleEntry: idleTailEnd ?? memoryEnd,
    })
    : null;

  const summary = {
    logDir,
    requestedWindow: {
      start: windowStartIso,
      end: windowEndIso,
    },
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationSeconds: Number(((endedAt.getTime() - startedAt.getTime()) / 1000).toFixed(1)),
    samples: {
      memory: memoryEntries.length,
      db: dbEntries.length,
    },
    memory: memoryEntries.length > 0 ? {
      heapUsedMb: {
        start: toMB(memoryStart.memory.heapUsedBytes),
        max: toMB(maxBy(memoryEntries, (entry) => entry.memory.heapUsedBytes)),
        end: toMB(memoryEnd.memory.heapUsedBytes),
        delta: toMB(memoryEnd.memory.heapUsedBytes - memoryStart.memory.heapUsedBytes),
      },
      rssMb: {
        start: toMB(memoryStart.memory.rssBytes),
        max: toMB(maxBy(memoryEntries, (entry) => entry.memory.rssBytes)),
        end: toMB(memoryEnd.memory.rssBytes),
        delta: toMB(memoryEnd.memory.rssBytes - memoryStart.memory.rssBytes),
      },
      idleTail: idleTail.length > 1 ? {
        samples: idleTail.length,
        heapTrendPct: percentDelta(idleTailStart.memory.heapUsedBytes, idleTailEnd.memory.heapUsedBytes),
        rssTrendPct: percentDelta(idleTailStart.memory.rssBytes, idleTailEnd.memory.rssBytes),
      } : null,
      graphileCache: {
        maxSize: maxBy(memoryEntries, (entry) => entry.graphileCache?.size ?? 0),
        endSize: memoryEnd.graphileCache?.size ?? 0,
        endKeys: memoryEnd.graphileCache?.keys ?? [],
      },
      graphileCacheDuplicates: memoryEnd.graphileCacheAnalysis ?? null,
      graphileCacheRedundancy,
      graphileCacheActivityDelta: getCacheActivityDelta(
        memoryStart.graphileCacheActivity ?? null,
        memoryEnd.graphileCacheActivity ?? null,
      ),
      svcCache: memoryEnd.svcCache ?? null,
      inFlight: {
        maxCount: maxBy(memoryEntries, (entry) => entry.inFlight?.count ?? 0),
        endCount: memoryEnd.inFlight?.count ?? 0,
      },
      graphileBuilds: {
        started: memoryEnd.graphileBuilds?.started ?? 0,
        succeeded: memoryEnd.graphileBuilds?.succeeded ?? 0,
        failed: memoryEnd.graphileBuilds?.failed ?? 0,
        maxBuildMs: memoryEnd.graphileBuilds?.maxMs ?? 0,
        averageBuildMs: memoryEnd.graphileBuilds?.averageMs ?? 0,
      },
    } : null,
    database: dbEntries.length > 0 ? {
      pool: {
        maxTotalCount: maxBy(dbEntries, (entry) => entry.pool?.totalCount ?? 0),
        maxIdleCount: maxBy(dbEntries, (entry) => entry.pool?.idleCount ?? 0),
        maxWaitingCount: maxBy(dbEntries, (entry) => entry.pool?.waitingCount ?? 0),
      },
      activity: {
        maxActiveRows: maxBy(dbEntries, (entry) => entry.activeActivity?.length ?? 0),
        maxBlockedRows: maxBy(dbEntries, (entry) => entry.blockedActivity?.length ?? 0),
        blockedSamples: dbEntries.filter((entry) => (entry.blockedActivity?.length ?? 0) > 0).length,
      },
      stats: {
        maxNumBackends: maxBy(dbEntries, (entry) => Number(entry.databaseStats?.numbackends ?? 0)),
        maxTempBytes: maxBy(dbEntries, (entry) => Number(entry.databaseStats?.temp_bytes ?? 0)),
        maxDeadlocks: maxBy(dbEntries, (entry) => Number(entry.databaseStats?.deadlocks ?? 0)),
      },
      notificationQueueUsage: {
        max: maxBy(dbEntries, (entry) => Number(entry.notificationQueueUsage ?? 0)),
        end: Number(dbEnd?.notificationQueueUsage ?? 0),
      },
    } : null,
  };

  const verdicts = [];
  if (summary.memory) {
    if (summary.memory.heapUsedMb.max >= 1500 || summary.memory.rssMb.max >= 1800) {
      verdicts.push('memory pressure stayed very high');
    }
    if (summary.memory.idleTail?.heapTrendPct != null && summary.memory.idleTail.heapTrendPct > 5) {
      verdicts.push('heap still trended upward during the last 6 samples');
    }
    if (summary.memory.idleTail?.rssTrendPct != null && summary.memory.idleTail.rssTrendPct > 5) {
      verdicts.push('rss still trended upward during the last 6 samples');
    }
    if ((summary.memory.graphileCacheDuplicates?.duplicateEntryRatio ?? 0) >= 0.2) {
      verdicts.push('graphile cache contains many duplicate runtime fingerprints');
    }
    if ((summary.memory.graphileCacheRedundancy?.end?.redundantEntryRatio ?? 0) >= 0.2) {
      verdicts.push('graphile cache shows redundant entries for same runtime fingerprint');
    }
    if ((summary.memory.graphileCacheRedundancy?.end?.amplificationFactor ?? 0) >= 1.3) {
      verdicts.push('graphile cache keyspace amplification is high (same runtime cached multiple times)');
    }
    if (Array.isArray(summary.memory.graphileCacheRedundancy?.riskSignals) &&
      summary.memory.graphileCacheRedundancy.riskSignals.length > 0) {
      verdicts.push(`graphile redundancy risk signals: ${summary.memory.graphileCacheRedundancy.riskSignals.join(', ')}`);
    }
    if (summary.memory.graphileBuilds.failed === 0) {
      verdicts.push('no graphile build failures');
    }
  }
  if (summary.database) {
    if (summary.database.activity.blockedSamples === 0) {
      verdicts.push('no blocked DB sessions captured');
    }
    if (summary.database.pool.maxWaitingCount === 0) {
      verdicts.push('pg pool never queued waiters');
    }
    if (summary.database.notificationQueueUsage.max === 0) {
      verdicts.push('Postgres notify queue stayed empty');
    }
  }

  return { ...summary, verdicts };
};

const main = async () => {
  const summary = await summarize();
  if (jsonMode) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Log dir: ${summary.logDir}`);
  console.log(`Window: ${summary.startedAt} -> ${summary.endedAt} (${summary.durationSeconds}s)`);
  console.log(`Samples: memory=${summary.samples.memory}, db=${summary.samples.db}`);

  if (summary.memory) {
    console.log(
      `Heap MB: start=${summary.memory.heapUsedMb.start} max=${summary.memory.heapUsedMb.max} end=${summary.memory.heapUsedMb.end} delta=${summary.memory.heapUsedMb.delta}`,
    );
    console.log(
      `RSS MB: start=${summary.memory.rssMb.start} max=${summary.memory.rssMb.max} end=${summary.memory.rssMb.end} delta=${summary.memory.rssMb.delta}`,
    );
    if (summary.memory.idleTail) {
      console.log(
        `Idle tail (last ${summary.memory.idleTail.samples}): heapTrend=${summary.memory.idleTail.heapTrendPct}% rssTrend=${summary.memory.idleTail.rssTrendPct}%`,
      );
    }
    console.log(
      `Graphile cache: max=${summary.memory.graphileCache.maxSize} end=${summary.memory.graphileCache.endSize} keys=${summary.memory.graphileCache.endKeys.join(',') || 'none'}`,
    );
    if (summary.memory.graphileCacheDuplicates) {
      const duplicates = summary.memory.graphileCacheDuplicates;
      console.log(
        `Graphile cache duplicates: duplicateEntries=${duplicates.duplicateEntries}/${duplicates.totalEntries} duplicateFingerprints=${duplicates.duplicateFingerprints} maxKeysPerFingerprint=${duplicates.maxKeysPerFingerprint} ratio=${duplicates.duplicateEntryRatio}`,
      );
    }
    if (summary.memory.graphileCacheRedundancy) {
      const redundancy = summary.memory.graphileCacheRedundancy;
      console.log(
        `Graphile cache redundancy: endRedundantEntries=${redundancy.end.redundantEntries}/${redundancy.end.cacheSize} endRatio=${redundancy.end.redundantEntryRatio} amplification=${redundancy.end.amplificationFactor} crossKind=${redundancy.end.crossKindDuplicateFingerprints}`,
      );
      if (Array.isArray(redundancy.end.redundancyByKeyKind) && redundancy.end.redundancyByKeyKind.length > 0) {
        const keyKindSummary = redundancy.end.redundancyByKeyKind
          .map((row) => `${row.keyKind}:dup=${row.duplicateEntries}/${row.entries},red=${row.redundantEntries}`)
          .join(' | ');
        console.log(`Graphile redundancy by keyKind: ${keyKindSummary}`);
      }
      if (redundancy.estimates.redundantHeapFromWindowMb != null) {
        console.log(
          `Graphile redundancy heap estimate (window): perEntry=${redundancy.estimates.perEntryHeapFromWindowMb}MB redundant=${redundancy.estimates.redundantHeapFromWindowMb}MB`,
        );
      }
      if (redundancy.riskSignals.length > 0) {
        console.log(`Graphile redundancy signals: ${redundancy.riskSignals.join('; ')}`);
      }
    }
    console.log(
      `Graphile builds: started=${summary.memory.graphileBuilds.started} failed=${summary.memory.graphileBuilds.failed} maxBuildMs=${summary.memory.graphileBuilds.maxBuildMs} avgBuildMs=${summary.memory.graphileBuilds.averageBuildMs}`,
    );
    if (summary.memory.graphileCacheActivityDelta) {
      console.log(
        `Graphile cache activity delta: lookups=${summary.memory.graphileCacheActivityDelta.lookups.total} hits=${summary.memory.graphileCacheActivityDelta.lookups.hits} misses=${summary.memory.graphileCacheActivityDelta.lookups.misses} sets=${summary.memory.graphileCacheActivityDelta.builds.sets} evictions=${summary.memory.graphileCacheActivityDelta.evictions.total}`,
      );
    }
  }

  if (summary.database) {
    console.log(
      `DB pool: maxTotal=${summary.database.pool.maxTotalCount} maxIdle=${summary.database.pool.maxIdleCount} maxWaiting=${summary.database.pool.maxWaitingCount}`,
    );
    console.log(
      `DB activity: maxActiveRows=${summary.database.activity.maxActiveRows} maxBlockedRows=${summary.database.activity.maxBlockedRows} blockedSamples=${summary.database.activity.blockedSamples}`,
    );
    console.log(
      `DB stats: maxNumBackends=${summary.database.stats.maxNumBackends} maxTempBytes=${summary.database.stats.maxTempBytes} maxDeadlocks=${summary.database.stats.maxDeadlocks}`,
    );
    console.log(
      `Notify queue usage: end=${summary.database.notificationQueueUsage.end} max=${summary.database.notificationQueueUsage.max}`,
    );
  }

  if (summary.verdicts.length > 0) {
    console.log(`Verdicts: ${summary.verdicts.join('; ')}`);
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
