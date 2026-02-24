import {
  createGraphQLToolsFromRegistry,
} from '../../src/tools/graphql/tool-factory';
import {
  GraphQLOperationRegistry,
} from '../../src/tools/graphql/operation-registry';
import type { GraphQLExecutor } from '../../src/tools/graphql/executor';

describe('createGraphQLToolsFromRegistry', () => {
  it('creates executable tools with endpoint/headers and mapped variables', async () => {
    const registry = new GraphQLOperationRegistry();
    registry.register({
      toolName: 'get_entity_by_id',
      label: 'Get Entity',
      description: 'Fetches entity by id',
      capability: 'read',
      riskClass: 'read_only',
      document:
        'query GetEntity($id: ID!) { entity(id: $id) { id name } }',
      mapVariables: (args: { id: string }) => ({
        id: args.id,
      }),
    });

    const execute = jest.fn().mockResolvedValue({
      ok: true,
      data: {
        entity: {
          id: 'e1',
          name: 'Entity 1',
        },
      },
    });

    const executor: GraphQLExecutor = {
      execute,
    };

    const tools = createGraphQLToolsFromRegistry(registry, {
      executor,
    });

    expect(tools).toHaveLength(1);

    const tool = tools[0];
    const result = await tool.execute(
      {
        id: 'e1',
      },
      {
        runId: 'run-1',
        actorId: 'actor-1',
        identity: {
          actorId: 'actor-1',
          accessToken: 'token-abc',
          graphqlEndpoint: 'https://api.example.com/graphql',
        },
      },
    );

    expect(result.content).toEqual({
      entity: {
        id: 'e1',
        name: 'Entity 1',
      },
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toMatchObject({
      endpoint: 'https://api.example.com/graphql',
      variables: {
        id: 'e1',
      },
      headers: {
        Authorization: 'Bearer token-abc',
      },
    });
  });

  it('throws when endpoint is missing', async () => {
    const registry = new GraphQLOperationRegistry();
    registry.register({
      toolName: 'list_entities',
      label: 'List Entities',
      description: 'Lists entities',
      capability: 'read',
      riskClass: 'read_only',
      document: 'query ListEntities { entities { id } }',
    });

    const executor: GraphQLExecutor = {
      execute: jest.fn(),
    };

    const tools = createGraphQLToolsFromRegistry(registry, {
      executor,
    });

    await expect(
      tools[0].execute(
        {},
        {
          runId: 'run-1',
          actorId: 'actor-1',
        },
      ),
    ).rejects.toThrow('No GraphQL endpoint found');
  });
});
