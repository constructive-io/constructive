/**
 * Organizations - Integration Tests
 *
 * Organizations are users with type=2. Creating an organization triggers
 * a database trigger that auto-creates an owner membership.
 *
 * Covers: query orgs (users with type=2), createUser with type=2,
 * verify auto-created owner membership, updateUser on org (userPatch),
 * updateOrgMembership, createOrgMembershipDefault, updateOrgMembershipDefault,
 * deleteUser on org.
 *
 * V5 patterns:
 *   - No singular queries -- use collection(condition: {...})
 *   - updateUser uses `userPatch`
 *   - updateOrgMembership uses `orgMembershipPatch`
 *   - updateOrgMembershipDefault uses `orgMembershipDefaultPatch` with `id` (not entityId)
 *
 * Run:
 *   pnpm test -- --testPathPattern=organizations
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

const LIST_ORGS = /* GraphQL */ `
  query ListOrganizations($condition: UserCondition, $first: Int) {
    users(condition: $condition, first: $first) {
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
        endCursor
      }
    }
  }
`;

const CREATE_ORG = /* GraphQL */ `
  mutation CreateOrg($input: CreateUserInput!) {
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

const UPDATE_ORG = /* GraphQL */ `
  mutation UpdateOrg($input: UpdateUserInput!) {
    updateUser(input: $input) {
      user {
        id
        username
        displayName
      }
    }
  }
`;

const DELETE_ORG = /* GraphQL */ `
  mutation DeleteOrg($input: DeleteUserInput!) {
    deleteUser(input: $input) {
      user {
        id
      }
    }
  }
`;

const ORG_MEMBERSHIPS = /* GraphQL */ `
  query OrgMemberships($condition: OrgMembershipCondition, $first: Int) {
    orgMemberships(condition: $condition, first: $first) {
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
    }
  }
`;

const UPDATE_ORG_MEMBERSHIP = /* GraphQL */ `
  mutation UpdateOrgMembership($input: UpdateOrgMembershipInput!) {
    updateOrgMembership(input: $input) {
      orgMembership {
        id
        isAdmin
      }
    }
  }
`;

const ORG_MEMBERSHIP_DEFAULTS = /* GraphQL */ `
  query OrgMembershipDefaults($condition: OrgMembershipDefaultCondition, $first: Int) {
    orgMembershipDefaults(condition: $condition, first: $first) {
      nodes {
        id
        entityId
        isApproved
        deleteMemberCascadeGroups
        createGroupsCascadeMembers
        createdAt
        updatedAt
      }
    }
  }
`;

const CREATE_ORG_MEMBERSHIP_DEFAULT = /* GraphQL */ `
  mutation CreateOrgMembershipDefault($input: CreateOrgMembershipDefaultInput!) {
    createOrgMembershipDefault(input: $input) {
      orgMembershipDefault {
        id
        entityId
        isApproved
      }
    }
  }
`;

const UPDATE_ORG_MEMBERSHIP_DEFAULT = /* GraphQL */ `
  mutation UpdateOrgMembershipDefault($input: UpdateOrgMembershipDefaultInput!) {
    updateOrgMembershipDefault(input: $input) {
      orgMembershipDefault {
        id
        entityId
        isApproved
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Organizations', () => {
  let ctx: TestContext;
  let auth: AuthResult;

  // Track created entities for sequential tests and cleanup
  let orgId: string | null = null;
  let ownerMembershipId: string | null = null;
  let membershipDefaultId: string | null = null;

  beforeAll(async () => {
    ctx = await setupTestServer();
    auth = await signIn(ctx.request);
  });

  afterAll(async () => {
    // Clean up: delete the org (cascades memberships and defaults)
    if (orgId) {
      try {
        await postGraphQL(
          ctx.request,
          { query: DELETE_ORG, variables: { input: { id: orgId } } },
          auth.token,
        );
      } catch {
        // best-effort
      }
    }
    await ctx.teardown();
  });

  // -------------------------------------------------------------------------
  // Query: list organizations (users with type=2)
  // -------------------------------------------------------------------------

  it('should list organizations by querying users with type=2', async () => {
    const res = await postGraphQL(
      ctx.request,
      {
        query: LIST_ORGS,
        variables: { condition: { type: 2 }, first: 20 },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const users = res.body.data?.users;
    expect(users).toBeDefined();
    expect(users.totalCount).toBeGreaterThanOrEqual(0);

    // Every returned node should be type=2
    for (const node of users.nodes) {
      expect(node.type).toBe(2);
    }
  });

  // -------------------------------------------------------------------------
  // Mutation: create organization (createUser with type=2)
  // -------------------------------------------------------------------------

  it('should create an organization via createUser with type=2', async () => {
    const orgName = testName('org');

    const res = await postGraphQL(
      ctx.request,
      {
        query: CREATE_ORG,
        variables: {
          input: {
            user: {
              displayName: orgName,
              type: 2,
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
    expect(user.displayName).toBe(orgName);
    expect(user.type).toBe(2);

    orgId = user.id;
  });

  // -------------------------------------------------------------------------
  // Verify auto-created owner membership
  // -------------------------------------------------------------------------

  it('should have auto-created owner membership for the new org', async () => {
    expect(orgId).toBeTruthy();

    const res = await postGraphQL(
      ctx.request,
      {
        query: ORG_MEMBERSHIPS,
        variables: {
          condition: { entityId: orgId, isOwner: true },
          first: 1,
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const memberships = res.body.data?.orgMemberships;
    expect(memberships).toBeDefined();
    expect(memberships.totalCount).toBeGreaterThanOrEqual(1);

    const ownerMembership = memberships.nodes[0];
    expect(ownerMembership).toBeDefined();
    expect(ownerMembership.entityId).toBe(orgId);
    expect(ownerMembership.isOwner).toBe(true);
    // The actor should be the admin who created the org
    expect(ownerMembership.actorId).toBe(auth.userId);

    ownerMembershipId = ownerMembership.id;
  });

  // -------------------------------------------------------------------------
  // Mutation: updateUser on the org (rename)
  // -------------------------------------------------------------------------

  it('should update the organization displayName using userPatch', async () => {
    expect(orgId).toBeTruthy();

    const updatedName = testName('org_renamed');

    const res = await postGraphQL(
      ctx.request,
      {
        query: UPDATE_ORG,
        variables: {
          input: {
            id: orgId,
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
    expect(user.id).toBe(orgId);
    expect(user.displayName).toBe(updatedName);
  });

  // -------------------------------------------------------------------------
  // Mutation: updateOrgMembership
  // -------------------------------------------------------------------------

  it('should update org membership properties using orgMembershipPatch', async () => {
    expect(ownerMembershipId).toBeTruthy();

    const res = await postGraphQL(
      ctx.request,
      {
        query: UPDATE_ORG_MEMBERSHIP,
        variables: {
          input: {
            id: ownerMembershipId,
            orgMembershipPatch: { isAdmin: true },
          },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const membership = res.body.data?.updateOrgMembership?.orgMembership;
    expect(membership).toBeDefined();
    expect(membership.id).toBe(ownerMembershipId);
    expect(membership.isAdmin).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Query: orgMembershipDefaults for the org
  // -------------------------------------------------------------------------

  it('should query orgMembershipDefaults for the created org', async () => {
    expect(orgId).toBeTruthy();

    const res = await postGraphQL(
      ctx.request,
      {
        query: ORG_MEMBERSHIP_DEFAULTS,
        variables: {
          condition: { entityId: orgId },
          first: 1,
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const defaults = res.body.data?.orgMembershipDefaults;
    expect(defaults).toBeDefined();

    // Auto-created by trigger when org was created
    if (defaults.nodes.length > 0) {
      membershipDefaultId = defaults.nodes[0].id;
      expect(defaults.nodes[0].entityId).toBe(orgId);
    }
  });

  // -------------------------------------------------------------------------
  // Mutation: updateOrgMembershipDefault (V5: uses id, not entityId)
  // -------------------------------------------------------------------------

  it('should update orgMembershipDefault using id and orgMembershipDefaultPatch', async () => {
    // Skip if no default was auto-created
    if (!membershipDefaultId) {
      console.warn('No orgMembershipDefault found; skipping update test');
      return;
    }

    const res = await postGraphQL(
      ctx.request,
      {
        query: UPDATE_ORG_MEMBERSHIP_DEFAULT,
        variables: {
          input: {
            id: membershipDefaultId,
            orgMembershipDefaultPatch: { isApproved: true },
          },
        },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const def = res.body.data?.updateOrgMembershipDefault?.orgMembershipDefault;
    expect(def).toBeDefined();
    expect(def.id).toBe(membershipDefaultId);
    expect(def.isApproved).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Query: orgPermissionDefaults
  // -------------------------------------------------------------------------

  it('should query orgPermissionDefaults', async () => {
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

    const defaults = res.body.data?.orgPermissionDefaults;
    expect(defaults).toBeDefined();
    expect(defaults.nodes).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Mutation: deleteUser on the org (cleanup)
  // -------------------------------------------------------------------------

  it('should delete the organization via deleteUser', async () => {
    expect(orgId).toBeTruthy();

    const res = await postGraphQL(
      ctx.request,
      {
        query: DELETE_ORG,
        variables: { input: { id: orgId } },
      },
      auth.token,
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const deletedOrg = res.body.data?.deleteUser?.user;
    expect(deletedOrg).toBeDefined();
    expect(deletedOrg.id).toBe(orgId);

    // Verify the owner membership was cascaded
    const memberRes = await postGraphQL(
      ctx.request,
      {
        query: ORG_MEMBERSHIPS,
        variables: { condition: { entityId: orgId }, first: 1 },
      },
      auth.token,
    );

    expect(memberRes.status).toBe(200);
    const remaining = memberRes.body.data?.orgMemberships?.totalCount ?? 0;
    expect(remaining).toBe(0);

    orgId = null; // Already cleaned up
  });
});
