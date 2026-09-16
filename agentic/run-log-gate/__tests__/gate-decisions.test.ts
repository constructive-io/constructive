import type { RunGateDecisionRecord } from '@agentic-kit/harness';
import type { PiSessionEntry } from '@agentic-kit/run-log';
import { MemoryRunLogStore, projectToolState, readAll } from '@agentic-kit/run-log';

import { gateDecisionEntryId, runLogGateDecisions } from '../src/gate-decisions';

const decision = (overrides: Partial<RunGateDecisionRecord> = {}): RunGateDecisionRecord => ({
  runId: 'run-1',
  toolCallId: 'call-1',
  toolName: 'bash',
  input: { command: 'rm -rf /' },
  verdict: { decision: 'deny', reason: 'destructive commands are not permitted' },
  decision: 'deny',
  reason: 'destructive commands are not permitted',
  decidedAt: '2024-01-01T00:00:00.000Z',
  ...overrides
});

const message = (id: string, text: string): PiSessionEntry =>
  ({
    type: 'message',
    id,
    parentId: null,
    timestamp: '2024-01-01T00:00:00Z',
    message: { role: 'assistant', content: [{ type: 'text', text }] }
  }) as PiSessionEntry;

describe('runLogGateDecisions', () => {
  let store: MemoryRunLogStore;

  beforeEach(() => {
    store = new MemoryRunLogStore();
  });

  const recorder = () => runLogGateDecisions({ store, runId: 'run-1' });

  it('records a policy denial where a projector finds it', async () => {
    const decisions = recorder();
    decisions.onDecision(decision());
    await decisions.flush();

    const projected = projectToolState(await readAll(store, 'run-1'));
    expect(projected.gateDecisions['call-1']).toEqual(
      expect.objectContaining({
        toolCallId: 'call-1',
        toolName: 'bash',
        verdict: 'deny',
        decision: 'deny',
        reason: 'destructive commands are not permitted',
        decidedAt: '2024-01-01T00:00:00.000Z'
      })
    );
  });

  it('records the human who settled an asked-for call', async () => {
    const decisions = recorder();
    decisions.onDecision(
      decision({
        verdict: { decision: 'ask' },
        decision: 'allow',
        reason: 'looks fine',
        actorId: 'actor-7'
      })
    );
    await decisions.flush();

    expect(projectToolState(await readAll(store, 'run-1')).gateDecisions['call-1']).toEqual(
      expect.objectContaining({ verdict: 'ask', decision: 'allow', actorId: 'actor-7' })
    );
  });

  it('hangs the entry off the log\'s leaf so the session stays one tree', async () => {
    await store.append('run-1', [message('entry-1', 'thinking'), message('entry-2', 'calling bash')]);
    const decisions = recorder();
    decisions.onDecision(decision());
    await decisions.flush();

    const records = await readAll(store, 'run-1');
    const entry = records[records.length - 1].entry;
    expect(entry).toEqual(expect.objectContaining({ id: gateDecisionEntryId('call-1'), parentId: 'entry-2' }));
  });

  it('writes one entry when the same call is decided twice', async () => {
    const decisions = recorder();
    decisions.onDecision(decision());
    decisions.onDecision(decision({ reason: 're-evaluated after a retry' }));
    await decisions.flush();

    // Deterministic ids plus the store's idempotency: a retried execution must
    // not double-log its refusals.
    expect(await readAll(store, 'run-1')).toHaveLength(1);
  });

  it('keeps the log in decision order', async () => {
    const decisions = recorder();
    decisions.onDecision(decision());
    decisions.onDecision(decision({ toolCallId: 'call-2', toolName: 'write_file' }));
    await decisions.flush();

    const records = await readAll(store, 'run-1');
    expect(records.map((record) => record.entry.id)).toEqual([
      gateDecisionEntryId('call-1'),
      gateDecisionEntryId('call-2')
    ]);
  });

  it('throws the append failure out of flush instead of losing it', async () => {
    const failing = runLogGateDecisions({
      store: {
        append: () => Promise.reject(new Error('the log is unreachable')),
        read: store.read.bind(store)
      } as unknown as MemoryRunLogStore,
      runId: 'run-1'
    });
    failing.onDecision(decision());

    await expect(failing.flush()).rejects.toThrow('the log is unreachable');
  });
});
