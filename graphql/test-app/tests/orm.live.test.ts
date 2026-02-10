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
