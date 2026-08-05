import {
  getGraphileGovernorCounters,
  reopenGraphileBuildCoordinator,
  runGraphileBuild
} from '../middleware/graphile-build-governor';
import {
  GRAPHILE_CACHE_SHUTDOWN_DRAIN_TIMEOUT_CODE,
  GraphileCacheShutdownError,
  Server
} from '../server';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
};

const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('process-wide Graphile cache lifecycle', () => {
  const previousShutdownTimeout = process.env.GRAPHILE_BUILD_SHUTDOWN_TIMEOUT_MS;

  afterEach(() => {
    if (previousShutdownTimeout === undefined) {
      delete process.env.GRAPHILE_BUILD_SHUTDOWN_TIMEOUT_MS;
    } else {
      process.env.GRAPHILE_BUILD_SHUTDOWN_TIMEOUT_MS = previousShutdownTimeout;
    }
    jest.useRealTimers();
  });

  it('drains an admitted build before a direct process-wide cache clear', async () => {
    const gate = deferred<string>();
    const build = runGraphileBuild(() => gate.promise);
    await settle();

    let closeSettled = false;
    const close = Server.closeCaches().then(() => {
      closeSettled = true;
    });
    await settle();

    expect(closeSettled).toBe(false);
    expect(getGraphileGovernorCounters().activeBuilds).toBe(1);

    gate.resolve('built');
    await expect(build).resolves.toBe('built');
    await expect(close).resolves.toBeUndefined();
    expect(closeSettled).toBe(true);
    await expect(runGraphileBuild(async () => 'reopened')).resolves.toBe('reopened');
  });

  it('also drains when caches are requested after an ordinary Server close', async () => {
    const gate = deferred<string>();
    const build = runGraphileBuild(() => gate.promise);
    await settle();
    const server = Object.create(Server.prototype) as Server;
    Object.assign(server, { closed: true });

    let closeSettled = false;
    const close = server.close({ closeCaches: true }).then(() => {
      closeSettled = true;
    });
    await settle();
    expect(closeSettled).toBe(false);

    gate.resolve('built');
    await build;
    await close;
    expect(closeSettled).toBe(true);
    await expect(runGraphileBuild(async () => 'reopened')).resolves.toBe('reopened');
  });

  it('leaves caches intact and admission closed when a build cannot drain', async () => {
    jest.useFakeTimers();
    process.env.GRAPHILE_BUILD_SHUTDOWN_TIMEOUT_MS = '10';
    const gate = deferred<string>();
    const build = runGraphileBuild(() => gate.promise);
    await settle();

    const closeFailure = expect(Server.closeCaches()).rejects.toMatchObject({
      code: GRAPHILE_CACHE_SHUTDOWN_DRAIN_TIMEOUT_CODE
    } satisfies Partial<GraphileCacheShutdownError>);
    await settle();
    await jest.advanceTimersByTimeAsync(10);
    await closeFailure;

    gate.resolve('late completion');
    await expect(build).resolves.toBe('late completion');
    expect(reopenGraphileBuildCoordinator()).toBe(true);
    await expect(runGraphileBuild(async () => 'recovered')).resolves.toBe('recovered');
  });
});
