import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { AnyHarnessTool } from '@agentic-kit/harness';

import { constructiveDbTools } from '../src';
import { configureHost } from '../src/host';
import { storedName } from '../src/schema-resolve';
import { DATABASE_ID, type FakeBackend, type GraphQLAnswer, projectAnswer, type SeenRequest, startFakeBackend } from './fake-backend';
import recorded from './fixtures/stored-names-2026-11-25.json';

describe('storedName', () => {
  // The backend's own answers: a table or field name goes through inflection.underscore and get_identifier on insert.
  it.each(recorded.names.map(({ input, stored }) => [input, stored]))('stores %j as %j, as the backend does', (input, stored) => {
    expect(storedName(input)).toBe(stored);
  });

  it('gives no answer for a name with a letter outside ASCII, which the backend strips of accents with unaccent', () => {
    expect(storedName('café')).toBeUndefined();
  });
});

describe('the tools name what the backend stored', () => {
  let cwd: string;
  let backend: FakeBackend;

  // The backend stores "list_a" as "lista" and "x_y" as "xy", and answers with the stored rows.
  function answer({ query, variables }: SeenRequest): GraphQLAnswer {
    if (/createBlueprint\b/.test(query)) return { data: { createBlueprint: { blueprint: { id: 'bp-1', name: 'todo_1' } } } };
    if (/constructBlueprint/.test(query)) return { data: { constructBlueprint: { result: 'bc-1' } } };
    if (/blueprintConstructions\b/.test(query)) return { data: { blueprintConstructions: { nodes: [{ status: 'constructed', tableMap: { list_a: 't9' } }] } } };
    if (/createField/.test(query)) {
      const data = (variables.input as { field: { name: string } }).field;
      return { data: { createField: { field: { id: 'f9', name: storedName(data.name), type: { name: 'text' } } } } };
    }
    if (/\btables\b/.test(query)) {
      const ids = (variables.where as { id?: { in?: string[] } } | undefined)?.id?.in;
      if (ids) return { data: { tables: { nodes: ids.includes('t9') ? [{ id: 't9', name: 'lista' }] : [] } } };
      return { data: { tables: { nodes: [{ id: 't1', name: 'tasks' }] } } };
    }
    if (/\bfields\b/.test(query)) return { data: { fields: { nodes: [] } } };
    if (/uniqueConstraints/.test(query)) return { data: { uniqueConstraints: { nodes: [] } } };
    return { data: {} };
  }

  beforeEach(async () => {
    cwd = mkdtempSync(path.join(os.tmpdir(), 'db-stored-names-'));
    writeFileSync(path.join(cwd, '.env'), `DATABASE_ID=${DATABASE_ID}\nDATABASE_NAME=mydb\nOWNER_ID=b0000000-0000-4000-8000-00000000000e\n`);
    backend = await startFakeBackend((request) => projectAnswer(request.query, 'ME') ?? answer(request));
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

  it('provision_blueprint reports each table and field as stored, and the name it was given', async () => {
    const result = await run('provision_blueprint', {
      name: 'todo',
      description: 'Todo',
      definition: { tables: [{ table_name: 'list_a', fields: [{ name: 'x_y', type: 'text' }], policies: [{ $type: 'AuthzAllowAll' }] }] },
    });

    expect(result.failure).toBeUndefined();
    expect(result.details.tables[0]).toMatchObject({ name: 'lista', requestedName: 'list_a', fields: [expect.objectContaining({ name: 'xy', requestedName: 'x_y' })] });
    expect(result.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('lista (stored from "list_a"') });
  });

  it('create_field reports the field as stored', async () => {
    const result = await run('create_field', { table_name: 'tasks', field_name: 'is_a', type: 'boolean' });

    expect(result.failure).toBeUndefined();
    expect(result.details.message).toBe('Added field tasks.isa (stored from "is_a").');
  });
});
