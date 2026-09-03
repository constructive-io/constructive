import type { CounterEntry } from '../src/usage-counter';
import { BoundedCounter, CounterFlusher } from '../src/usage-counter';

interface Key {
  tenant: string;
  source: string;
}

const keyOf = (k: Key): string => `${k.tenant}|${k.source}`;
const overflowKey = (k: Key): Key => ({ tenant: k.tenant, source: 'overflow' });

const counterOf = (maxKeys: number) => new BoundedCounter<Key>({ maxKeys, keyOf, overflowKey });

const flushTick = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

// ─── BoundedCounter ─────────────────────────────────────────────────────────

describe('BoundedCounter', () => {
  it('aggregates increments that serialise to the same key', () => {
    const counter = counterOf(10);
    counter.increment({ tenant: 'a', source: '1' }, 1, 1_000);
    counter.increment({ tenant: 'a', source: '1' }, 2, 3_000);
    counter.increment({ tenant: 'a', source: '1' }, 1, 2_000);

    expect(counter.size).toBe(1);
    expect(counter.drain()).toEqual([
      { key: { tenant: 'a', source: '1' }, count: 4, firstAt: 1_000, lastAt: 3_000 }
    ]);
  });

  it('drain starts a fresh window', () => {
    const counter = counterOf(10);
    counter.increment({ tenant: 'a', source: '1' });
    expect(counter.drain()).toHaveLength(1);
    expect(counter.size).toBe(0);
    expect(counter.drain()).toEqual([]);
  });

  it('folds new keys into the overflow key once full, keeping the attribution', () => {
    const counter = counterOf(2);
    counter.increment({ tenant: 'a', source: '1' });
    counter.increment({ tenant: 'a', source: '2' });
    counter.increment({ tenant: 'a', source: '3' });
    counter.increment({ tenant: 'b', source: '4' }, 5);
    // A key already present keeps its own entry.
    counter.increment({ tenant: 'a', source: '1' });

    const drained = counter.drain();
    expect(drained).toHaveLength(4);
    expect(drained).toContainEqual(expect.objectContaining({ key: { tenant: 'a', source: '1' }, count: 2 }));
    expect(drained).toContainEqual(expect.objectContaining({ key: { tenant: 'a', source: 'overflow' }, count: 1 }));
    expect(drained).toContainEqual(expect.objectContaining({ key: { tenant: 'b', source: 'overflow' }, count: 5 }));
  });

  it('reports how many increments overflowed and resets on drain', () => {
    const counter = counterOf(1);
    counter.increment({ tenant: 'a', source: '1' });
    counter.increment({ tenant: 'a', source: '2' }, 3);
    expect(counter.overflowed).toBe(3);
    counter.drain();
    expect(counter.overflowed).toBe(0);
  });

  it('stays bounded under 10,000 distinct keys', () => {
    const counter = counterOf(2_000);
    const start = process.hrtime.bigint();
    for (let i = 0; i < 10_000; i++) {
      counter.increment({ tenant: `t${i % 7}`, source: `s${i}` });
    }
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

    // 2,000 real keys plus at most one overflow key per tenant.
    expect(counter.size).toBeLessThanOrEqual(2_000 + 7);
    expect(counter.overflowed).toBe(8_000);
    const total = counter.drain().reduce((sum, e) => sum + e.count, 0);
    expect(total).toBe(10_000);
    // Well under a millisecond per increment even on a slow CI box.
    expect(elapsedMs).toBeLessThan(2_000);
  });

  it('rejects a non-positive bound at construction', () => {
    expect(() => counterOf(0)).toThrow(/maxKeys/);
  });
});

// ─── CounterFlusher ─────────────────────────────────────────────────────────

describe('CounterFlusher', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const flusherOf = (
    counter: BoundedCounter<Key>,
    sink: (entries: CounterEntry<Key>[]) => Promise<void>,
    onError: (err: unknown, dropped: CounterEntry<Key>[]) => void = () => undefined
  ) => new CounterFlusher(counter, sink, { intervalMs: 1_000, jitterMs: 0, onError });

  it('drains into the sink on the interval', async () => {
    const counter = counterOf(10);
    const sink = jest.fn(async (_entries: CounterEntry<Key>[]): Promise<void> => undefined);
    const flusher = flusherOf(counter, sink);
    flusher.start();

    counter.increment({ tenant: 'a', source: '1' }, 2);
    jest.advanceTimersByTime(999);
    expect(sink).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await flushTick();

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][0]).toEqual([expect.objectContaining({ count: 2 })]);
    expect(counter.size).toBe(0);
    expect(flusher.stats().lastFlushAt).not.toBeNull();
    await flusher.stop();
  });

  it('skips the sink when nothing was counted', async () => {
    const counter = counterOf(10);
    const sink = jest.fn(async (_entries: CounterEntry<Key>[]): Promise<void> => undefined);
    const flusher = flusherOf(counter, sink);
    flusher.start();
    jest.advanceTimersByTime(3_000);
    await flushTick();
    expect(sink).not.toHaveBeenCalled();
    await flusher.stop();
  });

  it('reports a failed flush with the dropped batch and keeps counting', async () => {
    const counter = counterOf(10);
    const sink = jest.fn(async () => {
      throw new Error('platform db down');
    });
    const onError = jest.fn();
    const flusher = flusherOf(counter, sink, onError);
    flusher.start();

    counter.increment({ tenant: 'a', source: '1' }, 3);
    jest.advanceTimersByTime(1_000);
    await flushTick();

    expect(onError).toHaveBeenCalledTimes(1);
    const [err, dropped] = onError.mock.calls[0];
    expect((err as Error).message).toBe('platform db down');
    expect(dropped).toEqual([expect.objectContaining({ count: 3 })]);
    // Dropped, not re-queued: a broken sink must not grow the counter.
    expect(counter.size).toBe(0);
    expect(flusher.stats()).toMatchObject({
      consecutiveFailures: 1,
      droppedEntries: 1,
      lastError: 'platform db down'
    });

    // Every failure is reported — no "log once then go quiet".
    counter.increment({ tenant: 'a', source: '1' });
    jest.advanceTimersByTime(1_000);
    await flushTick();
    expect(onError).toHaveBeenCalledTimes(2);
    expect(flusher.stats().consecutiveFailures).toBe(2);

    await flusher.stop();
  });

  it('a throwing onError does not stop the loop', async () => {
    const counter = counterOf(10);
    const sink = jest.fn(async () => {
      throw new Error('nope');
    });
    const flusher = flusherOf(counter, sink, () => {
      throw new Error('reporter broke too');
    });
    flusher.start();
    counter.increment({ tenant: 'a', source: '1' });
    jest.advanceTimersByTime(1_000);
    await flushTick();
    counter.increment({ tenant: 'a', source: '1' });
    jest.advanceTimersByTime(1_000);
    await flushTick();
    expect(sink).toHaveBeenCalledTimes(2);
    await flusher.stop();
  });

  it('stop() flushes what is pending and disarms the timer', async () => {
    const counter = counterOf(10);
    const sink = jest.fn(async (_entries: CounterEntry<Key>[]): Promise<void> => undefined);
    const flusher = flusherOf(counter, sink);
    flusher.start();
    counter.increment({ tenant: 'a', source: '1' });

    await flusher.stop();
    expect(sink).toHaveBeenCalledTimes(1);
    expect(flusher.stats().running).toBe(false);

    counter.increment({ tenant: 'a', source: '2' });
    jest.advanceTimersByTime(10_000);
    await flushTick();
    expect(sink).toHaveBeenCalledTimes(1);
  });

  it('serialises overlapping flushes', async () => {
    const counter = counterOf(10);
    let release: () => void = () => undefined;
    const order: number[] = [];
    const sink = jest.fn(async (entries: CounterEntry<Key>[]) => {
      order.push(entries[0].count);
      if (order.length === 1) await new Promise<void>((resolve) => (release = resolve));
    });
    const flusher = flusherOf(counter, sink);

    counter.increment({ tenant: 'a', source: '1' }, 1);
    const first = flusher.flush();
    await flushTick();
    counter.increment({ tenant: 'a', source: '1' }, 2);
    const second = flusher.flush();
    await flushTick();
    expect(sink).toHaveBeenCalledTimes(1);

    release();
    await Promise.all([first, second]);
    expect(order).toEqual([1, 2]);
  });

  it('rejects a non-positive interval at construction', () => {
    expect(() =>
      new CounterFlusher(counterOf(1), async () => undefined, { intervalMs: 0, jitterMs: 0, onError: () => undefined })
    ).toThrow(/intervalMs/);
  });
});
