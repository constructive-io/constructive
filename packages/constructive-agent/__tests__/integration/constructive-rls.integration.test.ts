import path from 'path';

import {
  getConnections,
  seed,
  type GetConnectionsResult,
} from 'graphql-server-test';

import {
  createAgentRunner,
} from '../../src/runtime/create-agent-runner';
import { StaticPolicyEngine } from '../../src/policy/policy-engine';
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

  constructor(private readonly args: Record<string, unknown>) {}

  setTools(tools: any[]): void {
    this.tools = tools;
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  abort(): void {
    // no-op for test loader
  }

  async prompt(_input: string): Promise<void> {
    const tool = this.tools[0];
    if (!tool) return;

    await this.emit({ type: 'turn_start' });
    await this.emit({
      type: 'tool_execution_start',
      toolCallId: 'tool-call-1',
      toolName: tool.name,
      args: this.args,
    });

    try {
      const result = await tool.execute(
        'tool-call-1',
        this.args,
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

const createLoader = (
  args: Record<string, unknown>,
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
      return new FakeAgent(args) as any;
    },

    createAnyParametersSchema(): unknown {
      return {
        type: 'object',
        properties: {},
      };
    },
  };
};

const SERVICES_DATABASE_ID = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
const USER_1_ID = '11111111-1111-1111-1111-111111111111';
const USER_2_ID = '22222222-2222-2222-2222-222222222222';

const projectRoot = path.join(__dirname, '..', '..', '..', '..');
const fixtureRoot = path.join(projectRoot, 'graphql', 'server-test', '__fixtures__', 'seed', 'simple-seed-services');
const overlaySql = path.join(
  __dirname,
  '..',
  '..',
  '__fixtures__',
  'seed',
  'rls-overlay.sql',
);

const readRegistry = (): GraphQLOperationRegistry => {
  const registry = new GraphQLOperationRegistry();

  registry.register<Record<string, never>>({
    toolName: 'list_my_animals',
    label: 'List My Animals',
    description: 'Reads visible animals under RLS constraints.',
    capability: 'read',
    riskClass: 'read_only',
    document: `
      query ListMyAnimals {
        animals {
          nodes {
            id
            name
            ownerId
          }
        }
      }
    `,
  });

  return registry;
};

const writeRegistry = (): GraphQLOperationRegistry => {
  const registry = new GraphQLOperationRegistry();

  registry.register<{
    name: string;
    species: string;
    ownerId: string;
  }>({
    toolName: 'create_animal',
    label: 'Create Animal',
    description: 'Creates an animal row through GraphQL mutation.',
    capability: 'write',
    riskClass: 'low',
    document: `
      mutation CreateAnimal($input: CreateAnimalInput!) {
        createAnimal(input: $input) {
          animal {
            id
            name
            ownerId
          }
        }
      }
    `,
    mapVariables: (args) => ({
      input: {
        animal: {
          name: args.name,
          species: args.species,
          ownerId: args.ownerId,
        },
      },
    }),
  });

  return registry;
};

const createConfig = (
  graphqlEndpoint: string,
  token: string,
  tools: ReturnType<typeof createGraphQLToolsFromRegistry>,
): ConstructiveAgentRunConfig => {
  return {
    model: {
      provider: 'openai',
      model: 'fake-model',
      systemPrompt: 'You are a constrained assistant.',
      thinkingLevel: 'off',
    },
    identity: {
      actorId: 'actor-1',
      accessToken: token,
      graphqlEndpoint,
      databaseId: SERVICES_DATABASE_ID,
      apiName: 'private',
    },
    prompt: 'Execute the configured tool once.',
    tools,
  };
};

const getLastToolEnd = (
  events: Awaited<ReturnType<ReturnType<typeof createAgentRunner>['getEvents']>>,
) => {
  const toolEnds = events.filter((event) => event.type === 'tool_call_end');
  return toolEnds[toolEnds.length - 1];
};

jest.setTimeout(120000);

describe('constructive-agent real GraphQL/RLS integration', () => {
  let connections: GetConnectionsResult;

  beforeAll(async () => {
    connections = await getConnections(
      {
        schemas: ['simple-pets-public', 'simple-pets-pets-public'],
        authRole: 'anonymous',
        server: {
          api: {
            enableServicesApi: true,
            isPublic: false,
            metaSchemas: [
              'services_public',
              'metaschema_public',
              'metaschema_modules_public',
            ],
          },
        },
      },
      [
        seed.sqlfile([
          path.join(fixtureRoot, 'setup.sql'),
          path.join(fixtureRoot, 'schema.sql'),
          path.join(fixtureRoot, 'test-data.sql'),
          overlaySql,
        ]),
      ],
    );
  });

  afterAll(async () => {
    await connections.teardown();
  });

  it('reads only user-owned rows through token identity and RLS', async () => {
    const registry = readRegistry();
    const tools = createGraphQLToolsFromRegistry(registry);

    const runner = createAgentRunner({
      runtimeAdapter: createPiRuntimeAdapter({
        loader: createLoader({}),
      }),
    });

    const run = await runner.startRun(
      createConfig(connections.server.graphqlUrl, 'token-user-1', tools),
    );

    expect(run.status).toBe('completed');

    const events = await runner.getEvents(run.id);
    const lastToolEnd = getLastToolEnd(events);
    expect(lastToolEnd && lastToolEnd.type === 'tool_call_end').toBe(true);
    if (!lastToolEnd || lastToolEnd.type !== 'tool_call_end') {
      throw new Error('tool_call_end event not found');
    }

    expect(lastToolEnd.payload.success).toBe(true);

    const data = (
      lastToolEnd.payload.result as {
        details?: {
          result?: {
            animals?: {
              nodes?: Array<{
                ownerId: string;
              }>;
            };
          };
        };
      }
    ).details?.result;

    const nodes = data?.animals?.nodes || [];
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.every((node) => node.ownerId === USER_1_ID)).toBe(true);
  });

  it('blocks unauthorized cross-user write via PostgreSQL RLS', async () => {
    const registry = writeRegistry();
    const tools = createGraphQLToolsFromRegistry(registry);

    const allowWritePolicy = new StaticPolicyEngine(
      {
        read: {
          action: 'allow',
          reason: 'Allowed for test.',
        },
        write: {
          action: 'allow',
          reason: 'Allowed for test.',
        },
      },
      {
        action: 'allow',
        reason: 'Default allow for integration test.',
        riskClass: 'low',
      },
    );

    const runner = createAgentRunner({
      runtimeAdapter: createPiRuntimeAdapter({
        loader: createLoader({
          name: 'AgentBad',
          species: 'Llama',
          ownerId: USER_2_ID,
        }),
        policyEngine: allowWritePolicy,
      }),
    });

    const run = await runner.startRun(
      createConfig(connections.server.graphqlUrl, 'token-user-1', tools),
    );

    expect(run.status).toBe('completed');

    const events = await runner.getEvents(run.id);
    const lastToolEnd = getLastToolEnd(events);
    expect(lastToolEnd && lastToolEnd.type === 'tool_call_end').toBe(true);
    if (!lastToolEnd || lastToolEnd.type !== 'tool_call_end') {
      throw new Error('tool_call_end event not found');
    }

    expect(lastToolEnd.payload.success).toBe(false);

    const persisted = await connections.pg.query<{ count: string }>(
      `
        SELECT COUNT(*) AS count
        FROM "simple-pets-pets-public".animals
        WHERE name = 'AgentBad'
      `,
    );

    expect(Number(persisted.rows[0].count)).toBe(0);
  });

  it('permits write when owner matches jwt.claims.user_id', async () => {
    const registry = writeRegistry();
    const tools = createGraphQLToolsFromRegistry(registry);

    const allowWritePolicy = new StaticPolicyEngine(
      {
        write: {
          action: 'allow',
          reason: 'Allowed for test.',
        },
      },
      {
        action: 'allow',
        reason: 'Default allow for integration test.',
        riskClass: 'low',
      },
    );

    const runner = createAgentRunner({
      runtimeAdapter: createPiRuntimeAdapter({
        loader: createLoader({
          name: 'AgentGood',
          species: 'Otter',
          ownerId: USER_1_ID,
        }),
        policyEngine: allowWritePolicy,
      }),
    });

    const run = await runner.startRun(
      createConfig(connections.server.graphqlUrl, 'token-user-1', tools),
    );

    expect(run.status).toBe('completed');

    const events = await runner.getEvents(run.id);
    const lastToolEnd = getLastToolEnd(events);
    expect(lastToolEnd && lastToolEnd.type === 'tool_call_end').toBe(true);
    if (!lastToolEnd || lastToolEnd.type !== 'tool_call_end') {
      throw new Error('tool_call_end event not found');
    }
    expect(lastToolEnd.payload.success).toBe(true);

    const persisted = await connections.pg.query<{
      owner_id: string;
    }>(
      `
        SELECT owner_id
        FROM "simple-pets-pets-public".animals
        WHERE name = 'AgentGood'
      `,
    );

    expect(persisted.rows[0]?.owner_id).toBe(USER_1_ID);
  });
});
