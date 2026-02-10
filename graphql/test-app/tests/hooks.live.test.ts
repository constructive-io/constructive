import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { act } from 'react-test-renderer';

import {
  currentUserIdQueryKey,
  currentUserQueryKey,
  fetchCurrentUserIdQuery,
  fetchCurrentUserQuery,
  fetchUserQuery,
  fetchUsersQuery,
  prefetchCurrentUserIdQuery,
  prefetchCurrentUserQuery,
  prefetchUserQuery,
  prefetchUsersQuery,
  useCheckPasswordMutation,
  useCurrentUserIdQuery,
  useCurrentUserQuery,
  useSignInMutation,
  useSignOutMutation,
  useUserQuery,
  useUsersQuery,
  userQueryKey,
  usersQueryKey,
} from '../src/generated/hooks';
import { buildListSelectionArgs } from '../src/generated/hooks/selection';

import { renderHookWithClient } from './hook-test-utils';
import {
  assertLiveEnvConfigured,
  configureHooks,
  createTestQueryClient,
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
  describe('React Query Hooks (live endpoint)', () => {
    let sharedSession: AuthSession | null = null;

    const ensureAuth = async (): Promise<AuthSession> => {
      if (!sharedSession) {
        sharedSession = await signIn(liveEnv);
      }
      configureHooks(liveEnv, sharedSession.token);
      return sharedSession;
    };

    before(() => {
      configureHooks(liveEnv);
    });

    after(async () => {
      if (sharedSession) {
        await signOut(liveEnv, sharedSession.token);
        sharedSession = null;
      }
      configureHooks(liveEnv);
    });

    test('useSignInMutation returns token payload when explicit select is provided', async () => {
      // Ensure the test credentials exist on this local server before asserting sign-in payloads.
      const existing = await signIn(liveEnv);
      await signOut(liveEnv, existing.token);

      const queryClient = createTestQueryClient();
      const hook = await renderHookWithClient(
        () =>
          useSignInMutation({
            selection: {
              fields: {
                result: {
                  select: {
                    accessToken: true,
                    userId: true,
                    isVerified: true,
                    totpEnabled: true,
                  },
                },
              },
            },
          }),
        queryClient
      );

      let result:
        | {
            signIn: {
              result?: {
                accessToken?: string | null;
                userId?: string | null;
                isVerified?: boolean | null;
                totpEnabled?: boolean | null;
              } | null;
            };
          }
        | null = null;

      await act(async () => {
        result = await hook.getResult().mutateAsync({
          input: {
            email: liveEnv.email,
            password: liveEnv.password,
            rememberMe: true,
          },
        });
      });

      const token = result?.signIn.result?.accessToken ?? null;
      const userId = result?.signIn.result?.userId ?? null;
      assert.ok(token, 'useSignInMutation did not return accessToken');
      assert.ok(userId, 'useSignInMutation did not return userId');

      await signOut(liveEnv, token);
      await hook.unmount();
      queryClient.clear();
    });

    test('useCurrentUserQuery returns nested selected relation fields', async () => {
      await ensureAuth();
      const queryClient = createTestQueryClient();
      const hook = await renderHookWithClient(
        () =>
          useCurrentUserQuery({
            selection: {
              fields: {
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
            },
          }),
        queryClient
      );

      const result = await hook.waitFor((value) => value.isSuccess || value.isError);
      assert.equal(result.isError, false, 'useCurrentUserQuery returned an error');
      assert.ok(result.data?.currentUser?.id, 'currentUser.id is missing');
      assert.ok(
        Array.isArray(result.data?.currentUser?.ownedDatabases?.nodes),
        'currentUser.ownedDatabases.nodes should be an array'
      );

      await hook.unmount();
      queryClient.clear();
    });

    test('useCurrentUserIdQuery matches useCurrentUserQuery id', async () => {
      const session = await ensureAuth();
      const queryClient = createTestQueryClient();
      const hook = await renderHookWithClient(() => useCurrentUserIdQuery(), queryClient);

      const result = await hook.waitFor((value) => value.isSuccess || value.isError);
      assert.equal(result.isError, false, 'useCurrentUserIdQuery returned an error');
      assert.equal(result.data?.currentUserId, session.userId, 'currentUserId does not match signed in user');

      await hook.unmount();
      queryClient.clear();
    });

    test('useUsersQuery and useUserQuery execute with select overloads', async () => {
      const session = await ensureAuth();
      const queryClient = createTestQueryClient();

      const usersHook = await renderHookWithClient(
        () =>
          useUsersQuery({
            selection: {
              fields: {
                id: true,
                username: true,
                ownedDatabases: {
                  first: 1,
                  select: {
                    id: true,
                  },
                },
              },
              first: 5,
              orderBy: ['CREATED_AT_DESC'],
            },
          }),
        queryClient
      );

      const usersResult = await usersHook.waitFor((value) => value.isSuccess || value.isError);
      assert.equal(usersResult.isError, false, 'useUsersQuery returned an error');
      assert.ok(Array.isArray(usersResult.data?.users.nodes), 'users.nodes should be an array');

      const userHook = await renderHookWithClient(
        () =>
          useUserQuery({
            id: session.userId,
            selection: {
              fields: {
                id: true,
                username: true,
              },
            },
          }),
        queryClient
      );

      const userResult = await userHook.waitFor((value) => value.isSuccess || value.isError);
      assert.equal(userResult.isError, false, 'useUserQuery returned an error');
      assert.equal(userResult.data?.user?.id, session.userId, 'useUserQuery did not return the requested user');

      await usersHook.unmount();
      await userHook.unmount();
      queryClient.clear();
    });

    test('fetch/prefetch helpers populate QueryClient cache with expected keys', async () => {
      const session = await ensureAuth();
      const queryClient = createTestQueryClient();

      const currentUser = await fetchCurrentUserQuery({
        selection: {
          fields: {
            id: true,
            username: true,
          },
        },
      });
      assert.equal(currentUser.currentUser.id, session.userId, 'fetchCurrentUserQuery returned unexpected user');

      const currentUserId = await fetchCurrentUserIdQuery();
      assert.equal(currentUserId.currentUserId, session.userId, 'fetchCurrentUserIdQuery returned unexpected user');

      const usersArgs = {
        selection: {
          fields: {
            id: true,
            username: true,
          },
          first: 3,
        },
      } as const;
      const usersData = await fetchUsersQuery(usersArgs);
      assert.ok(Array.isArray(usersData.users.nodes), 'fetchUsersQuery users.nodes should be an array');

      const userData = await fetchUserQuery({
        id: session.userId,
        selection: {
          fields: {
            id: true,
            username: true,
          },
        },
      });
      assert.equal(userData.user?.id, session.userId, 'fetchUserQuery returned unexpected user');

      await prefetchCurrentUserQuery(queryClient, {
        selection: {
          fields: {
            id: true,
            username: true,
          },
        },
      });
      await prefetchCurrentUserIdQuery(queryClient);
      await prefetchUsersQuery(queryClient, usersArgs);
      await prefetchUserQuery(queryClient, {
        id: session.userId,
        selection: {
          fields: {
            id: true,
            username: true,
          },
        },
      });

      assert.ok(queryClient.getQueryData(currentUserQueryKey()), 'currentUser cache entry missing');
      assert.ok(queryClient.getQueryData(currentUserIdQueryKey()), 'currentUserId cache entry missing');
      const usersKeyArgs = buildListSelectionArgs(usersArgs.selection);
      assert.ok(queryClient.getQueryData(usersQueryKey(usersKeyArgs)), 'users cache entry missing');
      assert.ok(
        queryClient.getQueryData(userQueryKey(session.userId)),
        'user detail cache entry missing'
      );

      queryClient.clear();
    });

    test('useCheckPasswordMutation succeeds for the signed-in user', async () => {
      await ensureAuth();
      const queryClient = createTestQueryClient();
      const hook = await renderHookWithClient(
        () =>
          useCheckPasswordMutation({
            selection: {
              fields: {
                clientMutationId: true,
              },
            },
          }),
        queryClient
      );

      let result:
        | {
            checkPassword: {
              clientMutationId?: string | null;
            };
          }
        | null = null;

      await act(async () => {
        result = await hook.getResult().mutateAsync({
          input: {
            password: liveEnv.password,
          },
        });
      });

      assert.ok(result?.checkPassword, 'useCheckPasswordMutation returned empty payload');

      await hook.unmount();
      queryClient.clear();
    });

    test('useSignOutMutation signs out current session', async () => {
      const session = await ensureAuth();
      const queryClient = createTestQueryClient();
      const hook = await renderHookWithClient(
        () =>
          useSignOutMutation({
            selection: {
              fields: {
                clientMutationId: true,
              },
            },
          }),
        queryClient
      );

      let result:
        | {
            signOut: {
              clientMutationId?: string | null;
            };
          }
        | null = null;

      await act(async () => {
        result = await hook.getResult().mutateAsync({
          input: {},
        });
      });

      assert.ok(result?.signOut, 'useSignOutMutation returned empty payload');
      sharedSession = null;
      configureHooks(liveEnv);
      await signOut(liveEnv, session.token);

      await hook.unmount();
      queryClient.clear();
    });
  });
}
