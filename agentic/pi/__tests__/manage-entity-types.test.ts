import type { HarnessToolContext } from '@agentic-kit/harness';

jest.mock('../src/context', () => ({
  resolveProjectContext: jest.fn(),
}));

import { resolveProjectContext } from '../src/context';
import {
  defaultPrefix,
  manageEntityTypesTool,
  validateManageEntityTypes,
} from '../src/tools/manage-entity-types';

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

function run(params: Record<string, unknown>) {
  return manageEntityTypesTool.execute(params as never, ctx);
}

afterEach(() => jest.clearAllMocks());

describe('validateManageEntityTypes', () => {
  it('requires a name for create', () => {
    expect(validateManageEntityTypes({ action: 'create' } as never)).toMatch(/requires "name"/);
    expect(validateManageEntityTypes({ action: 'create', name: 'org' } as never)).toBeNull();
  });

  it('rejects an entity_type_id on create', () => {
    expect(
      validateManageEntityTypes({ action: 'create', name: 'org', entity_type_id: 'etp-1' } as never),
    ).toMatch(/does not take "entity_type_id"/);
  });

  it('requires an id for delete and lets list through', () => {
    expect(validateManageEntityTypes({ action: 'delete' } as never)).toMatch(/entity_type_id/);
    expect(validateManageEntityTypes({ action: 'list' } as never)).toBeNull();
  });
});

describe('defaultPrefix', () => {
  it('snake_cases the name', () => {
    expect(defaultPrefix('Team Space')).toBe('team_space');
    expect(defaultPrefix('  Déjà-Vu!  ')).toBe('d_j_vu');
  });
});

describe('manage_entity_types execute', () => {
  it('returns the resolve reason when there is no project context', async () => {
    mockResolve.mockResolvedValue({ context: null, reason: 'no project' } as never);
    const result = await run({ action: 'list' });
    expect(result.details).toEqual({ success: false, message: 'no project' });
  });

  it('lists entity types scoped to the project database', async () => {
    const modules = makeModules();
    useContext(modules);
    const result = await run({ action: 'list' });
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
    const result = await run({ action: 'create', name: 'Team Space', has_profiles: true });
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
    expect(result.details.message).toMatch(/run_codegen/);
  });

  it('deletes by id and says the entity table remains', async () => {
    const modules = makeModules();
    useContext(modules);
    const result = await run({ action: 'delete', entity_type_id: 'etp-1' });
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
    const result = await run({ action: 'create', name: 'org' });
    expect(result.details).toEqual({ success: false, message: 'duplicate prefix' });
  });
});
