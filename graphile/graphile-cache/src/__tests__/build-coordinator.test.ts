import { GraphileBuildCoordinator, type GraphileBuildLease } from '../build-coordinator';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
};

describe('global build coordination', () => {
  afterEach(() => jest.useRealTimers());

  it('serializes actual builds in FIFO order and refuses overflow without starting work', async () => {
    const gate = deferred();
    const coordinator = new GraphileBuildCoordinator({ queueMax: 1 });
    const events: string[] = [];
    const first = coordinator.run(async () => { events.push('first'); await gate.promise; });
    const second = coordinator.run(async () => { events.push('second'); });
    const overflow = jest.fn();
    await expect(coordinator.run(overflow)).rejects.toMatchObject({ code: 'SCHEMA_BUILD_QUEUE_FULL' });
    expect(events).toEqual(['first']);
    expect(overflow).not.toHaveBeenCalled();
    gate.resolve();
    await Promise.all([first, second]);
    expect(events).toEqual(['first', 'second']);
    expect(await coordinator.closeAndDrain()).toBe(true);
  });

  it('latches watchdog failure, fences publication, and holds the permit through late cleanup', async () => {
    jest.useFakeTimers();
    const build = deferred();
    const cleanup = deferred();
    const coordinator = new GraphileBuildCoordinator({ watchdogMs: 10 });
    let lease!: GraphileBuildLease;
    const first = coordinator.run(async (token) => {
      lease = token;
      await build.promise;
      try { token.assertCurrent(); }
      finally { await cleanup.promise; }
    });
    const queuedFactory = jest.fn();
    const second = coordinator.run(queuedFactory);
    const firstFailure = expect(first).rejects.toMatchObject({ code: 'SCHEMA_BUILD_STUCK' });
    const secondFailure = expect(second).rejects.toMatchObject({ code: 'SCHEMA_BUILD_STUCK' });
    await jest.advanceTimersByTimeAsync(10);
    await Promise.all([firstFailure, secondFailure]);
    expect(() => lease.assertCurrent()).toThrow();
    expect(queuedFactory).not.toHaveBeenCalled();
    build.resolve();
    await Promise.resolve();
    expect(coordinator.stats).toMatchObject({ active: 1, queued: 0, state: 'stuck' });
    const drain = coordinator.closeAndDrain(100);
    await jest.advanceTimersByTimeAsync(100);
    expect(await drain).toBe(false);
    expect(coordinator.reopen()).toBe(false);
    cleanup.resolve();
    await jest.advanceTimersByTimeAsync(0);
    expect(coordinator.stats.active).toBe(0);
    expect(coordinator.reopen()).toBe(false);
    await expect(coordinator.run(async (): Promise<void> => undefined)).rejects.toMatchObject({ code: 'SCHEMA_BUILD_STUCK' });
  });

  it('close promptly rejects callers while drain waits for actual work and cleanup', async () => {
    const build = deferred();
    const cleanup = deferred();
    const coordinator = new GraphileBuildCoordinator();
    const first = coordinator.run(async (lease) => {
      await build.promise;
      try { lease.assertCurrent(); }
      finally { await cleanup.promise; }
    });
    const queued = coordinator.run(jest.fn());
    const rejected = [first, queued].map((pending) => expect(pending).rejects.toMatchObject({ code: 'SCHEMA_BUILDS_CLOSED' }));
    await Promise.resolve();
    let drained = false;
    const drain = coordinator.closeAndDrain().then((result) => { drained = result; return result; });
    await Promise.all(rejected);
    build.resolve();
    await Promise.resolve();
    expect(drained).toBe(false);
    expect(coordinator.reopen()).toBe(false);
    cleanup.resolve();
    expect(await drain).toBe(true);
    expect(coordinator.reopen()).toBe(true);
    expect(await coordinator.run(async () => 'ready')).toBe('ready');
    await coordinator.closeAndDrain();
  });

  it('releases the permit after a normal failure without poisoning future builds', async () => {
    const coordinator = new GraphileBuildCoordinator();
    const error = new Error('schema failed');
    await expect(coordinator.run(async () => { throw error; })).rejects.toBe(error);
    expect(await coordinator.run(async () => 42)).toBe(42);
    await coordinator.closeAndDrain();
  });
  it('applies one drain deadline to owned work and flights not yet admitted', async () => {
    jest.useFakeTimers();
    const lateFlight = deferred();
    const coordinator = new GraphileBuildCoordinator();
    const closing = coordinator.closeAndDrain(20, lateFlight.promise);
    await jest.advanceTimersByTimeAsync(20);
    expect(await closing).toBe(false);
    expect(coordinator.stats.state).toBe('stuck');
    lateFlight.resolve();
    expect(await coordinator.closeAndDrain(20)).toBe(true);
    expect(coordinator.reopen()).toBe(false);
  });

  it('validates timer range and combines owners without changing an active watchdog', async () => {
    const coordinator = new GraphileBuildCoordinator({ queueMax: 2, watchdogMs: 1000 });
    expect(() => coordinator.configure({ watchdogMs: 2_147_483_648 })).toThrow();
    coordinator.configure({ queueMax: 1, watchdogMs: 500, shutdownTimeoutMs: 100 });
    const work = deferred();
    const active = coordinator.run(async () => work.promise);
    expect(() => coordinator.configure({ watchdogMs: 250 })).toThrow();
    expect(coordinator.reopen()).toBe(true);
    work.resolve();
    await active;
    await coordinator.closeAndDrain();
  });

  it('lets the first explicit owner choose a queue above the operational default', async () => {
    const coordinator = new GraphileBuildCoordinator();
    coordinator.configure();
    coordinator.configure({ queueMax: undefined });
    coordinator.configure({ queueMax: 32 });
    const gate = deferred();
    const work = Array.from({ length: 21 }, () => coordinator.run(async () => gate.promise));
    expect(coordinator.stats.queued).toBe(20);
    gate.resolve();
    await Promise.all(work);
    await coordinator.closeAndDrain();
  });

});
