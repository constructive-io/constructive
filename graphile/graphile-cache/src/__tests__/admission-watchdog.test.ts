import {
  clearGraphileCache,
  closeGraphileBuilds,
  configureGraphileAdmission,
  configureGraphileBuilds,
  getCacheStats,
  getGraphileBuildStats,
  graphileBuildFlights,
  type GraphileCacheEntry
} from '../graphile-cache';

const metadata = (cacheKey: string) => ({ cacheKey, serviceKey: cacheKey, poolKey: 'pool' });
const entry = (cacheKey: string, release: () => Promise<void>): GraphileCacheEntry => ({
  cacheKey, createdAt: Date.now(), pgl: { release }, serv: {}, handler: {}, httpServer: { listening: false }
} as unknown as GraphileCacheEntry);

it('bounds and watches an eviction wait before a new factory can allocate', async () => {
  jest.useFakeTimers();
  configureGraphileAdmission({ max: 1, buildReserveBytes: 0 });
  configureGraphileBuilds({ queueMax: 1, watchdogMs: 10 });
  let finishRelease!: () => void;
  let releaseStarted!: () => void;
  const releasing = new Promise<void>((resolve) => { releaseStarted = resolve; });
  const release = new Promise<void>((resolve) => { finishRelease = resolve; });
  const resident = entry('resident', async () => { releaseStarted(); await release; });
  const create = jest.fn(async () => entry('replacement', async (): Promise<void> => undefined));
  const queuedCreate = jest.fn(async () => entry('queued', async (): Promise<void> => undefined));
  try {
    await graphileBuildFlights.getOrCreate(metadata('resident'), async () => resident);
    const replacing = graphileBuildFlights.getOrCreate(metadata('replacement'), create);
    const replacementFailure = expect(replacing).rejects.toMatchObject({ code: 'SCHEMA_BUILD_STUCK' });
    await releasing;
    const queued = graphileBuildFlights.getOrCreate(metadata('queued'), queuedCreate);
    const queueFailure = expect(queued).rejects.toMatchObject({ code: 'SCHEMA_BUILD_STUCK' });
    const overflow = jest.fn();
    await expect(graphileBuildFlights.getOrCreate(metadata('overflow'), overflow))
      .rejects.toMatchObject({ code: 'SCHEMA_BUILD_QUEUE_FULL' });
    expect(getGraphileBuildStats()).toMatchObject({ active: 1, queued: 1 });
    expect(getCacheStats()).toMatchObject({ reserved: 0, size: 0, disposing: 1 });
    expect(create).not.toHaveBeenCalled();
    expect(overflow).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(10);
    await Promise.all([replacementFailure, queueFailure]);
    expect(getGraphileBuildStats()).toMatchObject({ active: 1, queued: 0, state: 'stuck' });
    finishRelease();
    expect(await closeGraphileBuilds(100)).toBe(true);
    expect(create).not.toHaveBeenCalled();
    expect(queuedCreate).not.toHaveBeenCalled();
    expect(getCacheStats()).toMatchObject({ reserved: 0, disposing: 0, size: 0 });
  } finally {
    finishRelease();
    await clearGraphileCache();
    jest.useRealTimers();
  }
});
