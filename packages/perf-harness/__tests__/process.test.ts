import childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { PassThrough } from 'node:stream';

import {
  DEFAULT_WORKER_TIMEOUT_MS,
  parseWorkerProcessArgs,
  runWorkerProcess,
  validateWorkerTimeoutMs,
  WorkerCleanupError,
} from '../src/process';

describe('worker CLI protocol', () => {
  const encodedConfig = Buffer.from(
    JSON.stringify({ caseName: 'baseline', workerConfig: { value: 1 } })
  ).toString('base64url');

  test('parses the database URL and worker envelope from CLI arguments', () => {
    expect(
      parseWorkerProcessArgs([
        '--database-url',
        'postgres:///benchmark',
        '--worker-config',
        encodedConfig,
      ])
    ).toEqual({
      databaseUrl: 'postgres:///benchmark',
      envelope: { caseName: 'baseline', workerConfig: { value: 1 } },
    });
  });

  test('rejects missing, duplicate, and unsupported worker arguments', () => {
    expect(() =>
      parseWorkerProcessArgs(['--worker-config', encodedConfig])
    ).toThrow('--database-url is required');
    expect(() =>
      parseWorkerProcessArgs(['--database-url', 'postgres:///benchmark'])
    ).toThrow('--worker-config is required');
    expect(() =>
      parseWorkerProcessArgs([
        '--database-url',
        'postgres:///one',
        '--database-url',
        'postgres:///two',
        '--worker-config',
        encodedConfig,
      ])
    ).toThrow('--database-url may only be specified once');
    expect(() =>
      parseWorkerProcessArgs([
        '--database-url',
        'postgres:///benchmark',
        '--worker-config',
        encodedConfig,
        '--unexpected',
        'value',
      ])
    ).toThrow("unsupported worker argument '--unexpected'");
  });
});

describe('fresh worker process', () => {
  test('uses distinct PIDs and does not expose the database URL', async () => {
    const worker = resolve(__dirname, 'fixtures/fake-worker.js');
    const definition = {
      name: 'baseline',
      workerConfig: { value: 1, schemaHash: 'same' },
    };
    const databaseUrl = 'postgres://secret@example.test/database';
    const first = await runWorkerProcess(worker, databaseUrl, definition);
    const second = await runWorkerProcess(worker, databaseUrl, definition);
    expect(first.pid).not.toBe(process.pid);
    expect(second.pid).not.toBe(process.pid);
    expect(first.pid).not.toBe(second.pid);
    expect(JSON.stringify([first.result, second.result])).not.toContain(
      databaseUrl
    );
  });

  test.each(['hang', 'result-then-hang'])(
    'reaps a %s worker before rejecting and redacts its diagnostics',
    async (mode) => {
      const directory = await mkdtemp(resolve(tmpdir(), 'cperf-timeout-'));
      const pidFile = resolve(directory, 'worker.pid');
      const spawn = jest.spyOn(childProcess, 'spawn');
      const databaseUrl = 'postgres://secret@example.test/database';
      const running = runWorkerProcess(
        resolve(__dirname, 'fixtures/fake-worker.js'),
        databaseUrl,
        { name: mode, workerConfig: { mode, pidFile, value: 1 } },
        2_000
      );
      const child = spawn.mock.results[0].value as childProcess.ChildProcess;
      let closed = false;
      child.once('close', () => {
        closed = true;
      });
      // Keep a regression in timeout handling from orphaning the test child.
      const watchdog = setTimeout(() => child.kill('SIGKILL'), 5_000);
      try {
        const error = await running.catch((failure: Error) => failure);
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('timed out after 2000ms');
        expect((error as Error).stack).not.toContain(databaseUrl);
        expect(closed).toBe(true);
        expect(Number(await readFile(pidFile, 'utf8'))).toBe(child.pid);
      } finally {
        clearTimeout(watchdog);
        spawn.mockRestore();
        await rm(directory, { recursive: true, force: true });
      }
    },
    10_000
  );
});

describe('worker deadline lifecycle', () => {
  const definition = { name: 'baseline', workerConfig: {} };
  const databaseUrl = 'postgres://secret@example.test/database';
  let child: EventEmitter & {
    pid: number | undefined;
    stdout: PassThrough;
    stderr: PassThrough;
    kill: jest.Mock;
    unref: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    child = Object.assign(new EventEmitter(), {
      pid: 12345,
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      kill: jest.fn(() => true),
      unref: jest.fn(),
    });
    jest
      .spyOn(childProcess, 'spawn')
      .mockReturnValue(
        child as unknown as ReturnType<typeof childProcess.spawn>
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const writeSuccess = (): void => {
    child.stdout.write(
      `CPERF_RESULT ${JSON.stringify({
        status: 'ok',
        pid: child.pid,
        caseName: definition.name,
      })}\n`
    );
  };

  test('clears its deadline on normal close', async () => {
    const running = runWorkerProcess('worker.js', databaseUrl, definition, 100);
    writeSuccess();
    jest.advanceTimersByTime(99);
    child.emit('close', 0, null);
    await expect(running).resolves.toMatchObject({ pid: child.pid });
    jest.advanceTimersByTime(10_000);
    expect(child.kill).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('keeps a timeout latched until close, even after a success result', async () => {
    const running = runWorkerProcess('worker.js', databaseUrl, definition, 100);
    writeSuccess();
    let settled = false;
    const observed = running.catch((error: Error) => {
      settled = true;
      return error;
    });
    jest.advanceTimersByTime(100);
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    await Promise.resolve();
    expect(settled).toBe(false);
    child.emit('close', 0, null);
    expect(((await observed) as Error).message).toContain('timed out');
    expect(jest.getTimerCount()).toBe(0);
  });

  test('rejects spawn failure without waiting for the deadline', async () => {
    child.pid = undefined;
    const running = runWorkerProcess('worker.js', databaseUrl, definition, 100);
    child.emit('error', new Error(`cannot spawn ${databaseUrl}`));
    await expect(running).rejects.toThrow('could not start');
    expect(child.kill).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    expect(() => child.emit('error', new Error('late error'))).not.toThrow();
  });

  test('redacts synchronous spawn failures', async () => {
    jest.mocked(childProcess.spawn).mockImplementationOnce(() => {
      throw new Error(databaseUrl);
    });
    const error = await runWorkerProcess(
      'worker.js',
      databaseUrl,
      definition
    ).catch((failure: Error) => failure);
    expect((error as Error).message).toContain('could not start');
    expect((error as Error).stack).not.toContain(databaseUrl);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('reaps a worker after a post-spawn error before rejecting', async () => {
    const running = runWorkerProcess('worker.js', databaseUrl, definition, 100);
    let settled = false;
    const observed = running.catch((error: Error) => {
      settled = true;
      return error;
    });
    child.emit('error', new Error(`stream failed: ${databaseUrl}`));
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(child.kill).toHaveBeenCalledTimes(1);
    child.emit('close', 1, null);
    expect(((await observed) as Error).message).not.toContain(databaseUrl);
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each(['false', 'throw', 'no-close'])(
    'bounds cleanup when kill produces %s and tolerates late events',
    async (outcome) => {
      if (outcome === 'false') child.kill.mockReturnValue(false);
      if (outcome === 'throw')
        child.kill.mockImplementation(() => {
          throw new Error(`cannot kill ${databaseUrl}`);
        });
      const running = runWorkerProcess(
        'worker.js',
        databaseUrl,
        definition,
        100
      );
      const observed = running.catch((error: Error) => error);
      child.stderr.write(databaseUrl);
      jest.advanceTimersByTime(100);
      expect(child.stdout.destroyed).toBe(false);
      jest.advanceTimersByTime(5_000);
      const error = (await observed) as Error;
      expect(error).toBeInstanceOf(WorkerCleanupError);
      expect(error.message).toContain('cleanup was not confirmed');
      expect(error.stack).not.toContain(databaseUrl);
      expect(child.stdout.destroyed).toBe(true);
      expect(child.stderr.destroyed).toBe(true);
      expect(child.unref).toHaveBeenCalledTimes(1);
      expect(() => {
        child.emit('close', 0, null);
        child.emit('error', new Error('late child error'));
        child.stdout.emit('error', new Error('late stream error'));
      }).not.toThrow();
      jest.runAllTicks();
      expect(jest.getTimerCount()).toBe(0);
    }
  );

  test.each([0, -1, 1.5, NaN, Infinity, 2_147_483_648, null])(
    'rejects invalid timeout %s before spawning',
    async (timeout) => {
      await expect(
        runWorkerProcess('worker.js', databaseUrl, definition, timeout)
      ).rejects.toThrow('workerTimeoutMs');
      expect(childProcess.spawn).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    }
  );

  test('normalizes the default timeout', () => {
    expect(validateWorkerTimeoutMs()).toBe(DEFAULT_WORKER_TIMEOUT_MS);
  });
});
