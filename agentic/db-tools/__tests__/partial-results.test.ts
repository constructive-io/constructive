import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { AnyHarnessTool } from '@agentic-kit/harness';

import { constructiveDbTools } from '../src';
import { configureHost } from '../src/host';
import { DATABASE_ID, type FakeBackend, type GraphQLAnswer, projectAnswer, startFakeBackend } from './fake-backend';
import { expectTextNamesNoTool, suggests } from './follow-up';

const FORBIDDEN = { message: 'You do not have permission to do that.', extensions: { code: 'FORBIDDEN', class: 'public' } };
const DUPLICATE = { message: 'That value already exists.', extensions: { code: 'UNIQUE_VIOLATION', class: 'public' } };

// One table "posts" with a field "title" that has a unique constraint. The
// schema changes go through; every unique-constraint change is refused.
function schemaBackend(query: string): GraphQLAnswer {
  if (/createUniqueConstraint|deleteUniqueConstraint/.test(query)) return { data: null, errors: [FORBIDDEN] };
  if (/createField/.test(query)) return { data: { createField: { field: { id: 'f2', name: 'slug', type: 'text' } } } };
  if (/updateField/.test(query)) return { data: { updateField: { field: { id: 'f1', name: 'headline', type: 'text' } } } };
  if (/uniqueConstraints/.test(query)) return { data: { uniqueConstraints: { nodes: [{ id: 'u1', tableId: 't1', fieldIds: ['f1'] }] } } };
  if (/fields/.test(query)) return { data: { fields: { nodes: [{ id: 'f1', name: 'title', tableId: 't1' }] } } };
  if (/tables/.test(query)) return { data: { tables: { nodes: [{ id: 't1', name: 'posts' }] } } };
  return { data: {} };
}

// The app's own API for add_records: one table "posts"; a row titled "taken" is a duplicate.
function appBackend(query: string, variables: Record<string, unknown>): GraphQLAnswer {
  if (/DbToolsMeta/.test(query)) {
    return {
      data: {
        _meta: {
          tables: [
            {
              name: 'Post',
              query: { all: 'posts', one: 'post', create: 'createPost', update: 'updatePost', delete: 'deletePost' },
              inflection: { tableType: 'Post', createInputType: 'CreatePostInput', createPayloadType: 'CreatePostPayload' },
              fields: [
                { name: 'id', isNotNull: true, hasDefault: true, type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' } },
                { name: 'title', isNotNull: true, hasDefault: false, type: { gqlType: 'String', isArray: false, pgType: 'text' } },
              ],
            },
          ],
        },
      },
    };
  }
  const row = (variables.input as { post?: { title?: string } } | undefined)?.post;
  if (row?.title === 'taken') return { data: null, errors: [DUPLICATE] };
  if (row?.title === 'refused') return { data: null, errors: [FORBIDDEN] };
  // A row the policy lets this user insert but not read: no error, and no row in the answer.
  if (row?.title === 'hidden') return { data: { createPost: { post: null } } };
  return { data: { createPost: { post: { id: `id-${row?.title}`, title: row?.title } } } };
}

let cwd: string;
let backend: FakeBackend;
let warn: jest.SpyInstance;

beforeEach(async () => {
  cwd = mkdtempSync(path.join(os.tmpdir(), 'db-partial-'));
  writeFileSync(path.join(cwd, '.env'), `DATABASE_ID=${DATABASE_ID}\nDATABASE_NAME=mydb\n`);
  backend = await startFakeBackend(({ host, query, variables }) =>
    projectAnswer(query, 'ME') ?? (host.startsWith('api-mydb.') ? appBackend(query, variables) : schemaBackend(query)),
  );
  configureHost({
    account: () => ({ userId: 'ME', accessToken: 'account-bearer' }),
    backendConfig: () => ({ apiEndpoint: backend.endpoint(), modulesEndpoint: backend.endpoint('modules.localhost') }),
    previewToken: async () => ({ accessToken: 'app-user-token', userId: 'U1' }),
  });
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(async () => {
  const warned = warn.mock.calls.length;
  warn.mockRestore();
  rmSync(cwd, { recursive: true, force: true });
  await backend.close();
  // A tool reports in its result; it never writes to the console.
  expect(warned).toBe(0);
});

const tool = (name: string): AnyHarnessTool => constructiveDbTools.find((candidate) => candidate.name === name);
const run = (name: string, params: Record<string, unknown>) => tool(name).execute(tool(name).parameters.parse(params), { cwd });

describe('a call that did only part of what was asked', () => {
  it('create_field: the field is added, its unique constraint is refused', async () => {
    const result = await run('create_field', { table_name: 'posts', field_name: 'slug', type: 'text', is_unique: true });

    expect(result.failure).toMatchObject({ code: 'partial', calls: [suggests('update_field', { table_name: 'posts', field_name: 'slug', is_unique: true })] });
    expectTextNamesNoTool(result.failure);
    expect(result.failure.message).toMatch(/^Added field posts\.slug\. The unique constraint was not created: the backend answered with the code FORBIDDEN/);
    expect(result.details).toEqual({
      success: false,
      message: expect.stringContaining('Added field posts.slug.'),
      errors: ['The unique constraint was not created: the backend answered with the code FORBIDDEN.'],
    });
  });

  it('update_field: the rename is made, the unique constraint is not removed', async () => {
    const result = await run('update_field', { table_name: 'posts', field_name: 'title', new_name: 'headline', is_unique: false });

    expect(result.failure).toMatchObject({ code: 'partial', calls: [suggests('update_field', { table_name: 'posts', field_name: 'headline', is_unique: false })] });
    expectTextNamesNoTool(result.failure);
    expect(result.failure.message).toMatch(/^Updated field posts\.title\. The unique constraint was not removed/);
  });

  it('update_field: only the unique constraint was asked for, so nothing was done', async () => {
    const result = await run('update_field', { table_name: 'posts', field_name: 'title', is_unique: false });

    expect(result.failure).toMatchObject({ code: 'permission-denied' });
    expect(result.details.success).toBe(false);
  });

  it('update_field: a field that is already unique needs no change', async () => {
    const result = await run('update_field', { table_name: 'posts', field_name: 'title', is_unique: true });

    expect(result.failure).toBeUndefined();
    expect(result.details).toMatchObject({ success: true, message: 'Field posts.title is already unique; nothing changed.' });
  });

  it('add_records: some rows are inserted, the failed rows and their errors are in details', async () => {
    const result = await run('add_records', {
      table_name: 'posts',
      records: [{ title: 'one' }, { title: 'taken' }, { title: 'two' }],
    });

    expect(result.failure).toMatchObject({ code: 'partial' });
    expect(result.failure.message).toBe(
      'Inserted 2 of 3 rows into posts; 1 were not inserted (row 1: the backend answered with the code UNIQUE_VIOLATION).',
    );
    expect(result.details).toMatchObject({
      success: false,
      createdCount: 2,
      failedRows: [{ index: 1, message: 'the backend answered with the code UNIQUE_VIOLATION' }],
    });
  });

  it('add_records: a row the backend answers without is not counted as inserted', async () => {
    const result = await run('add_records', { table_name: 'posts', records: [{ title: 'one' }, { title: 'hidden' }] });

    expect(result.failure).toMatchObject({ code: 'partial' });
    expect(result.details).toMatchObject({
      createdCount: 1,
      failedRows: [{ index: 1, message: 'The backend answered without the new row, so it may not exist, or this account may not read it.' }],
    });
  });

  it('add_records: no row in any answer is no-rows-changed, not a success', async () => {
    const result = await run('add_records', { table_name: 'posts', records: [{ title: 'hidden' }] });

    expect(result.failure).toEqual({
      code: 'no-rows-changed',
      message: 'Failed to insert into "posts": the backend answered without the new row, so it may not exist, or this account may not read it.',
      hint: "The table's read rules may hide the new row from this person: read the rules of the table to see who they let read.",
      calls: [suggests('explain_access', { table_name: 'posts' })],
    });
  });

  it('add_records: a refused row points to the rules of the table', async () => {
    const result = await run('add_records', { table_name: 'posts', records: [{ title: 'refused' }] });

    expect(result.failure).toMatchObject({
      code: 'permission-denied',
      hint: expect.stringContaining('read the rules of the table'),
      calls: [suggests('explain_access', { table_name: 'posts' })],
    });
    expectTextNamesNoTool(result.failure);
  });

  it('add_records: a duplicate row value is a conflict, not a name to change', async () => {
    const result = await run('add_records', { table_name: 'posts', records: [{ title: 'taken' }] });

    expect(result.failure).toMatchObject({ code: 'conflict' });
    expect(result.failure.hint).not.toMatch(/name/i);
  });
});
