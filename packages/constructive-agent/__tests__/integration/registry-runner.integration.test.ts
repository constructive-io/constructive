import http, { type IncomingMessage, type ServerResponse } from 'http';
import type { AddressInfo } from 'net';

import {
  createAgentRunner,
} from '../../src/runtime/create-agent-runner';
import {
  createPiRuntimeAdapter,
  type PiRuntimeLoader,
} from '../../src/runtime/pi-runtime-adapter';
import {
  GraphQLOperationRegistry,
} from '../../src/tools/graphql/operation-registry';
import {
  createGraphQLToolsFromRegistry,
} from '../../src/tools/graphql/tool-factory';
import type { ConstructiveAgentRunConfig } from '../../src/types/config';

type EventListener = (
  event: { type: string } & Record<string, unknown>,
) => void | Promise<void>;

type CapturedRequest = {
  method?: string;
  headers: IncomingMessage['headers'];
  body: string;
};

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

    await this.emit({ type: 'turn_start' });

    await this.emit({
      type: 'tool_execution_start',
      toolCallId: 'tool-call-1',
      toolName: tool.name,
      args: { id: 'entity-1' },
    });

    try {
      const result = await tool.execute(
        'tool-call-1',
        { id: 'entity-1' },
        undefined,
      );

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

const readBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
};

const writeJson = (
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
): void => {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(payload));
};

describe('registry-based runner integration', () => {
  let server: http.Server | null = null;
  let requests: CapturedRequest[] = [];
  let endpoint = '';

  beforeEach(async () => {
    requests = [];

    server = http.createServer(async (req, res) => {
      if (req.url !== '/graphql' || req.method !== 'POST') {
        writeJson(res, 404, { error: 'not found' });
        return;
      }

      const body = await readBody(req);
      requests.push({
        method: req.method,
        headers: req.headers,
        body,
      });

      writeJson(res, 200, {
        data: {
          entity: {
            id: 'entity-1',
            name: 'Entity 1',
          },
        },
      });
    });

    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address() as AddressInfo;
    endpoint = `http://127.0.0.1:${address.port}/graphql`;
  });

  afterEach(async () => {
    if (!server) return;

    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    server = null;
  });

  it('executes allowlisted read operation end-to-end with headers and variables', async () => {
    const registry = new GraphQLOperationRegistry();
    registry.register<{ id: string }>({
      toolName: 'get_entity_by_id',
      label: 'Get Entity',
      description: 'Reads an entity by id',
      capability: 'read',
      riskClass: 'read_only',
      document:
        'query GetEntity($id: ID!) { entity(id: $id) { id name } }',
      mapVariables: (args) => ({
        id: args.id,
      }),
    });

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
        systemPrompt: 'You are a test assistant.',
        thinkingLevel: 'off',
      },
      identity: {
        actorId: 'actor-1',
        accessToken: 'token-xyz',
        graphqlEndpoint: endpoint,
        databaseId: 'db-1',
        apiName: 'main-api',
      },
      prompt: 'Fetch the entity',
      tools: createGraphQLToolsFromRegistry(registry),
    };

    const run = await runner.startRun(config);
    const events = await runner.getEvents(run.id);

    expect(run.status).toBe('completed');
    expect(requests).toHaveLength(1);

    const request = requests[0];
    expect(request.method).toBe('POST');
    expect(request.headers.authorization).toBe('Bearer token-xyz');
    expect(request.headers['x-database-id']).toBe('db-1');
    expect(request.headers['x-api-name']).toBe('main-api');

    const payload = JSON.parse(request.body) as {
      query: string;
      variables: Record<string, unknown>;
    };
    expect(payload.query).toContain('query GetEntity');
    expect(payload.variables).toEqual({
      id: 'entity-1',
    });

    expect(events.some((event) => event.type === 'policy_decision')).toBe(true);
    expect(events.some((event) => event.type === 'tool_call_end')).toBe(true);
    expect(events[events.length - 1]?.type).toBe('run_end');
  });

  it('does not execute write operation without approval under default policy', async () => {
    const registry = new GraphQLOperationRegistry();
    registry.register<{ id: string }>({
      toolName: 'update_entity_name',
      label: 'Update Entity',
      description: 'Updates entity name',
      capability: 'write',
      riskClass: 'low',
      document:
        'mutation UpdateEntity($id: ID!) { updateEntity(id: $id) { id } }',
      mapVariables: (args) => ({
        id: args.id,
      }),
    });

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
        systemPrompt: 'You are a test assistant.',
        thinkingLevel: 'off',
      },
      identity: {
        actorId: 'actor-1',
        accessToken: 'token-xyz',
        graphqlEndpoint: endpoint,
      },
      prompt: 'Update the entity',
      tools: createGraphQLToolsFromRegistry(registry),
    };

    const run = await runner.startRun(config);
    const events = await runner.getEvents(run.id);

    expect(run.status).toBe('needs_approval');
    expect(requests).toHaveLength(0);

    const policyEvent = events.find((event) => event.type === 'policy_decision');
    expect(policyEvent && policyEvent.type === 'policy_decision').toBe(true);
    if (!policyEvent || policyEvent.type !== 'policy_decision') {
      throw new Error('policy_decision event not found');
    }

    expect(policyEvent.payload.decision).toMatchObject({
      action: 'needs_approval',
    });
  });
});
