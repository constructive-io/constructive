import { MemoryRunLogStore } from '@agentic-kit/run-log';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

import { composeRun } from '../../src';

const identity = { databaseId: 'db-1', entityId: 'ent-1', actorId: 'actor-1' };
const gatewayUrl = 'https://gateway.constructive.io';
const models = [{ id: 'gpt-5', contextWindow: 200_000, maxTokens: 32_000 }];

describe('composeRun', () => {
  it('composes nothing but the host extensions when no lane is configured', () => {
    const hostExtension = jest.fn();
    const run = composeRun({ runId: 'run-1', extensions: [hostExtension] });

    expect(run.extensions).toEqual([hostExtension]);
    expect(run.lanes).toEqual({});
  });

  it('loads the lanes before the host extensions, so host tools are gated and logged', () => {
    const hostExtension = jest.fn();
    const run = composeRun({
      runId: 'run-1',
      log: { store: new MemoryRunLogStore() },
      metering: { mode: 'gateway', gatewayUrl, identity, models },
      gate: { policy: { defaultDecision: 'allow' } },
      extensions: [hostExtension]
    });

    expect(run.extensions).toHaveLength(4);
    expect(run.extensions[0]).toBe(run.lanes.log!.extension);
    expect(run.extensions[1]).toBe(run.lanes.meteredModel!.extension);
    expect(run.extensions[2]).toBe(run.lanes.gate!.extension);
    expect(run.extensions[3]).toBe(hostExtension);
  });

  it('threads the run id into every lane that records against a run', async () => {
    const store = new MemoryRunLogStore();
    const decisions: string[] = [];
    const run = composeRun({
      runId: 'run-42',
      log: { store },
      gate: { policy: { defaultDecision: 'allow' }, onDecision: (record) => decisions.push(record.runId) }
    });

    const handlers = new Map<string, (event: any, ctx: any) => unknown>();
    run.lanes.gate!.extension({ on: (event: string, handler: any) => handlers.set(event, handler) } as unknown as ExtensionAPI);
    await handlers.get('tool_call')!({ type: 'tool_call', toolCallId: 'c1', toolName: 'read', input: {} }, {});

    expect(decisions).toEqual(['run-42']);
    expect(run.runId).toBe('run-42');
  });

  it('picks the gateway lane as the metered one, with no self-report double count', () => {
    const run = composeRun({
      runId: 'run-1',
      metering: { mode: 'gateway', gatewayUrl, identity, models }
    });

    expect(run.lanes.meteredModel).toBeDefined();
    expect(run.lanes.usageReport).toBeUndefined();
    expect(run.lanes.meteredModel!.selectedModel).toBe('gpt-5');
  });

  it('picks the self-report lane for a run on the host’s own provider key', () => {
    const run = composeRun({
      runId: 'run-1',
      metering: { mode: 'self-report', identity, sink: () => Promise.resolve() }
    });

    expect(run.lanes.usageReport).toBeDefined();
    expect(run.lanes.meteredModel).toBeUndefined();
  });

  it('surfaces a lane’s own configuration error at compose time', () => {
    expect(() =>
      composeRun({
        runId: 'run-1',
        metering: { mode: 'gateway', gatewayUrl: `${gatewayUrl}/v1`, identity, models }
      })
    ).toThrow();

    // A policy that can ask needs somewhere to ask.
    expect(() => composeRun({ runId: 'run-1', gate: { policy: {} } })).toThrow(/approvals channel is required/);
  });

  it('flushes the log before usage, so a usage failure cannot cost the transcript', async () => {
    const order: string[] = [];
    const run = composeRun({
      runId: 'run-1',
      log: { store: new MemoryRunLogStore() },
      metering: {
        mode: 'self-report',
        identity,
        sink: () => {
          order.push('usage');
          return Promise.resolve();
        }
      }
    });

    const logFlush = jest.spyOn(run.lanes.log!, 'flush').mockImplementation(async () => {
      order.push('log');
      return [];
    });
    run.lanes.usageReport!.reporter.enqueue({
      model: 'gpt-5',
      provider: 'constructive',
      service: 'chat',
      operation: 'pi/chat',
      input_tokens: 1,
      output_tokens: 1,
      total_tokens: 2,
      latency_ms: 0,
      status: 'ok'
    });

    await run.flush();

    expect(logFlush).toHaveBeenCalled();
    expect(order).toEqual(['log', 'usage']);
  });

  it('propagates a flush failure instead of reporting a clean shutdown', async () => {
    const run = composeRun({
      runId: 'run-1',
      log: { store: new MemoryRunLogStore() }
    });
    jest.spyOn(run.lanes.log!, 'flush').mockRejectedValue(new Error('store unreachable'));

    await expect(run.flush()).rejects.toThrow('store unreachable');
  });
});
