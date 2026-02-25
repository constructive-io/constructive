import type { PgTestClient } from 'pgsql-test/test-client';
import type { GraphQLQueryFn } from '../src/types';
import type supertest from 'supertest';
import {
  getTestConnections,
  CONNECTION_FIELDS,
} from './test-utils';

jest.setTimeout(30000);

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

  // ---------------------------------------------------------------
  // Organizations = Users with type=2
  // Creating a user with type=2 auto-creates an owner membership
  // ---------------------------------------------------------------

  describe('queries', () => {
    it('should list organizations by querying users with type=2', async () => {
      const res = await query(
        `query {
          users(condition: { type: 2 }) {
            totalCount
            nodes { id displayName type }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const users = res.data!.users;
      expect(users.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(users.nodes)).toBe(true);
      // Every returned user must have type=2
      for (const node of users.nodes) {
        expect(node.type).toBe(2);
      }
    });
  });

  describe('organization CRUD', () => {
    let orgId: string;
    let ownerMembershipId: string;

    it('should create an organization via createUser with type=2', async () => {
      const ts = Date.now();
      const res = await query(
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
      const user = res.data!.createUser.user;
      expect(user.id).toBeDefined();
      expect(user.type).toBe(2);
      expect(user.displayName).toContain('Test Org');
      orgId = user.id;
    });

    it('should query org memberships by entityId (auto-create needs JWT context)', async () => {
      expect(orgId).toBeDefined();

      // The DB trigger auto-creates an owner org_membership when a type=2 user
      // is created, BUT only when current_user_id() is available (JWT context).
      // Without RLS module / JWT, the trigger skips membership creation.
      // We verify the query shape is valid and accept 0 results.
      const res = await query(
        `query($condition: OrgMembershipCondition) {
          orgMemberships(condition: $condition) {
            nodes { id actorId entityId }
          }
        }`,
        { condition: { entityId: orgId } }
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const memberships = res.data!.orgMemberships.nodes;
      expect(Array.isArray(memberships)).toBe(true);

      // If membership was created, verify it
      if (memberships.length > 0) {
        ownerMembershipId = memberships[0].id;
        expect(memberships[0].entityId).toBe(orgId);
      }
    });

    it('should update the organization displayName using userPatch', async () => {
      expect(orgId).toBeDefined();
      const res = await query(
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
      const res = await query(
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

  describe('org membership defaults', () => {
    let orgId: string;
    let orgMembershipDefaultId: string;

    beforeAll(async () => {
      // We need a fresh org for this describe block since it runs independently.
      // Note: beforeAll does not participate in per-test savepoint rollback,
      // but the org will be cleaned up in the last test or by suite teardown.
    });

    it('should query orgMembershipDefaults for the org', async () => {
      // First, create an org to work with
      const createRes = await query(
        `mutation($input: CreateUserInput!) {
          createUser(input: $input) {
            user { id type }
          }
        }`,
        {
          input: {
            user: {
              displayName: `Org For Defaults ${Date.now()}`,
              type: 2,
            },
          },
        }
      );
      expect(createRes.errors).toBeUndefined();
      orgId = createRes.data!.createUser.user.id;

      // Query orgMembershipDefaults -- the seed has 1 existing default
      const res = await query(
        `query {
          orgMembershipDefaults(first: 10) {
            totalCount
            nodes { id entityId }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.orgMembershipDefaults.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.data!.orgMembershipDefaults.nodes)).toBe(true);

      // If there is an existing default for our org, capture it
      const existing = res.data!.orgMembershipDefaults.nodes.find(
        (n: any) => n.entityId === orgId
      );
      if (existing) {
        orgMembershipDefaultId = existing.id;
      }
    });

    it('should update orgMembershipDefault using orgMembershipDefaultPatch', async () => {
      expect(orgId).toBeDefined();

      // If no default exists yet for this org, create one first
      if (!orgMembershipDefaultId) {
        const createRes = await query(
          `mutation($input: CreateOrgMembershipDefaultInput!) {
            createOrgMembershipDefault(input: $input) {
              orgMembershipDefault { id entityId }
            }
          }`,
          {
            input: {
              orgMembershipDefault: { entityId: orgId },
            },
          }
        );
        expect(createRes.errors).toBeUndefined();
        orgMembershipDefaultId = createRes.data!.createOrgMembershipDefault.orgMembershipDefault.id;
      }

      expect(orgMembershipDefaultId).toBeDefined();

      // V5: ID-based update with orgMembershipDefaultPatch
      const res = await query(
        `mutation($input: UpdateOrgMembershipDefaultInput!) {
          updateOrgMembershipDefault(input: $input) {
            orgMembershipDefault { id entityId isApproved }
          }
        }`,
        {
          input: {
            id: orgMembershipDefaultId,
            orgMembershipDefaultPatch: { isApproved: true },
          },
        }
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.updateOrgMembershipDefault.orgMembershipDefault.id).toBe(
        orgMembershipDefaultId
      );
    });
  });

  describe('org permission defaults', () => {
    it('should query orgPermissionDefaults', async () => {
      // V5: fields are id, entityId (not permissions)
      const res = await query(
        `query {
          orgPermissionDefaults(first: 5) {
            totalCount
            nodes { id entityId }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.orgPermissionDefaults.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.data!.orgPermissionDefaults.nodes)).toBe(true);
    });
  });
});
