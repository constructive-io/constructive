import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { constructiveDbTools } from '../src';
import { expandBlueprintDefaults } from '../src/blueprint/blueprint-defaults';
import { fieldTypeToTypeName, toFieldDefault, toFieldType } from '../src/blueprint/field-type';
import { configureHost } from '../src/host';
import { DATABASE_ID, type FakeBackend, type GraphQLAnswer, projectAnswer, type SeenRequest, startFakeBackend } from './fake-backend';

describe('field-type conversions', () => {
  it('round-trips array types', () => {
    expect(toFieldType('text[]')).toEqual({ name: 'text', array_dimensions: 1 });
    expect(fieldTypeToTypeName({ name: 'text', array_dimensions: 1 })).toBe('text[]');
  });

  it('parses defaults into structured FieldDefault values', () => {
    expect(toFieldDefault('now()')).toEqual({ function: 'now' });
    expect(toFieldDefault('CURRENT_TIMESTAMP')).toEqual({ sql_keyword: 'CURRENT_TIMESTAMP' });
    expect(toFieldDefault("'draft'")).toEqual({ value: 'draft' });
    expect(toFieldDefault('42')).toEqual({ value: 42 });
    expect(toFieldDefault(null)).toBeUndefined();
  });
});

type Expanded = { tables: Array<Record<string, unknown>> } & Record<string, unknown>;
const expand = (definition: Record<string, unknown>) => expandBlueprintDefaults(definition) as Expanded;
const nodeTypes = (nodes: unknown) => (nodes as Array<string | { $type: string }>).map((node) => (typeof node === 'string' ? node : node.$type));

describe('expandBlueprintDefaults', () => {
  it('derives nodes, default grants and rule defaults for a bare table, and gives each field the backend form', () => {
    const [table] = expand({
      tables: [
        {
          table_name: 'posts',
          fields: [
            { name: 'id', type: 'uuid' },
            { name: 'title', type: 'text', is_required: true, default: "'untitled'" },
          ],
          policies: [{ $type: 'AuthzDirectOwner', data: { entity_field: 'owner_id' } }],
        },
      ],
    }).tables;
    expect(table.use_rls).toBe(true);
    expect(Array.isArray(table.grants)).toBe(true);
    expect(nodeTypes(table.nodes)[0]).toBe('DataId');
    expect(nodeTypes(table.nodes).at(-1)).toBe('DataTimestamps');
    expect(table.fields).toEqual([
      { name: 'id', type: { name: 'uuid' } },
      { name: 'title', type: { name: 'text' }, is_required: true, default: { value: 'untitled' } },
    ]);
    expect(table.policies).toEqual([
      { $type: 'AuthzDirectOwner', data: { entity_field: 'owner_id' }, privileges: ['select', 'insert', 'update', 'delete'], policy_role: 'authenticated', permissive: true },
    ]);
  });

  it('keeps the grants a table gives, and gives the default only to a table that has none', () => {
    const readOnly = [{ roles: ['authenticated'], privileges: [['select', '*']] }];
    const [posts, notes] = expand({
      tables: [
        { table_name: 'posts', policies: [{ $type: 'AuthzAllowAll' }], grants: readOnly },
        { table_name: 'notes', policies: [{ $type: 'AuthzAllowAll' }] },
      ],
    }).tables;
    expect(posts.grants).toEqual(readOnly);
    expect(notes.grants).toEqual([{ roles: ['authenticated'], privileges: [['select', '*'], ['insert', '*'], ['update', '*'], ['delete', '*']] }]);
  });

  it('keeps every key of the definition it does not fill in, at the top and in a table', () => {
    const indexes = [{ table_name: 'posts', columns: ['title'], access_method: 'btree' }];
    const expanded = expand({
      tables: [{ table_name: 'posts', schema_name: 'app_public', policies: [{ $type: 'AuthzAllowAll' }], unique_constraints: [{ columns: ['title'] }] }],
      relations: [{ $type: 'RelationBelongsTo', source_table: 'posts', target_table: 'users', source_schema: 'app_public', target_schema: 'app_public', delete_action: 'c' }],
      indexes,
      check_constraints: [],
    });
    expect(expanded.indexes).toEqual(indexes);
    expect(expanded.check_constraints).toEqual([]);
    expect(expanded.relations).toEqual([
      { $type: 'RelationBelongsTo', source_table: 'posts', target_table: 'users', source_schema: 'app_public', target_schema: 'app_public', delete_action: 'c' },
    ]);
    expect(expanded.tables[0]).toMatchObject({ schema_name: 'app_public', unique_constraints: [{ columns: ['title'] }] });
  });
});

// The registry decides which Data node a rule needs and which columns that node adds.
describe('expandBlueprintDefaults follows the registry', () => {
  const tableOf = (policies: Array<{ $type: string; data?: Record<string, unknown> }>, fields?: { name: string; type: string }[]) =>
    expand({ tables: [{ table_name: 'items', policies, ...(fields ? { fields } : {}) }] }).tables[0] as { nodes: unknown; fields?: { name: string }[] };

  it('passes the publish column names of AuthzPublishable to DataPublishable', () => {
    expect(tableOf([{ $type: 'AuthzPublishable', data: { is_published_field: 'live' } }]).nodes).toContainEqual({
      $type: 'DataPublishable',
      data: { is_published_field_name: 'live', published_at_field_name: 'published_at' },
    });
  });

  it('adds the Data nodes the policies inside an AuthzComposite need', () => {
    const composite = { OR: [{ AuthzDirectOwner: { entity_field: 'owner_id' } }, { AuthzAppMembership: {} }] };
    expect(nodeTypes(tableOf([{ $type: 'AuthzComposite', data: composite }]).nodes)).toContain('DataDirectOwner');
  });

  it('adds the Data node of AuthzMemberOwner', () => {
    expect(nodeTypes(tableOf([{ $type: 'AuthzMemberOwner', data: { membership_type: 2 } }]).nodes)).toContain('DataOwnershipInEntity');
  });

  it('keeps a field that a Data node also adds (DataTags): the backend creates the field, and the node keeps it', () => {
    const [table] = expand({
      tables: [{ table_name: 'items', nodes: [{ $type: 'DataTags', data: { field_name: 'labels' } }], policies: [{ $type: 'AuthzAllowAll' }], fields: [{ name: 'labels', type: 'text' }, { name: 'title', type: 'text' }] }],
    }).tables;
    expect((table.fields as { name: string }[]).map((field) => field.name)).toEqual(['labels', 'title']);
  });
});

describe('provision_blueprint sends the blueprint the schema takes', () => {
  let cwd: string;
  let backend: FakeBackend;

  // The project database has the schemas app_public and sales, the table users, and refuses to create a blueprint.
  function answer({ query }: SeenRequest): GraphQLAnswer {
    if (/ProbeDatabase/.test(query)) return projectAnswer(query, 'ME');
    if (/\bschemas\b/.test(query)) return { data: { schemas: { nodes: [{ id: 'schema-1', name: 'app_public' }, { id: 'schema-2', name: 'sales' }] } } };
    if (/createBlueprint/.test(query)) return { data: null, errors: [{ message: 'the test backend refuses every change' }] };
    if (/\btables\b/.test(query)) return { data: { tables: { nodes: [{ id: 't1', name: 'users' }] } } };
    return { data: {} };
  }

  beforeEach(async () => {
    cwd = mkdtempSync(path.join(os.tmpdir(), 'db-blueprint-'));
    writeFileSync(path.join(cwd, '.env'), `DATABASE_ID=${DATABASE_ID}\nDATABASE_NAME=mydb\nOWNER_ID=b0000000-0000-4000-8000-00000000000e\n`);
    backend = await startFakeBackend(answer);
    configureHost({
      account: () => ({ userId: 'ME', accessToken: 'account-bearer' }),
      backendConfig: () => ({ apiEndpoint: backend.endpoint(), modulesEndpoint: backend.endpoint('modules.localhost') }),
    });
  });
  afterEach(async () => {
    rmSync(cwd, { recursive: true, force: true });
    await backend.close();
  });

  const tool = constructiveDbTools.find((candidate) => candidate.name === 'provision_blueprint');
  const sent = () => backend.requests.find(({ query }) => /createBlueprint/.test(query))?.variables as { input: { blueprint: { definition: Record<string, unknown> } } } | undefined;

  it('takes a relation that names the schema of each end, and sends the keys as given', async () => {
    const relation = { $type: 'RelationBelongsTo', source_table: 'deals', target_table: 'contacts', source_schema: 'sales', target_schema: 'app_public', field_name: 'contact_id', delete_action: 'c' };
    const params = {
      name: 'crm',
      description: 'CRM',
      definition: {
        tables: [
          { table_name: 'contacts', policies: [{ $type: 'AuthzAllowAll' }] },
          { table_name: 'deals', schema_name: 'sales', policies: [{ $type: 'AuthzAllowAll' }] },
        ],
        relations: [relation],
      },
    };

    const result = await tool.execute(tool.parameters.parse(params), { cwd });

    expect(result.failure?.message).toBe('Failed to provision "crm": the backend answered with an error without a public code.');
    expect(sent()?.input.blueprint.definition.relations).toEqual([relation]);
  });

  it.each([
    ['the row id', [{ name: 'id', type: 'uuid' }], 'the field id is the row id'],
    ['a column a rule\'s node adds, with another type', [{ name: 'owner_id', type: 'text' }], 'the field owner_id is text, and DataDirectOwner adds owner_id as uuid'],
  ])('refuses a field that is %s, and sends nothing', async (_case, fields, message) => {
    const params = { name: 'notes', description: 'Notes', definition: { tables: [{ table_name: 'notes', fields, policies: [{ $type: 'AuthzDirectOwner', data: { entity_field: 'owner_id' } }] }] } };

    const result = await tool.execute(tool.parameters.parse(params), { cwd });

    expect(result.failure).toMatchObject({ code: 'invalid-input', message: expect.stringContaining(message) });
    expect(sent()).toBeUndefined();
  });

  it('keeps a field that a rule\'s node adds with the same type, as the backend does', async () => {
    const params = { name: 'notes', description: 'Notes', definition: { tables: [{ table_name: 'notes', fields: [{ name: 'owner_id', type: 'uuid' }], policies: [{ $type: 'AuthzDirectOwner', data: { entity_field: 'owner_id' } }] }] } };

    await tool.execute(tool.parameters.parse(params), { cwd });

    expect((sent()?.input.blueprint.definition.tables as Array<{ fields: unknown[] }>)[0].fields).toEqual([{ name: 'owner_id', type: { name: 'uuid' } }]);
  });
});
