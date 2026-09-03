/**
 * usage-counter — the shared in-memory count + batch-flush mechanism.
 *
 * Two classes, neither of which knows what is being counted:
 *
 *   - `BoundedCounter<K>` is the map. Consumers pass the key type, how a key
 *     serialises (`keyOf`) and where a key folds to once the map is full
 *     (`overflowKey`). `increment` is O(1), synchronous and never throws, so a
 *     request path can call it while refusing traffic without ever waiting on,
 *     or being affected by, whatever eventually stores the counts.
 *   - `CounterFlusher<K>` is the loop. It drains the counter on a jittered
 *     interval, hands the batch to a `sink`, and owns the failure policy: a
 *     batch the sink cannot write is reported through `onError` *and dropped*.
 *     Re-queuing under a broken sink is how a bounded counter becomes an
 *     unbounded one, and the counter is already accumulating the next window.
 *
 * Refusal observability instantiates these with a refusal key and a sink that
 * calls `constructive_limits_private.record_refusals` (see `refusals.ts`); the
 * page/request metering lane instantiates the same two classes with its own
 * `K`, `keyOf`, `overflowKey`, bound, interval and sink. The seam is the
 * constructor arguments — nothing in this file is specific to either.
 *
 * Counters live in process memory only. A crash loses at most one interval's
 * worth of counts; `stop()` flushes on graceful shutdown. That is deliberate:
 * the alternative is a durable write per event, which is the thing counting in
 * memory exists to avoid.
 *
 * @module usage-counter
 */

export interface CounterEntry<K> {
  key: K;
  /** Sum of every `by` since this entry was created (or last drained). */
  count: number;
  /** Earliest `at` folded into this entry. */
  firstAt: number;
  /** Latest `at` folded into this entry. */
  lastAt: number;
}

export interface BoundedCounterOptions<K> {
  /**
   * Distinct keys the counter will hold between drains. Past this, a *new* key
   * is replaced by `overflowKey(key)` before it is counted; keys already
   * present keep incrementing. Overflow keys are always admitted, so the true
   * ceiling is `maxKeys` plus the number of distinct overflow keys the
   * consumer's `overflowKey` can produce — keep that small.
   */
  maxKeys: number;
  /** Serialise a key. Two keys with the same string share one entry. */
  keyOf: (key: K) => string;
  /**
   * Where a key folds to once the map is full. Should collapse the
   * high-cardinality parts of the key (a source address, a route) while
   * keeping the attribution the consumer cannot afford to lose.
   */
  overflowKey: (key: K) => K;
}

export class BoundedCounter<K> {
  private readonly entries = new Map<string, CounterEntry<K>>();
  private overflowedSinceDrain = 0;
  private readonly maxKeys: number;
  private readonly keyOf: (key: K) => string;
  private readonly overflowKey: (key: K) => K;

  constructor(opts: BoundedCounterOptions<K>) {
    if (!Number.isInteger(opts.maxKeys) || opts.maxKeys < 1) {
      throw new Error(`BoundedCounter: maxKeys must be a positive integer, got ${opts.maxKeys}`);
    }
    this.maxKeys = opts.maxKeys;
    this.keyOf = opts.keyOf;
    this.overflowKey = opts.overflowKey;
  }

  /** Distinct keys currently held. */
  get size(): number {
    return this.entries.size;
  }

  /** Increments folded into an overflow key since the last drain. */
  get overflowed(): number {
    return this.overflowedSinceDrain;
  }

  /**
   * Add `by` to `key`. Synchronous, O(1), never throws for a well-formed
   * `keyOf`/`overflowKey`; the caller's request path must not depend on it in
   * any other way.
   */
  increment(key: K, by = 1, at: number = Date.now()): void {
    let id = this.keyOf(key);
    let entry = this.entries.get(id);
    if (!entry && this.entries.size >= this.maxKeys) {
      key = this.overflowKey(key);
      id = this.keyOf(key);
      entry = this.entries.get(id);
      this.overflowedSinceDrain += by;
    }
    if (!entry) {
      this.entries.set(id, { key, count: by, firstAt: at, lastAt: at });
      return;
    }
    entry.count += by;
    if (at < entry.firstAt) entry.firstAt = at;
    if (at > entry.lastAt) entry.lastAt = at;
  }

  /**
   * Return every entry and start a fresh window. The returned array is the
   * only reference to those entries, so a slow sink never contends with the
   * hot path.
   */
  drain(): CounterEntry<K>[] {
    const drained = Array.from(this.entries.values());
    this.entries.clear();
    this.overflowedSinceDrain = 0;
    return drained;
  }
}

export type CounterSink<K> = (entries: CounterEntry<K>[]) => Promise<void>;

export interface CounterFlusherOptions<K> {
  /** Base time between flushes. */
  intervalMs: number;
  /**
   * Uniform random offset added to each interval so replicas started together
   * do not hit the store on the same tick.
   */
  jitterMs: number;
  /**
   * Called for every failed flush with the batch that was dropped. Every
   * failure is reported — there is no "log once then go quiet" — and the
   * request path is not involved, so making this loud is free.
   */
  onError: (err: unknown, dropped: CounterEntry<K>[]) => void;
}

export interface CounterFlusherStats {
  /** Epoch ms of the last flush attempt that returned without error, or null. */
  lastFlushAt: number | null;
  /** Epoch ms of the last failed flush, or null. */
  lastErrorAt: number | null;
  /** Message of the last failed flush, or null. */
  lastError: string | null;
  /** Failed flushes since the last success. */
  consecutiveFailures: number;
  /** Entries handed to `onError` over the flusher's lifetime. */
  droppedEntries: number;
  /** Whether the timer is armed. */
  running: boolean;
}

export class CounterFlusher<K> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private running = false;
  private lastFlushAt: number | null = null;
  private lastErrorAt: number | null = null;
  private lastError: string | null = null;
  private consecutiveFailures = 0;
  private droppedEntries = 0;

  constructor(
    private readonly counter: BoundedCounter<K>,
    private readonly sink: CounterSink<K>,
    private readonly opts: CounterFlusherOptions<K>
  ) {
    if (!(opts.intervalMs > 0)) {
      throw new Error(`CounterFlusher: intervalMs must be positive, got ${opts.intervalMs}`);
    }
    if (!(opts.jitterMs >= 0)) {
      throw new Error(`CounterFlusher: jitterMs must be non-negative, got ${opts.jitterMs}`);
    }
  }

  /** Arm the timer. Idempotent. The timer is unref'd so it never pins the process. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.arm();
  }

  /** Disarm the timer and flush whatever is pending. Idempotent. */
  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.flush();
  }

  /**
   * Drain and write now. Never rejects: a sink failure goes to `onError`. If a
   * flush is already in flight the call waits for it and then runs its own, so
   * two overlapping timers cannot send batches out of order.
   */
  async flush(): Promise<void> {
    if (this.inFlight) await this.inFlight;
    const run = this.flushOnce();
    this.inFlight = run;
    try {
      await run;
    } finally {
      if (this.inFlight === run) this.inFlight = null;
    }
  }

  stats(): CounterFlusherStats {
    return {
      lastFlushAt: this.lastFlushAt,
      lastErrorAt: this.lastErrorAt,
      lastError: this.lastError,
      consecutiveFailures: this.consecutiveFailures,
      droppedEntries: this.droppedEntries,
      running: this.running
    };
  }

  private arm(): void {
    const delay = this.opts.intervalMs + Math.floor(Math.random() * (this.opts.jitterMs + 1));
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush().finally(() => {
        if (this.running) this.arm();
      });
    }, delay);
    this.timer.unref?.();
  }

  private async flushOnce(): Promise<void> {
    const entries = this.counter.drain();
    if (entries.length === 0) return;
    try {
      await this.sink(entries);
      this.lastFlushAt = Date.now();
      this.consecutiveFailures = 0;
    } catch (err) {
      this.lastErrorAt = Date.now();
      this.lastError = err instanceof Error ? err.message : String(err);
      this.consecutiveFailures += 1;
      this.droppedEntries += entries.length;
      // The batch is gone whether or not onError itself misbehaves; a
      // reporter that throws must not turn one lost window into a stuck loop.
      try {
        this.opts.onError(err, entries);
      } catch {
        // Fire-and-forget by design: the failure is already recorded in stats().
      }
    }
  }
}
