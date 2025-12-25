import '../../test-utils/env';

import { readdirSync, readFileSync } from 'fs';
import { getConnections, type GraphQLQueryFn,seed, snapshot } from 'graphile-test';
import { join } from 'path';
import type { PgTestClient } from 'pgsql-test/test-client';

import PostgisPlugin from '../../src';
import { sql } from '../../test-utils/helpers';

const queriesDir = join(__dirname, '../fixtures/queries');
const queryFileNames = readdirSync(queriesDir);

describe('integration queries', () => {
  let teardown: () => Promise<void>;
  let query: GraphQLQueryFn;
  let db: PgTestClient;

  beforeAll(async () => {
    const connections = await getConnections(
      {
        schemas: ['graphile_postgis'],
        authRole: 'authenticated',
        graphile: {
          overrideSettings: {
            appendPlugins: [PostgisPlugin]
          }
        }
      },
      [seed.sqlfile([sql('schema.sql')])]
    );

    ({ db, query, teardown } = connections);
  });

  beforeEach(async () => {
    await db.beforeEach();
    db.setContext({ role: 'authenticated' });
  });
  afterEach(() => db.afterEach());
  afterAll(async () => {
    await teardown();
  });

  it.each(queryFileNames)('%s', async (queryFileName) => {
    const queryText = readFileSync(join(queriesDir, queryFileName), 'utf8');
    const result = await query(queryText);

    expect(snapshot(result)).toMatchSnapshot();
  });
});
