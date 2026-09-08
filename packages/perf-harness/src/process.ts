import { spawn } from 'node:child_process';

import type {
  BenchmarkCaseDefinition,
  WorkerConfigEnvelope,
  WorkerResult,
} from './types';

export const WORKER_RESULT_PREFIX = 'CPERF_RESULT ';
export const DATABASE_URL_ARGUMENT = 'database-url';
export const WORKER_CONFIG_ARGUMENT = 'worker-config';
export const DEFAULT_WORKER_TIMEOUT_MS = 300_000;
export const MAX_WORKER_TIMEOUT_MS = 2_147_483_647;
const WORKER_CLEANUP_TIMEOUT_MS = 5_000;

export const validateWorkerTimeoutMs = (
  value = DEFAULT_WORKER_TIMEOUT_MS
): number => {
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > MAX_WORKER_TIMEOUT_MS
  ) {
    throw new Error(
      `workerTimeoutMs must be an integer between 1 and ${MAX_WORKER_TIMEOUT_MS}`
    );
  }
  return value;
};

/** The suite must stop: another measurement could overlap this worker. */
export class WorkerCleanupError extends Error {
  constructor(
    message: string,
    readonly pid: number | undefined
  ) {
    super(message);
    this.name = 'WorkerCleanupError';
  }
}

export interface ParsedValueArgs {
  values: Map<string, string>;
}

export interface WorkerProcessArgs {
  databaseUrl: string;
  envelope: WorkerConfigEnvelope;
}

export interface SpawnedWorkerResult {
  pid: number;
  result: WorkerResult;
}

const lastLines = (value: string, count = 20): string =>
  value.trim().split('\n').slice(-count).join('\n');

export const redactSecret = (value: string, secret: string): string =>
  secret ? value.replaceAll(secret, '<redacted database URL>') : value;

export const parseValueArgs = (args: readonly string[]): ParsedValueArgs => {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (
      !flag?.startsWith('--') ||
      value === undefined ||
      value.startsWith('--')
    ) {
      throw new Error(`expected --name value near '${flag ?? '<end>'}'`);
    }
    const name = flag.slice(2);
    if (values.has(name))
      throw new Error(`--${name} may only be specified once`);
    values.set(name, value);
  }
  return { values };
};

export const parseWorkerProcessArgs = (
  args: readonly string[]
): WorkerProcessArgs => {
  const parsed = parseValueArgs(args);
  for (const name of parsed.values.keys()) {
    if (name !== DATABASE_URL_ARGUMENT && name !== WORKER_CONFIG_ARGUMENT) {
      throw new Error(`unsupported worker argument '--${name}'`);
    }
  }
  const databaseUrl = parsed.values.get(DATABASE_URL_ARGUMENT);
  if (!databaseUrl) throw new Error('--database-url is required');
  return {
    databaseUrl,
    envelope: parseWorkerEnvelope(parsed.values.get(WORKER_CONFIG_ARGUMENT)),
  };
};

export const runWorkerProcess = (
  workerPath: string,
  databaseUrl: string,
  definition: BenchmarkCaseDefinition,
  timeoutMs = DEFAULT_WORKER_TIMEOUT_MS
): Promise<SpawnedWorkerResult> =>
  new Promise((resolve, reject) => {
    validateWorkerTimeoutMs(timeoutMs);
    const config: WorkerConfigEnvelope = {
      caseName: definition.name,
      workerConfig: definition.workerConfig,
    };
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(
        process.execPath,
        [
          '--expose-gc',
          workerPath,
          `--${DATABASE_URL_ARGUMENT}`,
          databaseUrl,
          `--${WORKER_CONFIG_ARGUMENT}`,
          Buffer.from(JSON.stringify(config)).toString('base64url'),
        ],
        {
          env: {
            ...process.env,
            NODE_ENV: 'production',
            GRAPHILE_ENV: 'production',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );
    } catch (error) {
      reject(
        new Error(
          redactSecret(
            `benchmark worker could not start: ${String(
              error instanceof Error ? error.message : error
            )}`,
            databaseUrl
          )
        )
      );
      return;
    }
    const pid = child.pid;
    let stdout = '';
    let stderr = '';
    let settled = false;
    let failure: string | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let cleanupDeadline: ReturnType<typeof setTimeout> | undefined;
    const diagnostics: string[] = [];
    const ignoreLateError = (): undefined => undefined;
    const onStdout = (chunk: string): void => {
      stdout += chunk;
    };
    const onStderr = (chunk: string): void => {
      stderr += chunk;
    };
    const failureMessage = (reason: string): string =>
      redactSecret(
        `benchmark worker ${pid ?? 'unknown'} (${definition.name}) ${reason}` +
          (diagnostics.length ? `\n${diagnostics.join('\n')}` : '') +
          (stderr.trim() ? `\n${lastLines(stderr)}` : ''),
        databaseUrl
      );
    const finish = (error?: Error, result?: SpawnedWorkerResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      clearTimeout(cleanupDeadline);
      child.removeListener('close', onClose);
      child.removeListener('error', onError);
      child.on('error', ignoreLateError);
      child.stdout.removeListener('data', onStdout);
      child.stderr.removeListener('data', onStderr);
      for (const stream of [child.stdout, child.stderr]) {
        stream.removeListener('error', onError);
        stream.on('error', ignoreLateError);
      }
      if (error) reject(error);
      else resolve(result!);
    };
    const terminate = (reason: string): void => {
      if (settled || failure !== undefined) return;
      failure = reason;
      clearTimeout(deadline);
      cleanupDeadline = setTimeout(() => {
        finish(
          new WorkerCleanupError(
            failureMessage(
              `${failure}; cleanup was not confirmed within ${WORKER_CLEANUP_TIMEOUT_MS}ms`
            ),
            pid
          )
        );
        // The suite stops on this error. Release our handles even if the OS
        // cannot reap the worker, so the CLI can write its failed report.
        child.stdout.destroy();
        child.stderr.destroy();
        child.unref();
      }, WORKER_CLEANUP_TIMEOUT_MS);
      try {
        if (!child.kill('SIGKILL'))
          diagnostics.push('SIGKILL could not be sent');
      } catch (error) {
        diagnostics.push(
          redactSecret(
            `SIGKILL failed: ${String(error instanceof Error ? error.message : error)}`,
            databaseUrl
          )
        );
      }
    };
    const onError = (error: Error): void => {
      if (settled) return;
      const detail = redactSecret(error.message, databaseUrl);
      if (typeof pid !== 'number') {
        finish(new Error(failureMessage(`could not start: ${detail}`)));
        return;
      }
      diagnostics.push(detail);
      terminate('failed before its process and stdio closed');
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    const onClose = (code: number | null, signal: string | null): void => {
      if (settled) return;
      if (failure !== undefined) {
        finish(new Error(failureMessage(failure)));
        return;
      }
      const resultLine = stdout
        .split('\n')
        .reverse()
        .find((line) => line.startsWith(WORKER_RESULT_PREFIX));
      if (!resultLine) {
        finish(
          new Error(
            redactSecret(
              `benchmark worker ${pid ?? 'unknown'} exited without a result ` +
                `(code=${String(code)}, signal=${String(signal)})` +
                (stderr.trim() ? `\n${lastLines(stderr)}` : ''),
              databaseUrl
            )
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
        if (result.caseName !== definition.name) {
          throw new Error(
            `worker case mismatch: expected ${definition.name}, reported ${result.caseName}`
          );
        }
        if (result.status === 'ok' && code !== 0) {
          throw new Error(`successful worker exited with code ${String(code)}`);
        }
        finish(undefined, { pid, result });
      } catch (error) {
        finish(
          new Error(
            redactSecret(
              `invalid result from benchmark worker ${String(pid)}: ${String(
                error instanceof Error ? error.message : error
              )}`,
              databaseUrl
            )
          )
        );
      }
    };
    child.stdout.on('data', onStdout);
    child.stderr.on('data', onStderr);
    child.stdout.on('error', onError);
    child.stderr.on('error', onError);
    child.on('error', onError);
    child.once('close', onClose);
    deadline = setTimeout(() => {
      terminate(`timed out after ${timeoutMs}ms`);
    }, timeoutMs);
  });

export const parseWorkerEnvelope = (
  encoded: string | undefined
): WorkerConfigEnvelope => {
  if (!encoded) throw new Error('--worker-config is required');
  const parsed = JSON.parse(
    Buffer.from(encoded, 'base64url').toString('utf8')
  ) as Partial<WorkerConfigEnvelope>;
  if (
    typeof parsed.caseName !== 'string' ||
    parsed.caseName.length === 0 ||
    parsed.workerConfig === undefined
  ) {
    throw new Error('worker configuration envelope is invalid');
  }
  return parsed as WorkerConfigEnvelope;
};

export const writeWorkerResult = (result: WorkerResult): void => {
  process.stdout.write(`${WORKER_RESULT_PREFIX}${JSON.stringify(result)}\n`);
};
