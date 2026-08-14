import { introspect } from 'introspectron';
import { join } from 'path';
import { getConnections, seed } from 'pgsql-test';
import type { PgTestClient } from 'pgsql-test/test-client';

import { buildIr, Ir } from '../src/ir';

const sql = (f: string) => join(__dirname, '/../sql', f);

let teardown: () => Promise<void>;
let pg: PgTestClient;
let ir: Ir;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections({}, [seed.sqlfile([sql('test.sql')])]));
  const introspection = await introspect(pg.client, { schemas: ['codegen_test'] });
  ir = buildIr(introspection, { schemas: ['codegen_test'] });
});

afterAll(() => teardown());

const table = (name: string) => {
  const found = ir.schemas[0].tables.find(candidate => candidate.name === name);
  if (!found) throw new Error(`table ${name} missing from IR`);
  return found;
};

const column = (tableName: string, columnName: string) => {
  const found = table(tableName).columns.find(candidate => candidate.name === columnName);
  if (!found) throw new Error(`column ${tableName}.${columnName} missing from IR`);
  return found;
};

it('normalizes tables, views and their primary keys', () => {
  expect(ir.schemas).toHaveLength(1);
  expect(ir.schemas[0].tables.map(candidate => `${candidate.kind}:${candidate.name}`)).toEqual([
    'view:active_users',
    'table:agent_runs',
    'table:posts',
    'table:users'
  ]);
  expect(table('users').primaryKey).toEqual(['id']);
  expect(table('agent_runs').primaryKey).toEqual(['id']);
  expect(table('active_users').primaryKey).toEqual([]);
});

it('maps scalars, nullability and defaults', () => {
  expect(column('users', 'id')).toMatchObject({
    scalar: 'integer',
    nullable: false,
    hasDefault: true,
    propertyName: 'id'
  });
  expect(column('users', 'username')).toMatchObject({ scalar: 'string', nullable: false });
  expect(column('posts', 'id')).toMatchObject({ scalar: 'uuid', nullable: false });
  expect(column('posts', 'published')).toMatchObject({ scalar: 'boolean', nullable: true });
  expect(column('posts', 'published_at')).toMatchObject({ scalar: 'timestamp', nullable: true });
  expect(column('agent_runs', 'last_event_seq')).toMatchObject({ scalar: 'bigint', nullable: false });
  expect(column('agent_runs', 'score')).toMatchObject({ scalar: 'number', nullable: true });
  expect(column('agent_runs', 'metadata')).toMatchObject({ scalar: 'json', nullable: false });
  expect(column('agent_runs', 'settings')).toMatchObject({ scalar: 'json', nullable: true });
});

it('derives camelCase property names', () => {
  expect(column('agent_runs', 'thread_id').propertyName).toBe('threadId');
  expect(column('agent_runs', 'last_event_seq').propertyName).toBe('lastEventSeq');
});

it('unwraps domains to their base scalar', () => {
  expect(column('users', 'email')).toMatchObject({ scalar: 'string', nullable: true, pgType: 'email' });
});

it('resolves arrays to their element scalar', () => {
  expect(column('agent_runs', 'tags')).toMatchObject({ scalar: 'string', isArray: true, nullable: false });
  expect(column('agent_runs', 'retry_seconds')).toMatchObject({ scalar: 'integer', isArray: true, nullable: true });
});

it('collects enums and links enum columns to them', () => {
  expect(ir.schemas[0].enums).toEqual([
    {
      schema: 'codegen_test',
      name: 'run_status',
      values: ['queued', 'running', 'succeeded', 'failed']
    }
  ]);
  expect(column('agent_runs', 'status')).toMatchObject({
    scalar: 'enum',
    enumName: 'run_status',
    nullable: false
  });
});

it('carries table and column comments', () => {
  expect(table('agent_runs').comment).toBe('One run of an agent within a thread');
  expect(column('agent_runs', 'last_event_seq').comment).toBe(
    'Highest event seq appended for this run'
  );
});
