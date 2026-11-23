import { createConstructivePreset } from 'graphile-settings';
import { getConnections } from 'graphile-test';
import { parse } from 'graphql';
import { join } from 'path';
import { seed } from 'pgsql-test';

let connections: Awaited<ReturnType<typeof getConnections>>;

beforeAll(async () => {
  connections = await getConnections(
    {
      useRoot: true,
      schemas: ['app_public'],
      authRole: 'postgres',
      preset: { extends: [createConstructivePreset({ enableRealtime: true })] }
    },
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
  const result = await connections.query(parse('{ __schema { queryType { name } subscriptionType { name } } }'));
  expect(result).toEqual({
    data: { __schema: { queryType: { name: 'Query' }, subscriptionType: null } }
  });
});
