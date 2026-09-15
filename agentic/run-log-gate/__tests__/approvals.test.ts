import type { ApprovalRequest } from '@agentic-kit/harness';
import type { PiSessionEntry } from '@agentic-kit/run-log';
import { MemoryRunLogStore, projectToolState, readAll } from '@agentic-kit/run-log';

import { approvalEntryId, resolveApproval, runLogApprovals } from '../src/approvals';

const request = (overrides: Partial<ApprovalRequest> = {}): ApprovalRequest => ({
  runId: 'run-1',
  toolCallId: 'call-1',
  toolName: 'bash',
  input: { command: 'rm -rf /' },
  reason: 'policy asks about destructive commands',
  requestedAt: '2024-01-01T00:00:00.000Z',
  ...overrides
});

/** Let every pending read/append settle — the submit is several awaits deep. */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const message = (id: string, text: string): PiSessionEntry =>
  ({
    type: 'message',
    id,
    parentId: null,
    timestamp: '2024-01-01T00:00:00Z',
    message: { role: 'assistant', content: [{ type: 'text', text }] }
  }) as PiSessionEntry;

describe('runLogApprovals', () => {
  let store: MemoryRunLogStore;

  beforeEach(() => {
    store = new MemoryRunLogStore();
  });

  const channel = (overrides: Partial<Parameters<typeof runLogApprovals>[0]> = {}) =>
    runLogApprovals({
      store,
      runId: 'run-1',
      intervalMs: 0,
      // A macrotask rather than a microtask: a poll loop that only ever yields to
      // the microtask queue starves the run's timers for as long as it spins.
      sleep: () => new Promise<void>((resolve) => setImmediate(resolve)),
      now: () => new Date('2024-01-01T00:00:00.000Z'),
      ...overrides
    });

  it('writes the request into the log where a projector finds it pending', async () => {
    const pending = channel().request(request());
    // Let the submit land before answering, the way a human would.
    await flush();

    const projected = projectToolState(await readAll(store, 'run-1'));
    expect(projected.pendingApprovals).toEqual([
      expect.objectContaining({
        toolCallId: 'call-1',
        prompt: 'bash: policy asks about destructive commands'
      })
    ]);

    await resolveApproval(store, 'run-1', { toolCallId: 'call-1', decision: 'approved' });
    await expect(pending).resolves.toEqual({ decision: 'allow' });
  });

  it('carries the resolution\'s reason and actor back to the gate', async () => {
    const pending = channel().request(request());
    await flush();
    await resolveApproval(store, 'run-1', {
      toolCallId: 'call-1',
      decision: 'rejected',
      reason: 'not on production',
      actorId: 'user-7'
    });

    await expect(pending).resolves.toEqual({
      decision: 'deny',
      reason: 'not on production',
      actorId: 'user-7'
    });
  });

  it('sees a resolution appended after unrelated entries in a later page', async () => {
    const pending = channel({ pageLimit: 1 }).request(request());
    await flush();
    await store.append('run-1', [message('chatter-1', 'still thinking')]);
    await store.append('run-1', [message('chatter-2', 'still thinking')]);
    await resolveApproval(store, 'run-1', { toolCallId: 'call-1', decision: 'approved' });

    await expect(pending).resolves.toEqual({ decision: 'allow' });
  });

  it('asks once when a submit is retried, because the entry id is the tool call', async () => {
    const first = channel().request(request());
    await flush();
    const second = channel().request(request());
    await flush();

    await resolveApproval(store, 'run-1', { toolCallId: 'call-1', decision: 'approved' });
    await expect(first).resolves.toEqual({ decision: 'allow' });
    await expect(second).resolves.toEqual({ decision: 'allow' });

    const records = await readAll(store, 'run-1');
    const requests = records.filter(
      (candidate) => (candidate.entry as { id?: string }).id === approvalEntryId('call-1')
    );
    expect(requests).toHaveLength(1);
  });

  it('hangs the request off the log\'s leaf so the session stays one tree', async () => {
    await store.append('run-1', [message('leaf', 'about to run a tool')]);
    // Bounded so the request settles instead of polling past the assertion.
    const pending = channel({ timeoutMs: 0 }).request(request());
    await pending;

    const records = await readAll(store, 'run-1');
    const submitted = records[records.length - 1].entry as { parentId?: string | null };
    expect(submitted.parentId).toBe('leaf');
  });

  it('denies on timeout rather than proceeding unapproved', async () => {
    let clock = 0;
    const outcome = await runLogApprovals({
      store,
      runId: 'run-1',
      intervalMs: 1,
      timeoutMs: 10,
      sleep: () => {
        clock += 10;
        return Promise.resolve();
      },
      now: () => new Date(clock)
    }).request(request());

    expect(outcome).toEqual({ decision: 'deny', reason: 'gate: no decision within 10ms' });
  });

  it('can be told to allow on timeout', async () => {
    let clock = 0;
    const outcome = await runLogApprovals({
      store,
      runId: 'run-1',
      intervalMs: 1,
      timeoutMs: 10,
      onTimeout: 'allow',
      sleep: () => {
        clock += 10;
        return Promise.resolve();
      },
      now: () => new Date(clock)
    }).request(request());

    expect(outcome.decision).toBe('allow');
  });
});
