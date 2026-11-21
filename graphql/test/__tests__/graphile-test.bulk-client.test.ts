import { readFileSync } from 'fs';
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
let withPgClient: Awaited<ReturnType<typeof getWithPgClientFromPgService>>;

const returning = 'id name quantity createdAt localTime day metadata labels state history position { x label } optionalAt';

function expectTypedRow(row: any) {
  expect(row.createdAt).toMatch(/^2026-11-20[T ]12:34:56\.123456(?:Z|\+00(?::?00)?)$/);
  expect(row.localTime).toMatch(/^2026-11-20[T ]12:34:56\.654321$/);
  expect(row.day).toBe('2026-11-20');
  expect(row.metadata).toEqual({ nested: [1, null, { enabled: true }], text: 'commas,quotes"and\\slashes' });
  expect(row.labels).toEqual(['comma,value', 'quote"value', 'back\\slash', '', null]);
  expect(row.state).toBe('QUEUED');
  expect(row.history).toEqual(['QUEUED', 'IN_PROGRESS']);
  expect(row.position).toEqual({ x: 7, label: 'nested,record' });
  expect(row.optionalAt).toBeNull();
}

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
  withPgClient = await getWithPgClientFromPgService(service);
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
  ['bulkUpsertItems', 'values: [{name: "Widget A", quantity: 7}, {name: "Client C", quantity: 8}], onConflict: {constraint: ITEMS_NAME_KEY}', 2],
  ['bulkUpdateItems', 'where: {name: {equalTo: "Widget A"}}, patch: {quantity: 9}', 1]
])('%s executes through the real PgClient and returns affected rows', async (field, input, count) => {
  const result = await query<any>({ query: `mutation { ${field}(input: {${input}}) { affectedCount returning { ${returning} } } }` });
  expect(result.errors).toBeUndefined();
  expect(result.data[field].affectedCount).toBe(count);
  expect(result.data[field].returning).toHaveLength(count as number);
  for (const row of result.data[field].returning) {
    expect(row.id).toEqual(expect.any(Number));
    expect(row).toMatchObject({ name: expect.any(String), quantity: expect.any(Number) });
    expectTypedRow(row);
  }
});

it('returns null typed columns without confusing them with empty values', async () => {
  const result = await query<any>({ query: `mutation { bulkCreateItems(input: {values: [{name: "Nulls", metadata: null, labels: null, state: null, history: null, position: null}]}) { returning { metadata labels state history position { x label } optionalAt } } }` });
  expect(result.errors).toBeUndefined();
  expect(result.data.bulkCreateItems.returning).toEqual([{ metadata: null, labels: null, state: null, history: null, position: null, optionalAt: null }]);
});

it('returns no records when a bulk update matches no rows', async () => {
  const result = await query<any>({ query: `mutation { bulkUpdateItems(input: {where: {name: {equalTo: "Absent"}}, patch: {quantity: 1}}) { affectedCount returning { ${returning} } } }` });
  expect(result.errors).toBeUndefined();
  expect(result.data.bulkUpdateItems).toEqual({ affectedCount: 0, returning: [] });
});

it('omits an unsupported physical column before timestamps without shifting returning values', async () => {
  const shape = await query<any>({ query: '{ __type(name: "Item") { fields { name } } }' });
  expect(shape.errors).toBeUndefined();
  expect(shape.data.__type.fields.map((field: any) => field.name)).not.toContain('unsupportedValue');
  const result = await query<any>({ query: `mutation { bulkCreateItems(input: {values: [{name: "Unsupported"}]}) { returning { ${returning} } } }` });
  expect(result.errors).toBeUndefined();
  expect(result.data.bulkCreateItems.returning).toHaveLength(1);
  expectTypedRow(result.data.bulkCreateItems.returning[0]);
});

it('returns non-casting codec attributes without including unsupported physical slots', async () => {
  const result = await query<any>({ query: 'mutation { bulkCreatePlainItems(input: {values: [{quantity: 12}]}) { returning { id quantity state } } }' });
  expect(result.errors).toBeUndefined();
  expect(result.data.bulkCreatePlainItems.returning).toEqual([{ id: expect.any(Number), quantity: 12, state: 'QUEUED' }]);
});

it('preserves the primary-key-only returning contract for deleted rows', async () => {
  const result = await query<any>({ query: 'mutation { bulkDeleteItems(input: {where: {name: {equalTo: "Widget A"}}}) { affectedCount returning { id } } }' });
  expect(result.errors).toBeUndefined();
  expect(result.data.bulkDeleteItems).toEqual({ affectedCount: 1, returning: [{ id: expect.any(Number) }] });
});

it.each([
  ['bulkCreateItems', 'values: [{name: "Computed", quantity: 4}]', 'Computed:4'],
  ['bulkUpsertItems', 'values: [{name: "Widget A", quantity: 6}], onConflict: {constraint: ITEMS_NAME_KEY}', 'Widget A:6'],
  ['bulkUpdateItems', 'where: {name: {equalTo: "Widget A"}}, patch: {quantity: 8}', 'Widget A:8']
])('%s resolves overloaded computed-column functions using the table row type', async (field, input, label) => {
  const shape = await query<any>({ query: '{ __type(name: "Item") { fields { name } } }' });
  expect(shape.data.__type.fields.map((field: any) => field.name)).toContain('label');
  await withPgClient({ role: 'postgres' }, (client) => client.query({
    text: readFileSync(join(__dirname, '../sql/bulk-client-overload.sql'), 'utf8')
  }));
  const result = await query<any>({ query: `mutation { ${field}(input: {${input}}) { returning { ${returning} label } } }` });
  expect(result.errors).toBeUndefined();
  expect(result.data[field].returning).toHaveLength(1);
  expect(result.data[field].returning[0].label).toBe(label);
  expectTypedRow(result.data[field].returning[0]);
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
