import { errors } from '@constructive-io/errors';

export interface GraphileBuildOptions {
  queueMax?: number;
  watchdogMs?: number;
  shutdownTimeoutMs?: number;
}

export interface GraphileBuildLease {
  /** Must be checked synchronously with publication after the last await. */
  assertCurrent(): void;
}

interface QueuedBuild {
  start(): void;
  reject(error: unknown): void;
}

/** A timeout fences publication; it never cancels or frees actual work. */
export class GraphileBuildCoordinator {
  private state: 'open' | 'closed' | 'stuck' = 'open';
  private epoch = 0;
  private active = false;
  private activeReject?: (error: unknown) => void;
  private queue: QueuedBuild[] = [];
  private drainWaiters = new Set<() => void>();
  private queueMax: number;
  private watchdogMs: number;
  private shutdownTimeoutMs: number;
  private configured = false;

  constructor(options: GraphileBuildOptions = {}) {
    this.queueMax = 16;
    this.watchdogMs = 300_000;
    this.shutdownTimeoutMs = 30_000;
    if (Object.values(options).some((value) => value !== undefined)) this.configure(options);
  }

  configure(options: GraphileBuildOptions = {}): void {
    if (!Object.values(options).some((value) => value !== undefined)) return;
    for (const value of Object.values(options)) {
      if (value !== undefined && !Number.isSafeInteger(value)) {
        throw errors.INTERNAL_FAILURE({ details: 'Invalid schema build coordinator configuration' });
      }
    }
    const next = {
      queueMax: options.queueMax ?? this.queueMax,
      watchdogMs: options.watchdogMs ?? this.watchdogMs,
      shutdownTimeoutMs: options.shutdownTimeoutMs ?? this.shutdownTimeoutMs
    };
    if (!Number.isSafeInteger(next.queueMax) || next.queueMax < 0 ||
        !Number.isSafeInteger(next.watchdogMs) || next.watchdogMs < 1 || next.watchdogMs > 2_147_483_647 ||
        !Number.isSafeInteger(next.shutdownTimeoutMs) || next.shutdownTimeoutMs < 1 || next.shutdownTimeoutMs > 2_147_483_647) {
      throw errors.INTERNAL_FAILURE({ details: 'Invalid schema build coordinator configuration' });
    }
    if (this.configured) {
      next.queueMax = Math.min(next.queueMax, this.queueMax);
      next.watchdogMs = Math.min(next.watchdogMs, this.watchdogMs);
      next.shutdownTimeoutMs = Math.min(next.shutdownTimeoutMs, this.shutdownTimeoutMs);
    }
    if (next.queueMax < this.queue.length || (this.active && next.watchdogMs !== this.watchdogMs)) {
      throw errors.INTERNAL_FAILURE({ details: 'Cannot change schema build limits during active work' });
    }
    this.queueMax = next.queueMax;
    this.watchdogMs = next.watchdogMs;
    this.shutdownTimeoutMs = next.shutdownTimeoutMs;
    this.configured = true;
  }

  get drainTimeoutMs(): number { return this.shutdownTimeoutMs; }

  get stats(): { active: number; queued: number; state: 'open' | 'closed' | 'stuck' } {
    return { active: Number(this.active), queued: this.queue.length, state: this.state };
  }

  private refusal(): Error {
    return this.state === 'stuck'
      ? errors.SCHEMA_BUILD_STUCK()
      : errors.SCHEMA_BUILDS_CLOSED();
  }

  /** Called synchronously before a unique flight allocates tracking records. */
  assertAccepting(): void {
    if (this.state !== 'open') throw this.refusal();
    if (this.active && this.queue.length >= this.queueMax) {
      throw errors.SCHEMA_BUILD_QUEUE_FULL();
    }
  }

  run<T>(work: (lease: GraphileBuildLease) => Promise<T>): Promise<T> {
    try { this.assertAccepting(); }
    catch (error) { return Promise.reject(error); }
    return new Promise<T>((resolve, reject) => {
      const start = (): void => {
        this.active = true;
        this.activeReject = reject;
        const epoch = this.epoch;
        const lease: GraphileBuildLease = {
          assertCurrent: () => {
            if (this.state !== 'open' || epoch !== this.epoch) throw this.refusal();
          }
        };
        const timer = setTimeout(() => this.fence('stuck'), this.watchdogMs);
        timer.unref?.();
        // Keep the internal task observed even after the caller is rejected by
        // close/watchdog. Only its actual settlement hands the permit onward.
        void Promise.resolve().then(() => work(lease)).then(resolve, reject).finally(() => {
          clearTimeout(timer);
          this.active = false;
          this.activeReject = undefined;
          const next = this.state === 'open' ? this.queue.shift() : undefined;
          if (next) next.start();
          else {
            for (const done of this.drainWaiters) done();
            this.drainWaiters.clear();
          }
        });
      };
      if (this.active) this.queue.push({ start, reject });
      else start();
    });
  }

  private fence(state: 'closed' | 'stuck'): void {
    if (this.state === 'stuck') return;
    if (state === 'closed' && this.state === 'closed') return;
    // Fencing is synchronous and precedes every caller/queue rejection.
    this.epoch++;
    this.state = state;
    const error = this.refusal();
    this.activeReject?.(error);
    for (const pending of this.queue.splice(0)) pending.reject(error);
  }

  close(): void {
    this.fence('closed');
  }

  /** Failed cleanup and timed-out drain retain a permanent unhealthy fence. */
  fail(): void {
    this.fence('stuck');
  }

  /** Await actual work and its queued successors without reopening or closing. */
  async drain(): Promise<void> {
    if (!this.active) return;
    await new Promise<void>((resolve) => this.drainWaiters.add(resolve));
  }

  async closeAndDrain(
    timeoutMs = this.shutdownTimeoutMs,
    pendingWork: Promise<unknown> = Promise.resolve()
  ): Promise<boolean> {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
      throw errors.INTERNAL_FAILURE({ details: 'Invalid schema shutdown timeout' });
    }
    this.close();
    let done: (() => void) | undefined;
    let timer!: ReturnType<typeof setTimeout>;
    const ownedWork = this.active
      ? new Promise<void>((resolve) => { done = resolve; this.drainWaiters.add(resolve); })
      : Promise.resolve();
    try {
      // A single deadline includes active work and registry tasks that have not
      // yet entered run(). Neither caller rejection nor a timeout proves drain.
      const drained = await Promise.race([
        Promise.all([ownedWork, pendingWork]).then(() => true),
        new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), timeoutMs); })
      ]);
      if (!drained) this.fail();
      return drained;
    } finally {
      clearTimeout(timer);
      if (done) this.drainWaiters.delete(done);
    }
  }

  reopen(): boolean {
    if (this.state === 'open') return true;
    if (this.state === 'stuck' || this.active || this.queue.length > 0) return false;
    this.state = 'open';
    return true;
  }
}

/** One coordinator governs all cached Graphile producers loaded by this process. */
export const graphileBuildCoordinator = new GraphileBuildCoordinator();
