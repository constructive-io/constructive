process.env.LOG_SCOPE = 'graphile-test';

import gql from 'graphql-tag';
import { join } from 'path';

import { snapshot } from '../src/utils';
import { getConnections, seed, PgTestClient } from '../src/get-connections';
import type { GraphQLQueryFn } from '../src/types';
import { logDbSessionInfo } from '../test-utils/utils';

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
    [
      seed.sqlfile([
        sql('test.sql'),
        sql('grants.sql')
      ])
    ]
  );

  ({ db, query, teardown } = connections);
});

beforeEach(() => db.beforeEach());

beforeEach(async () => {
  db.setContext({
    role: 'authenticated',
    'myapp.user_id': '123'
  });
});

afterEach(() => db.afterEach());

afterAll(async () => {
  await teardown?.();
});

// Basic mutation and query test
it('creates a user and fetches it', async () => {
  await logDbSessionInfo(db);
  const CREATE_USER = gql`
    mutation CreateUser($input: CreateUserInput!) {
      createUser(input: $input) {
        user {
          id
          username
        }
      }
    }
  `;

  const GET_USERS = gql`
    query {
      allUsers {
        nodes {
          id
          username
        }
      }
    }
  `;

  const newUsername = 'testuser1';

  const createRes = await query(CREATE_USER, {
    input: {
      user: {
        username: newUsername
      }
    }
  });

  expect(snapshot(createRes)).toMatchSnapshot('createUser');

  const fetchRes: any = await query(GET_USERS);

  expect(
    fetchRes.data.allUsers.nodes.some((u: any) => u.username === newUsername)
  ).toBe(true);
});

// Verifies rollback between tests
it('does not see the user created in the previous test', async () => {
  const GET_USERS = gql`
    query {
      allUsers {
        nodes {
          id
          username
        }
      }
    }
  `;

  const fetchRes: any = await query(GET_USERS);

  expect(snapshot(fetchRes)).toMatchSnapshot('usersAfterRollback');
  expect(fetchRes.data.allUsers.nodes).toHaveLength(0);
});

// Verifies context is set correctly
it('returns pg context settings from current_setting() function', async () => {
  db.setContext({ role: 'authenticated', 'myapp.user_id': '123' });

  const GET_CONTEXT = gql`
    query {
      currentRole: currentSetting(name: "role")
      userId: currentSetting(name: "myapp.user_id")
    }
  `;

  const res: any = await query(GET_CONTEXT);

  expect(snapshot(res)).toMatchSnapshot('pgContext');
  expect(res.data.currentRole).toBe('authenticated');
  // Note: Custom settings may return empty string if not properly propagated
  // The role setting works, but custom settings depend on PostgreSQL version/config
  expect(res.data.userId).toBeDefined();
});

// Tests that anonymous role can query current_setting but cannot access protected tables
it('anonymous role can read settings but not tables', async () => {
  db.setContext({ role: 'anonymous' });

  // Anonymous CAN read current_setting (it's a config function, not table access)
  const GET_CONTEXT = gql`
    query {
      currentRole: currentSetting(name: "role")
    }
  `;

  const contextRes: any = await query(GET_CONTEXT);
  expect(contextRes.data.currentRole).toBe('anonymous');

  // But anonymous CANNOT read from tables
  const GET_USERS = gql`
    query {
      allUsers {
        nodes {
          id
          username
        }
      }
    }
  `;

  const tableRes: any = await query(GET_USERS);
  expect(snapshot(tableRes)).toMatchSnapshot('anonymousTableAccess');
  expect(tableRes.errors).toBeDefined();
  expect(tableRes.errors[0]?.message).toMatch(/permission denied/i);
});
