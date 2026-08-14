import { MemoryRunLogStore, projectParts, type RunLogAppendStore, START } from '@agentic-kit/run-log';

import { SessionMirror } from '../src/mirror';

interface FakeSession {
  getHeader(): unknown;
  getEntries(): readonly unknown[];
  push(entry: unknown): void;
  reset(sessionId: string): void;
}

const fakeSession = (sessionId = 'sess-1'): FakeSession => {
  let header: Record<string, unknown> = { type: 'session', version: 3, id: sessionId, timestamp: '2026-01-01T00:00:00.000Z', cwd: '/w' };
  let entries: unknown[] = [];
  return {
    getHeader: () => header,
    getEntries: () => entries,
    push: (entry) => {
      entries.push(entry);
    },
    reset: (id) => {
      header = { ...header, id };
      entries = [];
    }
  };
};

let parent: string | null = null;
let n = 0;
const message = (role: 'user' | 'assistant', text: string) => {
  n += 1;
  const id = `e${n}`;
  const entry = {
    type: 'message',
    id,
    parentId: parent,
    timestamp: `2026-01-01T00:00:0${n}.000Z`,
    message: { role, content: [{ type: 'text', text }] }
  };
  parent = id;
  return entry;
};

beforeEach(() => {
  parent = null;
  n = 0;
});

describe('SessionMirror', () => {
  it('mirrors the header once, then every new entry, in order', async () => {
    const store = new MemoryRunLogStore();
    const session = fakeSession();
    const mirror = new SessionMirror({ runId: 'run-1', store });
    mirror.bind(session);

    session.push(message('user', 'hi'));
    expect(await mirror.drain()).toHaveLength(2); // header + entry
    session.push(message('assistant', 'hello'));
    expect(await mirror.drain()).toHaveLength(1);
    expect(await mirror.drain()).toHaveLength(0);

    const page = await store.read('run-1', START);
    expect(page.records.map((r) => r.seq)).toEqual([1, 2, 3]);
    expect(page.records[0].entry.type).toBe('session');
    expect(projectParts(page.records).parts.map((p) => p.kind)).toEqual(['text', 'text']);
  });

  it('stores entries verbatim, including types it does not understand', async () => {
    const store = new MemoryRunLogStore();
    const session = fakeSession();
    const mirror = new SessionMirror({ runId: 'run-1', store });
    mirror.bind(session);

    const exotic = { type: 'future_thing', id: 'x1', parentId: null as string | null, timestamp: '2026-01-01T00:00:01.000Z', payload: { deep: [1, 2] } };
    session.push(exotic);
    await mirror.drain();

    const page = await store.read('run-1', START);
    expect(page.records[1].entry).toEqual(exotic);
  });

  it('does nothing until bound', async () => {
    const store = new MemoryRunLogStore();
    const mirror = new SessionMirror({ runId: 'run-1', store });
    expect(await mirror.drain()).toEqual([]);
  });

  it('serializes concurrent drains rather than interleaving batches', async () => {
    const store = new MemoryRunLogStore();
    const session = fakeSession();
    const mirror = new SessionMirror({ runId: 'run-1', store });
    mirror.bind(session);

    session.push(message('user', 'a'));
    const first = mirror.drain();
    session.push(message('assistant', 'b'));
    const second = mirror.drain();
    const [a, b] = await Promise.all([first, second]);

    const seqs = [...a, ...b].map((r) => r.seq);
    expect(seqs).toEqual([...seqs].sort((x, y) => x - y));
    const page = await store.read('run-1', START);
    expect(page.records).toHaveLength(3);
  });

  it('retries the whole batch when an append fails, losing nothing', async () => {
    const inner = new MemoryRunLogStore();
    let fail = true;
    const store: RunLogAppendStore = {
      append: async (runId, entries, options) => {
        if (fail) {
          fail = false;
          throw new Error('transport down');
        }
        return inner.append(runId, entries, options);
      }
    };
    const session = fakeSession();
    const mirror = new SessionMirror({ runId: 'run-1', store });
    mirror.bind(session);

    session.push(message('user', 'a'));
    await expect(mirror.drain()).rejects.toThrow('transport down');
    session.push(message('assistant', 'b'));
    expect(await mirror.drain()).toHaveLength(3);
    expect((await inner.read('run-1', START)).records).toHaveLength(3);
  });

  it('re-mirrors from the start when pi switches to another session', async () => {
    const store = new MemoryRunLogStore();
    const session = fakeSession('sess-1');
    const mirror = new SessionMirror({ runId: 'run-1', store });
    mirror.bind(session);

    session.push(message('user', 'a'));
    await mirror.drain();

    session.reset('sess-2');
    session.push(message('user', 'a-forked'));
    await mirror.drain();

    const page = await store.read('run-1', START);
    const headers = page.records.filter((r) => r.entry.type === 'session');
    expect(headers).toHaveLength(2);
    expect(page.records.map((r) => r.seq)).toEqual([1, 2, 3, 4]);
  });

  it('replays a resumed session idempotently', async () => {
    const store = new MemoryRunLogStore();
    const session = fakeSession();
    session.push(message('user', 'a'));
    session.push(message('assistant', 'b'));

    const first = new SessionMirror({ runId: 'run-1', store });
    first.bind(session);
    await first.drain();

    // Fresh process, same session file, same run: nothing is written twice.
    const resumed = new SessionMirror({ runId: 'run-1', store });
    resumed.bind(session);
    expect(await resumed.drain()).toEqual([]);
    expect((await store.read('run-1', START)).records).toHaveLength(3);
  });

  it('rejects a malformed entry loudly', async () => {
    const store = new MemoryRunLogStore();
    const session = fakeSession();
    const mirror = new SessionMirror({ runId: 'run-1', store });
    mirror.bind(session);
    session.push({ type: 'message', message: {} });

    await expect(mirror.drain()).rejects.toThrow(/id/);
  });

  it('passes the pi session version through to the records', async () => {
    const store = new MemoryRunLogStore();
    const session = fakeSession();
    const mirror = new SessionMirror({ runId: 'run-1', store, piSessionVersion: 3 });
    mirror.bind(session);
    session.push(message('user', 'a'));
    await mirror.drain();

    const page = await store.read('run-1', START);
    expect(page.records.every((r) => r.piSessionVersion === 3)).toBe(true);
  });
});
