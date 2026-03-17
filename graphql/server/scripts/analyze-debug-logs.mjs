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
const percentDelta = (start, end) => {
  if (!Number.isFinite(start) || start <= 0 || !Number.isFinite(end)) {
    return null;
  }
  return Number((((end - start) / start) * 100).toFixed(1));
};

const summarize = async () => {
  const logDir = await resolveLogDir(requestedLogDir);
  const memoryPath = path.join(logDir, 'debug-memory.ndjson');
  const dbPath = path.join(logDir, 'debug-db.ndjson');

  const [memoryLines, dbLines] = await Promise.all([readNdjson(memoryPath), readNdjson(dbPath)]);
  const memoryEntries = getLastSessionEntries(memoryLines).filter((entry) => entry.memory);
  const dbEntries = getLastSessionEntries(dbLines).filter((entry) => entry.database !== undefined);

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

  const summary = {
    logDir,
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
    console.log(
      `Graphile builds: started=${summary.memory.graphileBuilds.started} failed=${summary.memory.graphileBuilds.failed} maxBuildMs=${summary.memory.graphileBuilds.maxBuildMs} avgBuildMs=${summary.memory.graphileBuilds.averageBuildMs}`,
    );
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
