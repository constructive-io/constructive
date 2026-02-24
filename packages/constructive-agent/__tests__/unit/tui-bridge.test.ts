import {
  createBufferedTuiBridge,
  publishToTui,
} from '../../src/adapters/tui/bridge';
import type { AgentRunEvent } from '../../src/types/events';

const event: AgentRunEvent = {
  runId: 'run-1',
  seq: 1,
  type: 'run_start',
  timestamp: Date.now(),
  payload: {
    actorId: 'actor-1',
    modelProvider: 'openai',
    modelName: 'gpt-4.1-mini',
  },
};

describe('TUI bridge helpers', () => {
  it('buffers and forwards events', () => {
    const forwarded: AgentRunEvent[] = [];
    const errors: Error[] = [];

    const bridge = createBufferedTuiBridge({
      onEvent: (incoming) => {
        forwarded.push(incoming);
      },
      onError: (error) => {
        errors.push(error);
      },
    });

    publishToTui(bridge, event);

    expect(forwarded).toHaveLength(1);
    expect(errors).toHaveLength(0);
    expect(bridge.getBuffer()).toHaveLength(1);

    bridge.clearBuffer();
    expect(bridge.getBuffer()).toHaveLength(0);
  });

  it('routes bridge handler exceptions to onError', () => {
    const errors: Error[] = [];
    const bridge = createBufferedTuiBridge({
      onEvent: () => {
        throw new Error('boom');
      },
      onError: (error) => {
        errors.push(error);
      },
    });

    publishToTui(bridge, event);

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('boom');
  });
});

