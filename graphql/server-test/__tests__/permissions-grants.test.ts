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


describe('Permissions & Grants', () => {
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
  // permission queries
  // -------------------------------------------------------------------------
  describe('permission queries', () => {
    it('should list appPermissions with connection shape', async () => {
      const res = await query<{
        appPermissions: {
          totalCount: number;
          nodes: Array<{ id: string; name: string; bitnum: number; bitstr: string }>;
        };
      }>(`
        query {
          appPermissions(first: 5) {
            totalCount
            nodes { id name bitnum bitstr }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.appPermissions.totalCount).toBeGreaterThanOrEqual(1);
      expect(res.data!.appPermissions.totalCount).toBeGreaterThanOrEqual(
        res.data!.appPermissions.nodes.length
      );
      if (res.data!.appPermissions.nodes.length > 0) {
        const node = res.data!.appPermissions.nodes[0];
        expect(node.id).toBeDefined();
        expect(node.name).toBeDefined();
        expect(typeof node.bitnum).toBe('number');
        expect(node.bitstr).toBeDefined();
        expect(node.bitstr).toHaveLength(24);
      }
    });

    it('should list orgPermissions with connection shape', async () => {
      const res = await query<{
        orgPermissions: {
          totalCount: number;
          nodes: Array<{ id: string; name: string; bitnum: number; bitstr: string }>;
        };
      }>(`
        query {
          orgPermissions(first: 5) {
            totalCount
            nodes { id name bitnum bitstr }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.orgPermissions.totalCount).toBeGreaterThanOrEqual(1);
      expect(res.data!.orgPermissions.totalCount).toBeGreaterThanOrEqual(
        res.data!.orgPermissions.nodes.length
      );
      if (res.data!.orgPermissions.nodes.length > 0) {
        const node = res.data!.orgPermissions.nodes[0];
        expect(node.bitstr).toHaveLength(24);
      }
    });
  });

  // -------------------------------------------------------------------------
  // app permission CRUD
  // -------------------------------------------------------------------------
  describe('app permission CRUD', () => {
    let createdAppPermId: string;

    it('should create an app permission with bitnum and bitstr', async () => {
      // CRITICAL: both bitnum AND bitstr (exactly 24-char) are required
      const res = await query<{
        createAppPermission: {
          appPermission: { id: string; name: string; bitnum: number; bitstr: string };
        };
      }>(
        `mutation($input: CreateAppPermissionInput!) {
          createAppPermission(input: $input) {
            appPermission { id name bitnum bitstr }
          }
        }`,
        {
          input: {
            appPermission: {
              name: 'test-app-perm',
              bitnum: 20,
              bitstr: '000000000000000000010000',
            },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const perm = res.data!.createAppPermission.appPermission;
      expect(perm.id).toBeDefined();
      expect(perm.name).toBe('test-app-perm');
      expect(perm.bitnum).toBe(20);
      // The DB trigger may recalculate bitstr from bitnum, but it should be 24 chars
      expect(perm.bitstr).toHaveLength(24);
      createdAppPermId = perm.id;
    });

    it('should update app permission name using appPermissionPatch', async () => {
      expect(createdAppPermId).toBeDefined();

      const res = await query<{
        updateAppPermission: {
          appPermission: { id: string; name: string };
        };
      }>(
        `mutation($input: UpdateAppPermissionInput!) {
          updateAppPermission(input: $input) {
            appPermission { id name }
          }
        }`,
        {
          input: {
            id: createdAppPermId,
            appPermissionPatch: { name: 'updated-app-perm' },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.updateAppPermission.appPermission.name).toBe('updated-app-perm');
    });

    it('should verify app permission in database via SQL', async () => {
      expect(createdAppPermId).toBeDefined();

      const dbResult = await pg.query(
        'SELECT name, bitnum, bitstr FROM constructive_permissions_public.app_permissions WHERE id = $1',
        [createdAppPermId]
      );

      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].name).toBe('updated-app-perm');
      expect(dbResult.rows[0].bitnum).toBe(20);
      expect(dbResult.rows[0].bitstr).toHaveLength(24);
    });

    it('should delete the created app permission', async () => {
      expect(createdAppPermId).toBeDefined();

      const res = await query<{
        deleteAppPermission: { appPermission: { id: string } };
      }>(
        `mutation($input: DeleteAppPermissionInput!) {
          deleteAppPermission(input: $input) {
            appPermission { id }
          }
        }`,
        { input: { id: createdAppPermId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.deleteAppPermission.appPermission.id).toBe(createdAppPermId);
    });
  });

  // -------------------------------------------------------------------------
  // org permission CRUD
  // -------------------------------------------------------------------------
  describe('org permission CRUD', () => {
    let createdOrgPermId: string;

    it('should create an org permission with bitnum and bitstr', async () => {
      const res = await query<{
        createOrgPermission: {
          orgPermission: { id: string; name: string; bitnum: number; bitstr: string };
        };
      }>(
        `mutation($input: CreateOrgPermissionInput!) {
          createOrgPermission(input: $input) {
            orgPermission { id name bitnum bitstr }
          }
        }`,
        {
          input: {
            orgPermission: {
              name: 'test-org-perm',
              bitnum: 15,
              bitstr: '000000001000000000000000',
            },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const perm = res.data!.createOrgPermission.orgPermission;
      expect(perm.id).toBeDefined();
      expect(perm.name).toBe('test-org-perm');
      expect(perm.bitnum).toBe(15);
      expect(perm.bitstr).toHaveLength(24);
      createdOrgPermId = perm.id;
    });

    it('should update org permission name using orgPermissionPatch', async () => {
      expect(createdOrgPermId).toBeDefined();

      const res = await query<{
        updateOrgPermission: {
          orgPermission: { id: string; name: string };
        };
      }>(
        `mutation($input: UpdateOrgPermissionInput!) {
          updateOrgPermission(input: $input) {
            orgPermission { id name }
          }
        }`,
        {
          input: {
            id: createdOrgPermId,
            orgPermissionPatch: { name: 'updated-org-perm' },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.updateOrgPermission.orgPermission.name).toBe('updated-org-perm');
    });

    it('should delete the created org permission', async () => {
      expect(createdOrgPermId).toBeDefined();

      const res = await query<{
        deleteOrgPermission: { orgPermission: { id: string } };
      }>(
        `mutation($input: DeleteOrgPermissionInput!) {
          deleteOrgPermission(input: $input) {
            orgPermission { id }
          }
        }`,
        { input: { id: createdOrgPermId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.deleteOrgPermission.orgPermission.id).toBe(createdOrgPermId);
    });
  });

  // -------------------------------------------------------------------------
  // org permission defaults
  // -------------------------------------------------------------------------
  describe('org permission defaults', () => {
    let orgId: string;
    let createdDefaultId: string;

    it('should list orgPermissionDefaults', async () => {
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

    it('should create an orgPermissionDefault', async () => {
      // First create an org
      const orgRes = await query<{
        createUser: { user: { id: string } };
      }>(
        `mutation($input: CreateUserInput!) {
          createUser(input: $input) { user { id } }
        }`,
        { input: { user: { displayName: 'OrgForPermDefaults', type: 2 } } }
      );
      expect(orgRes.errors).toBeUndefined();
      orgId = orgRes.data!.createUser.user.id;

      const res = await query<{
        createOrgPermissionDefault: {
          orgPermissionDefault: { id: string; entityId: string };
        };
      }>(
        `mutation($input: CreateOrgPermissionDefaultInput!) {
          createOrgPermissionDefault(input: $input) {
            orgPermissionDefault { id entityId }
          }
        }`,
        {
          input: {
            orgPermissionDefault: { entityId: orgId },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const created = res.data!.createOrgPermissionDefault.orgPermissionDefault;
      expect(created.entityId).toBe(orgId);
      createdDefaultId = created.id;
    });

    it('should update orgPermissionDefault with 24-char bitstr', async () => {
      expect(createdDefaultId).toBeDefined();

      const res = await query<{
        updateOrgPermissionDefault: {
          orgPermissionDefault: { id: string };
        };
      }>(
        `mutation($input: UpdateOrgPermissionDefaultInput!) {
          updateOrgPermissionDefault(input: $input) {
            orgPermissionDefault { id }
          }
        }`,
        {
          input: {
            id: createdDefaultId,
            orgPermissionDefaultPatch: {
              permissions: '000000000000000000000001',
            },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.updateOrgPermissionDefault.orgPermissionDefault.id).toBe(createdDefaultId);
    });
  });
});
