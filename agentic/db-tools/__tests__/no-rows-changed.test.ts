import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { AnyHarnessTool } from '@agentic-kit/harness';

import { constructiveDbTools } from '../src';
import { configureHost } from '../src/host';
import { DATABASE_ID, type FakeBackend, type GraphQLAnswer, projectAnswer, startFakeBackend } from './fake-backend';
import { expectTextNamesNoTool, suggests } from './follow-up';

const ENTITY_TYPE_ID = '019a1d47-5c2e-7a1b-8f00-aabbccddeeff';

// Each mutation the tools send, with the payload field that names its row and the row.
const MUTATIONS: [string, string, unknown][] = [
  ['deleteTable', 'table', { id: 't1' }],
  ['updateField', 'field', { id: 'f1', name: 'headline', type: 'text' }],
  ['deleteField', 'field', { id: 'f1' }],
  ['createField', 'field', { id: 'f9', name: 'slug', type: 'text' }],
  ['deleteUniqueConstraint', 'uniqueConstraint', { id: 'u1' }],
  ['createUniqueConstraint', 'uniqueConstraint', { id: 'u9' }],
  ['updateBlueprintTemplate', 'blueprintTemplate', { id: 'tpl-1', displayName: 'Blog' }],
  ['deleteBlueprintTemplate', 'blueprintTemplate', { id: 'tpl-1' }],
  ['createBlueprintTemplate', 'blueprintTemplate', { id: 'tpl-9', displayName: 'Blog copy' }],
  ['deleteEntityTypeProvision', 'entityTypeProvision', { id: ENTITY_TYPE_ID, name: 'org', outEntityTableName: 'orgs' }],
  ['createEntityTypeProvision', 'entityTypeProvision', { id: ENTITY_TYPE_ID, name: 'org', prefix: 'org', outEntityTableName: 'orgs' }],
  ['createSecureTableProvision', 'secureTableProvision', { id: 'stp-9', tableId: 't1', tableName: 'posts' }],
  ['createBlueprint', 'blueprint', { id: 'bp-9', name: 'notes' }],
  ['copyTemplateToBlueprint', 'result', 'bp-9'],
  ['constructBlueprint', 'result', 'construction-9'],
];

// The mutations that answer the way the server at main answers for a row this
// account cannot see (server-main.md, events e1 and e3): no error, and no row
// in the payload. Every other one answers with its row.
let rowless: RegExp;

// One table "posts" (fields "title", unique, and "body") and a table "users";
// one template "Blog"; one blueprint of the project.
function backendAnswer(query: string): GraphQLAnswer {
  for (const [name, key, row] of MUTATIONS) {
    if (new RegExp(`\\b${name}\\b`).test(query)) return { data: { [name]: { [key]: rowless.test(name) ? null : row } } };
  }
  if (/blueprintTemplates/.test(query)) {
    return { data: { blueprintTemplates: { nodes: [{ id: 'tpl-1', displayName: 'Blog', definition: {} }] } } };
  }
  // The entity types there are: the one a delete names, and no type with the prefix "org" a create takes.
  if (/entityTypeProvisions/.test(query)) return { data: { entityTypeProvisions: { nodes: [{ id: ENTITY_TYPE_ID, prefix: 'other' }] } } };
  if (/\bblueprints\b/.test(query)) {
    return { data: { blueprints: { nodes: [{ id: 'bp-0', name: 'blog', displayName: 'blog', definition: { tables: [] } }] } } };
  }
  if (/uniqueConstraints/.test(query)) return { data: { uniqueConstraints: { nodes: [{ id: 'u1', tableId: 't1', fieldIds: ['f1'] }] } } };
  if (/fields/.test(query)) {
    return { data: { fields: { nodes: [{ id: 'f1', name: 'title', tableId: 't1' }, { id: 'f2', name: 'body', tableId: 't1' }] } } };
  }
  if (/tables/.test(query)) return { data: { tables: { nodes: [{ id: 't1', name: 'posts' }, { id: 't2', name: 'users' }] } } };
  return { data: {} };
}

let cwd: string;
let backend: FakeBackend;

beforeEach(async () => {
  cwd = mkdtempSync(path.join(os.tmpdir(), 'db-no-rows-'));
  writeFileSync(path.join(cwd, '.env'), `DATABASE_ID=${DATABASE_ID}\nDATABASE_NAME=mydb\n`);
  rowless = /./;
  backend = await startFakeBackend(({ query }) => projectAnswer(query, 'ME') ?? backendAnswer(query));
  configureHost({
    account: () => ({ userId: 'ME', accessToken: 'account-bearer' }),
    backendConfig: () => ({ apiEndpoint: backend.endpoint(), modulesEndpoint: backend.endpoint('modules.localhost') }),
  });
});
afterEach(async () => {
  rmSync(cwd, { recursive: true, force: true });
  await backend.close();
});

const tool = (name: string): AnyHarnessTool => constructiveDbTools.find((candidate) => candidate.name === name);
const run = (name: string, params: Record<string, unknown>) => tool(name).execute(tool(name).parameters.parse(params), { cwd });

const CHECK_CALLS: Record<string, ReturnType<typeof suggests>> = {
  'explain_access with table_name "posts"': suggests('explain_access', { table_name: 'posts' }),
};
const checkCall = (check: string) => CHECK_CALLS[check] ?? suggests(check, {});

const NO_ROW = 'no row was changed, because it does not exist or this account may not change it.';

describe('a mutation that answers with no row changed nothing', () => {
  it.each<[string, Record<string, unknown>, string, string]>([
    ['delete_table', { table_name: 'posts' }, 'Failed to delete table "posts"', 'describe_schema'],
    ['update_field', { table_name: 'posts', field_name: 'title', new_name: 'headline' }, 'Failed to update field "title" on "posts"', 'describe_schema'],
    ['update_field', { table_name: 'posts', field_name: 'title', is_unique: false }, 'The unique constraint was not removed', 'describe_schema'],
    ['delete_field', { table_name: 'posts', field_name: 'title' }, 'Failed to delete field "title" from "posts"', 'describe_schema'],
    ['update_template', { templateName: 'Blog', patch: { description: 'A blog' } }, 'Failed to update template "Blog"', 'list_templates'],
    ['delete_template', { templateName: 'Blog' }, 'Failed to delete template "Blog"', 'list_templates'],
    ['delete_entity_type', { entity_type_id: ENTITY_TYPE_ID }, `Failed to delete entity type ${ENTITY_TYPE_ID}`, 'list_entity_types'],
  ])('%s %j: reports no-rows-changed, not success', async (name, params, action, check) => {
    const result = await run(name, params);

    expect(result.details.success).toBe(false);
    expect(result.failure).toEqual({
      code: 'no-rows-changed',
      message: `${action}: ${NO_ROW}`,
      hint: 'Check that it still exists; if it does, this account may not change it.',
      calls: [checkCall(check)],
    });
    expectTextNamesNoTool(result.failure);
  });
});

const NO_NEW_ROW = 'the backend answered without the new row, so it may not exist, or this account may not read it.';

describe('a create that answers with no row is not a success', () => {
  it.each<[string, Record<string, unknown>, string, string, string]>([
    ['create_field', { table_name: 'posts', field_name: 'slug', type: 'text' }, 'createField', 'Failed to add field "slug" to "posts"', 'describe_schema'],
    ['update_field', { table_name: 'posts', field_name: 'body', is_unique: true }, 'createUniqueConstraint', 'The unique constraint was not added', 'describe_schema'],
    ['add_policies', { table_name: 'posts', policies: [{ $type: 'AuthzAllowAll', privileges: ['select'] }] }, 'createSecureTableProvision', 'Failed to add policies to "posts"', 'explain_access with table_name "posts"'],
    ['create_template', { displayName: 'Blog copy' }, 'createBlueprintTemplate', 'Failed to create template "Blog copy"', 'list_templates'],
    [
      'provision_blueprint',
      { name: 'notes', description: 'Notes', definition: { tables: [{ table_name: 'notes', policies: [{ $type: 'AuthzAllowAll' }] }] } },
      'createBlueprint',
      'Failed to create the blueprint "notes"',
      'describe_schema',
    ],
    [
      'provision_blueprint',
      { name: 'notes', description: 'Notes', definition: { tables: [{ table_name: 'notes', policies: [{ $type: 'AuthzAllowAll' }] }] } },
      'constructBlueprint',
      'Failed to provision "notes"',
      'describe_schema',
    ],
    ['add_relation', { source_table: 'posts', target_table: 'users', field_name: 'author_id' }, 'createBlueprint', 'Failed to add relation', 'describe_schema'],
    ['apply_template', { templateName: 'Blog' }, 'copyTemplateToBlueprint', 'Failed to apply template "Blog"', 'describe_schema'],
    ['create_entity_type', { name: 'org' }, 'createEntityTypeProvision', 'Failed to create entity type "org"', 'list_entity_types'],
  ])('%s %j: reports no-rows-changed when %s names no row', async (name, params, mutation, action, check) => {
    rowless = new RegExp(`^${mutation}$`);

    const result = await run(name, params);

    expect(result.failure).toEqual({
      code: 'no-rows-changed',
      message: `${action}: ${NO_NEW_ROW}`,
      hint: 'Check whether it exists before you call again.',
      calls: [checkCall(check)],
    });
    expectTextNamesNoTool(result.failure);
  });

  it('create_field: the field is added, and a unique constraint with no row is the part that failed', async () => {
    rowless = /^createUniqueConstraint$/;

    const result = await run('create_field', { table_name: 'posts', field_name: 'slug', type: 'text', is_unique: true });

    expect(result.failure).toMatchObject({
      code: 'partial',
      message: `Added field posts.slug. The unique constraint was not created: ${NO_NEW_ROW}`,
    });
  });
});
