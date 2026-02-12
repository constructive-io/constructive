/**
 * Memberships & Invites - Integration Tests
 *
 * Covers: appMemberships, appMembershipDefaults, orgMemberships,
 * invites CRUD, orgInvites CRUD, submitInviteCode, submitOrgInviteCode,
 * createAppMembershipDefault, updateAppMembershipDefault.
 *
 * V5 patterns:
 *   - No singular ByXxx lookups -- use collection(condition: {...})
 *   - updateInvite uses `invitePatch`
 *   - updateOrgInvite uses `orgInvitePatch`
 *   - updateAppMembership uses `appMembershipPatch`
 *   - updateAppMembershipDefault uses `appMembershipDefaultPatch`
 *   - submitInviteCode/submitOrgInviteCode return OBJECT_NOT_FOUND (not INVITE_NOT_FOUND)
 *
 * Run:
 *   pnpm test -- --testPathPattern=memberships-invites
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

const APP_MEMBERSHIPS = /* GraphQL */ `
  query AppMemberships($first: Int) {
    appMemberships(first: $first) {
      totalCount
      nodes {
        id
        actorId
        isApproved
        isBanned
        isDisabled
        isVerified
        isActive
        isOwner
        isAdmin
        permissions
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const APP_MEMBERSHIP_DEFAULTS = /* GraphQL */ `
  query AppMembershipDefaults($first: Int) {
    appMembershipDefaults(first: $first) {
      nodes {
        id
        isApproved
        createdAt
        updatedAt
      }
    }
  }
`;

const ORG_MEMBERSHIPS = /* GraphQL */ `
  query OrgMemberships($first: Int, $filter: OrgMembershipFilter) {
    orgMemberships(first: $first, filter: $filter) {
      totalCount
      nodes {
        id
        actorId
        entityId
        isOwner
        isAdmin
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

const CREATE_INVITE = /* GraphQL */ `
  mutation CreateInvite($input: CreateInviteInput!) {
    createInvite(input: $input) {
      invite {
        id
        email
        role
        token
        expiresAt
        createdAt
      }
    }
  }
`;

const LIST_INVITES = /* GraphQL */ `
  query Invites($first: Int) {
    invites(first: $first) {
      totalCount
      nodes {
        id
        email
        role
        token
        expiresAt
        createdAt
      }
    }
  }
`;

const UPDATE_INVITE = /* GraphQL */ `
  mutation UpdateInvite($input: UpdateInviteInput!) {
    updateInvite(input: $input) {
      invite {
        id
        email
        role
      }
    }
  }
`;

const DELETE_INVITE = /* GraphQL */ `
  mutation DeleteInvite($input: DeleteInviteInput!) {
    deleteInvite(input: $input) {
      invite {
        id
      }
    }
  }
`;

const SUBMIT_INVITE_CODE = /* GraphQL */ `
  mutation SubmitInviteCode($input: SubmitInviteCodeInput!) {
    submitInviteCode(input: $input) {
      clientMutationId
    }
  }
`;

const CREATE_ORG_INVITE = /* GraphQL */ `
  mutation CreateOrgInvite($input: CreateOrgInviteInput!) {
    createOrgInvite(input: $input) {
      orgInvite {
        id
        entityId
        email
        role
        token
        expiresAt
        createdAt
      }
    }
  }
`;

const LIST_ORG_INVITES = /* GraphQL */ `
  query OrgInvites($first: Int) {
    orgInvites(first: $first) {
      totalCount
      nodes {
        id
        entityId
        email
        role
        token
        expiresAt
        createdAt
      }
    }
  }
`;

const UPDATE_ORG_INVITE = /* GraphQL */ `
  mutation UpdateOrgInvite($input: UpdateOrgInviteInput!) {
    updateOrgInvite(input: $input) {
      orgInvite {
        id
        email
        role
      }
    }
  }
`;

const DELETE_ORG_INVITE = /* GraphQL */ `
  mutation DeleteOrgInvite($input: DeleteOrgInviteInput!) {
    deleteOrgInvite(input: $input) {
      orgInvite {
        id
      }
    }
  }
`;

const SUBMIT_ORG_INVITE_CODE = /* GraphQL */ `
  mutation SubmitOrgInviteCode($input: SubmitOrgInviteCodeInput!) {
    submitOrgInviteCode(input: $input) {
      clientMutationId
    }
  }
`;

const UPDATE_APP_MEMBERSHIP_DEFAULT = /* GraphQL */ `
  mutation UpdateAppMembershipDefault($input: UpdateAppMembershipDefaultInput!) {
    updateAppMembershipDefault(input: $input) {
      appMembershipDefault {
        id
        isApproved
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Memberships & Invites', () => {
  let ctx: TestContext;
  let auth: AuthResult;

  // Track created entities for cleanup
  let inviteId: string | null = null;
  let orgInviteId: string | null = null;
  let orgId: string | null = null;

  beforeAll(async () => {
    ctx = await setupTestServer();
    auth = await signIn(ctx.request);

    // Create a test org for org invite tests
    const orgName = testName('mbr_org');
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
    // Clean up invite if not deleted during tests
    if (inviteId) {
      try {
        await postGraphQL(
          ctx.request,
          { query: DELETE_INVITE, variables: { input: { id: inviteId } } },
          auth.token,
        );
      } catch { /* best-effort */ }
    }
    // Clean up org invite
    if (orgInviteId) {
      try {
        await postGraphQL(
          ctx.request,
          { query: DELETE_ORG_INVITE, variables: { input: { id: orgInviteId } } },
          auth.token,
        );
      } catch { /* best-effort */ }
    }
    // Clean up org
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
  // Query: appMemberships
  // -------------------------------------------------------------------------

  it('should list appMemberships', async () => {
    const res = await postGraphQL(
      ctx.request,
      { query: APP_MEMBERSHIPS, variables: { first: 20 } },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const data = res.body.data?.appMemberships;
    expect(data).toBeDefined();
    expect(data.totalCount).toBeGreaterThanOrEqual(1);
    expect(data.nodes.length).toBeGreaterThanOrEqual(1);

    // Admin should have an app membership
    const adminMembership = data.nodes.find(
      (m: any) => m.actorId === '00000000-0000-0000-0000-000000000002',
    );
    expect(adminMembership).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Query: appMembershipDefaults
  // -------------------------------------------------------------------------

  it('should list appMembershipDefaults (singleton)', async () => {
    const res = await postGraphQL(
      ctx.request,
      { query: APP_MEMBERSHIP_DEFAULTS, variables: { first: 20 } },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const data = res.body.data?.appMembershipDefaults;
    expect(data).toBeDefined();
    expect(data.nodes).toBeDefined();
    // AppMembershipDefault is a singleton (1 row from bootstrap)
    expect(data.nodes.length).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // Query: orgMemberships
  // -------------------------------------------------------------------------

  it('should list orgMemberships', async () => {
    const res = await postGraphQL(
      ctx.request,
      { query: ORG_MEMBERSHIPS, variables: { first: 20 } },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const data = res.body.data?.orgMemberships;
    expect(data).toBeDefined();
    expect(data.totalCount).toBeGreaterThanOrEqual(0);
    expect(data.nodes).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Mutation: createInvite
  // -------------------------------------------------------------------------

  it('should create an app invite with unique code', async () => {
    const uniqueEmail = `${testName('invite')}@example.com`;

    const res = await postGraphQL(
      ctx.request,
      {
        query: CREATE_INVITE,
        variables: {
          input: {
            invite: {
              email: uniqueEmail,
            },
          },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const invite = res.body.data?.createInvite?.invite;
    expect(invite).toBeDefined();
    expect(invite.id).toBeTruthy();
    expect(invite.email).toBe(uniqueEmail);
    expect(invite.token).toBeTruthy();

    inviteId = invite.id;
  });

  // -------------------------------------------------------------------------
  // Query: invites -- verify created invite
  // -------------------------------------------------------------------------

  it('should list invites and find the created invite', async () => {
    expect(inviteId).toBeTruthy();

    const res = await postGraphQL(
      ctx.request,
      { query: LIST_INVITES, variables: { first: 50 } },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const data = res.body.data?.invites;
    expect(data).toBeDefined();
    expect(data.totalCount).toBeGreaterThanOrEqual(1);

    const found = data.nodes.find((i: any) => i.id === inviteId);
    expect(found).toBeDefined();
    expect(found.token).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Mutation: updateInvite (uses invitePatch)
  // -------------------------------------------------------------------------

  it('should update invite using invitePatch', async () => {
    expect(inviteId).toBeTruthy();

    const res = await postGraphQL(
      ctx.request,
      {
        query: UPDATE_INVITE,
        variables: {
          input: {
            id: inviteId,
            invitePatch: { role: 'editor' },
          },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const invite = res.body.data?.updateInvite?.invite;
    expect(invite).toBeDefined();
    expect(invite.id).toBe(inviteId);
    expect(invite.role).toBe('editor');
  });

  // -------------------------------------------------------------------------
  // Mutation: submitInviteCode (with invalid code)
  // -------------------------------------------------------------------------

  it('should return error for submitInviteCode with invalid token', async () => {
    const res = await postGraphQL(
      ctx.request,
      {
        query: SUBMIT_INVITE_CODE,
        variables: { input: { token: 'nonexistent-invite-code-12345' } },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    // V5 returns OBJECT_NOT_FOUND for invalid invite codes
    const hasError =
      (res.body.errors && res.body.errors.length > 0) ||
      res.body.data?.submitInviteCode === null;
    expect(hasError).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Mutation: deleteInvite
  // -------------------------------------------------------------------------

  it('should delete the created invite', async () => {
    expect(inviteId).toBeTruthy();

    const res = await postGraphQL(
      ctx.request,
      {
        query: DELETE_INVITE,
        variables: { input: { id: inviteId } },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const deleted = res.body.data?.deleteInvite?.invite;
    expect(deleted).toBeDefined();
    expect(deleted.id).toBe(inviteId);

    inviteId = null; // Already cleaned up
  });

  // -------------------------------------------------------------------------
  // Mutation: createOrgInvite
  // -------------------------------------------------------------------------

  it('should create an org invite', async () => {
    expect(orgId).toBeTruthy();

    const uniqueEmail = `${testName('orginvite')}@example.com`;

    const res = await postGraphQL(
      ctx.request,
      {
        query: CREATE_ORG_INVITE,
        variables: {
          input: {
            orgInvite: {
              entityId: orgId,
              email: uniqueEmail,
            },
          },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const orgInvite = res.body.data?.createOrgInvite?.orgInvite;
    expect(orgInvite).toBeDefined();
    expect(orgInvite.id).toBeTruthy();
    expect(orgInvite.entityId).toBe(orgId);
    expect(orgInvite.email).toBe(uniqueEmail);
    expect(orgInvite.token).toBeTruthy();

    orgInviteId = orgInvite.id;
  });

  // -------------------------------------------------------------------------
  // Query: orgInvites -- verify created org invite
  // -------------------------------------------------------------------------

  it('should list orgInvites and find the created invite', async () => {
    expect(orgInviteId).toBeTruthy();

    const res = await postGraphQL(
      ctx.request,
      { query: LIST_ORG_INVITES, variables: { first: 50 } },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const data = res.body.data?.orgInvites;
    expect(data).toBeDefined();
    expect(data.totalCount).toBeGreaterThanOrEqual(1);

    const found = data.nodes.find((i: any) => i.id === orgInviteId);
    expect(found).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Mutation: updateOrgInvite (uses orgInvitePatch)
  // -------------------------------------------------------------------------

  it('should update orgInvite using orgInvitePatch', async () => {
    expect(orgInviteId).toBeTruthy();

    const res = await postGraphQL(
      ctx.request,
      {
        query: UPDATE_ORG_INVITE,
        variables: {
          input: {
            id: orgInviteId,
            orgInvitePatch: { role: 'member' },
          },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const orgInvite = res.body.data?.updateOrgInvite?.orgInvite;
    expect(orgInvite).toBeDefined();
    expect(orgInvite.id).toBe(orgInviteId);
    expect(orgInvite.role).toBe('member');
  });

  // -------------------------------------------------------------------------
  // Mutation: submitOrgInviteCode (with invalid code)
  // -------------------------------------------------------------------------

  it('should return error for submitOrgInviteCode with invalid token', async () => {
    const res = await postGraphQL(
      ctx.request,
      {
        query: SUBMIT_ORG_INVITE_CODE,
        variables: { input: { token: 'nonexistent-org-invite-code-99' } },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    // V5 returns OBJECT_NOT_FOUND for invalid invite codes
    const hasError =
      (res.body.errors && res.body.errors.length > 0) ||
      res.body.data?.submitOrgInviteCode === null;
    expect(hasError).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Mutation: deleteOrgInvite
  // -------------------------------------------------------------------------

  it('should delete the created org invite', async () => {
    expect(orgInviteId).toBeTruthy();

    const res = await postGraphQL(
      ctx.request,
      {
        query: DELETE_ORG_INVITE,
        variables: { input: { id: orgInviteId } },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const deleted = res.body.data?.deleteOrgInvite?.orgInvite;
    expect(deleted).toBeDefined();
    expect(deleted.id).toBe(orgInviteId);

    orgInviteId = null; // Already cleaned up
  });

  // -------------------------------------------------------------------------
  // Mutation: updateAppMembershipDefault (uses appMembershipDefaultPatch)
  // -------------------------------------------------------------------------

  it('should update appMembershipDefault using appMembershipDefaultPatch', async () => {
    // First, fetch the existing singleton default
    const listRes = await postGraphQL(
      ctx.request,
      { query: APP_MEMBERSHIP_DEFAULTS, variables: { first: 1 } },
      auth.token,
    );

    expect(listRes.status).toBe(200);
    const defaults = listRes.body.data?.appMembershipDefaults?.nodes;
    expect(defaults).toBeDefined();
    expect(defaults.length).toBeGreaterThanOrEqual(1);

    const defaultId = defaults[0].id;
    const currentApproved = defaults[0].isApproved;

    // Toggle the isApproved field
    const res = await postGraphQL(
      ctx.request,
      {
        query: UPDATE_APP_MEMBERSHIP_DEFAULT,
        variables: {
          input: {
            id: defaultId,
            appMembershipDefaultPatch: { isApproved: !currentApproved },
          },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const updated = res.body.data?.updateAppMembershipDefault?.appMembershipDefault;
    expect(updated).toBeDefined();
    expect(updated.id).toBe(defaultId);
    expect(updated.isApproved).toBe(!currentApproved);

    // Restore original value
    await postGraphQL(
      ctx.request,
      {
        query: UPDATE_APP_MEMBERSHIP_DEFAULT,
        variables: {
          input: {
            id: defaultId,
            appMembershipDefaultPatch: { isApproved: currentApproved },
          },
        },
      },
      auth.token,
    );
  });
});
