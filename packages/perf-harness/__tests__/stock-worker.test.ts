import { makeSchema } from 'graphile-build';
import { buildSchema, type GraphQLSchema } from 'graphql';
import { makePgService } from 'postgraphile/adaptors/pg';

import { WORKER_RESULT_PREFIX } from '../src/process';
import { runStockWorker } from '../src/stock-worker';
import type { WorkerResult } from '../src/types';

jest.mock('graphile-build', () => ({
  defaultPreset: {},
  makeSchema: jest.fn(),
}));

jest.mock('graphile-build-pg', () => ({ defaultPreset: {} }));

jest.mock('postgraphile/adaptors/pg', () => ({
  makePgService: jest.fn(),
}));

const mockedMakeSchema = jest.mocked(makeSchema);
const mockedMakePgService = jest.mocked(makePgService);

const databaseUrl = 'postgres://secret@example.test/benchmark';
const encodedConfig = (workerConfig: unknown): string =>
  Buffer.from(JSON.stringify({ caseName: 'stock', workerConfig })).toString(
    'base64url'
  );
const workerArgs = (workerConfig: unknown): string[] => [
  '--database-url',
  databaseUrl,
  '--worker-config',
  encodedConfig(workerConfig),
];

interface MockService {
  release: jest.Mock<Promise<void>, []>;
}

const createService = (): MockService => ({
  release: jest.fn().mockResolvedValue(undefined),
});

const readResult = (write: jest.Mock): WorkerResult => {
  const output = write.mock.calls[0]?.[0];
  expect(typeof output).toBe('string');
  expect(write).toHaveBeenCalledTimes(1);
  return JSON.parse(
    (output as string).slice(WORKER_RESULT_PREFIX.length)
  ) as WorkerResult;
};

describe('stock worker lifecycle', () => {
  let originalExitCode: typeof process.exitCode;
  let originalGcDescriptor: PropertyDescriptor | undefined;
  let output: jest.Mock;
  let service: MockService;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    originalGcDescriptor = Object.getOwnPropertyDescriptor(global, 'gc');
    Object.defineProperty(global, 'gc', {
      configurable: true,
      value: jest.fn(),
      writable: true,
    });
    output = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true) as unknown as jest.Mock;
    service = createService();
    // Schema construction is mocked separately; this service stub owns only
    // the external release hook exercised by these lifecycle tests.
    mockedMakePgService.mockReturnValue(
      service as unknown as ReturnType<typeof makePgService>
    );
    mockedMakeSchema.mockResolvedValue({
      schema: buildSchema('type Query { stock: String }'),
      resolvedPreset: {},
    } as { schema: GraphQLSchema; resolvedPreset: never });
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    jest.restoreAllMocks();
    jest.clearAllMocks();
    if (originalGcDescriptor) {
      Object.defineProperty(global, 'gc', originalGcDescriptor);
    } else {
      Reflect.deleteProperty(global, 'gc');
    }
  });

  test('writes exactly once after deferred cleanup completes', async () => {
    let finishRelease: (() => void) | undefined;
    service.release.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishRelease = resolve;
        })
    );

    const running = runStockWorker(workerArgs({ schemas: ['public'] }));
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(service.release).toHaveBeenCalledTimes(1);
    expect(output).not.toHaveBeenCalled();
    finishRelease?.();
    await running;

    expect(readResult(output)).toMatchObject({
      status: 'ok',
      caseName: 'stock',
    });
  });

  test('reports one successful result after releasing the service', async () => {
    await runStockWorker(workerArgs({ schemas: ['public'] }));

    expect(service.release).toHaveBeenCalledTimes(1);
    expect(readResult(output)).toMatchObject({
      status: 'ok',
      caseName: 'stock',
      runtimeVerified: true,
    });
    expect(global.gc).toHaveBeenCalledTimes(6);
  });

  test('reports a release failure once', async () => {
    service.release.mockRejectedValue(new Error('release failed'));

    await runStockWorker(workerArgs({ schemas: ['public'] }));

    expect(readResult(output)).toMatchObject({
      status: 'error',
      error: 'release failed',
    });
    expect(process.exitCode).toBe(1);
  });

  test('reports a measurement failure after cleanup', async () => {
    mockedMakeSchema.mockRejectedValue(new Error('measurement failed'));

    await runStockWorker(workerArgs({ schemas: ['public'] }));

    expect(service.release).toHaveBeenCalledTimes(1);
    expect(readResult(output)).toMatchObject({
      status: 'error',
      error: 'measurement failed',
    });
  });

  test('keeps the primary diagnostic before a release failure', async () => {
    mockedMakeSchema.mockRejectedValue(
      new Error(`measurement failed: ${databaseUrl}`)
    );
    service.release.mockRejectedValue(
      new Error(`release failed: ${databaseUrl}`)
    );

    await runStockWorker(workerArgs({ schemas: ['public'] }));

    const result = readResult(output);
    expect(result).toMatchObject({ status: 'error' });
    expect((result as Extract<WorkerResult, { status: 'error' }>).error).toBe(
      'measurement failed: <redacted database URL>; release failed: <redacted database URL>'
    );
    expect(JSON.stringify(result)).not.toContain(databaseUrl);
  });

  test.each([
    ['undefined', undefined],
    ['null', null],
    ['false', false],
    ['zero', 0],
    ['empty string', ''],
  ])('preserves a %s thrown value', async (_name, failure) => {
    mockedMakeSchema.mockImplementation(async () => {
      throw failure;
    });

    await runStockWorker(workerArgs({ schemas: ['public'] }));

    const result = readResult(output);
    expect(result.status).toBe('error');
    expect((result as Extract<WorkerResult, { status: 'error' }>).error).toBe(
      String(failure)
    );
  });

  test('does not call hostile object toString or leak it', async () => {
    const hostile = {
      get toString(): never {
        throw new Error(databaseUrl);
      },
    };
    mockedMakeSchema.mockImplementation(async () => {
      throw hostile;
    });

    await expect(
      runStockWorker(workerArgs({ schemas: ['public'] }))
    ).resolves.toBeUndefined();

    const result = readResult(output);
    expect(result).toMatchObject({ status: 'error', error: 'unknown error' });
    expect(JSON.stringify(result)).not.toContain(databaseUrl);
  });

  test('handles an Error with a throwing message getter', async () => {
    const hostile = Object.create(Error.prototype) as Error;
    Object.defineProperty(hostile, 'message', {
      configurable: true,
      get: () => {
        throw new Error(databaseUrl);
      },
    });
    mockedMakeSchema.mockImplementation(async () => {
      throw hostile;
    });

    await runStockWorker(workerArgs({ schemas: ['public'] }));

    expect(readResult(output)).toMatchObject({
      status: 'error',
      error: 'unknown error',
    });
    expect(output.mock.calls.join(' ')).not.toContain(databaseUrl);
  });

  test('preserves a falsy cleanup rejection', async () => {
    service.release.mockRejectedValue(false);

    await runStockWorker(workerArgs({ schemas: ['public'] }));

    expect(readResult(output)).toMatchObject({
      status: 'error',
      error: 'false',
    });
  });

  test('redacts the full database URL in both failure diagnostics', async () => {
    mockedMakeSchema.mockRejectedValue(
      new Error(`could not connect to ${databaseUrl}`)
    );
    service.release.mockRejectedValue(
      new Error(`could not release ${databaseUrl}`)
    );

    await runStockWorker(workerArgs({ schemas: ['public'] }));

    const result = readResult(output);
    expect(result).toMatchObject({
      status: 'error',
      error:
        'could not connect to <redacted database URL>; could not release <redacted database URL>',
    });
    expect(JSON.stringify(result)).not.toContain(databaseUrl);
  });

  test('validates config before allocating a service', async () => {
    await runStockWorker(workerArgs({ schemas: [] }));

    expect(mockedMakePgService).not.toHaveBeenCalled();
    expect(output).toHaveBeenCalledTimes(1);
    expect(readResult(output)).toMatchObject({
      status: 'error',
      error: 'stock worker requires a non-empty schemas array',
    });
  });
});
