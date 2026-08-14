import { cursorAfter, follow, MemoryRunLogStore, readAll, START } from '../src';
import { assistantText, header, resetIds, userMessage } from './fixtures';

let store: MemoryRunLogStore;

beforeEach(() => {
  resetIds();
  store = new MemoryRunLogStore();
});

describe('MemoryRunLogStore', () => {
  it('assigns gapless sequences in append order', async () => {
    await store.append('run-1', [header(), userMessage('hi')]);
    await store.append('run-1', [assistantText('hello')]);
    expect(store.snapshot('run-1').map((r) => r.seq)).toEqual([1, 2, 3]);
  });

  it('keeps runs independent', async () => {
    await store.append('run-1', [userMessage('a')]);
    await store.append('run-2', [userMessage('b')]);
    expect(store.snapshot('run-1')).toHaveLength(1);
    expect(store.snapshot('run-2')[0].seq).toBe(1);
    expect(store.runIds()).toEqual(['run-1', 'run-2']);
  });

  it('skips entries it already holds, so an append can be retried', async () => {
    const entries = [header(), userMessage('hi'), assistantText('hello')];
    const first = await store.append('run-1', entries);
    const retry = await store.append('run-1', entries);
    const extended = await store.append('run-1', [...entries, userMessage('again', 5)]);

    expect(first).toHaveLength(3);
    expect(retry).toHaveLength(0);
    expect(extended).toHaveLength(1);
    expect(extended[0].seq).toBe(4);
  });

  it('reads after a cursor', async () => {
    await store.append('run-1', [userMessage('a'), userMessage('b', 2), userMessage('c', 3)]);

    const first = await store.read('run-1', START, 2);
    expect(first.records.map((r) => r.seq)).toEqual([1, 2]);
    expect(first.cursor).toEqual({ afterSeq: 2 });

    const next = await store.read('run-1', first.cursor);
    expect(next.records.map((r) => r.seq)).toEqual([3]);

    const end = await store.read('run-1', next.cursor);
    expect(end.records).toEqual([]);
    // An empty page must not rewind the cursor.
    expect(end.cursor).toEqual({ afterSeq: 3 });
  });

  it('reports an empty page for an unknown run rather than throwing', async () => {
    expect((await store.read('nope')).records).toEqual([]);
  });
});

describe('cursorAfter', () => {
  it('keeps the previous position when nothing was read', () => {
    expect(cursorAfter([], { afterSeq: 7 })).toEqual({ afterSeq: 7 });
  });
});

describe('readAll', () => {
  it('pages to the end of the run', async () => {
    const entries = Array.from({ length: 25 }, (_, i) => userMessage(`m${String(i)}`, i + 1));
    await store.append('run-1', entries);
    const records = await readAll(store, 'run-1', START, 10);
    expect(records.map((r) => r.seq)).toEqual(entries.map((_, i) => i + 1));
  });
});

describe('follow', () => {
  const immediateSleep = async (): Promise<void> => {};

  it('yields batches as they arrive and stops on a terminal batch', async () => {
    await store.append('run-1', [userMessage('a')]);

    const batches: number[][] = [];
    const iteration = (async () => {
      for await (const batch of follow(store, 'run-1', {
        sleep: immediateSleep,
        isTerminal: (records) => records.some((r) => r.entry.type === 'run_finished')
      })) {
        batches.push(batch.map((r) => r.seq));
        if (batches.length === 1) {
          await store.append('run-1', [assistantText('b', 2)]);
        } else if (batches.length === 2) {
          await store.append('run-1', [
            { type: 'run_finished', id: 'ffffffff', parentId: null, timestamp: '2026-01-01T00:00:09.000Z' }
          ]);
        }
      }
    })();

    await iteration;
    expect(batches).toEqual([[1], [2], [3]]);
  });

  it('stops when the caller aborts', async () => {
    const controller = new AbortController();
    const batches: number[][] = [];
    const iteration = (async () => {
      for await (const batch of follow(store, 'run-1', { sleep: immediateSleep, signal: controller.signal })) {
        batches.push(batch.map((r) => r.seq));
        controller.abort();
      }
    })();

    await store.append('run-1', [userMessage('a')]);
    await iteration;
    expect(batches.length).toBeLessThanOrEqual(1);
  });

  it('races a push wakeup against the poll delay', async () => {
    let wakeups = 0;
    const iteration = (async () => {
      for await (const batch of follow(store, 'run-1', {
        sleep: immediateSleep,
        waitForChange: async () => {
          wakeups += 1;
          if (wakeups === 1) await store.append('run-1', [userMessage('a')]);
        },
        isTerminal: () => true
      })) {
        expect(batch).toHaveLength(1);
      }
    })();

    await iteration;
    expect(wakeups).toBeGreaterThan(0);
    expect(store.snapshot('run-1')).toHaveLength(1);
  });
});
