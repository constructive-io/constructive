import fs from 'node:fs/promises';
import path from 'node:path';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import { getDebugDatabaseSnapshot } from './debug-db-snapshot';
import { getDebugMemorySnapshot } from './debug-memory-snapshot';
import { isGraphqlDebugSamplerEnabled } from './observability';

const log = new Logger('debug-sampler');

const MAX_TOTAL_BYTES = 1024 * 1024 * 1024; // 1 GB

const MIN_INTERVAL_MS = 1_000;
const DEFAULT_MEMORY_INTERVAL_MS = 10_000;
const DEFAULT_DB_INTERVAL_MS = 30_000;

const parseIntervalMs = (raw: string | undefined, fallback: number): number => {
  const parsed = raw ? Number.parseInt(raw, 10) : fallback;
  return Number.isFinite(parsed) && parsed >= MIN_INTERVAL_MS ? parsed : fallback;
};

const getMemorySamplerIntervalMs = (): number => {
  return parseIntervalMs(
    process.env.GRAPHQL_DEBUG_SAMPLER_MEMORY_INTERVAL_MS ?? process.env.GRAPHQL_DEBUG_SAMPLER_INTERVAL_MS,
    DEFAULT_MEMORY_INTERVAL_MS,
  );
};

const getDbSamplerIntervalMs = (memoryIntervalMs: number): number => {
  const parsed = parseIntervalMs(process.env.GRAPHQL_DEBUG_SAMPLER_DB_INTERVAL_MS, DEFAULT_DB_INTERVAL_MS);
  return Math.max(parsed, memoryIntervalMs);
};

const getSamplerRootDir = (): string => {
  if (process.env.GRAPHQL_DEBUG_SAMPLER_DIR) {
    return path.resolve(process.env.GRAPHQL_DEBUG_SAMPLER_DIR);
  }

  return path.resolve(__dirname, '../..', 'logs');
};

const createSessionLogDir = (): string => {
  const rootDir = getSamplerRootDir();
  const sessionName = `run-${new Date().toISOString().replace(/[:.]/g, '-')}-pid${process.pid}`;
  return process.env.GRAPHQL_DEBUG_SAMPLER_DIR
    ? rootDir
    : path.join(rootDir, sessionName);
};

const appendJsonLine = async (filePath: string, payload: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
};

const getDirSize = async (dirPath: string): Promise<number> => {
  let total = 0;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += await getDirSize(fullPath);
    } else {
      const stat = await fs.stat(fullPath);
      total += stat.size;
    }
  }
  return total;
};

const enforceMaxSize = async (rootDir: string, currentSessionDir: string): Promise<void> => {
  try {
    const totalSize = await getDirSize(rootDir);
    if (totalSize <= MAX_TOTAL_BYTES) {
      return;
    }

    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    const sessionDirs = await Promise.all(
      entries
        .filter((e) => e.isDirectory())
        .map(async (e) => {
          const fullPath = path.join(rootDir, e.name);
          const stat = await fs.stat(fullPath);
          return { path: fullPath, mtimeMs: stat.mtimeMs };
        }),
    );

    sessionDirs.sort((a, b) => a.mtimeMs - b.mtimeMs);

    for (const dir of sessionDirs) {
      if (dir.path === currentSessionDir) {
        continue;
      }
      log.info(`Rolling cleanup: removing old session dir ${dir.path}`);
      await fs.rm(dir.path, { recursive: true, force: true });
      const newSize = await getDirSize(rootDir);
      if (newSize <= MAX_TOTAL_BYTES) {
        break;
      }
    }
  } catch (error) {
    log.error('Failed to enforce max log size', error);
  }
};

export interface DebugSamplerHandle {
  stop(): Promise<void>;
}

export const startDebugSampler = (opts: ConstructiveOptions): DebugSamplerHandle | null => {
  if (!isGraphqlDebugSamplerEnabled(opts.server?.host)) {
    return null;
  }

  const memoryIntervalMs = getMemorySamplerIntervalMs();
  const dbIntervalMs = getDbSamplerIntervalMs(memoryIntervalMs);
  const logDir = createSessionLogDir();
  const memoryLogPath = path.join(logDir, 'debug-memory.ndjson');
  const dbLogPath = path.join(logDir, 'debug-db.ndjson');
  const errorLogPath = path.join(logDir, 'debug-sampler-errors.ndjson');

  let timer: NodeJS.Timeout | null = null;
  let stopped = false;
  let inFlight: Promise<void> | null = null;
  let writeFailureLogged = false;
  let lastDbSampleAt = 0;

  const runBackgroundWrite = (promise: Promise<unknown>, scope: string): void => {
    promise.catch((error) => {
      // Avoid recursive attempts to write additional error files when the
      // underlying storage path is broken or unavailable.
      if (!writeFailureLogged) {
        writeFailureLogged = true;
        log.error(`Debug sampler background write failed (${scope})`, error);
      }
    });
  };

  const recordError = async (scope: 'memory' | 'db' | 'sampler', error: unknown): Promise<void> => {
    const payload = {
      scope,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : {
        message: String(error),
      },
    };
    await appendJsonLine(errorLogPath, payload);
  };

  const sampleOnce = async (): Promise<void> => {
    if (stopped) {
      return;
    }

    try {
      await appendJsonLine(memoryLogPath, getDebugMemorySnapshot());
    } catch (error) {
      log.error('Failed to capture debug memory snapshot', error);
      await recordError('memory', error);
    }

    const now = Date.now();
    if (lastDbSampleAt === 0 || now - lastDbSampleAt >= dbIntervalMs) {
      try {
        await appendJsonLine(dbLogPath, await getDebugDatabaseSnapshot(opts));
      } catch (error) {
        log.error('Failed to capture debug DB snapshot', error);
        await recordError('db', error);
      } finally {
        lastDbSampleAt = Date.now();
      }
    }

    await enforceMaxSize(getSamplerRootDir(), logDir);
  };

  const tick = (): void => {
    if (stopped) {
      return;
    }

    if (inFlight) {
      runBackgroundWrite(
        recordError('sampler', new Error('Skipped debug sample because previous sample is still running')),
        'record-skip',
      );
      return;
    }

    inFlight = sampleOnce()
      .catch(async (error) => {
        log.error('Debug sampler tick failed', error);
        await recordError('sampler', error);
      })
      .finally(() => {
        inFlight = null;
      });
  };

  const lifecyclePayload = {
    event: 'sampler_started',
    intervalMs: memoryIntervalMs,
    memoryIntervalMs,
    dbIntervalMs,
    logDir,
    pid: process.pid,
    timestamp: new Date().toISOString(),
  };
  runBackgroundWrite(appendJsonLine(memoryLogPath, lifecyclePayload), 'lifecycle-memory-start');
  runBackgroundWrite(appendJsonLine(dbLogPath, lifecyclePayload), 'lifecycle-db-start');

  log.info(
    `Debug sampler writing memory snapshots every ${memoryIntervalMs}ms and DB snapshots every ${dbIntervalMs}ms to ${logDir}`,
  );
  tick();
  timer = setInterval(tick, memoryIntervalMs);
  timer.unref();

  return {
    async stop(): Promise<void> {
      stopped = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      if (inFlight) {
        await inFlight;
      }

      const payload = {
        event: 'sampler_stopped',
        intervalMs: memoryIntervalMs,
        memoryIntervalMs,
        dbIntervalMs,
        logDir,
        pid: process.pid,
        timestamp: new Date().toISOString(),
      };

      await Promise.allSettled([
        appendJsonLine(memoryLogPath, payload),
        appendJsonLine(dbLogPath, payload),
      ]);
    },
  };
};
