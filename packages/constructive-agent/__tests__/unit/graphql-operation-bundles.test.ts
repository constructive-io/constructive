import {
  createEntityCrudBundle,
  registerEntityCrudBundle,
  registerOperationBundle,
} from '../../src/tools/graphql/operation-bundles';
import { GraphQLOperationRegistry } from '../../src/tools/graphql/operation-registry';
import { createGraphQLToolsFromRegistry } from '../../src/tools/graphql/tool-factory';
import type { GraphQLExecutor } from '../../src/tools/graphql/executor';

describe('GraphQL operation bundles', () => {
  it('builds default entity CRUD tool metadata', () => {
    const bundle = createEntityCrudBundle({
      entityName: 'ProjectMember',
      readById: {
        document: 'query ReadProjectMember($id: ID!) { projectMember(id: $id) { id } }',
      },
      create: {
        document:
          'mutation CreateProjectMember($input: ProjectMemberInput!) { createProjectMember(input: $input) { id } }',
      },
      update: {
        document:
          'mutation UpdateProjectMember($id: ID!, $patch: ProjectMemberPatch!) { updateProjectMember(id: $id, patch: $patch) { id } }',
      },
    });

    expect(bundle.name).toBe('project_member_crud');
    expect(bundle.operations.map((operation) => operation.toolName)).toEqual([
      'read_project_member',
      'create_project_member',
      'update_project_member',
    ]);

    expect(bundle.operations[0].capability).toBe('read');
    expect(bundle.operations[0].riskClass).toBe('read_only');
    expect(bundle.operations[1].capability).toBe('write');
    expect(bundle.operations[1].riskClass).toBe('low');
  });

  it('registers CRUD bundle and executes mapped operation through tool factory', async () => {
    const registry = new GraphQLOperationRegistry();

    registerEntityCrudBundle(registry, {
      entityName: 'animal',
      readById: {
        document:
          'query ReadAnimal($id: ID!) { animal(id: $id) { id ownerId } }',
        mapVariables: (args: { id: string }) => ({ id: args.id }),
      },
      create: {
        toolName: 'create_animal',
        document:
          'mutation CreateAnimal($input: AnimalInput!) { createAnimal(input: $input) { id } }',
        mapVariables: (args: { input: Record<string, unknown> }) => ({
          input: args.input,
        }),
      },
      update: {
        toolName: 'update_animal',
        document:
          'mutation UpdateAnimal($id: ID!, $patch: AnimalPatch!) { updateAnimal(id: $id, patch: $patch) { id } }',
        mapVariables: (args: { id: string; patch: Record<string, unknown> }) => ({
          id: args.id,
          patch: args.patch,
        }),
      },
    });

    const executorCalls: Array<{
      endpoint: string;
      document: string;
      variables?: Record<string, unknown>;
      headers?: Record<string, string>;
    }> = [];

    const executor: GraphQLExecutor = {
      async execute(input) {
        executorCalls.push(input);
        return {
          ok: true,
          data: {
            ok: true,
          },
        };
      },
    };

    const tools = createGraphQLToolsFromRegistry(registry, {
      executor,
      staticEndpoint: 'https://example.test/graphql',
      staticHeaders: {
        'x-test': '1',
      },
    });

    const readTool = tools.find((tool) => tool.name === 'read_animal');
    if (!readTool) {
      throw new Error('read_animal tool was not generated');
    }

    await readTool.execute(
      {
        id: 'animal-1',
      },
      {
        runId: 'run-1',
        actorId: 'actor-1',
      },
    );

    expect(executorCalls).toHaveLength(1);
    expect(executorCalls[0].variables).toEqual({
      id: 'animal-1',
    });
    expect(executorCalls[0].headers).toMatchObject({
      'x-test': '1',
    });
  });

  it('can register explicit operation bundles', () => {
    const registry = new GraphQLOperationRegistry();

    registerOperationBundle(registry, {
      name: 'custom',
      operations: [
        {
          toolName: 'custom_read',
          label: 'Custom Read',
          description: 'Custom read operation',
          capability: 'read',
          riskClass: 'read_only',
          document: 'query CustomRead { __typename }',
        },
      ],
    });

    expect(registry.get('custom_read')).toBeDefined();
  });
});
