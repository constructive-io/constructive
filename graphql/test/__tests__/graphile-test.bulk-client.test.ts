import { execute } from 'grafast';
import { makeSchema } from 'graphile-build';
import { createConstructivePreset, makePgService } from 'graphile-settings';
import type { GraphQLQueryFnObj } from 'graphile-test';
import type { GraphQLInputObjectType } from 'graphql';
import { getNamedType, parse } from 'graphql';
import { join } from 'path';
import { getWithPgClientFromPgService } from 'postgraphile/@dataplan/pg';
import { getConnections, seed } from 'pgsql-test';
import type { PgTestClient } from 'pgsql-test/test-client';

let pg: PgTestClient;
let db: PgTestClient;
let query: GraphQLQueryFnObj;
let teardown: () => Promise<void>;
let service: ReturnType<typeof makePgService>;

beforeEach(async () => {
  const connections = await getConnections({}, [seed.sqlfile([join(__dirname, '../sql/bulk-client.sql')])]);
  ({ pg, db, teardown } = connections);
  await pg.beforeEach(); await db.beforeEach();
  service = makePgService({ pool: connections.manager.getPool(pg.config), schemas: ['bulk_test'] });
  const { schema, resolvedPreset } = await makeSchema({
    extends: [createConstructivePreset({ enableBulk: true })],
    pgServices: [service]
  });
  // Bulk callbacks must receive the production PgClient facade.
  const withPgClient = await getWithPgClientFromPgService(service);
  query = async ({ query: document }) => execute({
    schema, resolvedPreset,
    document: typeof document === 'string' ? parse(document) : document,
    contextValue: { pgSettings: { role: 'postgres' }, withPgClient }
  }) as Promise<any>;
});
afterEach(async () => {
  await db.afterEach(); await pg.afterEach();
  await service.release?.();
  await teardown?.();
});

it.each([
  ['bulkCreateItems', 'values: [{name: "Client A", quantity: 1}, {name: "Client B", quantity: 2}]', 2],
  ['bulkUpsertItems', 'values: [{name: "Widget A", quantity: 7}, {name: "Client C", quantity: 8}], onConflict: {constraint: ITEMS_NAME_KEY}', 2]
])('%s executes through the real PgClient and returns affected rows', async (field, input, count) => {
  const result = await query<any>({ query: `mutation { ${field}(input: {${input}}) { affectedCount returning { id name quantity } } }` });
  expect(result.errors).toBeUndefined();
  expect(result.data[field].affectedCount).toBe(count);
  expect(result.data[field].returning).toHaveLength(count as number);
  for (const row of result.data[field].returning) {
    expect(row.id).toEqual(expect.any(Number));
    expect(row).toMatchObject({ name: expect.any(String), quantity: expect.any(Number) });
  }
});

it('an empty bulk insert does not issue an empty query', async () => {
  const result = await query<any>({ query: 'mutation { bulkCreateItems(input: {values: []}) { affectedCount returning { id } } }' });
  expect(result.errors).toBeUndefined();
  expect(result.data.bulkCreateItems).toEqual({ affectedCount: 0, returning: [] });
});

it('reports the real database constraint error rather than an invalid query call', async () => {
  const result = await query<any>({ query: 'mutation { bulkCreateItems(input: {values: [{name: "Widget A"}]}) { affectedCount } }' });
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].message).toMatch(/duplicate key value violates unique constraint/);
});

it.each([true, false])('builds full-preset bulk update/delete inputs with connection filtering %s', async (enableConnectionFilter) => {
  const { schema } = await makeSchema({
    extends: [createConstructivePreset({ enableBulk: true, enableConnectionFilter })],
    pgServices: [service]
  });
  const fields = schema.getMutationType()!.getFields();
  for (const name of ['bulkUpdateItems', 'bulkDeleteItems']) {
    expect(fields[name]).toBeDefined();
    const input = getNamedType(fields[name].args[0].type) as GraphQLInputObjectType;
    expect(String(input.getFields().where.type)).toBe(enableConnectionFilter ? 'ItemFilter!' : 'ItemCondition!');
  }
});
