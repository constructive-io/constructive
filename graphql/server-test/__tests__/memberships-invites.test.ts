import type { PgTestClient } from 'pgsql-test/test-client';
import type { GraphQLQueryFn } from '../src/types';
import type supertest from 'supertest';
import {
  EXPOSED_SCHEMAS,
  AUTH_ROLE,
  ADMIN_USER_ID,
  DATABASE_NAME,
  getTestConnections,
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

  // -------------------------------------------------------------------------
  // membership queries
  // -------------------------------------------------------------------------
  describe('membership queries', () => {
    it('should list appMemberships', async () => {
      const res = await query<{
        appMemberships: {
          totalCount: number;
          nodes: Array<{ id: string; actorId: string; createdAt: string }>;
        };
      }>(`
        query {
          appMemberships(first: 5) {
            totalCount
            nodes { id actorId createdAt }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      // Seed data provides 3 app memberships
      expect(res.data!.appMemberships.totalCount).toBeGreaterThanOrEqual(3);
    });

    it('should list appMembershipDefaults (singleton)', async () => {
      // V5: NO 'permissions' field on AppMembershipDefault
      const res = await query<{
        appMembershipDefaults: {
          totalCount: number;
          nodes: Array<{ id: string; isApproved: boolean; isVerified: boolean }>;
        };
      }>(`
        query {
          appMembershipDefaults(first: 5) {
            totalCount
            nodes { id isApproved isVerified }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.appMembershipDefaults.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('should list orgMemberships', async () => {
      const res = await query<{
        orgMemberships: {
          totalCount: number;
          nodes: Array<{ id: string; actorId: string; entityId: string; createdAt: string }>;
        };
      }>(`
        query {
          orgMemberships(first: 5) {
            totalCount
            nodes { id actorId entityId createdAt }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      // Seed data provides at least 1 org membership
      expect(res.data!.orgMemberships.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('should find membership by condition (not ByActorId)', async () => {
      // V5: no appMembershipByActorId -- use condition instead
      const res = await query<{
        appMemberships: {
          nodes: Array<{ id: string; actorId: string }>;
        };
      }>(
        `query($condition: AppMembershipCondition) {
          appMemberships(condition: $condition) {
            nodes { id actorId }
          }
        }`,
        { condition: { actorId: ADMIN_USER_ID } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      // Admin user should have an app membership
      expect(res.data!.appMemberships.nodes.length).toBeGreaterThanOrEqual(1);
      res.data!.appMemberships.nodes.forEach((node) => {
        expect(node.actorId).toBe(ADMIN_USER_ID);
      });
    });
  });

  // -------------------------------------------------------------------------
  // invite CRUD (app invites)
  // -------------------------------------------------------------------------
  describe('invite CRUD (app invites)', () => {
    it('should create an app invite - expect error without database_id in JWT', async () => {
      // Invites require database_id in JWT context to work.
      // Without it, the mutation fails with a NOT NULL constraint error
      // on the jobs table (invites trigger a background job).
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

      // Expected: error related to database_id being null
      expect(res.errors).toBeDefined();
      expect(res.errors!.length).toBeGreaterThan(0);
    });

    it('should test submitInviteCode with invalid token - expect error', async () => {
      const res = await query(
        `mutation($input: SubmitInviteCodeInput!) {
          submitInviteCode(input: $input) {
            clientMutationId
          }
        }`,
        { input: { token: 'invalid-token-xyz-123' } }
      );

      // Invalid token should return an error
      expect(res.errors).toBeDefined();
      expect(res.errors!.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // invite CRUD (org invites)
  // -------------------------------------------------------------------------
  describe('invite CRUD (org invites)', () => {
    it('should create an org invite - expect error without database_id in JWT', async () => {
      // First create an org for the invite
      const orgRes = await query<{
        createUser: { user: { id: string } };
      }>(
        `mutation($input: CreateUserInput!) {
          createUser(input: $input) { user { id } }
        }`,
        { input: { user: { displayName: 'OrgForInvite', type: 2 } } }
      );
      expect(orgRes.errors).toBeUndefined();
      const orgId = orgRes.data!.createUser.user.id;

      // createOrgInvite fails without database_id in JWT
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
              email: 'org-invite-test@example.com',
            },
          },
        }
      );

      // Expected: error related to database_id being null
      expect(res.errors).toBeDefined();
      expect(res.errors!.length).toBeGreaterThan(0);
    });

    it('should test submitOrgInviteCode with invalid token - expect error', async () => {
      const res = await query(
        `mutation($input: SubmitOrgInviteCodeInput!) {
          submitOrgInviteCode(input: $input) {
            clientMutationId
          }
        }`,
        { input: { token: 'invalid-org-token-xyz-456' } }
      );

      // Invalid token should return an error
      expect(res.errors).toBeDefined();
      expect(res.errors!.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // membership defaults
  // -------------------------------------------------------------------------
  describe('membership defaults', () => {
    it('should update appMembershipDefault using appMembershipDefaultPatch', async () => {
      // First get the existing default
      const listRes = await query<{
        appMembershipDefaults: {
          nodes: Array<{ id: string; isApproved: boolean; isVerified: boolean }>;
        };
      }>(`
        query {
          appMembershipDefaults(first: 1) {
            nodes { id isApproved isVerified }
          }
        }
      `);

      expect(listRes.errors).toBeUndefined();
      expect(listRes.data).toBeDefined();
      expect(listRes.data!.appMembershipDefaults.nodes.length).toBeGreaterThanOrEqual(1);

      const defaultId = listRes.data!.appMembershipDefaults.nodes[0].id;

      // Update using appMembershipDefaultPatch
      const res = await query<{
        updateAppMembershipDefault: { appMembershipDefault: { id: string; isApproved: boolean } };
      }>(
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

  // -------------------------------------------------------------------------
  // invite list queries
  // -------------------------------------------------------------------------
  describe('invite list queries', () => {
    it('should list invites with connection shape', async () => {
      // V5: use inviteToken not code
      const res = await query<{
        invites: {
          totalCount: number;
          nodes: Array<{ id: string; inviteToken: string; expiresAt: string }>;
        };
      }>(`
        query {
          invites(first: 5) {
            totalCount
            nodes { id inviteToken expiresAt }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.invites.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should list orgInvites with connection shape', async () => {
      const res = await query<{
        orgInvites: {
          totalCount: number;
          nodes: Array<{ id: string; entityId: string; expiresAt: string }>;
        };
      }>(`
        query {
          orgInvites(first: 5) {
            totalCount
            nodes { id entityId expiresAt }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.orgInvites.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should list claimed invites using receiverId (not actorId)', async () => {
      // V5: claimedInvites use receiverId, not actorId
      const res = await query<{
        claimedInvites: {
          totalCount: number;
          nodes: Array<{ id: string; receiverId: string }>;
        };
      }>(`
        query {
          claimedInvites(first: 5) {
            totalCount
            nodes { id receiverId }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.claimedInvites.totalCount).toBeGreaterThanOrEqual(0);

      // Also verify orgClaimedInvites
      const orgRes = await query<{
        orgClaimedInvites: {
          totalCount: number;
          nodes: Array<{ id: string; receiverId: string }>;
        };
      }>(`
        query {
          orgClaimedInvites(first: 5) {
            totalCount
            nodes { id receiverId }
          }
        }
      `);

      expect(orgRes.errors).toBeUndefined();
      expect(orgRes.data).toBeDefined();
      expect(orgRes.data!.orgClaimedInvites.totalCount).toBeGreaterThanOrEqual(0);
    });
  });
});
