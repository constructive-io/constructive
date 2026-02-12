/**
 * Permissions & Grants - Integration Tests
 *
 * Covers: appPermissions, orgPermissions, createAppPermission,
 * updateAppPermission (appPermissionPatch), deleteAppPermission,
 * createOrgPermission, updateOrgPermission (orgPermissionPatch),
 * deleteOrgPermission, orgPermissionDefaults.
 *
 * V5 patterns:
 *   - No singular ByXxx lookups -- use collection(condition: {...})
 *   - updateAppPermission uses `appPermissionPatch`
 *   - updateOrgPermission uses `orgPermissionPatch`
 *   - Permission bitstr is auto-computed via bitnum trigger
 *
 * Run:
 *   pnpm test -- --testPathPattern=permissions-grants
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

const APP_PERMISSIONS = /* GraphQL */ `
  query AppPermissions($first: Int, $orderBy: [AppPermissionsOrderBy!]) {
    appPermissions(first: $first, orderBy: $orderBy) {
      totalCount
      nodes {
        id
        name
        bitnum
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

const ORG_PERMISSIONS = /* GraphQL */ `
  query OrgPermissions($first: Int, $orderBy: [OrgPermissionsOrderBy!]) {
    orgPermissions(first: $first, orderBy: $orderBy) {
      totalCount
      nodes {
        id
        name
        bitnum
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

const CREATE_APP_PERMISSION = /* GraphQL */ `
  mutation CreateAppPermission($input: CreateAppPermissionInput!) {
    createAppPermission(input: $input) {
      appPermission {
        id
        name
        bitnum
      }
    }
  }
`;

const UPDATE_APP_PERMISSION = /* GraphQL */ `
  mutation UpdateAppPermission($input: UpdateAppPermissionInput!) {
    updateAppPermission(input: $input) {
      appPermission {
        id
        name
        bitnum
      }
    }
  }
`;

const DELETE_APP_PERMISSION = /* GraphQL */ `
  mutation DeleteAppPermission($input: DeleteAppPermissionInput!) {
    deleteAppPermission(input: $input) {
      appPermission {
        id
      }
    }
  }
`;

const CREATE_ORG_PERMISSION = /* GraphQL */ `
  mutation CreateOrgPermission($input: CreateOrgPermissionInput!) {
    createOrgPermission(input: $input) {
      orgPermission {
        id
        name
        bitnum
      }
    }
  }
`;

const UPDATE_ORG_PERMISSION = /* GraphQL */ `
  mutation UpdateOrgPermission($input: UpdateOrgPermissionInput!) {
    updateOrgPermission(input: $input) {
      orgPermission {
        id
        name
        bitnum
      }
    }
  }
`;

const DELETE_ORG_PERMISSION = /* GraphQL */ `
  mutation DeleteOrgPermission($input: DeleteOrgPermissionInput!) {
    deleteOrgPermission(input: $input) {
      orgPermission {
        id
      }
    }
  }
`;

const ORG_PERMISSION_DEFAULTS = /* GraphQL */ `
  query OrgPermissionDefaults($first: Int) {
    orgPermissionDefaults(first: $first) {
      nodes {
        id
        entityId
        permissions
        createdAt
        updatedAt
      }
    }
  }
`;

const CREATE_ORG_PERMISSION_DEFAULT = /* GraphQL */ `
  mutation CreateOrgPermissionDefault($input: CreateOrgPermissionDefaultInput!) {
    createOrgPermissionDefault(input: $input) {
      orgPermissionDefault {
        id
        entityId
        permissions
      }
    }
  }
`;

const UPDATE_ORG_PERMISSION_DEFAULT = /* GraphQL */ `
  mutation UpdateOrgPermissionDefault($input: UpdateOrgPermissionDefaultInput!) {
    updateOrgPermissionDefault(input: $input) {
      orgPermissionDefault {
        id
        permissions
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Permissions & Grants', () => {
  let ctx: TestContext;
  let auth: AuthResult;

  // Track created entities for sequential CRUD and cleanup
  let appPermissionId: string | null = null;
  let orgPermissionId: string | null = null;
  let orgId: string | null = null;
  let orgPermDefaultId: string | null = null;

  beforeAll(async () => {
    ctx = await setupTestServer();
    auth = await signIn(ctx.request);

    // Create a test org for org permission default tests
    const orgName = testName('perm_org');
    const orgRes = await postGraphQL(
      ctx.request,
      {
        query: /* GraphQL */ `
          mutation CreateOrg($input: CreateUserInput!) {
            createUser(input: $input) {
              user { id }
            }
          }
        `,
        variables: { input: { user: { displayName: orgName, type: 2 } } },
      },
      auth.token,
    );
    orgId = orgRes.body.data?.createUser?.user?.id ?? null;
  });

  afterAll(async () => {
    // Clean up app permission if not deleted during tests
    if (appPermissionId) {
      try {
        await postGraphQL(
          ctx.request,
          {
            query: DELETE_APP_PERMISSION,
            variables: { input: { id: appPermissionId } },
          },
          auth.token,
        );
      } catch { /* best-effort */ }
    }
    // Clean up org permission
    if (orgPermissionId) {
      try {
        await postGraphQL(
          ctx.request,
          {
            query: DELETE_ORG_PERMISSION,
            variables: { input: { id: orgPermissionId } },
          },
          auth.token,
        );
      } catch { /* best-effort */ }
    }
    // Clean up org (cascades permission defaults)
    if (orgId) {
      try {
        await postGraphQL(
          ctx.request,
          {
            query: /* GraphQL */ `
              mutation DeleteUser($input: DeleteUserInput!) {
                deleteUser(input: $input) { user { id } }
              }
            `,
            variables: { input: { id: orgId } },
          },
          auth.token,
        );
      } catch { /* best-effort */ }
    }
    await ctx.teardown();
  });

  // -------------------------------------------------------------------------
  // Query: appPermissions
  // -------------------------------------------------------------------------

  it('should list appPermissions', async () => {
    const res = await postGraphQL(
      ctx.request,
      {
        query: APP_PERMISSIONS,
        variables: { first: 20, orderBy: ['NAME_ASC'] },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const data = res.body.data?.appPermissions;
    expect(data).toBeDefined();
    expect(data.totalCount).toBeGreaterThanOrEqual(0);
    expect(data.nodes).toBeDefined();
    expect(data.pageInfo).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Query: orgPermissions
  // -------------------------------------------------------------------------

  it('should list orgPermissions', async () => {
    const res = await postGraphQL(
      ctx.request,
      {
        query: ORG_PERMISSIONS,
        variables: { first: 20, orderBy: ['NAME_ASC'] },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const data = res.body.data?.orgPermissions;
    expect(data).toBeDefined();
    expect(data.totalCount).toBeGreaterThanOrEqual(0);
    expect(data.nodes).toBeDefined();
    expect(data.pageInfo).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Mutation: createAppPermission
  // -------------------------------------------------------------------------

  it('should create an app permission', async () => {
    const permName = testName('appperm');

    const res = await postGraphQL(
      ctx.request,
      {
        query: CREATE_APP_PERMISSION,
        variables: {
          input: {
            appPermission: { name: permName },
          },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const perm = res.body.data?.createAppPermission?.appPermission;
    expect(perm).toBeDefined();
    expect(perm.id).toBeTruthy();
    expect(perm.name).toBe(permName);
    // bitnum is auto-assigned by the trigger
    expect(perm.bitnum).toBeDefined();

    appPermissionId = perm.id;
  });

  // -------------------------------------------------------------------------
  // Mutation: updateAppPermission (uses appPermissionPatch)
  // -------------------------------------------------------------------------

  it('should update app permission name using appPermissionPatch', async () => {
    expect(appPermissionId).toBeTruthy();

    const updatedName = testName('appperm_updated');

    const res = await postGraphQL(
      ctx.request,
      {
        query: UPDATE_APP_PERMISSION,
        variables: {
          input: {
            id: appPermissionId,
            appPermissionPatch: { name: updatedName },
          },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const perm = res.body.data?.updateAppPermission?.appPermission;
    expect(perm).toBeDefined();
    expect(perm.id).toBe(appPermissionId);
    expect(perm.name).toBe(updatedName);
  });

  // -------------------------------------------------------------------------
  // Verify app permission via SQL
  // -------------------------------------------------------------------------

  it('should verify app permission in database via SQL', async () => {
    expect(appPermissionId).toBeTruthy();

    const rows = await queryDb(
      ctx.pg,
      'SELECT id, name FROM constructive_permissions_public.app_permissions WHERE id = $1',
      [appPermissionId],
    );

    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe(appPermissionId);
    expect(rows[0].name).toContain('appperm_updated');
  });

  // -------------------------------------------------------------------------
  // Mutation: deleteAppPermission
  // -------------------------------------------------------------------------

  it('should delete the created app permission', async () => {
    expect(appPermissionId).toBeTruthy();

    const res = await postGraphQL(
      ctx.request,
      {
        query: DELETE_APP_PERMISSION,
        variables: { input: { id: appPermissionId } },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const deleted = res.body.data?.deleteAppPermission?.appPermission;
    expect(deleted).toBeDefined();
    expect(deleted.id).toBe(appPermissionId);

    // Verify gone from database
    const rows = await queryDb(
      ctx.pg,
      'SELECT id FROM constructive_permissions_public.app_permissions WHERE id = $1',
      [appPermissionId],
    );
    expect(rows.length).toBe(0);

    appPermissionId = null; // Already cleaned up
  });

  // -------------------------------------------------------------------------
  // Mutation: createOrgPermission
  // -------------------------------------------------------------------------

  it('should create an org permission', async () => {
    const permName = testName('orgperm');

    const res = await postGraphQL(
      ctx.request,
      {
        query: CREATE_ORG_PERMISSION,
        variables: {
          input: {
            orgPermission: { name: permName },
          },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const perm = res.body.data?.createOrgPermission?.orgPermission;
    expect(perm).toBeDefined();
    expect(perm.id).toBeTruthy();
    expect(perm.name).toBe(permName);
    expect(perm.bitnum).toBeDefined();

    orgPermissionId = perm.id;
  });

  // -------------------------------------------------------------------------
  // Mutation: updateOrgPermission (uses orgPermissionPatch)
  // -------------------------------------------------------------------------

  it('should update org permission name using orgPermissionPatch', async () => {
    expect(orgPermissionId).toBeTruthy();

    const updatedName = testName('orgperm_updated');

    const res = await postGraphQL(
      ctx.request,
      {
        query: UPDATE_ORG_PERMISSION,
        variables: {
          input: {
            id: orgPermissionId,
            orgPermissionPatch: { name: updatedName },
          },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const perm = res.body.data?.updateOrgPermission?.orgPermission;
    expect(perm).toBeDefined();
    expect(perm.id).toBe(orgPermissionId);
    expect(perm.name).toBe(updatedName);
  });

  // -------------------------------------------------------------------------
  // Mutation: deleteOrgPermission
  // -------------------------------------------------------------------------

  it('should delete the created org permission', async () => {
    expect(orgPermissionId).toBeTruthy();

    const res = await postGraphQL(
      ctx.request,
      {
        query: DELETE_ORG_PERMISSION,
        variables: { input: { id: orgPermissionId } },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const deleted = res.body.data?.deleteOrgPermission?.orgPermission;
    expect(deleted).toBeDefined();
    expect(deleted.id).toBe(orgPermissionId);

    orgPermissionId = null; // Already cleaned up
  });

  // -------------------------------------------------------------------------
  // Query: orgPermissionDefaults
  // -------------------------------------------------------------------------

  it('should list orgPermissionDefaults', async () => {
    const res = await postGraphQL(
      ctx.request,
      {
        query: ORG_PERMISSION_DEFAULTS,
        variables: { first: 20 },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const data = res.body.data?.orgPermissionDefaults;
    expect(data).toBeDefined();
    expect(data.nodes).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Mutation: createOrgPermissionDefault
  // -------------------------------------------------------------------------

  it('should create an orgPermissionDefault for the test org', async () => {
    expect(orgId).toBeTruthy();

    const res = await postGraphQL(
      ctx.request,
      {
        query: CREATE_ORG_PERMISSION_DEFAULT,
        variables: {
          input: {
            orgPermissionDefault: { entityId: orgId },
          },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const def = res.body.data?.createOrgPermissionDefault?.orgPermissionDefault;
    expect(def).toBeDefined();
    expect(def.id).toBeTruthy();
    expect(def.entityId).toBe(orgId);

    orgPermDefaultId = def.id;
  });

  // -------------------------------------------------------------------------
  // Mutation: updateOrgPermissionDefault
  // -------------------------------------------------------------------------

  it('should update orgPermissionDefault permissions', async () => {
    if (!orgPermDefaultId) {
      console.warn('No orgPermissionDefault created; skipping update test');
      return;
    }

    const res = await postGraphQL(
      ctx.request,
      {
        query: UPDATE_ORG_PERMISSION_DEFAULT,
        variables: {
          input: {
            id: orgPermDefaultId,
            orgPermissionDefaultPatch: { permissions: '1010' },
          },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const def = res.body.data?.updateOrgPermissionDefault?.orgPermissionDefault;
    expect(def).toBeDefined();
    expect(def.id).toBe(orgPermDefaultId);
    expect(def.permissions).toBe('1010');
  });
});
