import childProcess from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import * as workerProcess from '../src/process';
import { cliMain, runBenchmarkSuite } from '../src/run';
import type { BenchmarkReport } from '../src/types';

describe('generic suite runner', () => {
  test('redacts errors returned by custom workers before recording them', async () => {
    const databaseUrl = 'postgres://secret@example.test/database';
    const run = jest
      .spyOn(workerProcess, 'runWorkerProcess')
      .mockResolvedValue({
        pid: 12345,
        result: {
          status: 'error',
          pid: 12345,
          caseName: 'broken',
          error: `could not connect to ${databaseUrl}; retrying ${databaseUrl}`,
        },
      });
    try {
      const report = await runBenchmarkSuite(
        {
          name: 'custom-worker-error',
          cases: [{ name: 'broken', workerConfig: {} }],
        },
        { databaseUrl, repetitions: 1, seed: 1, order: null },
        'custom-worker.js'
      );
      expect(report.runs[0].result).toMatchObject({
        status: 'error',
        error:
          'could not connect to <redacted database URL>; retrying <redacted database URL>',
      });
      expect(report.validation.allRunsSucceeded).toBe(false);
      expect(report.summaries).toEqual({});
      expect(JSON.stringify(report)).not.toContain(databaseUrl);
    } finally {
      run.mockRestore();
    }
  });

  test('requires the database URL as an explicit CLI argument', async () => {
    await expect(
      cliMain(['prepare', '--schema', 'cperf_explicit_cli'])
    ).rejects.toThrow('--database-url is required');
  });

  test('validates fresh processes and schema groups without fixed case names', async () => {
    const report = await runBenchmarkSuite(
      {
        name: 'test-suite',
        cases: ['alpha', 'beta', 'gamma'].map((name, index) => ({
          name,
          workerConfig: { value: index + 1, schemaHash: 'same' },
          expectedSchemaGroup: 'schema',
        })),
      },
      {
        databaseUrl: 'postgres:///not-used-by-fake-worker',
        repetitions: 1,
        seed: 1,
        order: ['alpha', 'beta', 'gamma'],
      },
      resolve(__dirname, 'fixtures/fake-worker.js')
    );
    expect(report.validation).toEqual(
      expect.objectContaining({
        allRunsSucceeded: true,
        freshProcessPerRun: true,
        caseValidationPassed: true,
        schemaGroupsEquivalent: true,
        schemaGroups: { schema: 'same' },
        errors: [],
      })
    );
    expect(new Set(report.runs.map((run) => run.result.pid)).size).toBe(3);
    expect(report.config.workerTimeoutMs).toBe(
      workerProcess.DEFAULT_WORKER_TIMEOUT_MS
    );
    expect(JSON.stringify(report)).not.toContain('postgres:///');
  });
});

describe('suite timeout reporting', () => {
  const worker = resolve(__dirname, 'fixtures/fake-worker.js');
  const options = {
    databaseUrl: 'postgres://secret@example.test/database',
    repetitions: 1,
    seed: 1,
    order: ['hung', 'healthy'],
    workerTimeoutMs: 2_000,
  };
  const suite = {
    name: 'timeout-suite',
    cases: [
      { name: 'hung', workerConfig: { mode: 'hang', value: 1 } },
      { name: 'healthy', workerConfig: { value: 2, schemaHash: 'same' } },
    ],
  };
  let watchdog: ReturnType<typeof setTimeout>;
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    const spawn = jest.spyOn(childProcess, 'spawn');
    watchdog = setTimeout(() => {
      for (const result of spawn.mock.results) {
        if (result.type === 'return') result.value.kill('SIGKILL');
      }
    }, 5_000);
  });

  afterEach(() => {
    clearTimeout(watchdog);
    process.exitCode = originalExitCode;
    jest.restoreAllMocks();
  });

  test('continues after a reaped timeout and excludes it from successful samples', async () => {
    const report = await runBenchmarkSuite(suite, options, worker);
    expect(report.config.workerTimeoutMs).toBe(2_000);
    expect(report.runs.map((run) => run.result.status)).toEqual([
      'error',
      'ok',
    ]);
    expect(report.validation.allRunsSucceeded).toBe(false);
    expect(report.validation.errors.join('\n')).toContain(
      'timed out after 2000ms'
    );
    expect(report.summaries.hung).toBeUndefined();
    expect(report.summaries.healthy.sampleCount).toBe(1);
    expect(JSON.stringify(report)).not.toContain(options.databaseUrl);
  }, 10_000);

  test('stops scheduling when cleanup cannot be confirmed, retaining a failed partial report', async () => {
    const run = jest
      .spyOn(workerProcess, 'runWorkerProcess')
      .mockRejectedValue(
        new workerProcess.WorkerCleanupError('cleanup was not confirmed', 12345)
      );
    const report = await runBenchmarkSuite(suite, options, worker);
    expect(run).toHaveBeenCalledTimes(1);
    expect(report.schedule).toHaveLength(2);
    expect(report.runs).toHaveLength(1);
    expect(report.runs[0].result).toMatchObject({
      status: 'error',
      pid: 12345,
    });
    expect(report.validation.allRunsSucceeded).toBe(false);
    expect(report.validation.errors.join('\n')).toContain(
      'cleanup was not confirmed'
    );
    expect(report.summaries).toEqual({});
  });

  test('validates suite timeout before spawning', async () => {
    await expect(
      runBenchmarkSuite(suite, { ...options, workerTimeoutMs: NaN }, worker)
    ).rejects.toThrow('workerTimeoutMs');
    expect(childProcess.spawn).not.toHaveBeenCalled();
  });

  const cliArgs = (): string[] => [
    'run',
    '--database-url',
    options.databaseUrl,
    '--cases',
    Buffer.from(JSON.stringify(suite.cases)).toString('base64url'),
    '--worker',
    worker,
    '--repetitions',
    '1',
    '--order',
    'hung,healthy',
  ];

  test('writes the timeout report and sets a failing CLI exit code', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'cperf-report-'));
    const output = resolve(directory, 'report.json');
    jest.spyOn(process.stdout, 'write').mockReturnValue(true);
    try {
      await cliMain([
        ...cliArgs(),
        '--worker-timeout-ms',
        '2000',
        '--output',
        output,
      ]);
      const report: BenchmarkReport = JSON.parse(
        await readFile(output, 'utf8')
      );
      expect(report.config.workerTimeoutMs).toBe(2_000);
      expect(report.runs.map((run) => run.result.status)).toEqual([
        'error',
        'ok',
      ]);
      expect(report.validation.allRunsSucceeded).toBe(false);
      expect(process.exitCode).toBe(1);
      expect(JSON.stringify(report)).not.toContain(options.databaseUrl);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 10_000);

  test.each(['0', '-1', '1.5', 'NaN', '2147483648'])(
    'rejects invalid CLI timeout %s',
    async (value) => {
      await expect(
        cliMain([...cliArgs(), '--worker-timeout-ms', value])
      ).rejects.toThrow('worker-timeout-ms');
      expect(childProcess.spawn).not.toHaveBeenCalled();
    }
  );
});
