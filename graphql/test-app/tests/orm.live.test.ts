import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';

import { createClient } from '../src/generated/orm';

import {
  assertLiveEnvConfigured,
  getLiveEnvHelpMessage,
  getLiveTestEnv,
  type AuthSession,
  signIn,
  signOut,
} from './live-test-utils';

const liveEnv = getLiveTestEnv();
assertLiveEnvConfigured(liveEnv);

if (!liveEnv) {
  test.skip(getLiveEnvHelpMessage(), () => {});
} else {
  describe('ORM Client (live endpoint)', () => {
    let sharedSession: AuthSession | null = null;

    const ensureAuth = async (): Promise<AuthSession> => {
      if (!sharedSession) {
        sharedSession = await signIn(liveEnv);
      }
      return sharedSession;
    };

    const createAuthedClient = async () => {
      const session = await ensureAuth();
      return createClient({
        endpoint: liveEnv.endpoint,
        headers: { Authorization: `Bearer ${session.token}` },
      });
    };

    after(async () => {
      if (sharedSession) {
        await signOut(liveEnv, sharedSession.token);
        sharedSession = null;
      }
    });

    test('custom signIn mutation returns token with explicit select', async () => {
      // Ensure the test credentials exist on this local server before asserting sign-in payloads.
      const existing = await signIn(liveEnv);
      await signOut(liveEnv, existing.token);

      const client = createClient({ endpoint: liveEnv.endpoint });
      const result = await client.mutation
        .signIn(
          {
            input: {
              email: liveEnv.email,
              password: liveEnv.password,
              rememberMe: true,
            },
          },
          {
            select: {
              result: {
                select: {
                  accessToken: true,
                  userId: true,
                  isVerified: true,
                },
              },
            },
          }
        )
        .unwrap();

      const token = result.signIn.result?.accessToken ?? null;
      assert.ok(token, 'ORM signIn did not return accessToken');
      await signOut(liveEnv, token);
    });

    test('custom signIn mutation returns payload shape with explicit nested select', async () => {
      // Ensure the test credentials exist on this local server before asserting sign-in payloads.
      const existing = await signIn(liveEnv);
      await signOut(liveEnv, existing.token);

      const client = createClient({ endpoint: liveEnv.endpoint });

      const result = await client.mutation.signIn(
        { 
          input: { 
            email: liveEnv.email,
            password: liveEnv.password, 
            rememberMe: true 
          } 
        },
        {
          select: {
            clientMutationId: true,
            result: {
              select: {
                accessToken: true,
                userId: true, 
                isVerified: true,
                totpEnabled: true,
              },
            },
          },
        }
      ).unwrap();

      assert.ok(result.signIn, 'Default signIn payload is missing');
      assert.ok(result.signIn?.result?.accessToken, 'Default signIn result is missing accessToken');
      await ensureAuth();
    });

    test('model findMany builds expected GraphQL and executes nested select', async () => {
      const client = await createAuthedClient();

      const builder = client.user.findMany({
        first: 5,
        orderBy: ['CREATED_AT_DESC'],
        select: {
          id: true,
          username: true,
          ownedDatabases: {
            first: 1,
            select: {
              id: true,
              schemaName: true,
            },
          },
        },
      });

      const graphql = builder.toGraphQL();
      const variables = builder.getVariables() ?? {};
      assert.match(graphql, /query UserQuery/);
      assert.match(graphql, /users\(/);
      assert.match(graphql, /ownedDatabases\(first: 1\)/);
      assert.equal(variables.first, 5, 'findMany first variable should be emitted');

      const result = await builder.unwrap();
      assert.ok(Array.isArray(result.users.nodes), 'users.nodes should be an array');
    });

    test('model findOne overloads work for default and explicit select', async () => {
      const session = await ensureAuth();
      const client = await createAuthedClient();

      const defaultResult = await client.user.findOne({ id: session.userId }).unwrap();
      assert.equal(defaultResult.user?.id, session.userId, 'findOne default select returned wrong user');

      const explicitResult = await client.user
        .findOne({
          id: session.userId,
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        })
        .unwrap();

      assert.equal(explicitResult.user?.id, session.userId, 'findOne explicit select returned wrong user');
    });

    test('model findFirst and custom currentUser/currentUserId queries execute', async () => {
      const session = await ensureAuth();
      const client = await createAuthedClient();

      const firstResult = await client.user
        .findFirst({
          select: {
            id: true,
            username: true,
          },
        })
        .unwrap();
      assert.ok(Array.isArray(firstResult.users.nodes), 'findFirst should return users.nodes array');

      const currentUserResult = await client.query
        .currentUser({
          select: {
            id: true,
            username: true,
          },
        })
        .unwrap();
      assert.equal(
        currentUserResult.currentUser.id,
        session.userId,
        'currentUser query returned unexpected user'
      );

      const currentUserIdResult = await client.query.currentUserId().unwrap();
      assert.equal(
        currentUserIdResult.currentUserId,
        session.userId,
        'currentUserId query returned unexpected user'
      );
    });

    test('CRUD lifecycle: update user with entity-specific patch field name', async () => {
      const session = await ensureAuth();
      const client = await createAuthedClient();

      // 1. Read the current user's displayName
      const before = await client.user
        .findOne({
          id: session.userId,
          select: { id: true, displayName: true },
        })
        .unwrap();
      const originalName = before.user?.displayName;

      // 2. Update displayName using entity-specific patch field (userPatch, not patch)
      const testName = `test-${Date.now()}`;
      const updateResult = await client.user
        .update({
          where: { id: session.userId },
          data: { displayName: testName },
          select: { id: true, displayName: true },
        })
        .unwrap();
      assert.equal(
        updateResult.updateUser.user.displayName,
        testName,
        'update mutation should return the new displayName'
      );

      // 3. Read back to verify persistence
      const after = await client.user
        .findOne({
          id: session.userId,
          select: { id: true, displayName: true },
        })
        .unwrap();
      assert.equal(
        after.user?.displayName,
        testName,
        'findOne after update should return updated displayName'
      );

      // 4. Restore original value
      await client.user
        .update({
          where: { id: session.userId },
          data: { displayName: originalName ?? null },
          select: { id: true },
        })
        .unwrap();
    });

    test('deeply nested select (4 levels: User → databases → schemas → tables → fields)', async () => {
      const client = await createAuthedClient();

      const result = await client.user
        .findMany({
          first: 2,
          select: {
            id: true,
            username: true,
            ownedDatabases: {
              first: 2,
              select: {
                id: true,
                name: true,
                schemas: {
                  first: 3,
                  select: {
                    id: true,
                    schemaName: true,
                    tables: {
                      first: 5,
                      select: {
                        id: true,
                        name: true,
                        fields: {
                          first: 10,
                          select: {
                            id: true,
                            name: true,
                            label: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        })
        .unwrap();

      // Level 1: users
      assert.ok(Array.isArray(result.users.nodes), 'users.nodes should be an array');

      // Traverse deeper only if data exists
      for (const user of result.users.nodes) {
        assert.ok(user.id, 'user.id should exist');
        assert.ok(
          Array.isArray(user.ownedDatabases.nodes),
          'ownedDatabases.nodes should be an array'
        );

        // Level 2: databases
        for (const db of user.ownedDatabases.nodes) {
          assert.ok(db.id, 'database.id should exist');
          assert.ok(Array.isArray(db.schemas.nodes), 'schemas.nodes should be an array');

          // Level 3: schemas
          for (const schema of db.schemas.nodes) {
            assert.ok(schema.id, 'schema.id should exist');
            assert.ok(Array.isArray(schema.tables.nodes), 'tables.nodes should be an array');

            // Level 4: tables → fields
            for (const table of schema.tables.nodes) {
              assert.ok(table.id, 'table.id should exist');
              assert.ok(Array.isArray(table.fields.nodes), 'fields.nodes should be an array');
            }
          }
        }
      }
    });

    test('connection pagination with first/after cursor', async () => {
      const client = await createAuthedClient();

      // Page 1
      const page1 = await client.user
        .findMany({
          first: 2,
          orderBy: ['CREATED_AT_ASC'],
          select: { id: true },
        })
        .unwrap();

      assert.ok(Array.isArray(page1.users.nodes), 'page1 nodes should be an array');
      assert.ok(typeof page1.users.totalCount === 'number', 'totalCount should be a number');
      assert.ok(page1.users.pageInfo, 'pageInfo should exist');
      assert.ok(
        typeof page1.users.pageInfo.hasNextPage === 'boolean',
        'hasNextPage should be a boolean'
      );

      // Page 2 (if more results)
      if (page1.users.pageInfo.hasNextPage && page1.users.pageInfo.endCursor) {
        const page2 = await client.user
          .findMany({
            first: 2,
            after: page1.users.pageInfo.endCursor,
            orderBy: ['CREATED_AT_ASC'],
            select: { id: true },
          })
          .unwrap();

        assert.ok(Array.isArray(page2.users.nodes), 'page2 nodes should be an array');

        // No duplicate IDs across pages
        const page1Ids = new Set(page1.users.nodes.map((n) => n.id));
        for (const node of page2.users.nodes) {
          assert.ok(!page1Ids.has(node.id), `duplicate id ${node.id} across pages`);
        }
      }
    });

    test('filter operations narrow results', async () => {
      const session = await ensureAuth();
      const client = await createAuthedClient();

      const result = await client.user
        .findMany({
          where: { id: { equalTo: session.userId } },
          select: { id: true, username: true },
        })
        .unwrap();

      assert.equal(result.users.nodes.length, 1, 'filter by id should return exactly 1 result');
      assert.equal(result.users.nodes[0].id, session.userId, 'filtered user id should match');
    });

    test('findOne with non-existent UUID returns null', async () => {
      const client = await createAuthedClient();

      const result = await client.user
        .findOne({
          id: '00000000-0000-0000-0000-000000000000',
          select: { id: true },
        })
        .unwrap();

      assert.equal(result.user, null, 'findOne for non-existent UUID should return null');
    });

    test('execute() returns ok/error result discriminated union', async () => {
      const client = await createAuthedClient();

      // Successful query — result.ok is true
      const successResult = await client.user
        .findMany({ first: 1, select: { id: true } })
        .execute();
      assert.equal(successResult.ok, true, 'execute() should return ok: true for valid query');
      if (successResult.ok) {
        assert.ok(
          Array.isArray(successResult.data.users.nodes),
          'successful execute() result should have data.users.nodes',
        );
      }

      // findOne with non-existent UUID — still ok: true, user is null
      const nullResult = await client.user
        .findOne({ id: '00000000-0000-0000-0000-000000000000', select: { id: true } })
        .execute();
      assert.equal(nullResult.ok, true, 'findOne for missing UUID should still be ok: true');
      if (nullResult.ok) {
        assert.equal(nullResult.data.user, null, 'findOne for missing UUID should return null user');
      }
    });

    test('custom checkPassword and signOut mutations execute successfully', async () => {
      const session = await ensureAuth();
      const client = await createAuthedClient();

      const checkPasswordResult = await client.mutation
        .checkPassword(
          {
            input: {
              password: liveEnv.password,
            },
          },
          {
            select: {
              clientMutationId: true,
            },
          }
        )
        .unwrap();
      assert.ok(checkPasswordResult.checkPassword, 'checkPassword payload missing');

      const signOutResult = await client.mutation
        .signOut(
          {
            input: {},
          },
          {
            select: {
              clientMutationId: true,
            },
          }
        )
        .unwrap();
      assert.ok(signOutResult.signOut, 'signOut payload missing');

      sharedSession = null;
      await signOut(liveEnv, session.token);
    });
  });
}
