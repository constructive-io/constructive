import {
  createAgentRunner,
} from '../../src/runtime/create-agent-runner';
import {
  PolicyMatrixApprovalAuthorizer,
} from '../../src/policy/approval-authorizer';
import {
  createPiRuntimeAdapter,
  type PiRuntimeLoader,
} from '../../src/runtime/pi-runtime-adapter';
import type { ConstructiveAgentRunConfig } from '../../src/types/config';
import type { AgentToolDefinition } from '../../src/types/tools';

type EventListener = (
  event: { type: string } & Record<string, unknown>,
) => void | Promise<void>;

class FakeAgent {
  private listeners = new Set<EventListener>();
  private tools: Array<{
    name: string;
    execute: (
      toolCallId: string,
      args: Record<string, unknown>,
      signal?: AbortSignal,
      onUpdate?: (partialResult: Record<string, unknown>) => void,
    ) => Promise<Record<string, unknown>>;
  }> = [];

  setTools(tools: any[]): void {
    this.tools = tools;
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  abort(): void {
    // no-op
  }

  async prompt(_input: string): Promise<void> {
    const tool = this.tools[0];
    if (!tool) return;

    const args = {
      id: 'entity-1',
      accessToken: 'sensitive-token',
    };

    await this.emit({ type: 'turn_start' });
    await this.emit({
      type: 'tool_execution_start',
      toolCallId: 'tool-call-1',
      toolName: tool.name,
      args,
    });

    try {
      const result = await tool.execute('tool-call-1', args, undefined);
      await this.emit({
        type: 'tool_execution_end',
        toolCallId: 'tool-call-1',
        toolName: tool.name,
        isError: false,
        result,
      });
    } catch (error) {
      await this.emit({
        type: 'tool_execution_end',
        toolCallId: 'tool-call-1',
        toolName: tool.name,
        isError: true,
        result: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    await this.emit({
      type: 'turn_end',
      message: {
        stopReason: 'stop',
      },
    });
  }

  private async emit(
    event: { type: string } & Record<string, unknown>,
  ): Promise<void> {
    for (const listener of this.listeners) {
      await listener(event);
    }
  }
}

const createLoader = (): PiRuntimeLoader => {
  return {
    getModel(): unknown {
      return {
        id: 'fake-model',
        provider: 'openai',
        api: 'openai-responses',
      };
    },

    createAgent(_input): any {
      return new FakeAgent() as any;
    },

    createAnyParametersSchema(): unknown {
      return {
        type: 'object',
        properties: {},
      };
    },
  };
};

const createConfig = (
  tool: AgentToolDefinition,
): ConstructiveAgentRunConfig => {
  return {
    model: {
      provider: 'openai',
      model: 'fake-model',
      systemPrompt: 'You are a test assistant.',
      thinkingLevel: 'off',
    },
    identity: {
      actorId: 'actor-1',
      accessToken: 'token',
      tenantId: 'tenant-1',
    },
    prompt: 'Update entity',
    tools: [tool],
  };
};

describe('approval lifecycle', () => {
  it('pauses on needs_approval and resumes after approval', async () => {
    const toolExecute = jest.fn(async () => {
      return {
        content: {
          id: 'entity-1',
          ok: true,
        },
      };
    });

    const tool: AgentToolDefinition = {
      name: 'write_entity',
      label: 'Write Entity',
      description: 'Writes an entity',
      capability: 'write',
      riskClass: 'low',
      execute: toolExecute,
    };

    const runtimeAdapter = createPiRuntimeAdapter({
      loader: createLoader(),
    });

    const runner = createAgentRunner({
      runtimeAdapter,
    });

    const firstRun = await runner.startRun(createConfig(tool));
    expect(firstRun.status).toBe('needs_approval');
    expect(toolExecute).toHaveBeenCalledTimes(0);

    const approvals = await runner.listApprovals(firstRun.id);
    expect(approvals).toHaveLength(1);
    expect(approvals[0].status).toBe('pending');

    const resumedRun = await runner.approvePending(firstRun.id, {
      decidedBy: 'operator-1',
      reason: 'approved for test',
    });

    expect(resumedRun.status).toBe('completed');
    expect(toolExecute).toHaveBeenCalledTimes(1);

    const finalApprovals = await runner.listApprovals(firstRun.id);
    expect(finalApprovals[0].status).toBe('applied');
  });

  it('redacts sensitive fields in approval_requested event payload', async () => {
    const tool: AgentToolDefinition = {
      name: 'write_entity',
      label: 'Write Entity',
      description: 'Writes an entity',
      capability: 'write',
      riskClass: 'low',
      execute: async () => {
        return {
          content: {
            ok: true,
          },
        };
      },
    };

    const runtimeAdapter = createPiRuntimeAdapter({
      loader: createLoader(),
    });

    const runner = createAgentRunner({
      runtimeAdapter,
    });

    const run = await runner.startRun(createConfig(tool));
    expect(run.status).toBe('needs_approval');

    const events = await runner.getEvents(run.id);
    const approvalEvent = events.find(
      (event) => event.type === 'approval_requested',
    );

    expect(approvalEvent && approvalEvent.type === 'approval_requested').toBe(true);
    if (!approvalEvent || approvalEvent.type !== 'approval_requested') {
      throw new Error('approval_requested event not found');
    }

    expect(approvalEvent.payload.argsRedacted).toMatchObject({
      id: 'entity-1',
      accessToken: '[REDACTED]',
    });
  });

  it('enforces approval authorization policy before decision is applied', async () => {
    const tool: AgentToolDefinition = {
      name: 'write_entity',
      label: 'Write Entity',
      description: 'Writes an entity',
      capability: 'write',
      riskClass: 'low',
      execute: async () => {
        return {
          content: {
            ok: true,
          },
        };
      },
    };

    const runtimeAdapter = createPiRuntimeAdapter({
      loader: createLoader(),
    });

    const runner = createAgentRunner({
      runtimeAdapter,
      approvalAuthorizer: new PolicyMatrixApprovalAuthorizer({
        rules: [
          {
            id: 'allow-operator-1-tenant-1',
            effect: 'allow',
            deciders: ['operator-1'],
            tenantIds: ['tenant-1'],
            riskClasses: ['low'],
          },
        ],
      }),
    });

    const run = await runner.startRun(createConfig(tool));
    expect(run.status).toBe('needs_approval');

    await expect(
      runner.approvePending(run.id, {
        decidedBy: 'operator-2',
      }),
    ).rejects.toThrow('Approval decision not authorized');

    const pendingAfterDeniedAttempt = await runner.listApprovals(run.id);
    expect(pendingAfterDeniedAttempt[0].status).toBe('pending');

    const resumed = await runner.approvePending(run.id, {
      decidedBy: 'operator-1',
      reason: 'authorized',
    });

    expect(resumed.status).toBe('completed');
  });
});
