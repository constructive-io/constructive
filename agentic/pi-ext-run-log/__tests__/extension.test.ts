import { MemoryRunLogStore, type RunLogAppendStore, START } from '@agentic-kit/run-log';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

import { createRunLogExtension, MIRROR_EVENTS } from '../src/extension';

const header = { type: 'session', version: 3, id: 'sess-1', timestamp: '2026-01-01T00:00:00.000Z', cwd: '/w' };

const entry = (id: string, parentId: string | null) => ({
  type: 'message',
  id,
  parentId,
  timestamp: '2026-01-01T00:00:01.000Z',
  message: { role: 'assistant', content: [{ type: 'text', text: id }] }
});

interface FakePi {
  api: ExtensionAPI;
  emit(event: string): Promise<void>;
  registered: string[];
  entries: unknown[];
}

const fakePi = (): FakePi => {
  const handlers = new Map<string, (event: unknown, ctx: unknown) => Promise<void> | void>();
  const entries: unknown[] = [];
  const sessionManager = { getHeader: () => header, getEntries: () => entries };
  const api = {
    on: (event: string, handler: (event: unknown, ctx: unknown) => Promise<void> | void) => {
      handlers.set(event, handler);
    }
  } as unknown as ExtensionAPI;

  return {
    api,
    registered: [],
    entries,
    emit: async (event) => {
      const handler = handlers.get(event);
      if (!handler) throw new Error(`no handler registered for ${event}`);
      await handler({ type: event }, { sessionManager });
    }
  };
};

describe('createRunLogExtension', () => {
  it('drains the session on each mirrored event', async () => {
    const store = new MemoryRunLogStore();
    const pi = fakePi();
    const { extension } = createRunLogExtension({ runId: 'run-1', store });
    extension(pi.api);

    pi.entries.push(entry('e1', null));
    await pi.emit('session_start');
    pi.entries.push(entry('e2', 'e1'));
    await pi.emit('message_end');

    const page = await store.read('run-1', START);
    expect(page.records.map((r) => r.seq)).toEqual([1, 2, 3]);
  });

  it('registers every mirrored event, and only those', async () => {
    const seen: string[] = [];
    const api = { on: (event: string) => seen.push(event) } as unknown as ExtensionAPI;
    createRunLogExtension({ runId: 'run-1', store: new MemoryRunLogStore() }).extension(api);
    expect(seen).toEqual([...MIRROR_EVENTS]);
  });

  it('honours a narrowed event list', () => {
    const seen: string[] = [];
    const api = { on: (event: string) => seen.push(event) } as unknown as ExtensionAPI;
    createRunLogExtension({ runId: 'run-1', store: new MemoryRunLogStore(), events: ['turn_end'] }).extension(api);
    expect(seen).toEqual(['turn_end']);
  });

  it('throws into pi by default when the store fails', async () => {
    const store: RunLogAppendStore = {
      append: async () => {
        throw new Error('store offline');
      }
    };
    const pi = fakePi();
    createRunLogExtension({ runId: 'run-1', store }).extension(pi.api);
    pi.entries.push(entry('e1', null));

    await expect(pi.emit('message_end')).rejects.toThrow('store offline');
  });

  it('routes failures to onError when the host wants to survive them', async () => {
    const errors: unknown[] = [];
    const store: RunLogAppendStore = {
      append: async () => {
        throw new Error('store offline');
      }
    };
    const pi = fakePi();
    createRunLogExtension({ runId: 'run-1', store, onError: (error) => errors.push(error) }).extension(pi.api);
    pi.entries.push(entry('e1', null));

    await pi.emit('message_end');
    expect(errors).toHaveLength(1);
  });

  it('flushes on demand for a host that is shutting down', async () => {
    const store = new MemoryRunLogStore();
    const pi = fakePi();
    const { extension, flush, mirror } = createRunLogExtension({ runId: 'run-1', store });
    extension(pi.api);
    await pi.emit('session_start');

    pi.entries.push(entry('e1', null));
    expect(await flush()).toHaveLength(1);
    expect(await mirror.drain()).toEqual([]);
  });
});
