import { createConstructivePreset } from 'graphile-settings';
import { GraphQLTest } from 'graphile-test';
import { parse } from 'graphql';
import { join } from 'path';
import { getConnections, seed } from 'pgsql-test';

let connections: Awaited<ReturnType<typeof getConnections>>;

beforeAll(async () => {
  connections = await getConnections(
    { useRoot: true },
    [seed.sqlfile([join(__dirname, '../sql/test.sql')])]
  );
});

beforeEach(async () => {
  await connections.pg.beforeEach();
  await connections.db.beforeEach();
});

afterEach(async () => {
  await connections.db.afterEach();
  await connections.pg.afterEach();
});

afterAll(async () => connections.teardown());

it('builds a realtime-enabled API with no realtime-tagged tables', async () => {
  const context = GraphQLTest({
    schemas: ['app_public'],
    authRole: 'postgres',
    preset: { extends: [createConstructivePreset({ enableRealtime: true })] }
  }, connections);

  try {
    await context.setup();
    const result = await context.query({
      query: parse('{ __schema { queryType { name } subscriptionType { name } } }')
    });
    expect(result).toEqual({
      data: { __schema: { queryType: { name: 'Query' }, subscriptionType: null } }
    });
  } finally {
    await context.teardown();
  }
});
