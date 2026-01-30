process.env.LOG_SCOPE = 'graphile-test';

import { join } from 'path';

import { snapshot } from '../src/utils';
import { getConnectionsObject, seed, PgTestClient } from '../src/get-connections';
import type { GraphQLQueryFnObj } from '../src/types';

const schemas = ['app_public'];
const sql = (f: string) => join(__dirname, '/../sql', f);

let teardown: () => Promise<void>;
let query: GraphQLQueryFnObj;
let db: PgTestClient;

beforeAll(async () => {
  const connections = await getConnectionsObject(
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

  ({ query, db, teardown } = connections);
});

beforeEach(() => db.beforeEach());
afterEach(() => db.afterEach());
afterAll(() => teardown?.());

it('creates a user and returns typed result', async () => {
  db.setContext({
    role: 'authenticated'
  });
    interface CreateUserVariables {
        input: {
            user: {
                username: string;
            };
        };
    }

    interface CreateUserResult {
        createUser: {
            user: {
                id: number;
                username: string;
            };
        };
    }

    const result = await query<CreateUserResult, CreateUserVariables>({
      query: `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            user {
              id
              username
            }
          }
        }
      `,
      variables: {
        input: {
          user: {
            username: 'alice'
          }
        }
      }
    });

    // Assertions
    expect(result).toBeDefined();
    expect(result.data.createUser).toBeDefined();
    expect(result.data.createUser.user.username).toBe('alice');
    // GraphQL returns IDs as strings (Int serializes to number, but serial PKs may be BigInt)
    expect(result.data.createUser.user.id).toBeDefined();

    // Optional snapshot for structure
    expect(snapshot(result)).toMatchSnapshot('create-user');
});
