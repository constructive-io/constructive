import {
  InMemoryWebBridge,
} from '../../src/adapters/web/bridge';
import type { AgentRunEvent } from '../../src/types/events';

const eventFor = (runId: string, seq: number): AgentRunEvent => {
  return {
    runId,
    seq,
    type: 'run_start',
    timestamp: Date.now(),
    payload: {
      actorId: 'actor-1',
      modelProvider: 'openai',
      modelName: 'gpt-4.1-mini',
    },
  };
};

describe('InMemoryWebBridge', () => {
  it('publishes events only to subscribers of the same run', async () => {
    const bridge = new InMemoryWebBridge();
    const receivedA: AgentRunEvent[] = [];
    const receivedB: AgentRunEvent[] = [];

    const unsubscribeA = bridge.subscribe('run-a', (event) => {
      receivedA.push(event);
    });
    const unsubscribeB = bridge.subscribe('run-b', (event) => {
      receivedB.push(event);
    });

    await bridge.publish(eventFor('run-a', 1));
    await bridge.publish(eventFor('run-b', 1));

    expect(receivedA.map((event) => event.runId)).toEqual(['run-a']);
    expect(receivedB.map((event) => event.runId)).toEqual(['run-b']);

    unsubscribeA();
    unsubscribeB();
  });

  it('stops publishing after unsubscribe', async () => {
    const bridge = new InMemoryWebBridge();
    const received: AgentRunEvent[] = [];

    const unsubscribe = bridge.subscribe('run-a', (event) => {
      received.push(event);
    });

    await bridge.publish(eventFor('run-a', 1));
    unsubscribe();
    await bridge.publish(eventFor('run-a', 2));

    expect(received.map((event) => event.seq)).toEqual([1]);
  });

  it('supports global subscriptions across all runs', async () => {
    const bridge = new InMemoryWebBridge();
    const receivedRunIds: string[] = [];

    const unsubscribe = bridge.subscribeAll((event) => {
      receivedRunIds.push(event.runId);
    });

    await bridge.publish(eventFor('run-a', 1));
    await bridge.publish(eventFor('run-b', 1));

    expect(receivedRunIds).toEqual(['run-a', 'run-b']);

    unsubscribe();
  });

  it('continues fan-out delivery when one subscriber throws', async () => {
    const bridge = new InMemoryWebBridge();
    const perRunReceived: number[] = [];
    const globalReceived: number[] = [];

    bridge.subscribe('run-a', () => {
      throw new Error('subscriber failed');
    });
    bridge.subscribe('run-a', (event) => {
      perRunReceived.push(event.seq);
    });

    bridge.subscribeAll(() => {
      throw new Error('global subscriber failed');
    });
    bridge.subscribeAll((event) => {
      globalReceived.push(event.seq);
    });

    await expect(bridge.publish(eventFor('run-a', 1))).resolves.toBeUndefined();

    expect(perRunReceived).toEqual([1]);
    expect(globalReceived).toEqual([1]);
  });
});
