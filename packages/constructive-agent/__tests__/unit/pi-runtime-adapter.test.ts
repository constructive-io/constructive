import {
  createAgentRunner,
} from '../../src/runtime/create-agent-runner';
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
  constructor(
    private readonly toolExecutions: number = 1,
    private readonly turnCount: number = 1,
  ) {}

  private aborted = false;

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
    this.aborted = true;
  }

  async prompt(_input: string): Promise<void> {
    const tool = this.tools[0];
    if (!tool) return;

    for (let turn = 0; turn < this.turnCount; turn += 1) {
      if (this.aborted) break;

      await this.emit({
        type: 'turn_start',
      });

      for (let i = 0; i < this.toolExecutions; i += 1) {
        if (this.aborted) break;

        const toolCallId = `tool-call-${turn + 1}-${i + 1}`;
        const args = {
          id: `entity-${turn + 1}-${i + 1}`,
        };

        await this.emit({
          type: 'tool_execution_start',
          toolCallId,
          toolName: tool.name,
          args,
        });

        try {
          const result = await tool.execute(
            toolCallId,
            args,
            undefined,
            async (partialResult) => {
              await this.emit({
                type: 'tool_execution_update',
                toolCallId,
                toolName: tool.name,
                args,
                partialResult,
              });
            },
          );

          await this.emit({
            type: 'tool_execution_end',
            toolCallId,
            toolName: tool.name,
            isError: false,
            result,
          });
        } catch (error) {
          await this.emit({
            type: 'tool_execution_end',
            toolCallId,
            toolName: tool.name,
            isError: true,
            result: {
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }

      await this.emit({
        type: 'turn_end',
        message: {
          stopReason: 'stop',
        },
      });
    }
  }

  private async emit(
    event: { type: string } & Record<string, unknown>,
  ): Promise<void> {
    for (const listener of this.listeners) {
      await listener(event);
    }
  }
}

class AbortRejectAgent {
  private listeners = new Set<EventListener>();
  private rejectPrompt: ((error: unknown) => void) | undefined;

  setTools(_tools: any[]): void {
    // no-op
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  abort(): void {
    this.rejectPrompt?.(new Error('aborted'));
  }

  async prompt(_input: string): Promise<void> {
    await new Promise<void>((_resolve, reject) => {
      this.rejectPrompt = reject;
    });
  }
}

const createLoader = (
  options: {
    toolExecutions?: number;
    turnCount?: number;
  } = {},
): PiRuntimeLoader => {
  return {
    getModel(): unknown {
      return {
        id: 'fake-model',
        provider: 'openai',
        api: 'openai-responses',
      };
    },

    createAgent(_input): any {
      return new FakeAgent(
        options.toolExecutions || 1,
        options.turnCount || 1,
      ) as any;
    },

    createAnyParametersSchema(): unknown {
      return {
        type: 'object',
        properties: {},
      };
    },
  };
};

const createAbortRejectLoader = (): PiRuntimeLoader => {
  return {
    getModel(): unknown {
      return {
        id: 'fake-model',
        provider: 'openai',
        api: 'openai-responses',
      };
    },

    createAgent(_input): any {
      return new AbortRejectAgent() as any;
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
  overrides: Partial<ConstructiveAgentRunConfig> = {},
): ConstructiveAgentRunConfig => {
  return {
    model: {
      provider: 'openai',
      model: 'fake-model',
      systemPrompt: 'You are a test agent.',
      thinkingLevel: 'off',
    },
    identity: {
      actorId: 'actor-1',
      accessToken: 'token',
      tenantId: 'tenant-1',
    },
    prompt: 'Create entity',
    tools: [tool],
    ...overrides,
  };
};

describe('createPiRuntimeAdapter', () => {
  it('completes run for allowed tool and records policy/event trail', async () => {
    const tool: AgentToolDefinition = {
      name: 'read_entity',
      label: 'Read Entity',
      description: 'Reads an entity',
      capability: 'read',
      riskClass: 'read_only',
      execute: async () => {
        return {
          content: {
            id: 'entity-1',
            name: 'Entity 1',
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
    const events = await runner.getEvents(run.id);

    expect(run.status).toBe('completed');
    expect(events.some((event) => event.type === 'policy_decision')).toBe(true);
    expect(events.some((event) => event.type === 'tool_call_start')).toBe(true);
    expect(events.some((event) => event.type === 'tool_call_end')).toBe(true);
    expect(events[events.length - 1]?.type).toBe('run_end');
  });

  it('moves run to needs_approval when policy requires approval', async () => {
    const toolExecute = jest.fn(async () => {
      return {
        content: {
          id: 'entity-1',
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

    const run = await runner.startRun(createConfig(tool));
    const events = await runner.getEvents(run.id);

    expect(run.status).toBe('needs_approval');
    expect(toolExecute).not.toHaveBeenCalled();

    const policyEvent = events.find((event) => event.type === 'policy_decision');
    expect(policyEvent && policyEvent.type === 'policy_decision').toBe(true);
    if (!policyEvent || policyEvent.type !== 'policy_decision') {
      throw new Error('policy_decision event not found');
    }

    expect(policyEvent.payload.decision).toMatchObject({
      action: 'needs_approval',
    });
  });

  it('fails run when policy denies tool', async () => {
    const toolExecute = jest.fn(async () => {
      return {
        content: {
          id: 'entity-1',
        },
      };
    });

    const tool: AgentToolDefinition = {
      name: 'unsafe_tool',
      label: 'Unsafe Tool',
      description: 'An unsafe operation',
      capability: 'unsafe',
      riskClass: 'high',
      execute: toolExecute,
    };

    const runtimeAdapter = createPiRuntimeAdapter({
      loader: createLoader(),
    });

    const runner = createAgentRunner({
      runtimeAdapter,
    });

    const run = await runner.startRun(createConfig(tool));
    const events = await runner.getEvents(run.id);

    expect(run.status).toBe('failed');
    expect(toolExecute).not.toHaveBeenCalled();
    expect(events.some((event) => event.type === 'run_error')).toBe(true);
  });

  it('fails run when maxToolCalls is exceeded', async () => {
    const toolExecute = jest.fn(async () => {
      return {
        content: {
          ok: true,
        },
      };
    });

    const tool: AgentToolDefinition = {
      name: 'read_entity',
      label: 'Read Entity',
      description: 'Reads an entity',
      capability: 'read',
      riskClass: 'read_only',
      execute: toolExecute,
    };

    const runtimeAdapter = createPiRuntimeAdapter({
      loader: createLoader({
        toolExecutions: 2,
      }),
    });

    const runner = createAgentRunner({
      runtimeAdapter,
    });

    const run = await runner.startRun(
      createConfig(tool, {
        limits: {
          maxToolCalls: 1,
        },
      }),
    );
    const events = await runner.getEvents(run.id);

    expect(run.status).toBe('failed');
    expect(toolExecute).toHaveBeenCalledTimes(1);

    const errorEvent = events.find((event) => event.type === 'run_error');
    expect(errorEvent && errorEvent.type === 'run_error').toBe(true);
    if (!errorEvent || errorEvent.type !== 'run_error') {
      throw new Error('run_error event not found');
    }

    expect(errorEvent.payload.code).toBe('TOOL_LIMIT_EXCEEDED');
  });

  it('fails run when maxTurns is exceeded', async () => {
    const toolExecute = jest.fn(async () => {
      return {
        content: {
          ok: true,
        },
      };
    });

    const tool: AgentToolDefinition = {
      name: 'read_entity',
      label: 'Read Entity',
      description: 'Reads an entity',
      capability: 'read',
      riskClass: 'read_only',
      execute: toolExecute,
    };

    const runtimeAdapter = createPiRuntimeAdapter({
      loader: createLoader({
        toolExecutions: 1,
        turnCount: 2,
      }),
    });

    const runner = createAgentRunner({
      runtimeAdapter,
    });

    const run = await runner.startRun(
      createConfig(tool, {
        limits: {
          maxTurns: 1,
        },
      }),
    );
    const events = await runner.getEvents(run.id);

    expect(run.status).toBe('failed');

    const errorEvent = events.find((event) => event.type === 'run_error');
    expect(errorEvent && errorEvent.type === 'run_error').toBe(true);
    if (!errorEvent || errorEvent.type !== 'run_error') {
      throw new Error('run_error event not found');
    }

    expect(errorEvent.payload.code).toBe('TURN_LIMIT_EXCEEDED');
  });

  it('marks run aborted when timeout abort causes prompt rejection', async () => {
    const tool: AgentToolDefinition = {
      name: 'read_entity',
      label: 'Read Entity',
      description: 'Reads an entity',
      capability: 'read',
      riskClass: 'read_only',
      execute: async () => {
        return {
          content: {
            ok: true,
          },
        };
      },
    };

    const runtimeAdapter = createPiRuntimeAdapter({
      loader: createAbortRejectLoader(),
    });

    const runner = createAgentRunner({
      runtimeAdapter,
    });

    const run = await runner.startRun(
      createConfig(tool, {
        limits: {
          maxRuntimeMs: 10,
        },
      }),
    );
    const events = await runner.getEvents(run.id);

    expect(run.status).toBe('aborted');
    expect(events.some((event) => event.type === 'run_error')).toBe(false);
  });
});
