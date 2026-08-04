import {
  BuildCoordinator,
  captureGraphileBuildGeneration,
  closeGraphileBuildCoordinator,
  getGraphileGovernorCounters,
  GRAPHILE_BUILD_QUEUE_FULL_CODE,
  GRAPHILE_BUILD_SHUTTING_DOWN_CODE,
  GRAPHILE_BUILD_STUCK_RESTART_REQUIRED_CODE,
  GraphileBuildCoordinatorError,
  GraphileBuildWaitAbortedError,
  isGraphileBuildGenerationCurrent,
  reopenGraphileBuildCoordinator,
  runGraphileBuild,
  waitForGraphileBuild
} from '../graphile-build-governor';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('Graphile build coordinator', () => {
  it('serializes large builds process-wide', async () => {
    const firstGate = deferred<void>();
    const secondStarted = jest.fn();
    const first = runGraphileBuild(async () => {
      await firstGate.promise;
      return 'first';
    });
    const second = runGraphileBuild(async () => {
      secondStarted();
      return 'second';
    });

    await Promise.resolve();
    expect(secondStarted).not.toHaveBeenCalled();
    expect(getGraphileGovernorCounters().queueDepth).toBe(1);
    firstGate.resolve();
    await expect(first).resolves.toBe('first');
    await expect(second).resolves.toBe('second');
    expect(secondStarted).toHaveBeenCalledTimes(1);
  });

  it('clears its wait timer when a build settles', async () => {
    jest.useFakeTimers();
    try {
      await expect(waitForGraphileBuild(Promise.resolve('ready'), 60_000)).resolves.toBe('ready');
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('returns null with a stable timeout counter while the build continues', async () => {
    jest.useFakeTimers();
    try {
      const before = getGraphileGovernorCounters().buildWaitTimeouts;
      const pending = deferred<string>();
      const waiting = waitForGraphileBuild(pending.promise, 25);
      await jest.advanceTimersByTimeAsync(25);
      await expect(waiting).resolves.toBeNull();
      expect(getGraphileGovernorCounters().buildWaitTimeouts).toBe(before + 1);
      pending.resolve('eventually cached');
    } finally {
      jest.useRealTimers();
    }
  });

  it('bounds queued builds with a stable refusal code', async () => {
    const coordinator = new BuildCoordinator(1, 1);
    const releaseFirst = await coordinator.acquire();
    const queued = coordinator.acquire();

    await expect(coordinator.acquire()).rejects.toMatchObject({
      code: GRAPHILE_BUILD_QUEUE_FULL_CODE,
      retryAfterSeconds: 1
    } satisfies Partial<GraphileBuildCoordinatorError>);

    releaseFirst();
    const releaseQueued = await queued;
    releaseQueued();
  });

  it('removes an aborted waiter before it can start', async () => {
    const coordinator = new BuildCoordinator(1, 1);
    const releaseFirst = await coordinator.acquire();
    const abortController = new AbortController();
    const admitted = jest.fn();
    const queued = coordinator.acquire({
      signal: abortController.signal,
      onAdmitted: admitted
    });
    expect(coordinator.queueDepth).toBe(1);

    abortController.abort();
    await expect(queued).rejects.toBeInstanceOf(GraphileBuildWaitAbortedError);
    expect(coordinator.queueDepth).toBe(0);
    releaseFirst();
    expect(admitted).not.toHaveBeenCalled();
  });

  it('aborts request waiting without canceling an already active build', async () => {
    const pending = deferred<string>();
    const abortController = new AbortController();
    const waiting = waitForGraphileBuild(
      pending.promise,
      60_000,
      abortController.signal
    );

    abortController.abort();
    await expect(waiting).rejects.toBeInstanceOf(GraphileBuildWaitAbortedError);
    pending.resolve('still allowed to finish');
    await expect(pending.promise).resolves.toBe('still allowed to finish');
  });

  it('rejects unsafe concurrent-build configuration', () => {
    expect(() => new BuildCoordinator(2, 1)).toThrow(
      'GRAPHILE_BUILD_CONCURRENCY must be exactly 1'
    );
  });

  it('latches an unhealthy restart-required state without releasing the active slot', async () => {
    jest.useFakeTimers();
    try {
      const coordinator = new BuildCoordinator(1, 1, 25);
      const queuedAdmitted = jest.fn();
      const releaseActive = await coordinator.acquire();
      const queued = coordinator.acquire({ onAdmitted: queuedAdmitted });
      const queuedRefusal = expect(queued).rejects.toMatchObject({
        code: GRAPHILE_BUILD_STUCK_RESTART_REQUIRED_CODE,
        retryAfterSeconds: 30
      } satisfies Partial<GraphileBuildCoordinatorError>);

      await jest.advanceTimersByTimeAsync(25);
      await queuedRefusal;

      expect(coordinator.isUnhealthy).toBe(true);
      expect(coordinator.stuckSinceMs).not.toBeNull();
      expect(coordinator.activeCount).toBe(1);
      expect(coordinator.queueDepth).toBe(0);
      expect(queuedAdmitted).not.toHaveBeenCalled();
      await expect(coordinator.acquire()).rejects.toMatchObject({
        code: GRAPHILE_BUILD_STUCK_RESTART_REQUIRED_CODE
      } satisfies Partial<GraphileBuildCoordinatorError>);

      // Only completion of the real build may release its slot. The unhealthy
      // latch remains, so the same process still cannot admit replacement work.
      releaseActive();
      expect(coordinator.activeCount).toBe(0);
      expect(coordinator.isUnhealthy).toBe(true);
      await expect(coordinator.acquire()).rejects.toMatchObject({
        code: GRAPHILE_BUILD_STUCK_RESTART_REQUIRED_CODE
      } satisfies Partial<GraphileBuildCoordinatorError>);
    } finally {
      jest.useRealTimers();
    }
  });

  it('notifies active request waiters when the build watchdog trips', async () => {
    jest.useFakeTimers();
    try {
      const coordinator = new BuildCoordinator(1, 0, 10);
      const release = await coordinator.acquire();
      const stuck = new Promise<GraphileBuildCoordinatorError>((resolve) => {
        coordinator.onStuck(resolve);
      });

      await jest.advanceTimersByTimeAsync(10);
      await expect(stuck).resolves.toMatchObject({
        code: GRAPHILE_BUILD_STUCK_RESTART_REQUIRED_CODE
      });
      expect(coordinator.activeCount).toBe(1);
      release();
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects an invalid build watchdog configuration', () => {
    expect(() => new BuildCoordinator(1, 1, 0)).toThrow(
      'GRAPHILE_BUILD_WATCHDOG_MS must be a positive safe integer'
    );
  });

  it('closes admission, rejects queued work, drains active work, and advances generation', async () => {
    const firstGate = deferred<void>();
    const queuedStarted = jest.fn();
    const generation = captureGraphileBuildGeneration();
    const first = runGraphileBuild(async () => {
      await firstGate.promise;
      return 'first';
    });
    const queued = runGraphileBuild(async () => {
      queuedStarted();
      return 'queued';
    });
    await Promise.resolve();

    const draining = closeGraphileBuildCoordinator(100);
    await expect(queued).rejects.toMatchObject({
      code: GRAPHILE_BUILD_SHUTTING_DOWN_CODE
    } satisfies Partial<GraphileBuildCoordinatorError>);
    expect(isGraphileBuildGenerationCurrent(generation)).toBe(false);
    firstGate.resolve();
    await expect(first).resolves.toBe('first');
    await expect(draining).resolves.toBe(true);
    expect(queuedStarted).not.toHaveBeenCalled();
    expect(reopenGraphileBuildCoordinator()).toBe(true);
    await expect(runGraphileBuild(async () => 'restarted')).resolves.toBe('restarted');
  });
});
