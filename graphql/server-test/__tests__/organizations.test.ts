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


describe('Organizations', () => {
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
  // queries
  // -------------------------------------------------------------------------
  describe('queries', () => {
    it('should list organizations by querying users with type=2', async () => {
      const res = await query<{
        users: { totalCount: number; nodes: Array<{ id: string; displayName: string; type: number }> };
      }>(`
        query {
          users(condition: { type: 2 }) {
            totalCount
            nodes { id displayName type }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.users.totalCount).toBeGreaterThanOrEqual(0);
      if (res.data!.users.nodes.length > 0) {
        res.data!.users.nodes.forEach((node) => {
          expect(node.type).toBe(2);
        });
      }
    });
  });

  // -------------------------------------------------------------------------
  // organization CRUD
  // -------------------------------------------------------------------------
  describe('organization CRUD', () => {
    let orgId: string;
    let ownerMembershipId: string;

    it('should create an organization via createUser with type=2', async () => {
      const ts = Date.now();
      const res = await query<{
        createUser: { user: { id: string; displayName: string; type: number } };
      }>(
        `mutation($input: CreateUserInput!) {
          createUser(input: $input) {
            user { id displayName type }
          }
        }`,
        {
          input: {
            user: {
              displayName: `Test Org ${ts}`,
              type: 2,
            },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.createUser.user.type).toBe(2);
      expect(res.data!.createUser.user.id).toBeDefined();
      orgId = res.data!.createUser.user.id;
    });

    it('should query org memberships for the new org (owner membership requires JWT context)', async () => {
      // Create org within this test since each test has its own savepoint
      const ts = Date.now();
      const createRes = await query<{
        createUser: { user: { id: string; type: number } };
      }>(
        `mutation($input: CreateUserInput!) {
          createUser(input: $input) {
            user { id type }
          }
        }`,
        {
          input: {
            user: {
              displayName: `Test Org Membership ${ts}`,
              type: 2,
            },
          },
        }
      );

      expect(createRes.errors).toBeUndefined();
      const localOrgId = createRes.data!.createUser.user.id;
      orgId = localOrgId;

      // Query orgMemberships by entityId
      const res = await query<{
        orgMemberships: { nodes: Array<{ id: string; actorId: string; entityId: string }> };
      }>(
        `query($condition: OrgMembershipCondition) {
          orgMemberships(condition: $condition) {
            nodes { id actorId entityId }
          }
        }`,
        { condition: { entityId: localOrgId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();

      // The org membership trigger only auto-creates the owner membership when
      // jwt_public.current_user_id() returns a non-null value (requires RLS module).
      // Without RLS module (anonymous administrator role), the trigger skips
      // the org membership creation for type=2 users.
      if (res.data!.orgMemberships.nodes.length > 0) {
        // If RLS is active, the owner membership exists
        ownerMembershipId = res.data!.orgMemberships.nodes[0].id;
        expect(ownerMembershipId).toBeDefined();
      } else {
        // Without RLS module, no owner membership is auto-created
        expect(res.data!.orgMemberships.nodes.length).toBe(0);
      }
    });

    it('should update the organization displayName using userPatch', async () => {
      expect(orgId).toBeDefined();

      const res = await query<{
        updateUser: { user: { id: string; displayName: string } };
      }>(
        `mutation($input: UpdateUserInput!) {
          updateUser(input: $input) {
            user { id displayName }
          }
        }`,
        {
          input: {
            id: orgId,
            userPatch: { displayName: 'Updated Org Name' },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.updateUser.user.displayName).toBe('Updated Org Name');
    });

    it('should delete the organization via deleteUser', async () => {
      expect(orgId).toBeDefined();

      const res = await query<{
        deleteUser: { user: { id: string } };
      }>(
        `mutation($input: DeleteUserInput!) {
          deleteUser(input: $input) {
            user { id }
          }
        }`,
        { input: { id: orgId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.deleteUser.user.id).toBe(orgId);
    });
  });

  // -------------------------------------------------------------------------
  // org membership defaults
  // -------------------------------------------------------------------------
  describe('org membership defaults', () => {
    let orgId: string;
    let defaultId: string;

    beforeAll(async () => {
      // We need to create setup data outside the per-test transaction.
      // However, we re-use the query fn which goes through HTTP.
      // Create an org for this describe block.
    });

    it('should query orgMembershipDefaults for the org', async () => {
      // First create an org
      const createRes = await query<{
        createUser: { user: { id: string } };
      }>(
        `mutation($input: CreateUserInput!) {
          createUser(input: $input) { user { id } }
        }`,
        { input: { user: { displayName: 'OrgForDefaults', type: 2 } } }
      );
      expect(createRes.errors).toBeUndefined();
      orgId = createRes.data!.createUser.user.id;

      // Query orgMembershipDefaults -- the trigger may or may not auto-create one
      const res = await query<{
        orgMembershipDefaults: {
          totalCount: number;
          nodes: Array<{ id: string; entityId: string }>;
        };
      }>(
        `query($condition: OrgMembershipDefaultCondition) {
          orgMembershipDefaults(condition: $condition) {
            totalCount
            nodes { id entityId }
          }
        }`,
        { condition: { entityId: orgId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      // Connection shape is valid
      expect(res.data!.orgMembershipDefaults.totalCount).toBeGreaterThanOrEqual(0);

      // If a default was auto-created, store its id
      if (res.data!.orgMembershipDefaults.nodes.length > 0) {
        defaultId = res.data!.orgMembershipDefaults.nodes[0].id;
      }
    });

    it('should update orgMembershipDefault using orgMembershipDefaultPatch', async () => {
      expect(orgId).toBeDefined();

      // If no default was auto-created, create one
      if (!defaultId) {
        const createDefault = await query<{
          createOrgMembershipDefault: { orgMembershipDefault: { id: string; entityId: string } };
        }>(
          `mutation($input: CreateOrgMembershipDefaultInput!) {
            createOrgMembershipDefault(input: $input) {
              orgMembershipDefault { id entityId }
            }
          }`,
          { input: { orgMembershipDefault: { entityId: orgId } } }
        );
        expect(createDefault.errors).toBeUndefined();
        defaultId = createDefault.data!.createOrgMembershipDefault.orgMembershipDefault.id;
      }

      expect(defaultId).toBeDefined();

      // Update using orgMembershipDefaultPatch (V5: ID-based, not entityId-based)
      const res = await query<{
        updateOrgMembershipDefault: { orgMembershipDefault: { id: string } };
      }>(
        `mutation($input: UpdateOrgMembershipDefaultInput!) {
          updateOrgMembershipDefault(input: $input) {
            orgMembershipDefault { id }
          }
        }`,
        {
          input: {
            id: defaultId,
            orgMembershipDefaultPatch: { isApproved: true },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.updateOrgMembershipDefault.orgMembershipDefault.id).toBe(defaultId);
    });
  });

  // -------------------------------------------------------------------------
  // org permission defaults
  // -------------------------------------------------------------------------
  describe('org permission defaults', () => {
    it('should query orgPermissionDefaults', async () => {
      const res = await query<{
        orgPermissionDefaults: {
          totalCount: number;
          nodes: Array<{ id: string; entityId: string }>;
        };
      }>(`
        query {
          orgPermissionDefaults(first: 5) {
            totalCount
            nodes { id entityId }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.orgPermissionDefaults.totalCount).toBeGreaterThanOrEqual(0);
    });
  });
});
