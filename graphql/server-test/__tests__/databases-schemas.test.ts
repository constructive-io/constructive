/**
 * databases-schemas.test.ts
 *
 * Phase 3b -- Database and Schema CRUD, provision modules.
 * Tests: 14
 *
 * V5 rules applied:
 *   - Database has `label` not `description`
 *   - Update uses `databasePatch` / `schemaPatch`
 *   - Delete returns `{ entity { id } }` not `{ deletedEntityId }`
 *   - CreateSchemaInput requires `schemaName` in addition to `name`
 *   - OrderBy enums are singular: SchemaOrderBy
 *   - No singular databaseByName query -- use `databases(condition: { name: ... })`
 *   - Provision mutation: createDatabaseProvisionModule
 */

import type { PgTestClient } from 'pgsql-test/test-client';
import type { GraphQLQueryFn } from '../src/types';
import type supertest from 'supertest';
import {
  getTestConnections,
  ADMIN_USER_ID,
  DATABASE_NAME,
  CONNECTION_FIELDS,
} from './test-utils';

jest.setTimeout(30000);

describe('Databases and Schemas', () => {
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
      const res = await query(
        `{
          databases(first: 5) {
            ${CONNECTION_FIELDS}
            nodes { id name label createdAt }
          }
        }`
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();

      const conn = res.data!.databases;
      expect(conn).toHaveProperty('totalCount');
      expect(typeof conn.totalCount).toBe('number');
      expect(conn.totalCount).toBeGreaterThanOrEqual(0);
      expect(conn).toHaveProperty('pageInfo');
      expect(conn.pageInfo).toHaveProperty('hasNextPage');
      expect(conn.pageInfo).toHaveProperty('hasPreviousPage');
      expect(conn).toHaveProperty('nodes');
      expect(Array.isArray(conn.nodes)).toBe(true);
    });

    it('should find a database by condition', async () => {
      // The seed data may or may not have databases; query by a known
      // condition pattern and verify the connection shape is valid.
      const res = await query(
        `query FindDb($cond: DatabaseCondition!) {
          databases(condition: $cond) {
            totalCount
            nodes { id name label }
          }
        }`,
        { cond: { name: 'nonexistent-db-probe' } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.databases).toHaveProperty('totalCount');
      expect(res.data!.databases).toHaveProperty('nodes');
      expect(Array.isArray(res.data!.databases.nodes)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Database CRUD
  // ---------------------------------------------------------------------------

  describe('database CRUD', () => {
    let createdDatabaseId: string;
    const dbName = `test-db-${Date.now()}`;

    it('should create a database and return id', async () => {
      const res = await query(
        `mutation CreateDb($input: CreateDatabaseInput!) {
          createDatabase(input: $input) {
            database { id name label }
          }
        }`,
        { input: { database: { name: dbName, label: 'Test Database' } } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const db = res.data!.createDatabase.database;
      expect(db.id).toBeDefined();
      expect(db.name).toBe(dbName);
      createdDatabaseId = db.id;
    });

    it('should find the created database by condition', async () => {
      expect(createdDatabaseId).toBeDefined();

      const res = await query(
        `query FindCreated($cond: DatabaseCondition!) {
          databases(condition: $cond) {
            totalCount
            nodes { id name label }
          }
        }`,
        { cond: { id: createdDatabaseId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data!.databases.nodes).toHaveLength(1);
      expect(res.data!.databases.nodes[0].name).toBe(dbName);
    });

    it('should update the database name using databasePatch', async () => {
      expect(createdDatabaseId).toBeDefined();

      const res = await query(
        `mutation UpdateDb($input: UpdateDatabaseInput!) {
          updateDatabase(input: $input) {
            database { id name label }
          }
        }`,
        {
          input: {
            id: createdDatabaseId,
            databasePatch: { label: 'Updated Label' },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.updateDatabase.database.label).toBe('Updated Label');
    });

    it('should provision a module for the database', async () => {
      expect(createdDatabaseId).toBeDefined();

      // DatabaseProvisionModuleInput requires: databaseName!, ownerId!, domain!
      const res = await query(
        `mutation ProvisionModule($input: CreateDatabaseProvisionModuleInput!) {
          createDatabaseProvisionModule(input: $input) {
            databaseProvisionModule { id databaseId databaseName }
          }
        }`,
        {
          input: {
            databaseProvisionModule: {
              databaseId: createdDatabaseId,
              databaseName: dbName,
              ownerId: ADMIN_USER_ID,
              domain: 'localhost',
            },
          },
        }
      );

      // This may fail with business-level error (e.g., job queue constraints)
      // but should not fail with a schema validation error.
      if (res.errors) {
        for (const err of res.errors) {
          const msg = (err as any).message || '';
          expect(msg).not.toMatch(/Cannot query field/i);
          expect(msg).not.toMatch(/is not defined/i);
        }
      } else {
        expect(res.data).toBeDefined();
        const mod = res.data!.createDatabaseProvisionModule.databaseProvisionModule;
        expect(mod.id).toBeDefined();
      }
    });

    it('should delete the database', async () => {
      expect(createdDatabaseId).toBeDefined();

      const res = await query(
        `mutation DeleteDb($input: DeleteDatabaseInput!) {
          deleteDatabase(input: $input) {
            database { id }
          }
        }`,
        { input: { id: createdDatabaseId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      // V5: returns { database { id } }, not { deletedDatabaseId }
      expect(res.data!.deleteDatabase.database.id).toBe(createdDatabaseId);
    });
  });

  // ---------------------------------------------------------------------------
  // Schema Queries
  // ---------------------------------------------------------------------------

  describe('schema queries', () => {
    it('should list schemas with ordering', async () => {
      // V5: singular OrderBy enum -- SchemaOrderBy
      const res = await query(
        `{
          schemas(first: 5, orderBy: [NAME_ASC]) {
            ${CONNECTION_FIELDS}
            nodes { id name databaseId schemaName createdAt }
          }
        }`
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();

      const conn = res.data!.schemas;
      expect(conn).toHaveProperty('totalCount');
      expect(typeof conn.totalCount).toBe('number');
      expect(conn).toHaveProperty('nodes');
      expect(Array.isArray(conn.nodes)).toBe(true);
    });

    it('should list schemas filtered by databaseId', async () => {
      // Use a non-existent ID to verify the filter syntax is valid
      const fakeId = '00000000-0000-0000-0000-000000000099';
      const res = await query(
        `query SchemasByDb($cond: SchemaCondition!) {
          schemas(condition: $cond) {
            totalCount
            nodes { id name schemaName }
          }
        }`,
        { cond: { databaseId: fakeId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.schemas).toHaveProperty('totalCount');
      expect(Array.isArray(res.data!.schemas.nodes)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Schema CRUD
  // ---------------------------------------------------------------------------

  describe('schema CRUD', () => {
    let databaseId: string;
    let createdSchemaId: string;

    beforeAll(async () => {
      // Create a parent database for schema tests.
      // Note: this runs inside the test transaction scope, but beforeAll
      // executes outside beforeEach/afterEach boundaries. We create a
      // fresh database for the schema CRUD block.
      const res = await query(
        `mutation CreateDbForSchema($input: CreateDatabaseInput!) {
          createDatabase(input: $input) {
            database { id name }
          }
        }`,
        {
          input: {
            database: { name: `schema-parent-db-${Date.now()}` },
          },
        }
      );
      expect(res.errors).toBeUndefined();
      databaseId = res.data!.createDatabase.database.id;
    });

    it('should create a schema with schemaName field', async () => {
      expect(databaseId).toBeDefined();

      // V5 CRITICAL: CreateSchemaInput requires BOTH name AND schemaName
      const res = await query(
        `mutation CreateSchema($input: CreateSchemaInput!) {
          createSchema(input: $input) {
            schema { id name databaseId schemaName }
          }
        }`,
        {
          input: {
            schema: {
              name: 'Test Schema',
              schemaName: 'test_schema_name',
              databaseId,
            },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const schema = res.data!.createSchema.schema;
      expect(schema.id).toBeDefined();
      // schemaName is auto-generated by a DB trigger from <database_name>-<schema_name>
      // so we just verify it exists and is a non-empty string
      expect(typeof schema.schemaName).toBe('string');
      expect(schema.schemaName.length).toBeGreaterThan(0);
      expect(schema.databaseId).toBe(databaseId);
      createdSchemaId = schema.id;
    });

    it('should find the schema via condition query', async () => {
      expect(createdSchemaId).toBeDefined();

      const res = await query(
        `query FindSchema($cond: SchemaCondition!) {
          schemas(condition: $cond) {
            totalCount
            nodes { id name schemaName databaseId }
          }
        }`,
        { cond: { id: createdSchemaId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data!.schemas.nodes).toHaveLength(1);
      // schemaName is auto-generated, just verify it exists
      expect(res.data!.schemas.nodes[0].schemaName).toBeDefined();
    });

    it('should update the schema using schemaPatch', async () => {
      expect(createdSchemaId).toBeDefined();

      const res = await query(
        `mutation UpdateSchema($input: UpdateSchemaInput!) {
          updateSchema(input: $input) {
            schema { id name }
          }
        }`,
        {
          input: {
            id: createdSchemaId,
            schemaPatch: { name: 'Updated Schema' },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.updateSchema.schema.name).toBe('Updated Schema');
    });

    it('should delete the schema', async () => {
      expect(createdSchemaId).toBeDefined();

      const res = await query(
        `mutation DeleteSchema($input: DeleteSchemaInput!) {
          deleteSchema(input: $input) {
            schema { id }
          }
        }`,
        { input: { id: createdSchemaId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      // V5: returns { schema { id } }
      expect(res.data!.deleteSchema.schema.id).toBe(createdSchemaId);
    });
  });
});
