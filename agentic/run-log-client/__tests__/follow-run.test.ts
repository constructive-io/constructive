import { passthroughReader, TranscriptReaderRegistry } from '@agentic-kit/run-log';

import { GraphqlRunLogClient } from '../src/client';
import { followRun } from '../src/follow-run';
import type { RunView } from '../src/view';
import { type FakeApi, fakeApi, fakeRun, messageEntry, RUN_ID } from './fake-api';

const clientFor = (api: FakeApi) =>
  new GraphqlRunLogClient({
    request: api.request,
    now: () => new Date('2026-01-01T00:00:00.000Z'),
  });

/** No real timers: the loop's delay is injected, so tests stay deterministic. */
const noSleep = () => Promise.resolve();

const collect = async (
  iterator: AsyncGenerator<RunView, void, void>,
  count: number
): Promise<RunView[]> => {
  const views: RunView[] = [];
  for await (const view of iterator) {
    views.push(view);
    if (views.length >= count) break;
  }
  return views;
};

describe('followRun', () => {
  it('yields the whole history in one view, then only what is new', async () => {
    const api = fakeApi();
    const client = clientFor(api);
    await client.append(RUN_ID, [
      messageEntry('a', 'one'),
      messageEntry('b', 'two', 'a'),
    ]);

    const iterator = followRun(client, RUN_ID, { sleep: noSleep });
    const first = (await iterator.next()).value as RunView;
    expect(first.records.map((r) => r.seq)).toEqual([1, 2]);
    expect(first.run?.id).toBe(RUN_ID);

    await client.append(RUN_ID, [messageEntry('c', 'three', 'b')]);
    const second = (await iterator.next()).value as RunView;
    expect(second.records.map((r) => r.seq)).toEqual([1, 2, 3]);
    expect(second.cursor).toEqual({ afterSeq: 3 });
    await iterator.return();
  });

  it('drains a backlog larger than one page before yielding', async () => {
    const api = fakeApi();
    const client = clientFor(api);
    for (let i = 0; i < 5; i += 1) {
      await client.append(RUN_ID, [messageEntry(`e${i}`, `entry ${i}`)]);
    }

    const iterator = followRun(client, RUN_ID, { sleep: noSleep, limit: 2 });
    const first = (await iterator.next()).value as RunView;
    expect(first.records.map((r) => r.seq)).toEqual([1, 2, 3, 4, 5]);
    await iterator.return();
  });

  it('resumes from a caller-held cursor after a disconnect', async () => {
    const api = fakeApi();
    const client = clientFor(api);
    await client.append(RUN_ID, [
      messageEntry('a', 'one'),
      messageEntry('b', 'two', 'a'),
      messageEntry('c', 'three', 'b'),
    ]);

    const iterator = followRun(client, RUN_ID, {
      sleep: noSleep,
      cursor: { afterSeq: 2 },
    });
    const first = (await iterator.next()).value as RunView;
    expect(first.records.map((r) => r.seq)).toEqual([3]);
    await iterator.return();
  });

  it('stops once the run is terminal, after draining its tail', async () => {
    const api = fakeApi(fakeRun({ status: 'succeeded' }));
    const client = clientFor(api);
    await client.append(RUN_ID, [messageEntry('a', 'one')]);

    const views: RunView[] = [];
    for await (const view of followRun(client, RUN_ID, { sleep: noSleep })) {
      views.push(view);
      if (views.length > 4) throw new Error('followRun did not stop');
    }
    expect(views).toHaveLength(2);
    expect(views[views.length - 1].phase).toBe('terminal');
  });

  it('surfaces a read failure and keeps following', async () => {
    const api = fakeApi();
    const client = clientFor(api);
    await client.append(RUN_ID, [messageEntry('a', 'one')]);

    let fail = true;
    const request = api.request;
    api.request = (async (query: string, variables?: Record<string, unknown>) => {
      if (fail && query.includes('query Run(')) {
        throw new Error('502 bad gateway');
      }
      return request(query, variables);
    }) as typeof api.request;

    const iterator = followRun(clientFor(api), RUN_ID, { sleep: noSleep });
    const first = (await iterator.next()).value as RunView;
    expect(first.phase).toBe('error');
    expect(first.error).toMatch(/502/);

    fail = false;
    const second = (await iterator.next()).value as RunView;
    expect(second.phase).toBe('live');
    expect(second.error).toBeUndefined();
    expect(second.records.map((r) => r.seq)).toEqual([1]);
    await iterator.return();
  });

  it('wakes on a push instead of waiting out the poll delay', async () => {
    const api = fakeApi();
    const client = clientFor(api);
    await client.append(RUN_ID, [messageEntry('a', 'one')]);

    let poked = 0;
    const iterator = followRun(client, RUN_ID, {
      sleep: () => new Promise<void>(() => undefined), // a poll that never fires
      waitForChange: async () => {
        poked += 1;
      },
    });

    await iterator.next();
    await client.append(RUN_ID, [messageEntry('b', 'two', 'a')]);
    const second = (await iterator.next()).value as RunView;
    expect(second.records.map((r) => r.seq)).toEqual([1, 2]);
    expect(poked).toBe(1);
    await iterator.return();
  });

  it('stops when the caller aborts', async () => {
    const api = fakeApi();
    const client = clientFor(api);
    const controller = new AbortController();
    const views: RunView[] = [];

    for await (const view of followRun(client, RUN_ID, {
      sleep: noSleep,
      signal: controller.signal,
    })) {
      views.push(view);
      controller.abort();
    }
    expect(views).toHaveLength(1);
  });

  it('renders a run written by a foreign harness, from the client’s readers', async () => {
    const readers = new TranscriptReaderRegistry([passthroughReader('dsh')]);
    const api = fakeApi();
    const client = new GraphqlRunLogClient({
      request: api.request,
      readers,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });
    await client.append(RUN_ID, [{ type: 'turn/start', id: 'dsh-1' }], {
      transcriptFormat: 'dsh',
      transcriptVersion: 1,
    });

    const iterator = followRun(client, RUN_ID, { sleep: noSleep });
    const view = (await iterator.next()).value as RunView;
    // A surface passes no registry of its own: the client already knows which
    // formats it accepts, so following is enough to draw a non-pi run.
    expect(view.conversation.parts).toMatchObject([
      { kind: 'unknown', entryType: 'turn/start' },
    ]);
    await iterator.return();
  });

  it('collect helper reads consecutive views', async () => {
    const api = fakeApi();
    const client = clientFor(api);
    const views = await collect(
      followRun(client, RUN_ID, { sleep: noSleep }),
      2
    );
    expect(views).toHaveLength(2);
    expect(views.every((v) => v.records.length === 0)).toBe(true);
  });
});
