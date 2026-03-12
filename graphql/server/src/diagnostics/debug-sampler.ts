import fs from 'node:fs/promises';
import path from 'node:path';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import { getDebugDatabaseSnapshot } from './debug-db-snapshot';
import { getDebugMemorySnapshot } from './debug-memory-snapshot';
import { isGraphqlDebugSamplerEnabled } from './observability';

const log = new Logger('debug-sampler');

const getSamplerIntervalMs = (): number => {
  const raw = process.env.GRAPHQL_DEBUG_SAMPLER_INTERVAL_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : 10_000;
  return Number.isFinite(parsed) && parsed >= 1_000 ? parsed : 10_000;
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

export interface DebugSamplerHandle {
  stop(): Promise<void>;
}

export const startDebugSampler = (opts: ConstructiveOptions): DebugSamplerHandle | null => {
  if (!isGraphqlDebugSamplerEnabled(opts.server?.host)) {
    return null;
  }

  const intervalMs = getSamplerIntervalMs();
  const logDir = createSessionLogDir();
  const memoryLogPath = path.join(logDir, 'debug-memory.ndjson');
  const dbLogPath = path.join(logDir, 'debug-db.ndjson');
  const errorLogPath = path.join(logDir, 'debug-sampler-errors.ndjson');

  let timer: NodeJS.Timeout | null = null;
  let stopped = false;
  let inFlight: Promise<void> | null = null;
  let writeFailureLogged = false;

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

    try {
      await appendJsonLine(dbLogPath, await getDebugDatabaseSnapshot(opts));
    } catch (error) {
      log.error('Failed to capture debug DB snapshot', error);
      await recordError('db', error);
    }
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
    intervalMs,
    logDir,
    pid: process.pid,
    timestamp: new Date().toISOString(),
  };
  runBackgroundWrite(appendJsonLine(memoryLogPath, lifecyclePayload), 'lifecycle-memory-start');
  runBackgroundWrite(appendJsonLine(dbLogPath, lifecyclePayload), 'lifecycle-db-start');

  log.info(`Debug sampler writing snapshots every ${intervalMs}ms to ${logDir}`);
  tick();
  timer = setInterval(tick, intervalMs);
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
        intervalMs,
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
