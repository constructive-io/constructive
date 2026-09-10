import { makeSchema } from 'graphile-build';
import { buildSchema, type GraphQLSchema } from 'graphql';
import { makePgService } from 'postgraphile/adaptors/pg';
import { execute } from 'postgraphile/grafast';

import { WORKER_RESULT_PREFIX } from '../src/process';
import { runScopedIntrospectionWorker as runWorker } from '../src/scoped-introspection-worker';
import type { WorkerResult } from '../src/types';

jest.mock('graphile-build', () => ({
  defaultPreset: {},
  makeSchema: jest.fn(),
}));

jest.mock('graphile-build-pg', () => ({ defaultPreset: {} }));
jest.mock('graphile-scoped-introspection', () => ({
  ScopedIntrospectionPreset: { plugins: [] },
}));
jest.mock('postgraphile/@dataplan/pg', () => ({
  withPgClientFromPgService: jest.fn(),
}));
jest.mock('postgraphile/grafast', () => ({ execute: jest.fn() }));

jest.mock('postgraphile/adaptors/pg', () => ({
  makePgService: jest.fn(),
}));

const loadScopedPreset = jest.fn(async () => ({ plugins: [] }));
const runScopedIntrospectionWorker = (args: readonly string[]) =>
  runWorker(args, loadScopedPreset);

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

describe('scoped comparison worker lifecycle', () => {
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
    jest.mocked(execute).mockResolvedValue({ data: { __typename: 'Query' } });
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

    const running = runScopedIntrospectionWorker(
      workerArgs({ mode: 'stock', schemas: ['public'] })
    );
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
    await runScopedIntrospectionWorker(
      workerArgs({ mode: 'stock', schemas: ['public'] })
    );

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

    await runScopedIntrospectionWorker(
      workerArgs({ mode: 'stock', schemas: ['public'] })
    );

    expect(readResult(output)).toMatchObject({
      status: 'error',
      error: 'release failed',
    });
    expect(process.exitCode).toBe(1);
  });

  test('reports a measurement failure after cleanup', async () => {
    mockedMakeSchema.mockRejectedValue(new Error('measurement failed'));

    await runScopedIntrospectionWorker(
      workerArgs({ mode: 'stock', schemas: ['public'] })
    );

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

    await runScopedIntrospectionWorker(
      workerArgs({ mode: 'stock', schemas: ['public'] })
    );

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

    await runScopedIntrospectionWorker(
      workerArgs({ mode: 'stock', schemas: ['public'] })
    );

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
      runScopedIntrospectionWorker(
        workerArgs({ mode: 'stock', schemas: ['public'] })
      )
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

    await runScopedIntrospectionWorker(
      workerArgs({ mode: 'stock', schemas: ['public'] })
    );

    expect(readResult(output)).toMatchObject({
      status: 'error',
      error: 'unknown error',
    });
    expect(output.mock.calls.join(' ')).not.toContain(databaseUrl);
  });

  test('preserves a falsy cleanup rejection', async () => {
    service.release.mockRejectedValue(false);

    await runScopedIntrospectionWorker(
      workerArgs({ mode: 'stock', schemas: ['public'] })
    );

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

    await runScopedIntrospectionWorker(
      workerArgs({ mode: 'stock', schemas: ['public'] })
    );

    const result = readResult(output);
    expect(result).toMatchObject({
      status: 'error',
      error:
        'could not connect to <redacted database URL>; could not release <redacted database URL>',
    });
    expect(JSON.stringify(result)).not.toContain(databaseUrl);
  });

  test('validates config before allocating a service', async () => {
    await runScopedIntrospectionWorker(
      workerArgs({ mode: 'stock', schemas: [] })
    );

    expect(mockedMakePgService).not.toHaveBeenCalled();
    expect(output).toHaveBeenCalledTimes(1);
    expect(readResult(output)).toMatchObject({
      status: 'error',
      error: 'scoped introspection worker requires a non-empty schemas array',
    });
  });
  test('enables scoped defaults only through the named gather configuration', async () => {
    await runScopedIntrospectionWorker(
      workerArgs({ mode: 'scoped', schemas: ['public'] })
    );
    expect(mockedMakePgService).toHaveBeenCalledWith({
      name: 'main',
      connectionString: databaseUrl,
      schemas: ['public'],
      pubsub: false,
    });
    expect(mockedMakeSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        gather: { pgScopedIntrospection: { main: true } },
      })
    );
    expect(readResult(output).status).toBe('ok');
  });

  test('stock does not enable the scoped gather option', async () => {
    await runScopedIntrospectionWorker(
      workerArgs({ mode: 'stock', schemas: ['public'] })
    );
    expect(mockedMakeSchema.mock.calls[0][0]).not.toHaveProperty('gather');
    expect(loadScopedPreset).not.toHaveBeenCalled();
  });

  test('rejects incorrect data from the configured runtime query', async () => {
    jest.mocked(execute).mockResolvedValue({ data: { account: null } });
    await runScopedIntrospectionWorker(
      workerArgs({
        mode: 'scoped',
        schemas: ['public'],
        runtimeCheck: {
          query: '{ account { id } }',
          expectedData: { account: { id: '1' } },
        },
      })
    );
    expect(readResult(output)).toMatchObject({ status: 'error' });
    expect(service.release).toHaveBeenCalledTimes(1);
  });
});
