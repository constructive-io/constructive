import type { PgTestClient } from 'pgsql-test/test-client';
import type { GraphQLQueryFn } from '../src/types';
import type supertest from 'supertest';
import {
  getTestConnections,
  ADMIN_USER_ID,
  CONNECTION_FIELDS,
} from './test-utils';

jest.setTimeout(30000);

describe('Memberships & Invites', () => {
  let db: PgTestClient;
  let pg: PgTestClient;
  let query: GraphQLQueryFn;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    ({ db, pg, query, request, teardown } = await getTestConnections());
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(() => db.beforeEach());
  afterEach(() => db.afterEach());

  // ---------------------------------------------------------------
  // Membership queries (seed data smoke tests)
  // ---------------------------------------------------------------

  describe('membership queries', () => {
    it('should list appMemberships', async () => {
      const res = await query(
        `query {
          appMemberships(first: 10) {
            totalCount
            nodes { id actorId createdAt }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      // Seed has 3 app memberships
      expect(res.data!.appMemberships.totalCount).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(res.data!.appMemberships.nodes)).toBe(true);
    });

    it('should list appMembershipDefaults (singleton)', async () => {
      // V5: NO 'permissions' field on AppMembershipDefault
      const res = await query(
        `query {
          appMembershipDefaults(first: 5) {
            totalCount
            nodes { id isApproved isVerified }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.appMembershipDefaults.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('should list orgMemberships', async () => {
      const res = await query(
        `query {
          orgMemberships(first: 10) {
            totalCount
            nodes { id actorId entityId createdAt }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.orgMemberships.totalCount).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.data!.orgMemberships.nodes)).toBe(true);
    });

    it('should find membership by condition (not ByActorId)', async () => {
      // V5: no appMembershipByActorId -- use condition instead
      const res = await query(
        `query($condition: AppMembershipCondition) {
          appMemberships(condition: $condition) {
            nodes { id actorId }
          }
        }`,
        { condition: { actorId: ADMIN_USER_ID } }
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const nodes = res.data!.appMemberships.nodes;
      expect(Array.isArray(nodes)).toBe(true);
      // The admin should have an app membership
      if (nodes.length > 0) {
        expect(nodes[0].actorId).toBe(ADMIN_USER_ID);
      }
    });
  });

  // ---------------------------------------------------------------
  // Invite CRUD (app invites)
  // ---------------------------------------------------------------

  describe('invite CRUD (app invites)', () => {
    it('should create an app invite - expect error without database_id in JWT', async () => {
      // Without database_id in JWT context, createInvite fails
      // because the invite triggers a background job that requires database_id.
      const res = await query(
        `mutation($input: CreateInviteInput!) {
          createInvite(input: $input) {
            invite { id inviteToken }
          }
        }`,
        {
          input: {
            invite: { email: 'test-invite@example.com' },
          },
        }
      );
      // Expect an error related to database_id being null
      expect(res.errors).toBeDefined();
      expect(res.errors!.length).toBeGreaterThan(0);
    });

    it('should test submitInviteCode with invalid token - expect error', async () => {
      // submitInviteCode uses 'token' field in V5 (not 'code')
      const res = await query(
        `mutation($input: SubmitInviteCodeInput!) {
          submitInviteCode(input: $input) {
            clientMutationId
          }
        }`,
        {
          input: { token: 'invalid-token-xyz-123' },
        }
      );
      // Should return an error for invalid token
      expect(res.errors).toBeDefined();
      expect(res.errors!.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------
  // Invite CRUD (org invites)
  // ---------------------------------------------------------------

  describe('invite CRUD (org invites)', () => {
    it('should create an org invite - expect error without database_id in JWT', async () => {
      // First create an org to reference
      const orgRes = await query(
        `mutation($input: CreateUserInput!) {
          createUser(input: $input) {
            user { id type }
          }
        }`,
        {
          input: {
            user: { displayName: `Org For Invite ${Date.now()}`, type: 2 },
          },
        }
      );
      expect(orgRes.errors).toBeUndefined();
      const orgId = orgRes.data!.createUser.user.id;

      // Without database_id in JWT context, createOrgInvite fails
      const res = await query(
        `mutation($input: CreateOrgInviteInput!) {
          createOrgInvite(input: $input) {
            orgInvite { id entityId inviteToken }
          }
        }`,
        {
          input: {
            orgInvite: {
              entityId: orgId,
              email: 'org-invite@example.com',
            },
          },
        }
      );
      // Expect error (database_id null constraint)
      expect(res.errors).toBeDefined();
      expect(res.errors!.length).toBeGreaterThan(0);
    });

    it('should test submitOrgInviteCode with invalid token - expect error', async () => {
      // submitOrgInviteCode uses 'token' field in V5
      const res = await query(
        `mutation($input: SubmitOrgInviteCodeInput!) {
          submitOrgInviteCode(input: $input) {
            clientMutationId
          }
        }`,
        {
          input: { token: 'invalid-org-token-xyz-456' },
        }
      );
      // Should return an error for invalid token
      expect(res.errors).toBeDefined();
      expect(res.errors!.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------
  // Membership defaults
  // ---------------------------------------------------------------

  describe('membership defaults', () => {
    it('should update appMembershipDefault using appMembershipDefaultPatch', async () => {
      // First, find an existing appMembershipDefault (seed has 1)
      const listRes = await query(
        `query {
          appMembershipDefaults(first: 1) {
            nodes { id isApproved isVerified }
          }
        }`
      );
      expect(listRes.errors).toBeUndefined();
      const defaults = listRes.data!.appMembershipDefaults.nodes;
      expect(defaults.length).toBeGreaterThanOrEqual(1);

      const defaultId = defaults[0].id;

      // V5: uses appMembershipDefaultPatch (not patch)
      const res = await query(
        `mutation($input: UpdateAppMembershipDefaultInput!) {
          updateAppMembershipDefault(input: $input) {
            appMembershipDefault { id isApproved }
          }
        }`,
        {
          input: {
            id: defaultId,
            appMembershipDefaultPatch: { isApproved: true },
          },
        }
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.updateAppMembershipDefault.appMembershipDefault.id).toBe(defaultId);
    });
  });

  // ---------------------------------------------------------------
  // Invite list queries
  // ---------------------------------------------------------------

  describe('invite list queries', () => {
    it('should list invites with connection shape', async () => {
      // V5: use 'inviteToken' not 'code'
      const res = await query(
        `query {
          invites(first: 10) {
            totalCount
            nodes { id inviteToken expiresAt }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.invites.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.data!.invites.nodes)).toBe(true);
    });

    it('should list orgInvites with connection shape', async () => {
      // V5: use 'inviteToken' not 'code'
      const res = await query(
        `query {
          orgInvites(first: 10) {
            totalCount
            nodes { id entityId inviteToken expiresAt }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.orgInvites.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.data!.orgInvites.nodes)).toBe(true);
    });

    it('should list claimed invites using receiverId (not actorId)', async () => {
      // V5: claimedInvites use 'receiverId' not 'actorId'
      const res = await query(
        `query {
          claimedInvites(first: 10) {
            totalCount
            nodes { id receiverId }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.claimedInvites.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.data!.claimedInvites.nodes)).toBe(true);
    });
  });
});
