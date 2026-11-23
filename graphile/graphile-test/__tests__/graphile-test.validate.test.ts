process.env.LOG_SCOPE = 'graphile-test';

import gql from 'graphql-tag';
import { join } from 'path';
import { seed } from 'pgsql-test';
import type { PgTestClient } from 'pgsql-test/test-client';

import { getConnections } from '../src/get-connections';
import type { GraphQLQueryFn } from '../src/types';

const schemas = ['app_public'];
const sql = (f: string) => join(__dirname, '/../sql', f);

let teardown: () => Promise<void>;
let query: GraphQLQueryFn;
let db: PgTestClient;

beforeAll(async () => {
  const connections = await getConnections(
    {
      schemas,
      authRole: 'authenticated'
    },
    [seed.sqlfile([sql('test.sql'), sql('grants.sql')])]
  );
  ({ db, query, teardown } = connections);
});

beforeEach(async () => {
  await db.beforeEach();
  db.setContext({ role: 'authenticated' });
});
afterEach(() => db.afterEach());
afterAll(() => teardown());

// grafserv validates a document before it plans it; grafast's execute() alone
// does not. The test harness has to reject exactly what the server rejects.
describe('documents grafserv rejects are rejected here too', () => {
  it('a variable that is declared but never used', async () => {
    const res = await query(gql`
      query ($unused: Int) {
        __typename
      }
    `);
    expect(res.data).toBeUndefined();
    expect(res.errors?.map((e) => e.message)).toEqual(['Variable "$unused" is never used.']);
  });

  it('a fragment that is defined but never spread', async () => {
    const res = await query(gql`
      query {
        __typename
      }
      fragment Unused on Query {
        __typename
      }
    `);
    expect(res.data).toBeUndefined();
    expect(res.errors?.map((e) => e.message)).toEqual(['Fragment "Unused" is never used.']);
  });

  it('a field that is not in the schema', async () => {
    const res = await query(gql`
      query {
        notAField
      }
    `);
    expect(res.data).toBeUndefined();
    expect(res.errors?.map((e) => e.message)).toEqual([
      'Cannot query field "notAField" on type "Query".'
    ]);
  });

  it('a valid document still executes', async () => {
    const res = await query(gql`
      query ($first: Int) {
        allUsers(first: $first) {
          totalCount
        }
      }
    `, { first: 1 });
    expect(res.errors).toBeUndefined();
    expect(res.data).toEqual({ allUsers: { totalCount: expect.any(Number) } });
  });
});
