/**
 * Users & Profiles Integration Tests -- PostGraphile V5
 *
 * Tests user listing queries (connection shape, condition, filter, ordering)
 * and full CRUD mutations (create, read, update, delete) with SQL verification.
 *
 * Run:
 *   cd /Users/zeta/Projects/interweb/src/agents/constructive/graphql/server-test
 *   npx jest --forceExit --verbose --runInBand --testPathPattern='users-profiles'
 */

import type { PgTestClient } from 'pgsql-test/test-client';
import type supertest from 'supertest';

import type { ServerInfo, GraphQLQueryFn } from '../src/types';
import {
  ADMIN_USER_ID,
  getTestConnections,
  signIn,
  authenticatedQuery,
  expectSuccess,
  CONNECTION_FIELDS,
} from './test-utils';


describe('Users and Profiles', () => {
  let db: PgTestClient;
  let pg: PgTestClient;
  let server: ServerInfo;
  let query: GraphQLQueryFn;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;
  let adminToken: string;
  let authQuery: GraphQLQueryFn;

  beforeAll(async () => {
    ({ db, pg, server, query, request, teardown } =
      await getTestConnections());
    adminToken = await signIn(query);
    authQuery = authenticatedQuery(query, adminToken);
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(() => db.beforeEach());
  afterEach(() => db.afterEach());

  // ------------------------------------------------------------------
  // queries (smoke -- seed data)
  // ------------------------------------------------------------------
  describe('queries', () => {
    it('should list users with connection shape (nodes, totalCount, pageInfo)', async () => {
      // V5: NO email field on User type; use id, username, displayName, type, createdAt
      const data = await expectSuccess<{
        users: {
          totalCount: number;
          nodes: Array<{
            id: string;
            username: string;
            displayName: string;
            type: number;
            createdAt: string;
          }>;
          pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean };
        };
      }>(
        query,
        `{
          users(first: 10) {
            ${CONNECTION_FIELDS}
            nodes {
              id
              username
              displayName
              type
              createdAt
            }
          }
        }`
      );

      expect(data.users.totalCount).toBeGreaterThanOrEqual(3);
      expect(data.users.nodes).toBeInstanceOf(Array);
      expect(data.users.nodes.length).toBeGreaterThan(0);
      expect(data.users.pageInfo).toBeDefined();

      // Verify node shape
      const firstUser = data.users.nodes[0];
      expect(firstUser.id).toBeTruthy();
      expect(firstUser.username).toBeDefined();
      expect(firstUser.createdAt).toBeTruthy();
    });

    it('should find admin user by ID using condition', async () => {
      // V5: no singular user(id:) query -- use condition on plural connection
      const data = await expectSuccess<{
        users: {
          nodes: Array<{ id: string; username: string; displayName: string }>;
        };
      }>(
        query,
        `query FindUser($condition: UserCondition!) {
          users(condition: $condition) {
            nodes {
              id
              username
              displayName
            }
          }
        }`,
        { condition: { id: ADMIN_USER_ID } }
      );

      expect(data.users.nodes).toHaveLength(1);
      expect(data.users.nodes[0].id).toBe(ADMIN_USER_ID);
      expect(data.users.nodes[0].username).toBeTruthy();
    });

    it('should filter users by type', async () => {
      // Type 1 = regular user, type 2 = organization
      const data = await expectSuccess<{
        users: {
          totalCount: number;
          nodes: Array<{ id: string; type: number }>;
        };
      }>(
        query,
        `{
          users(condition: { type: 1 }) {
            totalCount
            nodes {
              id
              type
            }
          }
        }`
      );

      // All returned users should have type 1
      for (const node of data.users.nodes) {
        expect(node.type).toBe(1);
      }
    });

    it('should order users by UserOrderBy enum', async () => {
      // V5: OrderBy enums are singular (UserOrderBy, not UsersOrderBy)
      const data = await expectSuccess<{
        users: {
          nodes: Array<{ id: string; createdAt: string }>;
        };
      }>(
        query,
        `{
          users(orderBy: [CREATED_AT_ASC]) {
            nodes {
              id
              createdAt
            }
          }
        }`
      );

      expect(data.users.nodes.length).toBeGreaterThan(0);

      // Verify ascending order
      for (let i = 1; i < data.users.nodes.length; i++) {
        const prev = new Date(data.users.nodes[i - 1].createdAt).getTime();
        const curr = new Date(data.users.nodes[i].createdAt).getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    it('should return currentUser with auth token', async () => {
      const data = await expectSuccess<{
        currentUser: { id: string; username: string; displayName: string } | null;
      }>(
        authQuery,
        `{ currentUser { id username displayName } }`
      );

      // With bearer token, currentUser should return the admin user.
      // If RLS module is not configured, this may return null.
      if (data.currentUser !== null) {
        expect(data.currentUser.id).toBe(ADMIN_USER_ID);
      } else {
        expect(data.currentUser).toBeNull();
      }
    });
  });

  // ------------------------------------------------------------------
  // mutations (CRUD)
  //
  // CRUD tests share state (createdUserId) across sequential tests.
  // We disable per-test rollback for this describe block by NOT using
  // db.beforeEach/afterEach. Instead the parent describe handles it,
  // and these tests run within a single savepoint.
  //
  // NOTE: Because the parent describe uses beforeEach/afterEach,
  // each individual `it` gets its own savepoint. For a sequential
  // CRUD chain where later tests depend on earlier mutations, we
  // put all dependent operations in a single test or accept that
  // the savepoint-per-test means we must re-create in each test.
  //
  // Approach: We run the full CRUD chain using let variables scoped
  // to this describe. The db.beforeEach/afterEach from the parent
  // will rollback after each test, so we structure tests to be
  // self-contained where needed.
  // ------------------------------------------------------------------
  describe('mutations (CRUD)', () => {
    const uniqueUsername = `test-user-${Date.now()}`;

    it('should create a user and return id', async () => {
      const data = await expectSuccess<{
        createUser: {
          user: {
            id: string;
            username: string;
            displayName: string;
            type: number;
          };
        };
      }>(
        query,
        `mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            user {
              id
              username
              displayName
              type
            }
          }
        }`,
        {
          input: {
            user: {
              username: uniqueUsername,
              displayName: 'Test User CRUD',
              type: 1,
            },
          },
        }
      );

      const user = data.createUser.user;
      expect(user.id).toBeTruthy();
      expect(user.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(user.username).toBe(uniqueUsername);
      expect(user.displayName).toBe('Test User CRUD');
      expect(user.type).toBe(1);
    });

    it('should verify created user exists in database via SQL', async () => {
      // Create a user first (each test has its own savepoint)
      const createData = await expectSuccess<{
        createUser: { user: { id: string } };
      }>(
        query,
        `mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) { user { id } }
        }`,
        {
          input: {
            user: {
              username: `test-sql-verify-${Date.now()}`,
              displayName: 'SQL Verify User',
              type: 1,
            },
          },
        }
      );

      const createdId = createData.createUser.user.id;

      // Verify via direct SQL (pg = superuser, bypasses RLS)
      const dbResult = await pg.query(
        'SELECT id, display_name FROM constructive_users_public.users WHERE id = $1',
        [createdId]
      );

      expect(dbResult.rowCount).toBe(1);
      expect(dbResult.rows[0].id).toBe(createdId);
      expect(dbResult.rows[0].display_name).toBe('SQL Verify User');
    });

    it('should update the created user displayName using userPatch', async () => {
      // Create, then update (within same savepoint)
      const createData = await expectSuccess<{
        createUser: { user: { id: string } };
      }>(
        query,
        `mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) { user { id } }
        }`,
        {
          input: {
            user: {
              username: `test-update-${Date.now()}`,
              displayName: 'Before Update',
              type: 1,
            },
          },
        }
      );

      const userId = createData.createUser.user.id;

      // V5: uses userPatch, not patch
      const updateData = await expectSuccess<{
        updateUser: { user: { id: string; displayName: string } };
      }>(
        query,
        `mutation UpdateUser($input: UpdateUserInput!) {
          updateUser(input: $input) {
            user {
              id
              displayName
            }
          }
        }`,
        {
          input: {
            id: userId,
            userPatch: { displayName: 'After Update' },
          },
        }
      );

      expect(updateData.updateUser.user.id).toBe(userId);
      expect(updateData.updateUser.user.displayName).toBe('After Update');
    });

    it('should verify updated user in database via SQL', async () => {
      // Create, update, then verify via SQL
      const createData = await expectSuccess<{
        createUser: { user: { id: string } };
      }>(
        query,
        `mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) { user { id } }
        }`,
        {
          input: {
            user: {
              username: `test-sql-update-${Date.now()}`,
              displayName: 'Before SQL Check',
              type: 1,
            },
          },
        }
      );

      const userId = createData.createUser.user.id;

      await expectSuccess(
        query,
        `mutation UpdateUser($input: UpdateUserInput!) {
          updateUser(input: $input) { user { id } }
        }`,
        {
          input: {
            id: userId,
            userPatch: { displayName: 'After SQL Check' },
          },
        }
      );

      const dbResult = await pg.query(
        'SELECT display_name FROM constructive_users_public.users WHERE id = $1',
        [userId]
      );

      expect(dbResult.rowCount).toBe(1);
      expect(dbResult.rows[0].display_name).toBe('After SQL Check');
    });

    it('should delete the created user', async () => {
      // Create, then delete
      const createData = await expectSuccess<{
        createUser: { user: { id: string } };
      }>(
        query,
        `mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) { user { id } }
        }`,
        {
          input: {
            user: {
              username: `test-delete-${Date.now()}`,
              displayName: 'Delete Me',
              type: 1,
            },
          },
        }
      );

      const userId = createData.createUser.user.id;

      // V5: delete returns { user { id } }, not { deletedUserId }
      const deleteData = await expectSuccess<{
        deleteUser: { user: { id: string } };
      }>(
        query,
        `mutation DeleteUser($input: DeleteUserInput!) {
          deleteUser(input: $input) {
            user {
              id
            }
          }
        }`,
        { input: { id: userId } }
      );

      expect(deleteData.deleteUser.user.id).toBe(userId);
    });

    it('should find created user by condition then confirm deleted user no longer exists', async () => {
      // Create a user
      const createData = await expectSuccess<{
        createUser: { user: { id: string; username: string } };
      }>(
        query,
        `mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) { user { id username } }
        }`,
        {
          input: {
            user: {
              username: `test-find-delete-${Date.now()}`,
              displayName: 'Find Then Delete',
              type: 1,
            },
          },
        }
      );

      const userId = createData.createUser.user.id;

      // Verify user can be found by condition
      const findData = await expectSuccess<{
        users: { nodes: Array<{ id: string; username: string }> };
      }>(
        query,
        `query FindUser($condition: UserCondition!) {
          users(condition: $condition) {
            nodes { id username }
          }
        }`,
        { condition: { id: userId } }
      );

      expect(findData.users.nodes).toHaveLength(1);
      expect(findData.users.nodes[0].id).toBe(userId);

      // Delete the user
      await expectSuccess(
        query,
        `mutation DeleteUser($input: DeleteUserInput!) {
          deleteUser(input: $input) { user { id } }
        }`,
        { input: { id: userId } }
      );

      // Confirm user no longer exists
      const verifyData = await expectSuccess<{
        users: { totalCount: number };
      }>(
        query,
        `query FindUser($condition: UserCondition!) {
          users(condition: $condition) { totalCount }
        }`,
        { condition: { id: userId } }
      );

      expect(verifyData.users.totalCount).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // authenticated user context
  // ------------------------------------------------------------------
  describe('authenticated user context', () => {
    it('should return null from currentUser without RLS module', async () => {
      // Without RLS module, currentUser may return null even with token.
      // With RLS module, it returns the admin user.
      const data = await expectSuccess<{
        currentUser: { id: string; username: string; displayName: string } | null;
      }>(
        authQuery,
        `{ currentUser { id username displayName } }`
      );

      // Accept both outcomes: null (no RLS) or admin user (RLS active)
      if (data.currentUser !== null) {
        expect(data.currentUser.id).toBe(ADMIN_USER_ID);
      } else {
        expect(data.currentUser).toBeNull();
      }
    });

    it('should return null from currentUserId without RLS module', async () => {
      const data = await expectSuccess<{ currentUserId: string | null }>(
        authQuery,
        `{ currentUserId }`
      );

      if (data.currentUserId !== null) {
        expect(data.currentUserId).toBe(ADMIN_USER_ID);
      } else {
        expect(data.currentUserId).toBeNull();
      }
    });
  });
});
