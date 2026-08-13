import { spawn } from 'node:child_process';

import type { WorkerConfig, WorkerResult } from './types';

export const WORKER_RESULT_PREFIX = 'CPERF_RESULT ';
export const DATABASE_URL_ENV = 'CPERF_DATABASE_URL';
export const WORKER_CONFIG_ENV = 'CPERF_WORKER_CONFIG';

export interface SpawnedWorkerResult {
  pid: number;
  result: WorkerResult;
}

const lastLines = (value: string, count = 20): string =>
  value.trim().split('\n').slice(-count).join('\n');

export const runWorkerProcess = (
  workerPath: string,
  databaseUrl: string,
  config: WorkerConfig
): Promise<SpawnedWorkerResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--expose-gc', workerPath], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        GRAPHILE_ENV: 'production',
        [DATABASE_URL_ENV]: databaseUrl,
        [WORKER_CONFIG_ENV]: Buffer.from(JSON.stringify(config)).toString(
          'base64url'
        ),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const pid = child.pid;
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      const resultLine = stdout
        .split('\n')
        .reverse()
        .find((line: string) => line.startsWith(WORKER_RESULT_PREFIX));
      if (!resultLine) {
        reject(
          new Error(
            `benchmark worker ${pid ?? 'unknown'} exited without a result ` +
              `(code=${String(code)}, signal=${String(signal)})` +
              (stderr.trim() ? `\n${lastLines(stderr)}` : '')
          )
        );
        return;
      }
      try {
        const result = JSON.parse(
          resultLine.slice(WORKER_RESULT_PREFIX.length)
        ) as WorkerResult;
        if (typeof pid !== 'number' || result.pid !== pid) {
          throw new Error(
            `worker PID mismatch: spawned ${String(pid)}, reported ${String(
              result.pid
            )}`
          );
        }
        if (result.arm !== config.arm) {
          throw new Error(
            `worker arm mismatch: expected ${config.arm}, reported ${result.arm}`
          );
        }
        if (result.status === 'ok' && code !== 0) {
          throw new Error(`successful worker exited with code ${String(code)}`);
        }
        resolve({ pid, result });
      } catch (error) {
        reject(
          new Error(
            `invalid result from benchmark worker ${String(pid)}: ${String(
              error instanceof Error ? error.message : error
            )}`
          )
        );
      }
    });
  });
