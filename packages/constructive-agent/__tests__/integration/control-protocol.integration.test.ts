import {
  InMemoryAgentControlProtocol,
} from '../../src/adapters/control/protocol';
import {
  InMemoryWebBridge,
} from '../../src/adapters/web/bridge';
import {
  createAgentRunner,
  type AgentRuntimeAdapter,
} from '../../src/runtime/create-agent-runner';
import type { ConstructiveAgentRunConfig } from '../../src/types/config';

const createConfig = (runId?: string): ConstructiveAgentRunConfig => {
  return {
    runId,
    model: {
      provider: 'openai',
      model: 'fake-model',
      systemPrompt: 'You are a test assistant.',
      thinkingLevel: 'off',
    },
    identity: {
      actorId: 'actor-1',
      tenantId: 'tenant-1',
      accessToken: 'token',
    },
    prompt: 'Run operation',
    tools: [],
  };
};

const waitForNextTick = async (): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, 15));
};

describe('control protocol + live bridge', () => {
  it('streams events and resumes run after approval through protocol', async () => {
    const runtimeAdapter: AgentRuntimeAdapter = {
      async execute(run, controller) {
        const approvals = await controller.listApprovals(run.id);

        const approved = approvals.find((approval) => approval.status === 'approved');
        if (approved) {
          await controller.markApprovalApplied(run.id, approved.id);
          await controller.transitionStatus(run.id, 'completed');
          return;
        }

        const pending = approvals.find((approval) => approval.status === 'pending');
        if (pending) {
          await controller.transitionStatus(run.id, 'needs_approval');
          return;
        }

        await controller.requestApproval({
          runId: run.id,
          toolName: 'write_entity',
          capability: 'write',
          riskClass: 'low',
          argsHash: 'fixed-hash',
          argsRedacted: {
            id: 'entity-1',
          },
          reason: 'approval required for write',
        });

        await controller.transitionStatus(run.id, 'needs_approval');
      },
    };

    const webBridge = new InMemoryWebBridge();
    const runner = createAgentRunner({
      runtimeAdapter,
      eventPublisher: webBridge,
    });
    const protocol = new InMemoryAgentControlProtocol(runner, webBridge);

    const streamedEvents: string[] = [];
    const unsubscribe = protocol.subscribeAll((event) => {
      streamedEvents.push(event.type);
    });

    const startResponse = await protocol.execute({
      type: 'start_run',
      payload: {
        config: createConfig(),
      },
    });

    expect(startResponse.ok).toBe(true);
    if (!startResponse.ok || !startResponse.data || Array.isArray(startResponse.data)) {
      throw new Error('invalid start response payload');
    }

    const runId = startResponse.data.id;
    expect(startResponse.data.status).toBe('needs_approval');
    expect(streamedEvents).toContain('approval_requested');

    const approveResponse = await protocol.execute({
      type: 'approve_pending',
      payload: {
        runId,
        options: {
          decidedBy: 'operator-1',
          reason: 'approved in test',
        },
      },
    });

    expect(approveResponse.ok).toBe(true);
    if (!approveResponse.ok || !approveResponse.data || Array.isArray(approveResponse.data)) {
      throw new Error('invalid approve response payload');
    }

    expect(approveResponse.data.status).toBe('completed');
    expect(streamedEvents).toContain('approval_decision');
    expect(streamedEvents).toContain('approval_applied');
    expect(streamedEvents).toContain('run_end');

    unsubscribe();
  });

  it('supports interruption via abort_run command', async () => {
    const runtimeAdapter: AgentRuntimeAdapter = {
      async execute(run, controller, _config, signal) {
        await controller.appendEvent(run.id, 'turn_start', {
          turnId: 'turn-1',
        });

        await new Promise<void>((resolve) => {
          if (signal?.aborted) {
            resolve();
            return;
          }

          const timer = setTimeout(() => {
            resolve();
          }, 500);

          signal?.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              resolve();
            },
            { once: true },
          );
        });

        if (signal?.aborted) {
          return;
        }

        await controller.transitionStatus(run.id, 'completed');
      },
    };

    const webBridge = new InMemoryWebBridge();
    const runner = createAgentRunner({
      runtimeAdapter,
      eventPublisher: webBridge,
    });
    const protocol = new InMemoryAgentControlProtocol(runner, webBridge);

    const events: string[] = [];
    const unsubscribe = protocol.subscribeAll((event) => {
      events.push(event.type);
    });

    const runId = 'run-abort-1';
    const startPromise = protocol.execute({
      type: 'start_run',
      payload: {
        config: createConfig(runId),
      },
    });

    await waitForNextTick();

    const abortResponse = await protocol.execute({
      type: 'abort_run',
      payload: {
        runId,
        reason: 'operator aborted',
      },
    });

    expect(abortResponse.ok).toBe(true);
    if (!abortResponse.ok || !abortResponse.data || Array.isArray(abortResponse.data)) {
      throw new Error('invalid abort response payload');
    }

    expect(abortResponse.data.status).toBe('aborted');

    const startRunResponse = await startPromise;
    expect(startRunResponse.ok).toBe(true);
    if (!startRunResponse.ok || !startRunResponse.data || Array.isArray(startRunResponse.data)) {
      throw new Error('invalid start response payload');
    }
    expect(startRunResponse.data.status).toBe('aborted');

    expect(events).toContain('run_status_changed');
    expect(events).toContain('run_end');

    unsubscribe();
  });
});
