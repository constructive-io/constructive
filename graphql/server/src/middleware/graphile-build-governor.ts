import { raceWithClearedTimeout } from 'graphile-cache';

export interface GraphileGovernorCounters {
  buildsStarted: number;
  coalescedRequests: number;
  buildWaitTimeouts: number;
  buildWaitAborts: number;
  queueRefusals: number;
  shutdownRefusals: number;
  buildWatchdogTrips: number;
  stuckRefusals: number;
  queueDepth: number;
  activeBuilds: number;
  unhealthy: boolean;
  restartRequired: boolean;
  stuckSinceMs: number | null;
  activeBuildAgeMs: number | null;
  watchdogMs: number;
}

export const GRAPHILE_BUILD_QUEUE_FULL_CODE = 'GRAPHILE_BUILD_QUEUE_FULL';
export const GRAPHILE_BUILD_SHUTTING_DOWN_CODE = 'GRAPHILE_BUILD_SHUTTING_DOWN';
export const GRAPHILE_BUILD_STUCK_RESTART_REQUIRED_CODE =
  'GRAPHILE_BUILD_STUCK_RESTART_REQUIRED';

type GraphileBuildCoordinatorErrorCode =
  | typeof GRAPHILE_BUILD_QUEUE_FULL_CODE
  | typeof GRAPHILE_BUILD_SHUTTING_DOWN_CODE
  | typeof GRAPHILE_BUILD_STUCK_RESTART_REQUIRED_CODE;

export class GraphileBuildCoordinatorError extends Error {
  readonly retryAfterSeconds: number;

  constructor(
    readonly code: GraphileBuildCoordinatorErrorCode,
    message: string,
    retryAfterSeconds = 1
  ) {
    super(message);
    this.name = 'GraphileBuildCoordinatorError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class GraphileBuildWaitAbortedError extends Error {
  readonly code = 'GRAPHILE_BUILD_WAIT_ABORTED';

  constructor() {
    super('The request ended while waiting for a GraphQL schema build');
    this.name = 'GraphileBuildWaitAbortedError';
  }
}

interface BuildWaiter {
  resolve(release: () => void): void;
  reject(error: Error): void;
  signal?: AbortSignal;
  onAbort?: () => void;
  onAdmitted?: () => void;
}

export interface BuildAcquireOptions {
  signal?: AbortSignal;
  onAdmitted?: () => void;
}

export class BuildCoordinator {
  private active = 0;
  private readonly waiters: BuildWaiter[] = [];
  private readonly drainWaiters = new Set<() => void>();
  private readonly unhealthyListeners = new Set<(
    error: GraphileBuildCoordinatorError
  ) => void>();
  private closed = false;
  private unhealthyError: GraphileBuildCoordinatorError | null = null;
  private stuckAtMs: number | null = null;
  private activeStartedAtMs: number | null = null;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly capacity: number,
    private readonly maxQueueDepth: number,
    private readonly buildWatchdogMs = 300_000,
    private readonly onUnhealthy?: () => void
  ) {
    if (capacity !== 1) {
      throw new Error(
        'GRAPHILE_BUILD_CONCURRENCY must be exactly 1 until concurrent builds reserve independent heap budgets'
      );
    }
    if (!Number.isSafeInteger(maxQueueDepth) || maxQueueDepth < 0) {
      throw new Error('GRAPHILE_BUILD_QUEUE_MAX must be a non-negative safe integer');
    }
    if (!Number.isSafeInteger(buildWatchdogMs) || buildWatchdogMs <= 0) {
      throw new Error('GRAPHILE_BUILD_WATCHDOG_MS must be a positive safe integer');
    }
  }

  acquire(options: BuildAcquireOptions = {}): Promise<() => void> {
    const { signal, onAdmitted } = options;
    if (this.unhealthyError) {
      counters.stuckRefusals++;
      return Promise.reject(this.unhealthyError);
    }
    if (this.closed) {
      counters.shutdownRefusals++;
      return Promise.reject(new GraphileBuildCoordinatorError(
        GRAPHILE_BUILD_SHUTTING_DOWN_CODE,
        'GraphQL schema build admission is closed for shutdown'
      ));
    }
    if (signal?.aborted) {
      return Promise.reject(new GraphileBuildWaitAbortedError());
    }
    if (this.active < this.capacity) {
      this.active++;
      onAdmitted?.();
      return Promise.resolve(this.createRelease());
    }
    if (this.waiters.length >= this.maxQueueDepth) {
      counters.queueRefusals++;
      return Promise.reject(new GraphileBuildCoordinatorError(
        GRAPHILE_BUILD_QUEUE_FULL_CODE,
        'GraphQL schema build queue is full'
      ));
    }
    return new Promise((resolve, reject) => {
      const waiter: BuildWaiter = { resolve, reject, signal, onAdmitted };
      this.waiters.push(waiter);
      if (signal) {
        waiter.onAbort = () => {
          const index = this.waiters.indexOf(waiter);
          if (index < 0) return;
          this.waiters.splice(index, 1);
          reject(new GraphileBuildWaitAbortedError());
        };
        signal.addEventListener('abort', waiter.onAbort, { once: true });
        if (signal.aborted) waiter.onAbort();
      }
    });
  }

  private createRelease(): () => void {
    this.activeStartedAtMs = Date.now();
    this.watchdogTimer = setTimeout(() => this.markUnhealthy(), this.buildWatchdogMs);
    this.watchdogTimer.unref?.();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (this.watchdogTimer) {
        clearTimeout(this.watchdogTimer);
        this.watchdogTimer = null;
      }
      this.activeStartedAtMs = null;
      if (this.unhealthyError) {
        // The watchdog never releases this slot. Only completion of the actual
        // build reaches this callback, and the latched unhealthy state still
        // prevents this process from admitting another build.
        this.active = Math.max(0, this.active - 1);
        if (this.active === 0) {
          for (const resolve of this.drainWaiters) resolve();
          this.drainWaiters.clear();
        }
        return;
      }
      const next = this.waiters.shift();
      if (next) {
        if (next.signal && next.onAbort) {
          next.signal.removeEventListener('abort', next.onAbort);
        }
        next.onAdmitted?.();
        next.resolve(this.createRelease());
      } else {
        this.active = Math.max(0, this.active - 1);
        if (this.active === 0) {
          for (const resolve of this.drainWaiters) resolve();
          this.drainWaiters.clear();
        }
      }
    };
  }

  private markUnhealthy(): void {
    if (this.unhealthyError || this.active === 0) return;
    this.stuckAtMs = Date.now();
    this.unhealthyError = new GraphileBuildCoordinatorError(
      GRAPHILE_BUILD_STUCK_RESTART_REQUIRED_CODE,
      'GraphQL schema build exceeded its watchdog; process restart is required',
      30
    );
    counters.buildWatchdogTrips++;
    this.onUnhealthy?.();

    for (const waiter of this.waiters.splice(0)) {
      if (waiter.signal && waiter.onAbort) {
        waiter.signal.removeEventListener('abort', waiter.onAbort);
      }
      counters.stuckRefusals++;
      waiter.reject(this.unhealthyError);
    }
    for (const listener of this.unhealthyListeners) {
      listener(this.unhealthyError);
    }
  }

  onStuck(
    listener: (error: GraphileBuildCoordinatorError) => void
  ): () => void {
    if (this.unhealthyError) {
      listener(this.unhealthyError);
      return () => undefined;
    }
    this.unhealthyListeners.add(listener);
    return () => this.unhealthyListeners.delete(listener);
  }

  close(): boolean {
    if (this.closed) return false;
    this.closed = true;
    const error = new GraphileBuildCoordinatorError(
      GRAPHILE_BUILD_SHUTTING_DOWN_CODE,
      'GraphQL schema build admission closed during shutdown'
    );
    for (const waiter of this.waiters.splice(0)) {
      if (waiter.signal && waiter.onAbort) {
        waiter.signal.removeEventListener('abort', waiter.onAbort);
      }
      counters.shutdownRefusals++;
      waiter.reject(error);
    }
    return true;
  }

  async closeAndDrain(timeoutMs: number): Promise<boolean> {
    this.close();
    if (this.active === 0) return true;
    const drained = new Promise<void>((resolve) => this.drainWaiters.add(resolve));
    const result = await raceWithClearedTimeout(drained, timeoutMs);
    if (result.timedOut) this.drainWaiters.clear();
    return !result.timedOut;
  }

  get activeCount(): number {
    return this.active;
  }

  get queueDepth(): number {
    return this.waiters.length;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  get isUnhealthy(): boolean {
    return this.unhealthyError !== null;
  }

  get stuckSinceMs(): number | null {
    return this.stuckAtMs;
  }

  get activeBuildAgeMs(): number | null {
    return this.activeStartedAtMs == null
      ? null
      : Math.max(0, Date.now() - this.activeStartedAtMs);
  }

  get watchdogMs(): number {
    return this.buildWatchdogMs;
  }
}

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseNonNegativeInt = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error('GRAPHILE_BUILD_QUEUE_MAX must be a non-negative safe integer');
  }
  return parsed;
};

const parseSerializedBuildConcurrency = (value: string | undefined): number => {
  if (value === undefined) return 1;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed !== 1) {
    throw new Error(
      'GRAPHILE_BUILD_CONCURRENCY must be exactly 1 until concurrent builds reserve independent heap budgets'
    );
  }
  return parsed;
};

const parseBuildWatchdogMs = (value: string | undefined): number => {
  if (value === undefined) return 300_000;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error('GRAPHILE_BUILD_WATCHDOG_MS must be a positive safe integer');
  }
  return parsed;
};

let coordinatorGeneration = 0;

const createBuildCoordinator = (): BuildCoordinator => new BuildCoordinator(
  parseSerializedBuildConcurrency(process.env.GRAPHILE_BUILD_CONCURRENCY),
  parseNonNegativeInt(process.env.GRAPHILE_BUILD_QUEUE_MAX, 16),
  parseBuildWatchdogMs(process.env.GRAPHILE_BUILD_WATCHDOG_MS),
  () => {
    // Late completion from the stuck generation must never publish.
    coordinatorGeneration++;
  }
);

let coordinator = createBuildCoordinator();

const counters = {
  buildsStarted: 0,
  coalescedRequests: 0,
  buildWaitTimeouts: 0,
  buildWaitAborts: 0,
  queueRefusals: 0,
  shutdownRefusals: 0,
  buildWatchdogTrips: 0,
  stuckRefusals: 0
};

export interface RunGraphileBuildOptions extends BuildAcquireOptions {}

export const runGraphileBuild = async <T>(
  build: () => Promise<T>,
  options: RunGraphileBuildOptions = {}
): Promise<T> => {
  const release = await coordinator.acquire(options);
  counters.buildsStarted++;
  try {
    return await build();
  } finally {
    release();
  }
};

export const recordCoalescedRequest = (): void => {
  counters.coalescedRequests++;
};

export const waitForGraphileBuild = async <T>(
  build: Promise<T>,
  timeoutMs = parsePositiveInt(process.env.GRAPHILE_BUILD_TIMEOUT_MS, 180_000),
  signal?: AbortSignal
): Promise<T | null> => {
  if (signal?.aborted) {
    counters.buildWaitAborts++;
    throw new GraphileBuildWaitAbortedError();
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abortListener: (() => void) | undefined;
  let removeStuckListener: (() => void) | undefined;
  const timeout = new Promise<{ type: 'timeout' }>((resolve) => {
    timer = setTimeout(() => resolve({ type: 'timeout' }), timeoutMs);
    timer.unref?.();
  });
  const aborted = signal
    ? new Promise<{ type: 'aborted' }>((resolve) => {
      abortListener = () => resolve({ type: 'aborted' });
      signal.addEventListener('abort', abortListener, { once: true });
      if (signal.aborted) abortListener();
    })
    : new Promise<never>(() => undefined);
  const stuck = new Promise<{
    type: 'stuck';
    error: GraphileBuildCoordinatorError;
  }>((resolve) => {
    removeStuckListener = coordinator.onStuck((error) => {
      resolve({ type: 'stuck', error });
    });
  });
  try {
    const result = await Promise.race([
      build.then((value) => ({ type: 'ready' as const, value })),
      timeout,
      aborted,
      stuck
    ]);
    if (result.type === 'timeout') {
      counters.buildWaitTimeouts++;
      return null;
    }
    if (result.type === 'aborted') {
      counters.buildWaitAborts++;
      throw new GraphileBuildWaitAbortedError();
    }
    if (result.type === 'stuck') throw result.error;
    return result.value;
  } finally {
    if (timer) clearTimeout(timer);
    if (signal && abortListener) signal.removeEventListener('abort', abortListener);
    removeStuckListener?.();
  }
};

export const captureGraphileBuildGeneration = (): number => coordinatorGeneration;

export const isGraphileBuildGenerationCurrent = (generation: number): boolean =>
  generation === coordinatorGeneration;

export const closeGraphileBuildCoordinator = async (
  timeoutMs = parsePositiveInt(process.env.GRAPHILE_BUILD_SHUTDOWN_TIMEOUT_MS, 30_000)
): Promise<boolean> => {
  if (coordinator.close()) coordinatorGeneration++;
  return coordinator.closeAndDrain(timeoutMs);
};

/**
 * Reopen admission only after the previous coordinator fully drained. This
 * supports a clean in-process Server restart without ever overlapping a late
 * build from the previous generation.
 */
export const reopenGraphileBuildCoordinator = (): boolean => {
  if (coordinator.isUnhealthy) return false;
  if (!coordinator.isClosed) return true;
  if (coordinator.activeCount !== 0 || coordinator.queueDepth !== 0) return false;
  coordinator = createBuildCoordinator();
  return true;
};

export const getGraphileGovernorCounters = (): GraphileGovernorCounters => ({
  ...counters,
  queueDepth: coordinator.queueDepth,
  activeBuilds: coordinator.activeCount,
  unhealthy: coordinator.isUnhealthy,
  restartRequired: coordinator.isUnhealthy,
  stuckSinceMs: coordinator.stuckSinceMs,
  activeBuildAgeMs: coordinator.activeBuildAgeMs,
  watchdogMs: coordinator.watchdogMs
});
