import { type ApprovalOutcome, type ApprovalRequest, createRunGate, type RunGateDecisionRecord, staticApprovalChannel } from '../src';

describe('createRunGate', () => {
  it('allows a permitted tool', async () => {
    const gate = createRunGate({
      runId: 'run-1',
      policy: { rules: [{ tool: 'read', decision: 'allow' }], defaultDecision: 'deny' }
    });

    await expect(gate.decide({ toolCallId: 'call-1', toolName: 'read', input: { path: 'a.ts' } })).resolves.toEqual({
      allowed: true
    });
  });

  it('refuses with the policy reason, which is all the model sees', async () => {
    const gate = createRunGate({
      runId: 'run-1',
      policy: { rules: [{ tool: 'bash', decision: 'deny', reason: 'no shell in this run' }], defaultDecision: 'allow' }
    });

    await expect(gate.decide({ toolCallId: 'call-1', toolName: 'bash', input: { command: 'ls' } })).resolves.toEqual({
      allowed: false,
      reason: 'no shell in this run'
    });
  });

  it('refuses with a generic reason when the policy gave none', async () => {
    const gate = createRunGate({ runId: 'run-1', policy: { defaultDecision: 'deny' } });

    await expect(gate.decide({ toolCallId: 'call-1', toolName: 'write', input: { path: 'a.ts' } })).resolves.toEqual({
      allowed: false,
      reason: 'gate: write is not permitted in this run'
    });
  });

  it('suspends an asked call until the channel decides', async () => {
    let resolveOutcome: (outcome: ApprovalOutcome) => void = () => undefined;
    const seen: ApprovalRequest[] = [];
    const gate = createRunGate({
      runId: 'run-1',
      policy: { defaultDecision: 'ask', defaultReason: 'needs review' },
      approvals: {
        request: (req) => {
          seen.push(req);
          return new Promise<ApprovalOutcome>((resolve) => {
            resolveOutcome = resolve;
          });
        }
      }
    });

    const decision = gate.decide({ toolCallId: 'call-1', toolName: 'bash', input: { command: 'rm -rf build' } });
    await Promise.resolve();

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      runId: 'run-1',
      toolCallId: 'call-1',
      toolName: 'bash',
      input: { command: 'rm -rf build' },
      reason: 'needs review'
    });
    expect(gate.pending.get('call-1')).toBeDefined();

    resolveOutcome({ decision: 'allow', actorId: 'user-1' });
    await expect(decision).resolves.toEqual({ allowed: true });
    expect(gate.pending.size).toBe(0);
  });

  it('carries a human denial reason back to the model', async () => {
    const gate = createRunGate({
      runId: 'run-1',
      policy: { defaultDecision: 'ask' },
      approvals: staticApprovalChannel({ decision: 'deny', reason: 'not on production data' })
    });

    await expect(gate.decide({ toolCallId: 'call-1', toolName: 'bash', input: { command: 'psql' } })).resolves.toEqual({
      allowed: false,
      reason: 'not on production data'
    });
  });

  it('stops tracking a request even when the channel fails', async () => {
    const gate = createRunGate({
      runId: 'run-1',
      policy: { defaultDecision: 'ask' },
      approvals: { request: () => Promise.reject(new Error('api down')) }
    });

    await expect(gate.decide({ toolCallId: 'call-1', toolName: 'bash' })).rejects.toThrow('api down');
    expect(gate.pending.size).toBe(0);
  });

  it('records every settled decision for the audit trail', async () => {
    const records: RunGateDecisionRecord[] = [];
    const gate = createRunGate({
      runId: 'run-1',
      policy: { rules: [{ tool: 'read', decision: 'allow' }], defaultDecision: 'ask' },
      approvals: staticApprovalChannel({ decision: 'deny', reason: 'rejected', actorId: 'user-1' }),
      onDecision: (record) => records.push(record),
      now: () => new Date('2026-01-01T00:00:00.000Z')
    });

    await gate.decide({ toolCallId: 'call-a', toolName: 'read', input: { path: 'a.ts' } });
    await gate.decide({ toolCallId: 'call-b', toolName: 'bash', input: { command: 'ls' } });

    expect(records).toEqual([
      {
        runId: 'run-1',
        toolCallId: 'call-a',
        toolName: 'read',
        input: { path: 'a.ts' },
        verdict: { decision: 'allow', rule: { tool: 'read', decision: 'allow' } },
        decision: 'allow',
        decidedAt: '2026-01-01T00:00:00.000Z'
      },
      {
        runId: 'run-1',
        toolCallId: 'call-b',
        toolName: 'bash',
        input: { command: 'ls' },
        verdict: { decision: 'ask' },
        decision: 'deny',
        reason: 'rejected',
        actorId: 'user-1',
        decidedAt: '2026-01-01T00:00:00.000Z'
      }
    ]);
  });

  it('refuses to start a policy that can ask with nowhere to ask', () => {
    expect(() => createRunGate({ runId: 'run-1', policy: {} })).toThrow(/approvals channel is required/);
    expect(() =>
      createRunGate({
        runId: 'run-1',
        policy: { rules: [{ tool: 'bash', decision: 'ask' }], defaultDecision: 'allow' }
      })
    ).toThrow(/approvals channel is required/);
  });

  it('needs no channel when the policy only allows and denies', () => {
    expect(() =>
      createRunGate({
        runId: 'run-1',
        policy: { rules: [{ tool: 'bash', decision: 'deny' }], defaultDecision: 'allow' }
      })
    ).not.toThrow();
  });
});
