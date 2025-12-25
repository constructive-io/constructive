import '../test-utils/env';

import ConnectionFilterPlugin from 'graphile-plugin-connection-filter';
// @ts-ignore
import FulltextFilterPlugin from 'graphile-plugin-fulltext-filter';
import PgSimpleInflector from 'graphile-simple-inflector';
import { getConnections, GraphQLQueryFn,seed, snapshot } from 'graphile-test';
import { join } from 'path';
import type { PgTestClient } from 'pgsql-test/test-client';

import { PgSearchPlugin } from '../src';
import {
  GoalsSearchViaCondition,
  GoalsSearchViaCondition2,
  GoalsSearchViaFilter,
  GoalsSearchViaFilter2
} from '../test-utils/queries';

const SCHEMA = 'app_public';
const sql = (f: string) => join(__dirname, '../sql', f);

let teardown: () => Promise<void>;
let query: GraphQLQueryFn;
let db: PgTestClient;

beforeAll(async () => {
  const connections = await getConnections(
    {
      schemas: [SCHEMA],
      authRole: 'authenticated',
      graphile: {
        overrideSettings:{
          graphileBuildOptions:{
            pgSearchPrefix: 'fullText'
          },
          appendPlugins: [
            PgSimpleInflector,
            ConnectionFilterPlugin,
            FulltextFilterPlugin,
            PgSearchPlugin
          ]
        }
      }
    },
    [
      seed.sqlfile([
        sql('test.sql')
      ])
    ]
  );

  ({ db, query, teardown } = connections);
});

beforeEach(() => db.beforeEach());
beforeEach(async () => {
  db.setContext({
    role: 'authenticated'
  });
});
afterEach(() => db.afterEach());
afterAll(async () => {
  await teardown();
});

it('GoalsSearchViaFilter (order not relevant)', async () => {
  const data = await query(GoalsSearchViaFilter, {
    search: 'fowl'
  });
  expect(snapshot(data)).toMatchSnapshot();
});

it('GoalsSearchViaCondition (order is relevant)', async () => {
  const data = await query(GoalsSearchViaCondition, {
    search: 'fowl'
  });
  expect(snapshot(data)).toMatchSnapshot();
});

it('GoalsSearchViaFilter2 (order not relevant)', async () => {
  const data = await query(GoalsSearchViaFilter2, {
    search: 'fowl'
  });
  expect(snapshot(data)).toMatchSnapshot();
});

it('GoalsSearchViaCondition2 (order is relevant)', async () => {
  const data = await query(GoalsSearchViaCondition2, {
    search: 'fowl'
  });
  expect(snapshot(data)).toMatchSnapshot();
});
