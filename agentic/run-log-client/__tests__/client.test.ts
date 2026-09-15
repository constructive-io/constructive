import {
  APPROVAL_REQUEST_TYPE,
  passthroughReader,
  projectParts,
  projectToolState,
  type RunEventRecord,
  TranscriptReaderRegistry,
} from '@agentic-kit/run-log';

import { GraphqlRunLogClient, isSeqConflict } from '../src/client';
import {
  type FakeApi,
  fakeApi,
  fakeRun,
  messageEntry,
  RUN_ID,
} from './fake-api';

const clientFor = (api: FakeApi, ids: string[] = []) => {
  let next = 0;
  return new GraphqlRunLogClient({
    request: api.request,
    newId: () => ids[next++] ?? `id-${next}`,
    now: () => new Date('2026-01-01T00:00:00.000Z'),
  });
};

describe('GraphqlRunLogClient reads', () => {
  it('reads a page and reports the cursor it reached', async () => {
    const api = fakeApi();
    const client = clientFor(api);
    await client.append(RUN_ID, [
      messageEntry('a', 'one'),
      messageEntry('b', 'two', 'a'),
    ]);

    const page = await client.read(RUN_ID);
    expect(page.records.map((r) => r.seq)).toEqual([1, 2]);
    expect(page.cursor).toEqual({ afterSeq: 2 });

    const tail = await client.read(RUN_ID, page.cursor);
    expect(tail.records).toEqual([]);
    // An empty read must not rewind the caller's cursor.
    expect(tail.cursor).toEqual({ afterSeq: 2 });
  });

  it('reads only what follows the cursor', async () => {
    const api = fakeApi();
    const client = clientFor(api);
    await client.append(RUN_ID, [
      messageEntry('a', 'one'),
      messageEntry('b', 'two', 'a'),
      messageEntry('c', 'three', 'b'),
    ]);

    const page = await client.read(RUN_ID, { afterSeq: 2 });
    expect(page.records.map((r) => r.seq)).toEqual([3]);
  });

  it('throws when the run is not visible instead of rendering an empty one', async () => {
    const api = fakeApi();
    api.missing = true;
    await expect(clientFor(api).getRun(RUN_ID)).rejects.toThrow(
      /not found, or not visible/
    );
  });

  it('lists runs by thread', async () => {
    const api = fakeApi();
    const runs = await clientFor(api).listRuns({ threadId: 'thread-1' });
    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe(RUN_ID);
  });
});

describe('GraphqlRunLogClient appends', () => {
  it('allocates seq from the run cursor and advances it', async () => {
    const api = fakeApi();
    const client = clientFor(api);

    const written = await client.append(RUN_ID, [messageEntry('a', 'one')]);
    expect(written.map((r) => r.seq)).toEqual([1]);
    expect(api.run.lastEventSeq).toBe(1);

    const more = await client.append(RUN_ID, [messageEntry('b', 'two', 'a')]);
    expect(more.map((r) => r.seq)).toEqual([2]);
    expect(api.run.lastEventSeq).toBe(2);
  });

  it('appending nothing touches nothing', async () => {
    const api = fakeApi();
    await clientFor(api).append(RUN_ID, []);
    expect(api.calls).toEqual([]);
  });

  it('re-reads and retries when another writer takes the sequence', async () => {
    const api = fakeApi();
    const client = clientFor(api);

    // The Job appends at seq 1 in the instant between our read and our insert.
    let raced = false;
    api.beforeInsert = (row) => {
      if (raced) return;
      raced = true;
      api.events.push({ ...row, entry: messageEntry('job', 'from the job') });
      api.run.lastEventSeq = row.seq;
    };

    const written = await client.append(RUN_ID, [messageEntry('mine', 'hi')]);
    expect(written.map((r) => r.seq)).toEqual([2]);
    expect(api.events.map((r) => r.seq)).toEqual([1, 2]);
    expect(api.events[1].entry.id).toBe('mine');
  });

  it('is idempotent when the same entries are appended twice', async () => {
    const api = fakeApi();
    const client = clientFor(api);
    const entries = [messageEntry('a', 'one'), messageEntry('b', 'two', 'a')];

    await client.append(RUN_ID, entries);
    const second = await client.append(RUN_ID, entries);

    expect(second).toEqual([]);
    expect(api.events).toHaveLength(2);
  });

  it('gives up loudly when the sequence stays contended', async () => {
    const api = fakeApi();
    const client = new GraphqlRunLogClient({
      request: api.request,
      maxAppendAttempts: 2,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });
    // Every attempt loses the race, and the run cursor never moves.
    api.beforeInsert = (row) => {
      if (api.events.some((e) => e.seq === row.seq)) return;
      api.events.push({ ...row, entry: messageEntry(`other-${row.seq}`, 'x') });
    };

    await expect(
      client.append(RUN_ID, [messageEntry('mine', 'hi')])
    ).rejects.toThrow(/sequence is contended/);
  });

  it('rethrows a failure that is not a sequence conflict', async () => {
    const api = fakeApi();
    api.beforeInsert = () => {
      throw new Error('permission denied for table agent_event');
    };
    await expect(
      clientFor(api).append(RUN_ID, [messageEntry('a', 'one')])
    ).rejects.toThrow(/permission denied/);
  });
});

describe('GraphqlRunLogClient writes for the user', () => {
  it('chains a prompt to the run tail so the session stays loadable', async () => {
    const api = fakeApi();
    const client = clientFor(api, ['new-entry']);
    await client.append(RUN_ID, [messageEntry('a', 'one')]);

    const written = await client.prompt(RUN_ID, 'do the thing');
    expect(written).toHaveLength(1);
    const entry = written[0].entry;
    expect(entry.parentId).toBe('a');
    expect(entry.message).toMatchObject({
      role: 'user',
      content: 'do the thing',
    });
  });

  it('refuses an empty prompt', async () => {
    await expect(clientFor(fakeApi()).prompt(RUN_ID, '   ')).rejects.toThrow(
      /empty prompt/
    );
  });

  it('resolves an approval as a log entry the projection reads', async () => {
    const api = fakeApi(fakeRun());
    const client = clientFor(api, ['resolution']);
    await client.append(RUN_ID, [
      {
        id: 'call',
        parentId: null,
        timestamp: '2026-01-01T00:00:00.000Z',
        type: 'message',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'toolCall',
              id: 'call-1',
              name: 'bash',
              arguments: { command: 'rm -rf /' },
            },
          ],
        },
      },
      {
        id: 'req',
        parentId: 'call',
        timestamp: '2026-01-01T00:00:00.000Z',
        type: 'message',
        message: {
          role: 'custom',
          customType: APPROVAL_REQUEST_TYPE,
          content: 'run `rm -rf /`?',
          display: true,
          details: { toolCallId: 'call-1' },
        },
      },
    ]);

    await client.resolveApproval(RUN_ID, {
      toolCallId: 'call-1',
      decision: 'rejected',
      reason: 'absolutely not',
      actorId: 'user-1',
    });

    const records = (await client.read(RUN_ID)).records as RunEventRecord[];
    const projection = projectToolState(records);
    expect(projection.pendingApprovals).toEqual([]);
    expect(projection.tools['call-1'].status).toBe('rejected');
    expect(projection.tools['call-1'].approval).toMatchObject({
      decision: 'rejected',
      reason: 'absolutely not',
      actorId: 'user-1',
    });
  });
});

describe('GraphqlRunLogClient is transcript-neutral', () => {
  const dshReaders = new TranscriptReaderRegistry([passthroughReader('dsh')]);
  const dshClient = (api: FakeApi) =>
    new GraphqlRunLogClient({
      request: api.request,
      readers: dshReaders,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });
  const dshOptions = { transcriptFormat: 'dsh', transcriptVersion: 1 };

  it('stores a foreign harness entry under the format the caller names', async () => {
    const api = fakeApi();
    const client = dshClient(api);

    const written = await client.append(
      RUN_ID,
      [{ type: 'turn/start', id: 'dsh-1', turn: 1 }],
      dshOptions
    );

    // Verbatim: the log is not a re-encoding, so the harness's own reader sees
    // exactly the entry it wrote.
    expect(written[0]).toMatchObject({
      transcriptFormat: 'dsh',
      transcriptVersion: 1,
      entry: { type: 'turn/start', id: 'dsh-1', turn: 1 },
    });
  });

  it('reads a foreign run back and renders it as an unknown part', async () => {
    const api = fakeApi();
    const client = dshClient(api);
    await client.append(RUN_ID, [{ type: 'turn/start', id: 'dsh-1' }], dshOptions);

    const { records } = await client.read(RUN_ID);
    // Without pi's reader in the registry, a non-pi log still projects: it
    // renders as an unknown part rather than failing or coming back empty.
    expect(projectParts(records, { readers: dshReaders }).parts).toMatchObject([
      { kind: 'unknown', entryType: 'turn/start' },
    ]);
  });

  it('de-duplicates a foreign entry by its own id', async () => {
    const api = fakeApi();
    const client = dshClient(api);
    const entries = [{ type: 'turn/start', id: 'dsh-1' }];

    await client.append(RUN_ID, entries, dshOptions);
    expect(await client.append(RUN_ID, entries, dshOptions)).toEqual([]);
    expect(api.events).toHaveLength(1);
  });
});

describe('isSeqConflict', () => {
  it('recognises the unique violation and nothing else', () => {
    expect(
      isSeqConflict(new Error('duplicate key value violates unique constraint'))
    ).toBe(true);
    expect(isSeqConflict(new Error('permission denied'))).toBe(false);
  });
});
