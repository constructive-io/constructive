import {
  type ApprovalOutcome,
  type ApprovalRequest,
  type RunGateDecisionRecord,
  staticApprovalChannel
} from '@agentic-kit/harness';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

import { createGateExtension } from '../../src';

type Handler = (event: any, ctx: any) => unknown;

const fakePi = () => {
  const handlers = new Map<string, Handler>();
  const pi = {
    on: (event: string, handler: Handler) => {
      handlers.set(event, handler);
    }
  } as unknown as ExtensionAPI;
  return {
    pi,
    toolCall: (toolName: string, input: Record<string, unknown>, toolCallId = 'call-1') =>
      handlers.get('tool_call')?.({ type: 'tool_call', toolCallId, toolName, input }, {}) as Promise<
        { block?: boolean; reason?: string } | undefined
      >
  };
};

describe('createGateExtension', () => {
  it('lets an allowed tool run', async () => {
    const host = fakePi();
    createGateExtension({
      runId: 'run-1',
      policy: { rules: [{ tool: 'read', decision: 'allow' }], defaultDecision: 'deny' }
    }).extension(host.pi);

    await expect(host.toolCall('read', { path: 'a.ts' })).resolves.toEqual({});
  });

  it('blocks a denied tool with the policy reason, which is all the model sees', async () => {
    const host = fakePi();
    createGateExtension({
      runId: 'run-1',
      policy: { rules: [{ tool: 'bash', decision: 'deny', reason: 'no shell in this run' }], defaultDecision: 'allow' }
    }).extension(host.pi);

    await expect(host.toolCall('bash', { command: 'ls' })).resolves.toEqual({
      block: true,
      reason: 'no shell in this run'
    });
  });

  it('blocks with a generic reason when the policy gave none', async () => {
    const host = fakePi();
    createGateExtension({ runId: 'run-1', policy: { defaultDecision: 'deny' } }).extension(host.pi);

    await expect(host.toolCall('write', { path: 'a.ts' })).resolves.toEqual({
      block: true,
      reason: 'gate: write is not permitted in this run'
    });
  });

  it('suspends an asked tool call until the channel decides', async () => {
    let resolveOutcome: (outcome: ApprovalOutcome) => void = () => undefined;
    const seen: ApprovalRequest[] = [];
    const gate = createGateExtension({
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
    const host = fakePi();
    gate.extension(host.pi);

    const call = host.toolCall('bash', { command: 'rm -rf build' });
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
    await expect(call).resolves.toEqual({});
    expect(gate.pending.size).toBe(0);
  });

  it('blocks when the human denies, carrying their reason back to the model', async () => {
    const host = fakePi();
    createGateExtension({
      runId: 'run-1',
      policy: { defaultDecision: 'ask' },
      approvals: staticApprovalChannel({ decision: 'deny', reason: 'not on production data' })
    }).extension(host.pi);

    await expect(host.toolCall('bash', { command: 'psql' })).resolves.toEqual({
      block: true,
      reason: 'not on production data'
    });
  });

  it('stops tracking a request even when the channel fails', async () => {
    const gate = createGateExtension({
      runId: 'run-1',
      policy: { defaultDecision: 'ask' },
      approvals: { request: () => Promise.reject(new Error('api down')) }
    });
    const host = fakePi();
    gate.extension(host.pi);

    await expect(host.toolCall('bash', {})).rejects.toThrow('api down');
    expect(gate.pending.size).toBe(0);
  });

  it('records every settled decision for the audit trail', async () => {
    const records: RunGateDecisionRecord[] = [];
    const host = fakePi();
    createGateExtension({
      runId: 'run-1',
      policy: { rules: [{ tool: 'read', decision: 'allow' }], defaultDecision: 'ask' },
      approvals: staticApprovalChannel({ decision: 'deny', reason: 'rejected', actorId: 'user-1' }),
      onDecision: (record) => records.push(record),
      now: () => new Date('2026-01-01T00:00:00.000Z')
    }).extension(host.pi);

    await host.toolCall('read', { path: 'a.ts' }, 'call-a');
    await host.toolCall('bash', { command: 'ls' }, 'call-b');

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
    expect(() => createGateExtension({ runId: 'run-1', policy: {} })).toThrow(/approvals channel is required/);
    expect(() =>
      createGateExtension({
        runId: 'run-1',
        policy: { rules: [{ tool: 'bash', decision: 'ask' }], defaultDecision: 'allow' }
      })
    ).toThrow(/approvals channel is required/);
  });

  it('needs no channel when the policy only allows and denies', () => {
    expect(() =>
      createGateExtension({
        runId: 'run-1',
        policy: { rules: [{ tool: 'bash', decision: 'deny' }], defaultDecision: 'allow' }
      })
    ).not.toThrow();
  });
});
