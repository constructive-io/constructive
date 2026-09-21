import { GraphqlRunLogClient } from '../src/client';
import {
  adoptLocalRun,
  markLocalRunFailed,
  markLocalRunIdle,
  markLocalRunRunning,
  openLocalRun,
} from '../src/local-run';
import { fakeApi, fakeRun, RUN_ID } from './fake-api';

const clientFor = (api: ReturnType<typeof fakeApi>) =>
  new GraphqlRunLogClient({
    request: api.request,
    now: () => new Date('2026-01-01T00:00:00.000Z'),
  });

describe('openLocalRun', () => {
  it('opens a thread and a pending run marked local', async () => {
    const api = fakeApi();
    const store = clientFor(api);

    const { runId, threadId } = await openLocalRun({
      store,
      title: 'fix the build',
    });

    expect(api.calls).toEqual(['createThread', 'createRun']);
    expect(api.threads).toEqual([
      { id: threadId, title: 'fix the build', mode: 'agent' },
    ]);
    expect(api.created[0]).toMatchObject({
      id: runId,
      threadId,
      status: 'pending',
      placement: 'local',
    });
  });

  it('reuses a thread the host already has', async () => {
    const api = fakeApi();
    const { threadId } = await openLocalRun({
      store: clientFor(api),
      threadId: 'thread-existing',
    });

    expect(threadId).toBe('thread-existing');
    expect(api.calls).toEqual(['createRun']);
  });

  it('carries the workspace a local run works in', async () => {
    const api = fakeApi();
    await openLocalRun({
      store: clientFor(api),
      repoUrl: 'https://git.example/db.git',
      branch: 'agent/local',
    });

    expect(api.created[0]).toMatchObject({
      repoUrl: 'https://git.example/db.git',
      branch: 'agent/local',
    });
  });

  it('refuses a run the tenant did not open as local', async () => {
    const api = fakeApi();
    // A tenant that ignored the placement column would hand back a cloud run,
    // and a host that appended to it would file its events in the wrong lane.
    const raw = api.request;
    api.request = (async <T,>(
      query: string,
      variables?: Record<string, unknown>
    ): Promise<T> => {
      const data = await raw<T>(query, variables);
      if (query.includes('mutation CreateRun(')) {
        return {
          createAgentRun: { agentRun: fakeRun({ placement: 'cloud' }) },
        } as T;
      }
      return data;
    }) as typeof api.request;

    await expect(openLocalRun({ store: clientFor(api) })).rejects.toThrow(
      /was opened as placement 'cloud', not 'local'/
    );
  });
});

describe('adoptLocalRun', () => {
  it('adopts a local run this host opened earlier', async () => {
    const api = fakeApi(fakeRun({ placement: 'local' }));
    const run = await adoptLocalRun(clientFor(api), RUN_ID);
    expect(run.id).toBe(RUN_ID);
  });

  it('throws when a cached run is gone or belongs to someone else', async () => {
    const api = fakeApi(fakeRun({ placement: 'local' }));
    api.missing = true;
    await expect(adoptLocalRun(clientFor(api), RUN_ID)).rejects.toThrow(
      /not found, or not visible/
    );
  });

  it('refuses to take over a cloud run', async () => {
    const api = fakeApi(fakeRun({ placement: 'cloud' }));
    await expect(adoptLocalRun(clientFor(api), RUN_ID)).rejects.toThrow(
      /must not take over a cloud run/
    );
  });
});

describe('local run lifecycle', () => {
  it('moves the run row through running, idle and failed', async () => {
    const api = fakeApi(fakeRun({ placement: 'local', status: 'pending' }));
    const store = clientFor(api);

    await markLocalRunRunning(store, RUN_ID, new Date('2026-02-01T00:00:00Z'));
    expect(api.run).toMatchObject({
      status: 'running',
      startedAt: '2026-02-01T00:00:00.000Z',
    });

    await markLocalRunIdle(store, RUN_ID);
    expect(api.run.status).toBe('idle');

    await markLocalRunFailed(
      store,
      RUN_ID,
      new Error('provider key rejected'),
      new Date('2026-02-01T00:05:00Z')
    );
    expect(api.run).toMatchObject({
      status: 'failed',
      error: 'provider key rejected',
      finishedAt: '2026-02-01T00:05:00.000Z',
    });
  });

  it('refuses an empty patch instead of sending a no-op mutation', async () => {
    const api = fakeApi(fakeRun({ placement: 'local' }));
    await expect(clientFor(api).updateRun(RUN_ID, {})).rejects.toThrow(
      /empty patch/
    );
  });

  it('surfaces a run the tenant refused to update', async () => {
    const api = fakeApi(fakeRun({ placement: 'local' }));
    api.request = (async <T,>(query: string): Promise<T> => {
      if (query.includes('mutation AdvanceRun(')) {
        return { updateAgentRun: { agentRun: null } } as T;
      }
      throw new Error(`unexpected operation: ${query}`);
    }) as typeof api.request;

    await expect(markLocalRunIdle(clientFor(api), RUN_ID)).rejects.toThrow(
      /not visible or not writable/
    );
  });
});
