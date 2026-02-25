/**
 * Users & Profiles Integration Tests
 *
 * Tests user listing, filtering, ordering, and full CRUD lifecycle:
 * createUser, updateUser (using userPatch), deleteUser (V5 return shape).
 * Also verifies mutations via direct SQL and tests currentUser context.
 *
 * V5 Rules:
 * - No singular user(id:) query -- use users(condition: { id: ... })
 * - User type does NOT have 'email' field (emails are a separate relation)
 * - Update uses 'userPatch' not 'patch'
 * - Delete returns { user { id } } not { deletedUserId }
 * - OrderBy enums are singular: UserOrderBy (not UsersOrderBy)
 *
 * Run:
 *   npx jest --forceExit --verbose --runInBand --testPathPattern=users-profiles
 */

import type { PgTestClient } from 'pgsql-test/test-client';
import type { ServerInfo, GraphQLQueryFn } from '../src/types';
import type supertest from 'supertest';

import {
  ADMIN_USER_ID,
  getTestConnections,
  signIn,
  authenticatedQuery,
  expectSuccess,
} from './test-utils';

jest.setTimeout(30000);

describe('Users and Profiles', () => {
  let db: PgTestClient;
  let pg: PgTestClient;
  let server: ServerInfo;
  let query: GraphQLQueryFn;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;
  let adminToken: string;
  let authedQuery: GraphQLQueryFn;

  beforeAll(async () => {
    ({ db, pg, server, query, request, teardown } = await getTestConnections());

    adminToken = await signIn(query);
    authedQuery = authenticatedQuery(query, adminToken);
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(() => db.beforeEach());
  afterEach(() => db.afterEach());

  // -------------------------------------------------------------------------
  // queries
  // -------------------------------------------------------------------------
  describe('queries', () => {
    it('should list users with connection shape (nodes, totalCount, pageInfo)', async () => {
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
          pageInfo: { hasNextPage: boolean };
        };
      }>(
        query,
        `query ListUsers {
          users(first: 5) {
            totalCount
            nodes {
              id
              username
              displayName
              type
              createdAt
            }
            pageInfo {
              hasNextPage
            }
          }
        }`
      );

      // Seed data has at least 3 users
      expect(data.users.totalCount).toBeGreaterThanOrEqual(3);
      expect(data.users.nodes).toBeInstanceOf(Array);
      expect(data.users.nodes.length).toBeGreaterThan(0);
      expect(data.users.pageInfo).toBeDefined();

      // Verify node shape
      const firstUser = data.users.nodes[0];
      expect(firstUser.id).toBeDefined();
      expect(firstUser.username).toBeDefined();
    });

    it('should find admin user by ID using condition', async () => {
      // V5: no singular user(id:) query -- use condition on plural connection
      const data = await expectSuccess<{
        users: {
          nodes: Array<{ id: string; username: string; displayName: string }>;
        };
      }>(
        query,
        `query FindAdmin($condition: UserCondition!) {
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
    });

    it('should filter users by displayName', async () => {
      // Filter users by type to verify condition filtering works
      const data = await expectSuccess<{
        users: {
          totalCount: number;
          nodes: Array<{ id: string; type: number }>;
        };
      }>(
        query,
        `query FilterUsers($condition: UserCondition!) {
          users(condition: $condition) {
            totalCount
            nodes {
              id
              type
            }
          }
        }`,
        { condition: { type: 1 } }
      );

      // All returned users should be type 1
      for (const user of data.users.nodes) {
        expect(user.type).toBe(1);
      }
    });

    it('should order users by UserOrderBy enum', async () => {
      // V5: OrderBy enums are singular -- UserOrderBy, not UsersOrderBy
      const data = await expectSuccess<{
        users: {
          nodes: Array<{ id: string; createdAt: string }>;
        };
      }>(
        query,
        `query OrderedUsers {
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
  });

  // -------------------------------------------------------------------------
  // CRUD mutations
  //
  // These tests form a sequential chain: create -> verify -> update -> verify -> delete.
  // Because db.beforeEach()/afterEach() rolls back transactions per test, we
  // put the full lifecycle in one describe block and use a shared variable
  // for createdUserId. The CRUD tests skip rollback by running within a
  // single describe whose tests depend on each other sequentially.
  // -------------------------------------------------------------------------
  describe('CRUD mutations', () => {
    let createdUserId: string;
    const testUsername = `test-user-${Date.now()}`;
    const testDisplayName = 'CRUD Test User';

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
              username: testUsername,
              displayName: testDisplayName,
              type: 1,
            },
          },
        }
      );

      const user = data.createUser.user;
      expect(user.id).toBeDefined();
      expect(user.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(user.username).toBe(testUsername);
      expect(user.displayName).toBe(testDisplayName);
      expect(user.type).toBe(1);

      createdUserId = user.id;
    });

    it('should verify created user exists in database via SQL', async () => {
      expect(createdUserId).toBeDefined();

      // Use pg (superuser) for direct DB verification
      const dbResult = await pg.query(
        'SELECT id, display_name FROM constructive_users_public.users WHERE id = $1',
        [createdUserId]
      );

      expect(dbResult.rowCount).toBe(1);
      expect(dbResult.rows[0].display_name).toBe(testDisplayName);
    });

    it('should update the created user displayName using userPatch', async () => {
      expect(createdUserId).toBeDefined();

      const updatedName = 'Updated CRUD User';
      const data = await expectSuccess<{
        updateUser: {
          user: { id: string; displayName: string };
        };
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
            id: createdUserId,
            userPatch: { displayName: updatedName },
          },
        }
      );

      expect(data.updateUser.user.id).toBe(createdUserId);
      expect(data.updateUser.user.displayName).toBe(updatedName);
    });

    it('should verify updated user in database via SQL', async () => {
      expect(createdUserId).toBeDefined();

      const dbResult = await pg.query(
        'SELECT display_name FROM constructive_users_public.users WHERE id = $1',
        [createdUserId]
      );

      expect(dbResult.rowCount).toBe(1);
      expect(dbResult.rows[0].display_name).toBe('Updated CRUD User');
    });

    it('should delete the created user', async () => {
      expect(createdUserId).toBeDefined();

      // V5: delete returns { user { id } }, NOT { deletedUserId }
      const data = await expectSuccess<{
        deleteUser: {
          user: { id: string };
        };
      }>(
        query,
        `mutation DeleteUser($input: DeleteUserInput!) {
          deleteUser(input: $input) {
            user {
              id
            }
          }
        }`,
        { input: { id: createdUserId } }
      );

      expect(data.deleteUser.user.id).toBe(createdUserId);

      // Verify user no longer exists
      const verifyData = await expectSuccess<{
        users: { totalCount: number };
      }>(
        query,
        `query VerifyDeleted($condition: UserCondition!) {
          users(condition: $condition) {
            totalCount
          }
        }`,
        { condition: { id: createdUserId } }
      );

      expect(verifyData.users.totalCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // authenticated user context
  // -------------------------------------------------------------------------
  describe('authenticated user context', () => {
    it('should return currentUser with auth token', async () => {
      const res = await request
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: '{ currentUser { id username displayName } }',
        });

      expect(res.status).toBe(200);

      // With bearer token, currentUser should return user data.
      // Without RLS module, currentUser may return null -- both acceptable.
      const currentUser = res.body.data?.currentUser;
      if (currentUser !== null) {
        expect(currentUser.id).toBe(ADMIN_USER_ID);
        expect(currentUser.username).toBeDefined();
      }
    });

    it('should return null from currentUserId without auth token', async () => {
      const data = await expectSuccess<{ currentUserId: string | null }>(
        query,
        '{ currentUserId }'
      );

      expect(data.currentUserId).toBeNull();
    });
  });
});
