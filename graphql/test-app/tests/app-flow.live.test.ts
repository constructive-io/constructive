/**
 * Full-flow integration test for the React App component workflow.
 *
 * Mirrors what a user would do in App.tsx:
 *   signUp → signIn → identity queries → mutations → CRUD → cleanup
 *
 * Requires a live GraphQL endpoint (same as hooks.live.test.ts).
 */
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { act } from 'react-test-renderer';

import {
  configure,
  useSignUpMutation,
  useSignInMutation,
  useSignOutMutation,
  useCurrentUserQuery,
  useCurrentUserIdQuery,
  useUsersQuery,
  useCreateDatabaseMutation,
  useDatabaseQuery,
  useUpdateDatabaseMutation,
  useDeleteDatabaseMutation,
  useDatabasesQuery,
  useSchemasQuery,
  useTablesQuery,
  useUpdateUserMutation,
  useCurrentIpAddressQuery,
  useCurrentUserAgentQuery,
  useExtendTokenExpiresMutation,
  useAuditLogsQuery,
  useEmailsQuery,
} from '../src/generated/hooks';

import { renderHookWithClient } from './hook-test-utils';
import {
  assertLiveEnvConfigured,
  configureHooks,
  createTestQueryClient,
  getLiveEnvHelpMessage,
  getLiveTestEnv,
  type AuthSession,
  signOut,
} from './live-test-utils';

const liveEnv = getLiveTestEnv();
assertLiveEnvConfigured(liveEnv);

if (!liveEnv) {
  test.skip(getLiveEnvHelpMessage(), () => {});
} else {
  describe('App full-flow (live endpoint)', () => {
    // Shared auth state across sequential tests
    let sharedToken: string | null = null;
    let sharedUserId: string | null = null;

    before(() => {
      configureHooks(liveEnv);
    });

    after(async () => {
      if (sharedToken) {
        await signOut(liveEnv, sharedToken);
        sharedToken = null;
        sharedUserId = null;
      }
      configureHooks(liveEnv);
    });

    // -----------------------------------------------------------------
    // 1. Auth: signUp + signIn cycle
    // -----------------------------------------------------------------
    test('signUp creates account, signOut, then signIn returns token', async () => {
      const queryClient = createTestQueryClient();

      // --- signUp ---
      const signUpHook = await renderHookWithClient(
        () =>
          useSignUpMutation({
            selection: {
              fields: {
                result: {
                  select: {
                    accessToken: true,
                    userId: true,
                    isVerified: true,
                  },
                },
              },
            },
          }),
        queryClient,
      );

      let signUpResult: any = null;
      await act(async () => {
        signUpResult = await signUpHook.getResult().mutateAsync({
          input: {
            email: liveEnv.email,
            password: liveEnv.password,
          },
        });
      });

      const signUpToken = signUpResult?.signUp?.result?.accessToken ?? null;
      const signUpUserId = signUpResult?.signUp?.result?.userId ?? null;
      assert.ok(signUpToken, 'signUp should return accessToken');
      assert.ok(signUpUserId, 'signUp should return userId');
      await signUpHook.unmount();

      // --- signOut ---
      configureHooks(liveEnv, signUpToken);

      const signOutHook = await renderHookWithClient(
        () =>
          useSignOutMutation({
            selection: { fields: { clientMutationId: true } },
          }),
        queryClient,
      );

      await act(async () => {
        await signOutHook.getResult().mutateAsync({ input: {} });
      });
      await signOutHook.unmount();

      // --- signIn ---
      configureHooks(liveEnv); // reset to unauthenticated

      const signInHook = await renderHookWithClient(
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
        queryClient,
      );

      let signInResult: any = null;
      await act(async () => {
        signInResult = await signInHook.getResult().mutateAsync({
          input: {
            email: liveEnv.email,
            password: liveEnv.password,
            rememberMe: true,
          },
        });
      });

      sharedToken = signInResult?.signIn?.result?.accessToken ?? null;
      sharedUserId = signInResult?.signIn?.result?.userId ?? null;
      assert.ok(sharedToken, 'signIn should return accessToken');
      assert.ok(sharedUserId, 'signIn should return userId');
      assert.equal(sharedUserId, signUpUserId, 'signIn userId should match signUp userId');

      // Reconfigure hooks for authenticated requests
      configureHooks(liveEnv, sharedToken);

      await signInHook.unmount();
      queryClient.clear();
    });

    // -----------------------------------------------------------------
    // 2. Identity: currentUser + currentUserId
    // -----------------------------------------------------------------
    test('currentUser and currentUserId match authenticated user', async () => {
      assert.ok(sharedToken && sharedUserId, 'Auth required');
      const queryClient = createTestQueryClient();

      const currentUserHook = await renderHookWithClient(
        () =>
          useCurrentUserQuery({
            selection: {
              fields: { id: true, username: true, displayName: true, createdAt: true },
            },
          }),
        queryClient,
      );

      const cuResult = await currentUserHook.waitFor((v) => v.isSuccess || v.isError);
      assert.equal(cuResult.isError, false, 'useCurrentUserQuery should not error');
      assert.equal(cuResult.data?.currentUser?.id, sharedUserId, 'currentUser.id should match');
      assert.ok(cuResult.data?.currentUser?.createdAt, 'currentUser.createdAt should exist');

      const currentUserIdHook = await renderHookWithClient(
        () => useCurrentUserIdQuery(),
        queryClient,
      );

      const cuIdResult = await currentUserIdHook.waitFor((v) => v.isSuccess || v.isError);
      assert.equal(cuIdResult.isError, false, 'useCurrentUserIdQuery should not error');
      assert.equal(cuIdResult.data?.currentUserId, sharedUserId, 'currentUserId should match');

      await currentUserHook.unmount();
      await currentUserIdHook.unmount();
      queryClient.clear();
    });

    // -----------------------------------------------------------------
    // 3. User list with nested relations
    // -----------------------------------------------------------------
    test('users query returns list with nested ownedDatabases', async () => {
      assert.ok(sharedToken, 'Auth required');
      const queryClient = createTestQueryClient();

      const hook = await renderHookWithClient(
        () =>
          useUsersQuery({
            selection: {
              fields: {
                id: true,
                username: true,
                ownedDatabases: {
                  first: 2,
                  select: { id: true, name: true },
                },
              },
              first: 5,
              orderBy: ['CREATED_AT_DESC'],
            },
          }),
        queryClient,
      );

      const result = await hook.waitFor((v) => v.isSuccess || v.isError);
      assert.equal(result.isError, false, 'useUsersQuery should not error');
      assert.ok(Array.isArray(result.data?.users?.nodes), 'users.nodes should be an array');
      assert.ok(result.data!.users.nodes.length >= 1, 'should have at least 1 user');
      assert.ok(
        typeof result.data!.users.totalCount === 'number',
        'totalCount should be a number',
      );

      // Verify nested relation on first user
      const firstUser = result.data!.users.nodes[0];
      assert.ok(
        Array.isArray(firstUser.ownedDatabases.nodes),
        'ownedDatabases.nodes should be an array',
      );

      await hook.unmount();
      queryClient.clear();
    });

    // -----------------------------------------------------------------
    // 4. Update user mutation
    // -----------------------------------------------------------------
    test('updateUser mutation patches displayName and restores it', async () => {
      assert.ok(sharedToken && sharedUserId, 'Auth required');
      const queryClient = createTestQueryClient();

      const hook = await renderHookWithClient(
        () =>
          useUpdateUserMutation({
            selection: { fields: { id: true, displayName: true } },
          }),
        queryClient,
      );

      const testName = `flow-test-${Date.now()}`;
      let updateResult: any = null;

      await act(async () => {
        updateResult = await hook.getResult().mutateAsync({
          id: sharedUserId!,
          userPatch: { displayName: testName },
        });
      });

      assert.equal(
        updateResult?.updateUser?.user?.displayName,
        testName,
        'updateUser should return updated displayName',
      );

      // Restore
      await act(async () => {
        await hook.getResult().mutateAsync({
          id: sharedUserId!,
          userPatch: { displayName: null },
        });
      });

      await hook.unmount();
      queryClient.clear();
    });

    // -----------------------------------------------------------------
    // 5. Database CRUD lifecycle
    // -----------------------------------------------------------------
    test('database CRUD: create → read → update → delete', async () => {
      assert.ok(sharedToken && sharedUserId, 'Auth required');
      const queryClient = createTestQueryClient();
      const dbName = `flow_test_${Date.now()}`;

      // --- Create ---
      const createHook = await renderHookWithClient(
        () =>
          useCreateDatabaseMutation({
            selection: { fields: { id: true, name: true, label: true, createdAt: true } },
          }),
        queryClient,
      );

      let createResult: any = null;
      await act(async () => {
        createResult = await createHook.getResult().mutateAsync({
          ownerId: sharedUserId!,
          name: dbName,
          label: 'Flow Test',
        });
      });

      const dbId = createResult?.createDatabase?.database?.id;
      assert.ok(dbId, 'createDatabase should return database.id');
      assert.equal(createResult.createDatabase.database.name, dbName, 'name should match');
      await createHook.unmount();

      // --- Read (findOne) ---
      const readHook = await renderHookWithClient(
        () =>
          useDatabaseQuery({
            id: dbId,
            selection: { fields: { id: true, name: true, label: true } },
          }),
        queryClient,
      );

      const readResult = await readHook.waitFor((v) => v.isSuccess || v.isError);
      assert.equal(readResult.isError, false, 'useDatabaseQuery should not error');
      assert.equal(readResult.data?.database?.name, dbName, 'database name should match');
      assert.equal(readResult.data?.database?.label, 'Flow Test', 'database label should match');
      await readHook.unmount();

      // --- Update ---
      const updateHook = await renderHookWithClient(
        () =>
          useUpdateDatabaseMutation({
            selection: { fields: { id: true, name: true, label: true } },
          }),
        queryClient,
      );

      let updateResult: any = null;
      await act(async () => {
        updateResult = await updateHook.getResult().mutateAsync({
          id: dbId,
          databasePatch: { label: 'Updated' },
        });
      });

      assert.equal(
        updateResult?.updateDatabase?.database?.label,
        'Updated',
        'updateDatabase should return updated label',
      );
      await updateHook.unmount();

      // --- Delete ---
      const deleteHook = await renderHookWithClient(
        () =>
          useDeleteDatabaseMutation({
            selection: { fields: { id: true, name: true } },
          }),
        queryClient,
      );

      let deleteResult: any = null;
      await act(async () => {
        deleteResult = await deleteHook.getResult().mutateAsync({ id: dbId });
      });

      assert.equal(
        deleteResult?.deleteDatabase?.database?.id,
        dbId,
        'deleteDatabase should return the deleted database id',
      );
      await deleteHook.unmount();

      // --- Verify deleted ---
      const verifyHook = await renderHookWithClient(
        () =>
          useDatabaseQuery({
            id: dbId,
            selection: { fields: { id: true } },
          }),
        queryClient,
      );

      const verifyResult = await verifyHook.waitFor((v) => v.isSuccess || v.isError);
      assert.equal(verifyResult.data?.database, null, 'deleted database should return null');
      await verifyHook.unmount();

      queryClient.clear();
    });

    // -----------------------------------------------------------------
    // 6. Database list with nested schemas + filters
    // -----------------------------------------------------------------
    test('databases query with nested schemas and filter', async () => {
      assert.ok(sharedToken, 'Auth required');
      const queryClient = createTestQueryClient();

      const hook = await renderHookWithClient(
        () =>
          useDatabasesQuery({
            selection: {
              fields: {
                id: true,
                name: true,
                schemas: {
                  first: 5,
                  select: { id: true, schemaName: true },
                },
              },
              where: { name: { includesInsensitive: '' } },
              first: 10,
            },
          }),
        queryClient,
      );

      const result = await hook.waitFor((v) => v.isSuccess || v.isError);
      assert.equal(result.isError, false, 'useDatabasesQuery should not error');
      assert.ok(Array.isArray(result.data?.databases?.nodes), 'databases.nodes should be an array');

      // Verify nested schemas on each db
      for (const db of result.data?.databases?.nodes ?? []) {
        assert.ok(Array.isArray(db.schemas.nodes), 'schemas.nodes should be an array');
      }

      await hook.unmount();
      queryClient.clear();
    });

    // -----------------------------------------------------------------
    // 7. Schema list with parent database relation
    // -----------------------------------------------------------------
    test('schemas query with parent database relation', async () => {
      assert.ok(sharedToken, 'Auth required');
      const queryClient = createTestQueryClient();

      const hook = await renderHookWithClient(
        () =>
          useSchemasQuery({
            selection: {
              fields: {
                id: true,
                schemaName: true,
                isPublic: true,
                database: {
                  select: { id: true, name: true },
                },
              },
              first: 10,
            },
          }),
        queryClient,
      );

      const result = await hook.waitFor((v) => v.isSuccess || v.isError);
      assert.equal(result.isError, false, 'useSchemasQuery should not error');
      assert.ok(Array.isArray(result.data?.schemas?.nodes), 'schemas.nodes should be an array');

      // If schemas exist, verify parent database is accessible
      const schemas = result.data?.schemas?.nodes ?? [];
      if (schemas.length > 0) {
        assert.ok(schemas[0].database?.name, 'first schema should have database.name');
      }

      await hook.unmount();
      queryClient.clear();
    });

    // -----------------------------------------------------------------
    // 8. Tables query with nested fields
    // -----------------------------------------------------------------
    test('tables query with nested fields and parent schema', async () => {
      assert.ok(sharedToken, 'Auth required');
      const queryClient = createTestQueryClient();

      const hook = await renderHookWithClient(
        () =>
          useTablesQuery({
            selection: {
              fields: {
                id: true,
                name: true,
                schema: {
                  select: { id: true, schemaName: true },
                },
                fields: {
                  first: 10,
                  select: { id: true, name: true, type: true },
                },
              },
              first: 10,
            },
          }),
        queryClient,
      );

      const result = await hook.waitFor((v) => v.isSuccess || v.isError);
      assert.equal(result.isError, false, 'useTablesQuery should not error');
      assert.ok(Array.isArray(result.data?.tables?.nodes), 'tables.nodes should be an array');

      // Verify nested fields on first table if any exist
      const tables = result.data?.tables?.nodes ?? [];
      if (tables.length > 0) {
        assert.ok(
          Array.isArray(tables[0].fields.nodes),
          'first table should have fields.nodes array',
        );
      }

      await hook.unmount();
      queryClient.clear();
    });

    // -----------------------------------------------------------------
    // 9. Session identity scalars
    // -----------------------------------------------------------------
    test('currentIpAddress and currentUserAgent return strings', async () => {
      assert.ok(sharedToken, 'Auth required');
      const queryClient = createTestQueryClient();

      const ipHook = await renderHookWithClient(
        () => useCurrentIpAddressQuery(),
        queryClient,
      );

      const ipResult = await ipHook.waitFor((v) => v.isSuccess || v.isError);
      assert.equal(ipResult.isError, false, 'useCurrentIpAddressQuery should not error');
      assert.equal(typeof ipResult.data?.currentIpAddress, 'string', 'currentIpAddress should be a string');

      const uaHook = await renderHookWithClient(
        () => useCurrentUserAgentQuery(),
        queryClient,
      );

      const uaResult = await uaHook.waitFor((v) => v.isSuccess || v.isError);
      assert.equal(uaResult.isError, false, 'useCurrentUserAgentQuery should not error');
      assert.equal(typeof uaResult.data?.currentUserAgent, 'string', 'currentUserAgent should be a string');

      await ipHook.unmount();
      await uaHook.unmount();
      queryClient.clear();
    });

    // -----------------------------------------------------------------
    // 10. Extend token
    // -----------------------------------------------------------------
    test('extendTokenExpires mutation returns new expiresAt', async () => {
      assert.ok(sharedToken, 'Auth required');
      const queryClient = createTestQueryClient();

      const hook = await renderHookWithClient(
        () =>
          useExtendTokenExpiresMutation({
            selection: {
              fields: {
                result: {
                  select: { id: true, sessionId: true, expiresAt: true },
                },
              },
            },
          }),
        queryClient,
      );

      let result: any = null;
      await act(async () => {
        result = await hook.getResult().mutateAsync({ input: {} });
      });

      const extendResult = result?.extendTokenExpires?.result;
      assert.ok(
        Array.isArray(extendResult) ? extendResult[0]?.expiresAt : extendResult?.expiresAt,
        'extendTokenExpires should return result with expiresAt',
      );

      await hook.unmount();
      queryClient.clear();
    });

    // -----------------------------------------------------------------
    // 11. Audit logs populated after auth flow
    // -----------------------------------------------------------------
    test('audit logs contain at least one entry after auth flow', async () => {
      assert.ok(sharedToken, 'Auth required');
      const queryClient = createTestQueryClient();

      const hook = await renderHookWithClient(
        () =>
          useAuditLogsQuery({
            selection: {
              fields: { id: true, event: true, createdAt: true },
              first: 5,
            },
          }),
        queryClient,
      );

      const result = await hook.waitFor((v) => v.isSuccess || v.isError);
      assert.equal(result.isError, false, 'useAuditLogsQuery should not error');
      assert.ok(Array.isArray(result.data?.auditLogs?.nodes), 'auditLogs.nodes should be an array');
      assert.ok(
        result.data!.auditLogs.nodes.length >= 1,
        'should have at least 1 audit log entry after auth flow',
      );

      await hook.unmount();
      queryClient.clear();
    });

    // -----------------------------------------------------------------
    // 12. Emails query returns user's signup email
    // -----------------------------------------------------------------
    test('emails query returns at least one email from signup', async () => {
      assert.ok(sharedToken, 'Auth required');
      const queryClient = createTestQueryClient();

      const hook = await renderHookWithClient(
        () =>
          useEmailsQuery({
            selection: {
              fields: { id: true, email: true, isVerified: true },
              first: 5,
            },
          }),
        queryClient,
      );

      const result = await hook.waitFor((v) => v.isSuccess || v.isError);
      assert.equal(result.isError, false, 'useEmailsQuery should not error');
      assert.ok(Array.isArray(result.data?.emails?.nodes), 'emails.nodes should be an array');
      assert.ok(
        result.data!.emails.nodes.length >= 1,
        'should have at least 1 email from signup',
      );

      await hook.unmount();
      queryClient.clear();
    });

    // -----------------------------------------------------------------
    // 13. Auth: signOut cleans up
    // -----------------------------------------------------------------
    test('signOut cleans up session', async () => {
      assert.ok(sharedToken, 'Auth required');
      const queryClient = createTestQueryClient();

      const hook = await renderHookWithClient(
        () =>
          useSignOutMutation({
            selection: { fields: { clientMutationId: true } },
          }),
        queryClient,
      );

      let result: any = null;
      await act(async () => {
        result = await hook.getResult().mutateAsync({ input: {} });
      });

      assert.ok(result?.signOut, 'signOut should return payload');

      // Mark session as cleaned up so after() doesn't double-sign-out
      sharedToken = null;
      sharedUserId = null;
      configureHooks(liveEnv);

      await hook.unmount();
      queryClient.clear();
    });
  });
}
