import {
  createAgentRunner,
} from '../../src/runtime/create-agent-runner';
import {
  createPiRuntimeAdapter,
  type PiRuntimeLoader,
} from '../../src/runtime/pi-runtime-adapter';
import { createGraphQLHealthCheckTool } from '../../src/tools/graphql/builtins';
import type { ConstructiveAgentRunConfig } from '../../src/types/config';

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
    // no-op for fake runtime
  }

  async prompt(_input: string): Promise<void> {
    const tool = this.tools[0];
    if (!tool) return;

    await this.emit({
      type: 'turn_start',
    });

    await this.emit({
      type: 'tool_execution_start',
      toolCallId: 'tool-call-1',
      toolName: tool.name,
      args: {},
    });

    try {
      const result = await tool.execute('tool-call-1', {}, undefined);
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

describe('createGraphQLHealthCheckTool', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('executes read-only GraphQL health check through PI runtime adapter', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        data: {
          __typename: 'Query',
        },
      }),
    });

    global.fetch = fetchMock as any;

    const tool = createGraphQLHealthCheckTool();

    const runtimeAdapter = createPiRuntimeAdapter({
      loader: createLoader(),
    });

    const runner = createAgentRunner({
      runtimeAdapter,
    });

    const config: ConstructiveAgentRunConfig = {
      model: {
        provider: 'openai',
        model: 'fake-model',
        systemPrompt: 'You are a test agent.',
        thinkingLevel: 'off',
      },
      identity: {
        actorId: 'actor-1',
        accessToken: 'token-123',
        graphqlEndpoint: 'https://api.example.com/graphql',
      },
      prompt: 'Run health check',
      tools: [tool],
    };

    const run = await runner.startRun(config);
    const events = await runner.getEvents(run.id);

    expect(run.status).toBe('completed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/graphql');
    expect(fetchMock.mock.calls[0][1]?.headers?.Authorization).toBe(
      'Bearer token-123',
    );
    expect(events.some((event) => event.type === 'policy_decision')).toBe(true);
    expect(events.some((event) => event.type === 'tool_call_end')).toBe(true);
  });
});
