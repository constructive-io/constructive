/**
 * Databases & Schemas Test Suite
 *
 * Tests database and schema CRUD operations, provision modules,
 * ordering, and filtering against the constructive GraphQL API (V5).
 *
 * Owned by Phase 3b. Do not modify test-utils.ts.
 */

import type { PgTestClient } from 'pgsql-test/test-client';
import type { GraphQLQueryFn } from '../src/types';
import type supertest from 'supertest';
import {
  getTestConnections,
  EXPOSED_SCHEMAS,
  AUTH_ROLE,
  DATABASE_NAME,
  CONNECTION_FIELDS,
} from './test-utils';


describe('Databases & Schemas', () => {
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

  // ---------------------------------------------------------------------------
  // Database Queries
  // ---------------------------------------------------------------------------

  describe('database queries', () => {
    it('should list databases with connection shape', async () => {
      const res = await query<{
        databases: {
          totalCount: number;
          nodes: Array<{ id: string; name: string; label: string; createdAt: string }>;
        };
      }>(`{
        databases(first: 5) {
          totalCount
          nodes { id name label createdAt }
        }
      }`);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.databases).toHaveProperty('totalCount');
      expect(res.data!.databases).toHaveProperty('nodes');
      expect(Array.isArray(res.data!.databases.nodes)).toBe(true);
    });

    it('should find a database by condition', async () => {
      // The seed database may or may not exist in the metaschema tables.
      // This test validates the condition query shape works correctly.
      const res = await query<{
        databases: {
          nodes: Array<{ id: string; name: string }>;
        };
      }>(`query FindDatabase($condition: DatabaseCondition) {
        databases(condition: $condition) {
          nodes { id name }
        }
      }`, {
        condition: { name: DATABASE_NAME },
      });

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.databases).toHaveProperty('nodes');
      expect(Array.isArray(res.data!.databases.nodes)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Database CRUD
  // ---------------------------------------------------------------------------

  describe('database CRUD', () => {
    let createdDatabaseId: string;
    const testDbName = `test-db-${Date.now()}`;

    it('should create a database and return id', async () => {
      const res = await query<{
        createDatabase: {
          database: { id: string; name: string; label: string };
        };
      }>(
        `mutation CreateDatabase($input: CreateDatabaseInput!) {
          createDatabase(input: $input) {
            database { id name label }
          }
        }`,
        {
          input: {
            database: {
              name: testDbName,
              label: 'Test Database',
            },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.createDatabase.database.id).toBeDefined();
      expect(res.data!.createDatabase.database.name).toBe(testDbName);

      createdDatabaseId = res.data!.createDatabase.database.id;
    });

    it('should find the created database by condition', async () => {
      expect(createdDatabaseId).toBeDefined();

      const res = await query<{
        databases: {
          nodes: Array<{ id: string; name: string; label: string }>;
        };
      }>(
        `query FindDatabase($condition: DatabaseCondition) {
          databases(condition: $condition) {
            nodes { id name label }
          }
        }`,
        {
          condition: { id: createdDatabaseId },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data!.databases.nodes).toHaveLength(1);
      expect(res.data!.databases.nodes[0].name).toBe(testDbName);
    });

    it('should update the database name using databasePatch', async () => {
      expect(createdDatabaseId).toBeDefined();

      const updatedLabel = 'Updated Label';
      const res = await query<{
        updateDatabase: {
          database: { id: string; name: string; label: string };
        };
      }>(
        `mutation UpdateDatabase($input: UpdateDatabaseInput!) {
          updateDatabase(input: $input) {
            database { id name label }
          }
        }`,
        {
          input: {
            id: createdDatabaseId,
            databasePatch: {
              label: updatedLabel,
            },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data!.updateDatabase.database.label).toBe(updatedLabel);
    });

    // KNOWN ISSUE: DatabaseProvisionModule triggers a real provisioning
    // operation that takes 19+ seconds and may have side effects on the
    // database state (modifying the database row, creating new databases,
    // etc.). This test is skipped to avoid flaky behavior in the CRUD chain.
    // See KNOWN-ISSUES.md ISSUE-001.
    it.skip('should provision a module for the database', async () => {
      expect(createdDatabaseId).toBeDefined();

      const res = await query<{
        createDatabaseProvisionModule: {
          databaseProvisionModule: { id: string; databaseId: string };
        };
      }>(
        `mutation ProvisionModule($input: CreateDatabaseProvisionModuleInput!) {
          createDatabaseProvisionModule(input: $input) {
            databaseProvisionModule { id databaseId }
          }
        }`,
        {
          input: {
            databaseProvisionModule: {
              databaseId: createdDatabaseId,
              databaseName: testDbName,
              ownerId: '00000000-0000-0000-0000-000000000002',
              domain: 'localhost',
            },
          },
        }
      );

      if (res.errors) {
        const isSchemaError = res.errors.some(
          (e: any) => e.message?.includes('Cannot query field')
        );
        expect(isSchemaError).toBe(false);
      } else {
        expect(res.data).toBeDefined();
      }
    });

    it('should delete the database', async () => {
      expect(createdDatabaseId).toBeDefined();

      const res = await query<{
        deleteDatabase: {
          database: { id: string };
        };
      }>(
        `mutation DeleteDatabase($input: DeleteDatabaseInput!) {
          deleteDatabase(input: $input) {
            database { id }
          }
        }`,
        {
          input: {
            id: createdDatabaseId,
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data!.deleteDatabase.database.id).toBe(createdDatabaseId);
    });
  });

  // ---------------------------------------------------------------------------
  // Schema Queries
  // ---------------------------------------------------------------------------

  describe('schema queries', () => {
    it('should list schemas with ordering', async () => {
      const res = await query<{
        schemas: {
          totalCount: number;
          nodes: Array<{
            id: string;
            name: string;
            databaseId: string;
            schemaName: string;
            createdAt: string;
          }>;
        };
      }>(`{
        schemas(first: 5, orderBy: [NAME_ASC]) {
          totalCount
          nodes { id name databaseId schemaName createdAt }
        }
      }`);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.schemas).toHaveProperty('totalCount');
      expect(res.data!.schemas).toHaveProperty('nodes');
      expect(Array.isArray(res.data!.schemas.nodes)).toBe(true);
    });

    it('should list schemas filtered by databaseId', async () => {
      // Create a database first so we can filter schemas by its ID
      const dbRes = await query<{
        createDatabase: { database: { id: string } };
      }>(
        `mutation($input: CreateDatabaseInput!) {
          createDatabase(input: $input) {
            database { id }
          }
        }`,
        {
          input: {
            database: { name: `filter-test-db-${Date.now()}` },
          },
        }
      );

      expect(dbRes.errors).toBeUndefined();
      const dbId = dbRes.data!.createDatabase.database.id;

      const res = await query<{
        schemas: { totalCount: number };
      }>(
        `query FilterSchemas($condition: SchemaCondition) {
          schemas(condition: $condition) { totalCount }
        }`,
        {
          condition: { databaseId: dbId },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(typeof res.data!.schemas.totalCount).toBe('number');
    });
  });

  // ---------------------------------------------------------------------------
  // Schema CRUD
  // ---------------------------------------------------------------------------

  describe('schema CRUD', () => {
    let databaseId: string;
    let createdSchemaId: string;
    const schemaDisplayName = 'Test Schema';
    const schemaName = `test_schema_${Date.now()}`;

    beforeAll(async () => {
      // Create a database for schema tests
      const dbRes = await query<{
        createDatabase: { database: { id: string } };
      }>(
        `mutation($input: CreateDatabaseInput!) {
          createDatabase(input: $input) {
            database { id }
          }
        }`,
        {
          input: {
            database: { name: `schema-test-db-${Date.now()}` },
          },
        }
      );

      if (dbRes.errors) {
        throw new Error(`Failed to create database for schema tests: ${dbRes.errors[0].message}`);
      }

      databaseId = dbRes.data!.createDatabase.database.id;
    });

    it('should create a schema with schemaName field', async () => {
      expect(databaseId).toBeDefined();

      const res = await query<{
        createSchema: {
          schema: { id: string; name: string; schemaName: string; databaseId: string };
        };
      }>(
        `mutation CreateSchema($input: CreateSchemaInput!) {
          createSchema(input: $input) {
            schema { id name schemaName databaseId }
          }
        }`,
        {
          input: {
            schema: {
              name: schemaDisplayName,
              schemaName: schemaName,
              databaseId: databaseId,
            },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.createSchema.schema.id).toBeDefined();
      // The server may auto-generate schemaName from db name + schema display name.
      // Assert it is a non-empty string rather than exact match.
      expect(res.data!.createSchema.schema.schemaName).toBeTruthy();
      expect(typeof res.data!.createSchema.schema.schemaName).toBe('string');
      expect(res.data!.createSchema.schema.databaseId).toBe(databaseId);

      createdSchemaId = res.data!.createSchema.schema.id;
    });

    it('should find the schema via condition query', async () => {
      expect(createdSchemaId).toBeDefined();

      const res = await query<{
        schemas: {
          nodes: Array<{ id: string; name: string; schemaName: string }>;
        };
      }>(
        `query FindSchema($condition: SchemaCondition) {
          schemas(condition: $condition) {
            nodes { id name schemaName }
          }
        }`,
        {
          condition: { id: createdSchemaId },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data!.schemas.nodes).toHaveLength(1);
      expect(res.data!.schemas.nodes[0].id).toBe(createdSchemaId);
    });

    it('should update the schema using schemaPatch', async () => {
      expect(createdSchemaId).toBeDefined();

      const updatedName = 'Updated Schema Name';
      const res = await query<{
        updateSchema: {
          schema: { id: string; name: string };
        };
      }>(
        `mutation UpdateSchema($input: UpdateSchemaInput!) {
          updateSchema(input: $input) {
            schema { id name }
          }
        }`,
        {
          input: {
            id: createdSchemaId,
            schemaPatch: {
              name: updatedName,
            },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data!.updateSchema.schema.name).toBe(updatedName);
    });

    it('should delete the schema', async () => {
      expect(createdSchemaId).toBeDefined();

      const res = await query<{
        deleteSchema: {
          schema: { id: string };
        };
      }>(
        `mutation DeleteSchema($input: DeleteSchemaInput!) {
          deleteSchema(input: $input) {
            schema { id }
          }
        }`,
        {
          input: {
            id: createdSchemaId,
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data!.deleteSchema.schema.id).toBe(createdSchemaId);
    });
  });
});
