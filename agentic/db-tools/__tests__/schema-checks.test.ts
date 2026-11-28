import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { AnyHarnessTool } from '@agentic-kit/harness';

import { constructiveDbTools, constructiveGateDeps } from '../src';
import { configureHost } from '../src/host';
import { DATABASE_ID, type FakeBackend, type GraphQLAnswer, projectAnswer, type SeenRequest, startFakeBackend } from './fake-backend';
import { expectTextNamesNoTool } from './follow-up';

// The project has one table, "tasks", with the field "title", and a template
// "Todo" whose blueprint makes "tasks" and "tags".
const TEMPLATE_DEFINITION = {
  tables: [
    { table_name: 'tasks', fields: [{ name: 'title', type: 'text' }], policies: [{ $type: 'AuthzAllowAll' }] },
    { table_name: 'tags', fields: [], policies: [{ $type: 'AuthzAllowAll' }] },
  ],
};

// The policy rows of "tasks": one entity-membership rule split by privilege,
// and the read-only block the platform adds by itself.
const MEMBERS = { entity_field: 'entity_id', membership_type: 2 };
const POLICY_ROWS = [
  ...['select', 'insert', 'update', 'delete'].map((privilege, index) => ({
    tableId: 't1',
    policyType: 'AuthzEntityMembership',
    privilege,
    permissive: true,
    granteeName: 'authenticated',
    disabled: false,
    // The same data in another key order is the same rule.
    data: index % 2 ? MEMBERS : { membership_type: 2, entity_field: 'entity_id' },
  })),
  ...['insert', 'update', 'delete'].map((privilege) => ({
    tableId: 't1',
    policyType: 'AuthzNotReadOnly',
    privilege,
    permissive: false,
    granteeName: 'authenticated',
    disabled: false,
    data: MEMBERS,
  })),
];

const CHANGES = /createBlueprint|constructBlueprint|copyTemplateToBlueprint/;

// The app's own API: the tables it serves.
const metaTable = (name: string, all: string) => ({ name, query: { all }, inflection: { tableType: name }, fields: [] as unknown[] });

function answer({ host, query, variables }: SeenRequest): GraphQLAnswer {
  if (host.startsWith('api-mydb.')) return { data: { _meta: { tables: [metaTable('Task', 'tasks')] } } };
  if (CHANGES.test(query)) return { data: null, errors: [{ message: 'the test backend refuses every change' }] };
  if (/blueprintTemplates/.test(query)) {
    const name = (variables.where as { displayName?: { equalTo?: string } } | undefined)?.displayName?.equalTo;
    const nodes = [{ id: 'tpl-1', displayName: 'Todo', definition: TEMPLATE_DEFINITION }].filter((node) => !name || node.displayName === name);
    return { data: { blueprintTemplates: { nodes } } };
  }
  if (/entityTypeProvisions/.test(query)) {
    return { data: { entityTypeProvisions: { nodes: [{ id: '0190f1a2-0000-7000-8000-000000000001', name: 'Org', prefix: 'org', isVisible: true }] } } };
  }
  if (/uniqueConstraints/.test(query)) return { data: { uniqueConstraints: { nodes: [] } } };
  if (/policies/.test(query)) return { data: { policies: { nodes: POLICY_ROWS } } };
  if (/fields/.test(query)) return { data: { fields: { nodes: [{ id: 'f1', name: 'title', tableId: 't1', type: { name: 'text' }, isRequired: true, defaultValue: null }] } } };
  if (/tables/.test(query)) return { data: { tables: { nodes: [{ id: 't1', name: 'tasks', category: 'APP' }, { id: 't2', name: 'users', category: 'APP' }] } } };
  return { data: {} };
}

let cwd: string;
let backend: FakeBackend;

beforeEach(async () => {
  cwd = mkdtempSync(path.join(os.tmpdir(), 'db-schema-checks-'));
  writeFileSync(path.join(cwd, '.env'), `DATABASE_ID=${DATABASE_ID}\nDATABASE_NAME=mydb\n`);
  backend = await startFakeBackend((request) => projectAnswer(request.query, 'ME') ?? answer(request));
  configureHost({
    account: () => ({ userId: 'ME', accessToken: 'account-bearer' }),
    backendConfig: () => ({ apiEndpoint: backend.endpoint(), modulesEndpoint: backend.endpoint('modules.localhost') }),
    previewToken: async () => ({ accessToken: 'app-user-token', userId: 'U1' }),
  });
});
afterEach(async () => {
  rmSync(cwd, { recursive: true, force: true });
  await backend.close();
});

const tool = (name: string): AnyHarnessTool => constructiveDbTools.find((candidate) => candidate.name === name);
const run = (name: string, params: Record<string, unknown>) => tool(name).execute(tool(name).parameters.parse(params), { cwd });

describe('a name that is already taken in the project', () => {
  it.each([
    [
      'provision_blueprint',
      { name: 'todo', description: 'Todo', definition: { tables: [{ table_name: 'tasks', policies: [{ $type: 'AuthzAllowAll' }] }] } },
      'The project database already has a table named "tasks".',
    ],
    ['apply_template', { templateName: 'Todo' }, 'The project database already has a table named "tasks".'],
    [
      'add_relation',
      { relation_type: 'many_to_many', source_table: 'tasks', target_table: 'users', junction_table_name: 'tasks' },
      'The project database already has a table named "tasks".',
    ],
    [
      'add_relation',
      { source_table: 'tasks', target_table: 'users', field_name: 'title' },
      'Table "tasks" already has a field named "title".',
    ],
    [
      'provision_blueprint',
      { name: 'todo', description: 'Todo', definition: { tables: [{ table_name: 'task_s', policies: [{ $type: 'AuthzAllowAll' }] }] } },
      'The project database already has a table named "tasks", which is how the backend stores "task_s".',
    ],
  ])('%s %j is name-taken before anything changes', async (name, params, message) => {
    const result = await run(name, params);
    const blocked = await constructiveGateDeps().precondition(name, params, cwd);

    expect(result.failure).toMatchObject({ code: 'name-taken', message });
    expect(result.failure.calls?.length).toBeGreaterThan(0);
    expectTextNamesNoTool(result.failure);
    expect(blocked).toEqual({ kind: 'blocked', failure: result.failure });
    expect(backend.requests.some(({ query }) => CHANGES.test(query))).toBe(false);
  });
});

describe('describe_schema', () => {
  it('reports every policy of a table, the read-only block too, each rule once', async () => {
    const result = await run('describe_schema', {});
    const [tasks] = (result.details as { tables: Array<Record<string, unknown>> }).tables;

    expect(tasks.policies).toEqual(['AuthzEntityMembership', 'AuthzNotReadOnly']);
    expect(tasks.policyRules).toEqual([
      { $type: 'AuthzEntityMembership', privileges: ['select', 'insert', 'update', 'delete'], permissive: true, policy_role: 'authenticated', data: expect.objectContaining(MEMBERS) },
      { $type: 'AuthzNotReadOnly', privileges: ['insert', 'update', 'delete'], permissive: false, policy_role: 'authenticated', data: MEMBERS },
    ]);
    const text = result.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
    expect(text).toMatch(/\n {2}limit\s+AuthzNotReadOnly\s+insert update delete\n?/);
  });
});

describe('a name the backend stores differently', () => {
  it('a table asked for by the name it was made with names the stored one', async () => {
    const result = await run('create_field', { table_name: 'task_s', field_name: 'due', type: 'date' });

    expect(result.failure).toMatchObject({
      code: 'not-found',
      message: 'Table "task_s" not found in current schema. The backend stores that name as "tasks", and a table of that name exists.',
      hint: 'Call again with the name "tasks".',
    });
  });

  it('the plan of a new field says the name it will be stored under', async () => {
    const ready = await constructiveGateDeps().precondition('create_field', { table_name: 'tasks', field_name: 'is_a', type: 'boolean' }, cwd);

    expect(ready).toMatchObject({ kind: 'ready', notes: ['The backend stores the field name "is_a" as "isa".'] });
  });

  it('the plan of a blueprint says the names its tables and fields will be stored under', async () => {
    const input = {
      name: 'todo',
      description: 'Todo',
      definition: { tables: [{ table_name: 'list_a', fields: [{ name: 'x_y', type: 'text' }], policies: [{ $type: 'AuthzAllowAll' }] }] },
    };

    const ready = (await constructiveGateDeps().precondition('provision_blueprint', input, cwd)) as unknown as { access: { table: string; notes?: string[] }[] };

    expect(ready.access[0].notes).toEqual(
      expect.arrayContaining(['The backend stores the table name "list_a" as "lista".', 'The backend stores the field name "x_y" as "xy".']),
    );
  });
});

describe('no plan for a change that cannot work', () => {
  it('plans a generated column used only in an update rule’s with_check', async () => {
    const input = { name: 'todo', description: 'Todo', definition: { tables: [{
      table_name: 'notes',
      policies: [{ $type: 'AuthzAllowAll', privileges: ['update'], with_check: {
        $type: 'AuthzDirectOwner', data: { entity_field: 'editor_id' },
      } }],
    }] } };
    const result = await constructiveGateDeps().precondition('provision_blueprint', input, cwd);
    expect(result).toMatchObject({ kind: 'ready', access: [{
      table: 'notes', columnsAdded: expect.arrayContaining([expect.objectContaining({ name: 'editor_id', type: 'uuid' })]),
    }] });
  });

  it('does not resolve a schema-qualified relation endpoint to an existing table in a different schema', async () => {
    const input = { name: 'todo', description: 'Todo', definition: {
      tables: [{ table_name: 'notes', policies: [{ $type: 'AuthzAllowAll' }] }],
      relations: [{ $type: 'RelationBelongsTo', source_table: 'notes', target_table: 'users', target_schema: 'app_private', field_name: 'parent_id', delete_action: 'c' }],
    } };
    await backend.close();
    backend = await startFakeBackend((request) => /schemas/.test(request.query)
      ? { data: { schemas: { nodes: [{ id: 'schema-1', name: 'app_public' }, { id: 'schema-2', name: 'app_private' }] } } }
      : /tables/.test(request.query)
        ? { data: { tables: { nodes: [{ id: 't2', name: 'users', schemaId: 'schema-1' }] } } }
        : projectAnswer(request.query, 'ME') ?? answer(request));
    const result = await constructiveGateDeps().precondition('provision_blueprint', input, cwd);
    expect(result).toMatchObject({ kind: 'blocked', failure: {
      code: 'not-found', message: expect.stringContaining('names the table "app_private.users"'),
    } });
  });

  // One row for each write and destructive tool that names a table, a field, a template or an entity type:
  // the precondition finds that it does not exist, or that the stored form of a new name is taken.
  const ROWS: Array<[string, Record<string, unknown>, string, string]> = [
    ['delete_table', { table_name: 'no_such_table' }, 'not-found', 'Table "no_such_table" not found'],
    ['create_field', { table_name: 'no_such_table', field_name: 'due', type: 'date' }, 'not-found', 'Table "no_such_table" not found'],
    ['create_field', { table_name: 'tasks', field_name: 'titl_e', type: 'text' }, 'name-taken', 'already has a field named "title", which is how the backend stores "titl_e"'],
    ['update_field', { table_name: 'tasks', field_name: 'nope', is_required: true }, 'not-found', 'Field "nope" not found in table "tasks"'],
    ['retype_field', { table_name: 'tasks', field_name: 'nope', type: 'integer' }, 'not-found', 'Field "nope" not found in table "tasks"'],
    ['delete_field', { table_name: 'tasks', field_name: 'nope' }, 'not-found', 'Field "nope" not found in table "tasks"'],
    ['add_policies', { table_name: 'no_such_table', policies: [{ $type: 'AuthzAppMembership', privileges: ['select'] }] }, 'not-found', 'Table "no_such_table" was not found'],
    ['set_access', { table_name: 'no_such_table', policies: [{ $type: 'AuthzAppMembership', privileges: ['select'] }] }, 'not-found', 'Table "no_such_table" was not found'],
    ['add_relation', { source_table: 'no_such_table', target_table: 'users', field_name: 'owner_id' }, 'not-found', 'Table "no_such_table" not found'],
    ['add_records', { table_name: 'no_such_table', records: [{ title: 'x' }] }, 'not-found', 'Table "no_such_table" was not found in the app database'],
    [
      'provision_blueprint',
      {
        name: 'notes',
        description: 'Notes',
        definition: {
          tables: [{ table_name: 'notes', policies: [{ $type: 'AuthzAppMembership' }] }],
          relations: [{ $type: 'RelationBelongsTo', source_table: 'notes', target_table: 'no_such_table', field_name: 'thing_id', delete_action: 'c' }],
        },
      },
      'not-found',
      'names the table "no_such_table"',
    ],
    ['apply_template', { templateName: 'Nope' }, 'not-found', 'Template "Nope" not found'],
    ['update_template', { templateName: 'Nope', patch: { description: 'x' } }, 'not-found', 'Template "Nope" not found'],
    ['delete_template', { templateName: 'Nope' }, 'not-found', 'Template "Nope" not found'],
    ['delete_entity_type', { entity_type_id: '0190f1a2-0000-7000-8000-000000000009' }, 'not-found', 'No entity type has the id'],
    ['create_entity_type', { name: 'Org' }, 'name-taken', 'an entity type with the prefix "org" already exists'],
  ];
  // The other changes: what they name is new (a database), the backend's own (a key's scope, the generated code),
  // or found the way the tool states (create_template falls back to the latest blueprint).
  const NAMES_NOTHING_TO_CHECK = ['provision_database', 'replace_database', 'create_template', 'create_api_key', 'run_codegen'];

  it.each(ROWS)('%s %j is blocked before any plan', async (name, params, code, message) => {
    const ready = await constructiveGateDeps().precondition(name, params, cwd);

    expect(ready).toMatchObject({ kind: 'blocked', failure: { code, message: expect.stringContaining(message) } });
    expect(backend.requests.some(({ query }) => CHANGES.test(query) || /mutation/.test(query))).toBe(false);
  });

  it('covers every tool that can change something', () => {
    const changing = constructiveDbTools.filter((tool) => tool.effect !== 'read').map((tool) => tool.name);
    const covered = new Set([...ROWS.map(([name]) => name), ...NAMES_NOTHING_TO_CHECK]);
    expect(changing.filter((name) => !covered.has(name))).toEqual([]);
  });
});
