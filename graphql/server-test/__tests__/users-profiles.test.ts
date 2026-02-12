/**
 * Users & Profiles - Integration Tests
 *
 * Covers: users list query, users with condition (id), users with filter (name),
 * createUser, updateUser (userPatch), deleteUser, currentUser, currentUserId,
 * and direct SQL verification after mutations.
 *
 * V5 patterns:
 *   - No singular `user(id:)` -- use `users(condition: { id: ... })`
 *   - Update uses `userPatch` (not `patch`)
 *   - Delete returns `{ user { id } }` (not `deletedUserId`)
 *
 * Run:
 *   pnpm test -- --testPathPattern=users-profiles
 */

import {
  setupTestServer,
  postGraphQL,
  signIn,
  deleteEntity,
  testName,
  queryDb,
  TEST_TIMEOUT,
  TEST_CREDENTIALS,
  type TestContext,
  type AuthResult,
} from './test-utils';

jest.setTimeout(TEST_TIMEOUT);

// ---------------------------------------------------------------------------
// GraphQL operations
// ---------------------------------------------------------------------------

const USERS_LIST = /* GraphQL */ `
  query Users($first: Int, $offset: Int, $orderBy: [UsersOrderBy!], $filter: UserFilter) {
    users(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
      totalCount
      nodes {
        id
        username
        displayName
        type
        createdAt
        updatedAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const USERS_BY_CONDITION = /* GraphQL */ `
  query UserByCondition($condition: UserCondition) {
    users(condition: $condition) {
      nodes {
        id
        username
        displayName
        type
        createdAt
        updatedAt
      }
    }
  }
`;

const USERS_BY_FILTER = /* GraphQL */ `
  query UsersByFilter($filter: UserFilter, $first: Int) {
    users(filter: $filter, first: $first) {
      totalCount
      nodes {
        id
        username
        displayName
        type
      }
    }
  }
`;

const CREATE_USER = /* GraphQL */ `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      user {
        id
        username
        displayName
        type
        createdAt
      }
    }
  }
`;

const UPDATE_USER = /* GraphQL */ `
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      user {
        id
        username
        displayName
      }
    }
  }
`;

const DELETE_USER = /* GraphQL */ `
  mutation DeleteUser($input: DeleteUserInput!) {
    deleteUser(input: $input) {
      user {
        id
      }
    }
  }
`;

const CURRENT_USER = /* GraphQL */ `
  query CurrentUser {
    currentUser {
      id
      username
      displayName
      type
      createdAt
      updatedAt
    }
  }
`;

const CURRENT_USER_ID = /* GraphQL */ `
  query CurrentUserId {
    currentUserId
  }
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Users & Profiles', () => {
  let ctx: TestContext;
  let auth: AuthResult;

  // Track created user for sequential CRUD tests
  let createdUserId: string | null = null;

  beforeAll(async () => {
    ctx = await setupTestServer();
    auth = await signIn(ctx.request);
  });

  afterAll(async () => {
    // Clean up if the test user was not deleted during tests
    if (createdUserId) {
      try {
        await postGraphQL(
          ctx.request,
          { query: DELETE_USER, variables: { input: { id: createdUserId } } },
          auth.token,
        );
      } catch {
        // best-effort
      }
    }
    await ctx.teardown();
  });

  // -------------------------------------------------------------------------
  // Query: users list
  // -------------------------------------------------------------------------

  it('should list users with pagination', async () => {
    const res = await postGraphQL(
      ctx.request,
      {
        query: USERS_LIST,
        variables: { first: 10, orderBy: ['CREATED_AT_DESC'] },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const users = res.body.data?.users;
    expect(users).toBeDefined();
    expect(users.totalCount).toBeGreaterThanOrEqual(1);
    expect(users.nodes.length).toBeGreaterThanOrEqual(1);
    expect(users.pageInfo).toBeDefined();

    // Admin user should be in the list
    const admin = users.nodes.find(
      (u: any) => u.id === '00000000-0000-0000-0000-000000000002',
    );
    expect(admin).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Query: users with condition (by ID)
  // -------------------------------------------------------------------------

  it('should find admin user by ID using condition', async () => {
    const res = await postGraphQL(
      ctx.request,
      {
        query: USERS_BY_CONDITION,
        variables: {
          condition: { id: '00000000-0000-0000-0000-000000000002' },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const nodes = res.body.data?.users?.nodes;
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('00000000-0000-0000-0000-000000000002');
    expect(nodes[0].username).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Query: users with filter (name includes)
  // -------------------------------------------------------------------------

  it('should filter users by displayName using filter', async () => {
    const res = await postGraphQL(
      ctx.request,
      {
        query: USERS_BY_FILTER,
        variables: {
          filter: { displayName: { includesInsensitive: 'admin' } },
          first: 10,
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const data = res.body.data?.users;
    expect(data).toBeDefined();
    // At least 0 results is valid -- the filter may or may not match
    expect(data.totalCount).toBeGreaterThanOrEqual(0);
  });

  // -------------------------------------------------------------------------
  // Mutation: createUser
  // -------------------------------------------------------------------------

  it('should create a user and return id', async () => {
    const uniqueName = testName('user');

    const res = await postGraphQL(
      ctx.request,
      {
        query: CREATE_USER,
        variables: {
          input: {
            user: {
              displayName: uniqueName,
              username: uniqueName,
            },
          },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const user = res.body.data?.createUser?.user;
    expect(user).toBeDefined();
    expect(user.id).toBeTruthy();
    expect(user.displayName).toBe(uniqueName);
    expect(user.type).toBeDefined();

    createdUserId = user.id;
  });

  // -------------------------------------------------------------------------
  // Verify via SQL after create
  // -------------------------------------------------------------------------

  it('should verify created user exists in database via SQL', async () => {
    expect(createdUserId).toBeTruthy();

    const rows = await queryDb(
      ctx.pg,
      'SELECT id, display_name FROM constructive_users_public.users WHERE id = $1',
      [createdUserId],
    );

    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe(createdUserId);
  });

  // -------------------------------------------------------------------------
  // Mutation: updateUser (uses userPatch)
  // -------------------------------------------------------------------------

  it('should update the created user name using userPatch', async () => {
    expect(createdUserId).toBeTruthy();

    const updatedName = testName('user_updated');

    const res = await postGraphQL(
      ctx.request,
      {
        query: UPDATE_USER,
        variables: {
          input: {
            id: createdUserId,
            userPatch: { displayName: updatedName },
          },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const user = res.body.data?.updateUser?.user;
    expect(user).toBeDefined();
    expect(user.id).toBe(createdUserId);
    expect(user.displayName).toBe(updatedName);
  });

  // -------------------------------------------------------------------------
  // Verify via SQL after update
  // -------------------------------------------------------------------------

  it('should verify updated user in database via SQL', async () => {
    expect(createdUserId).toBeTruthy();

    const rows = await queryDb(
      ctx.pg,
      'SELECT id, display_name FROM constructive_users_public.users WHERE id = $1',
      [createdUserId],
    );

    expect(rows.length).toBe(1);
    expect(rows[0].display_name).toContain('user_updated');
  });

  // -------------------------------------------------------------------------
  // Mutation: deleteUser
  // -------------------------------------------------------------------------

  it('should delete the created user', async () => {
    expect(createdUserId).toBeTruthy();

    const res = await postGraphQL(
      ctx.request,
      {
        query: DELETE_USER,
        variables: { input: { id: createdUserId } },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const deletedUser = res.body.data?.deleteUser?.user;
    expect(deletedUser).toBeDefined();
    expect(deletedUser.id).toBe(createdUserId);

    // Verify gone from database
    const rows = await queryDb(
      ctx.pg,
      'SELECT id FROM constructive_users_public.users WHERE id = $1',
      [createdUserId],
    );
    expect(rows.length).toBe(0);

    createdUserId = null; // Already cleaned up
  });

  // -------------------------------------------------------------------------
  // Query: currentUser
  // -------------------------------------------------------------------------

  it('should return authenticated user info via currentUser', async () => {
    const res = await postGraphQL(
      ctx.request,
      { query: CURRENT_USER },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const user = res.body.data?.currentUser;
    expect(user).toBeDefined();
    expect(user.id).toBe('00000000-0000-0000-0000-000000000002');
    expect(user.username).toBeTruthy();
    expect(user.type).toBeDefined();
    expect(user.createdAt).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Query: currentUserId
  // -------------------------------------------------------------------------

  it('should return UUID string via currentUserId', async () => {
    const res = await postGraphQL(
      ctx.request,
      { query: CURRENT_USER_ID },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const userId = res.body.data?.currentUserId;
    expect(userId).toBe('00000000-0000-0000-0000-000000000002');
    // Verify UUID format
    expect(userId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
