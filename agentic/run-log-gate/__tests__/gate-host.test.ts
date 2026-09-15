import type { RunLogStore } from '@agentic-kit/run-log';
import { MemoryRunLogStore, projectToolState, readAll } from '@agentic-kit/run-log';

import { resolveApproval } from '../src/approvals';
import { createRunLogGateHost, SKIPPED_REASON } from '../src/gate-host';

/** Let every pending read/append settle — the submit is several awaits deep. */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('createRunLogGateHost', () => {
  let store: MemoryRunLogStore;

  beforeEach(() => {
    store = new MemoryRunLogStore();
  });

  const host = (overrides: Partial<Parameters<typeof createRunLogGateHost>[0]> = {}) =>
    createRunLogGateHost({
      store,
      runId: 'run-1',
      intervalMs: 0,
      sleep: () => new Promise<void>((resolve) => setImmediate(resolve)),
      now: () => new Date('2024-01-01T00:00:00.000Z'),
      ...overrides
    });

  it('has a UI: the run log is where the question is asked', () => {
    expect(host().hasUI).toBe(true);
  });

  it('asks in the log, with the title and message a human reads', async () => {
    const requested: unknown[] = [];
    const gate = host({ onRequested: (request) => requested.push(request) });
    const pending = gate.confirmTool('call-1', 'Allow bash?', 'The agent wants to run `ls`.');
    await flush();

    expect(requested).toEqual([
      { toolCallId: 'call-1', title: 'Allow bash?', message: 'The agent wants to run `ls`.' }
    ]);
    const records = await readAll(store, 'run-1');
    expect(records.map((record) => record.entry.id)).toEqual(['approval-call-1']);
    expect(projectToolState(records).pendingApprovals).toEqual([
      expect.objectContaining({
        toolCallId: 'call-1',
        prompt: 'Allow bash?\n\nThe agent wants to run `ls`.'
      })
    ]);

    await resolveApproval(store, 'run-1', { toolCallId: 'call-1', decision: 'approved' });
    await expect(pending).resolves.toBe(true);
  });

  it('settles on the resolution a human wrote and files it as the gate decision', async () => {
    const decided: unknown[] = [];
    const gate = host({ onDecided: (decision) => decided.push(decision) });
    const pending = gate.confirmTool('call-1', 'Allow bash?', 'rm -rf /');
    await flush();
    await resolveApproval(store, 'run-1', {
      toolCallId: 'call-1',
      decision: 'rejected',
      reason: 'not on a Friday',
      actorId: 'alice'
    });

    await expect(pending).resolves.toBe(false);
    await gate.drain();

    expect(decided).toEqual([
      { toolCallId: 'call-1', allowed: false, reason: 'not on a Friday', actorId: 'alice' }
    ]);
    const projected = projectToolState(await readAll(store, 'run-1'));
    expect(projected.pendingApprovals).toEqual([]);
    expect(projected.gateDecisions['call-1']).toEqual(
      expect.objectContaining({
        toolCallId: 'call-1',
        toolName: 'Allow bash?',
        verdict: 'ask',
        decision: 'deny',
        reason: 'not on a Friday',
        actorId: 'alice',
        decidedAt: '2024-01-01T00:00:00.000Z'
      })
    );
  });

  it('denies when nobody answers in time', async () => {
    const gate = host({ timeoutMs: 0 });
    await expect(gate.confirmTool('call-1', 'Allow bash?', 'ls')).resolves.toBe(false);
    await gate.drain();

    const projected = projectToolState(await readAll(store, 'run-1'));
    expect(projected.gateDecisions['call-1']).toEqual(
      expect.objectContaining({ decision: 'deny', reason: expect.stringContaining('no decision') })
    );
  });

  it('records a skipped repeat as a denial the projector settles the call with', async () => {
    const gate = host();
    gate.notifyToolSkipped('call-9');
    await gate.drain();

    const projected = projectToolState(await readAll(store, 'run-1'));
    expect(projected.gateDecisions['call-9']).toEqual(
      expect.objectContaining({ toolCallId: 'call-9', decision: 'deny', reason: SKIPPED_REASON })
    );
  });

  it('rethrows a decision write that failed from drain rather than losing it', async () => {
    const failing: RunLogStore = {
      read: (runId, cursor, limit) => store.read(runId, cursor, limit),
      append: async () => {
        throw new Error('log unavailable');
      }
    };
    const gate = host({ store: failing });
    gate.notifyToolSkipped('call-9');
    await expect(gate.drain()).rejects.toThrow('log unavailable');
  });
});
