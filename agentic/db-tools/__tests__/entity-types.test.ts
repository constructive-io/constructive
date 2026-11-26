import type { HarnessToolContext } from '@agentic-kit/harness';

jest.mock('../src/context', () => ({
  resolveProjectContext: jest.fn(),
}));

import { resolveProjectContext } from '../src/context';
import { createEntityTypeTool, defaultPrefix, deleteEntityTypeTool, listEntityTypesTool } from '../src/tools/entity-types';

const mockResolve = resolveProjectContext as jest.MockedFunction<typeof resolveProjectContext>;

const ROW = {
  id: 'etp-1',
  name: 'organization',
  description: 'orgs',
  prefix: 'org',
  parentEntity: null as string | null,
  isVisible: true,
  outEntityTableName: 'organization',
  outInstalledModules: ['membership'],
};

function builder(result: unknown) {
  return { unwrap: async () => result };
}

function makeModules() {
  return {
    entityTypeProvision: {
      findMany: jest.fn().mockReturnValue(
        builder({ entityTypeProvisions: { nodes: [ROW], totalCount: 1 } }),
      ),
      create: jest.fn().mockReturnValue(
        builder({ createEntityTypeProvision: { entityTypeProvision: ROW } }),
      ),
      delete: jest.fn().mockReturnValue(
        builder({ deleteEntityTypeProvision: { entityTypeProvision: ROW } }),
      ),
    },
  };
}

function useContext(modules: ReturnType<typeof makeModules>) {
  mockResolve.mockResolvedValue({
    context: { modules, databaseId: 'db-1' },
    reason: '',
  } as never);
}

const ctx: HarnessToolContext = { cwd: '/tmp/project' };

const list = () => listEntityTypesTool.execute({}, ctx);
const create = (params: Record<string, unknown>) => createEntityTypeTool.execute(params as never, ctx);
const remove = (params: Record<string, unknown>) => deleteEntityTypeTool.execute(params as never, ctx);

afterEach(() => jest.clearAllMocks());

describe('defaultPrefix', () => {
  it('snake_cases the name', () => {
    expect(defaultPrefix('Team Space')).toBe('team_space');
    expect(defaultPrefix('  Déjà-Vu!  ')).toBe('d_j_vu');
  });
});

describe('the entity type tools', () => {
  it('returns the resolve failure when there is no project context', async () => {
    mockResolve.mockResolvedValue({
      context: null,
      reason: 'no project',
      failure: { code: 'no-env', message: 'no project' },
    } as never);
    const result = await list();
    expect(result.details).toEqual({ success: false, message: 'no project' });
    expect(result.failure).toEqual({ code: 'no-env', message: 'no project' });
  });

  it('lists entity types scoped to the project database', async () => {
    const modules = makeModules();
    useContext(modules);
    const result = await list();
    expect(modules.entityTypeProvision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { databaseId: { equalTo: 'db-1' } } }),
    );
    expect(result.details.success).toBe(true);
    expect(result.details.entityTypes).toEqual([
      expect.objectContaining({ id: 'etp-1', name: 'organization', entityTableName: 'organization' }),
    ]);
  });

  it('creates with the database id and a defaulted snake_case prefix', async () => {
    const modules = makeModules();
    useContext(modules);
    const result = await create({ name: 'Team Space', has_profiles: true });
    expect(modules.entityTypeProvision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          databaseId: 'db-1',
          name: 'Team Space',
          prefix: 'team_space',
          hasProfiles: true,
        }),
      }),
    );
    const data = modules.entityTypeProvision.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('description');
    expect(data).not.toHaveProperty('storage');
    expect(result.details.success).toBe(true);
    expect(result.details.message).toMatch(/Generate the typed SDK again/);
    expect(result.calls).toEqual([expect.objectContaining({ tool: 'run_codegen', input: {} })]);
  });

  it('deletes by id and says the entity table remains', async () => {
    const modules = makeModules();
    useContext(modules);
    const result = await remove({ entity_type_id: 'etp-1' });
    expect(modules.entityTypeProvision.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'etp-1' } }),
    );
    expect(result.details.message).toMatch(/remains in the API schema/);
  });

  it('surfaces client errors as a failed result', async () => {
    const modules = makeModules();
    modules.entityTypeProvision.create.mockReturnValue({
      unwrap: async () => {
        throw new Error('duplicate prefix');
      },
    });
    useContext(modules);
    const result = await create({ name: 'team' });
    expect(result.details).toEqual({ success: false, message: 'Failed to create entity type "team": duplicate prefix' });
    expect(result.failure?.code).toBe('failed');
  });
});
