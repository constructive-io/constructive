import { replayRunEvents } from '../../src/runtime/replay';
import type { AgentRunEvent } from '../../src/types/events';

describe('replayRunEvents', () => {
  it('reconstructs run and approval state from event journal', () => {
    const events: AgentRunEvent[] = [
      {
        runId: 'run-1',
        seq: 1,
        type: 'run_start',
        timestamp: 1000,
        payload: {
          actorId: 'actor-1',
          modelProvider: 'openai',
          modelName: 'gpt-4.1-mini',
        },
      },
      {
        runId: 'run-1',
        seq: 2,
        type: 'run_status_changed',
        timestamp: 1001,
        payload: {
          from: 'queued',
          to: 'running',
        },
      },
      {
        runId: 'run-1',
        seq: 3,
        type: 'approval_requested',
        timestamp: 1002,
        payload: {
          requestId: 'approval-1',
          toolName: 'write_entity',
          reason: 'requires approval',
          argsRedacted: {
            id: 'entity-1',
          },
        },
      },
      {
        runId: 'run-1',
        seq: 4,
        type: 'approval_decision',
        timestamp: 1003,
        payload: {
          requestId: 'approval-1',
          decision: 'approved',
          decidedBy: 'operator-1',
        },
      },
      {
        runId: 'run-1',
        seq: 5,
        type: 'approval_applied',
        timestamp: 1004,
        payload: {
          requestId: 'approval-1',
          toolName: 'write_entity',
        },
      },
      {
        runId: 'run-1',
        seq: 6,
        type: 'run_status_changed',
        timestamp: 1005,
        payload: {
          from: 'running',
          to: 'completed',
        },
      },
      {
        runId: 'run-1',
        seq: 7,
        type: 'run_end',
        timestamp: 1006,
        payload: {
          status: 'completed',
        },
      },
    ];

    const snapshot = replayRunEvents(events);
    expect(snapshot.run).toMatchObject({
      id: 'run-1',
      actorId: 'actor-1',
      status: 'completed',
      endedAt: 1006,
    });
    expect(snapshot.approvals).toEqual([
      {
        requestId: 'approval-1',
        toolName: 'write_entity',
        status: 'applied',
        requestedAt: 1002,
        decidedAt: 1003,
        decidedBy: 'operator-1',
        reason: undefined,
      },
    ]);
  });
});

