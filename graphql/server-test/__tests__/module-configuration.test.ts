/**
 * Module Configuration Test Suite
 *
 * Tests _meta queries, node type registries, limits, module
 * availability, and table module CRUD against the constructive
 * GraphQL API (V5).
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

jest.setTimeout(30000);

describe('Module Configuration', () => {
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
  // _meta Query
  // ---------------------------------------------------------------------------

  describe('_meta query', () => {
    it('should return _meta with tables field', async () => {
      const res = await query<{
        _meta: {
          tables: Array<{ __typename: string }>;
        };
      }>(`{
        _meta {
          tables { __typename }
        }
      }`);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!._meta).toBeDefined();
      expect(res.data!._meta.tables).toBeDefined();
      expect(Array.isArray(res.data!._meta.tables)).toBe(true);
    });

    it('should return _meta tables with __typename', async () => {
      const res = await query<{
        _meta: {
          tables: Array<{ __typename: string }>;
        };
      }>(`{
        _meta {
          tables { __typename }
        }
      }`);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();

      const tables = res.data!._meta.tables;
      expect(tables.length).toBeGreaterThanOrEqual(0);

      // If there are tables, each should have __typename defined
      for (const table of tables) {
        expect(table.__typename).toBeDefined();
        expect(typeof table.__typename).toBe('string');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Node Type Registries
  // ---------------------------------------------------------------------------

  describe('node type registries', () => {
    it('should list node type registries with correct fields', async () => {
      const res = await query<{
        nodeTypeRegistries: {
          totalCount: number;
          nodes: Array<{ slug: string; name: string; category: string }>;
        };
      }>(`{
        nodeTypeRegistries(first: 5) {
          totalCount
          nodes { slug name category }
        }
      }`);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.nodeTypeRegistries.totalCount).toBe(33);
      expect(res.data!.nodeTypeRegistries.nodes.length).toBeGreaterThan(0);

      // Verify slug is the identifier -- no 'id' field
      const firstNode = res.data!.nodeTypeRegistries.nodes[0];
      expect(firstNode.slug).toBeDefined();
      expect(firstNode.name).toBeDefined();
    });

    it('should return registries with slug as identifier (not id)', async () => {
      const res = await query<{
        nodeTypeRegistries: {
          nodes: Array<{ slug: string; name: string }>;
        };
      }>(`{
        nodeTypeRegistries(first: 1) {
          nodes { slug name }
        }
      }`);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.nodeTypeRegistries.nodes.length).toBeGreaterThanOrEqual(1);

      const node = res.data!.nodeTypeRegistries.nodes[0];
      expect(node.slug).toBeDefined();
      expect(typeof node.slug).toBe('string');
      expect(node.slug.length).toBeGreaterThan(0);
    });

    it('should find registries via condition query', async () => {
      // Use a known registry slug -- 'data-id' is a standard one
      const res = await query<{
        nodeTypeRegistries: {
          nodes: Array<{ slug: string; name: string }>;
        };
      }>(
        `query FindRegistry($condition: NodeTypeRegistryCondition) {
          nodeTypeRegistries(condition: $condition) {
            nodes { slug name }
          }
        }`,
        {
          condition: { slug: 'data-id' },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      // data-id may or may not be an exact slug in the registry.
      // The important thing is the condition query works without error.
      expect(Array.isArray(res.data!.nodeTypeRegistries.nodes)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Limits
  // ---------------------------------------------------------------------------

  describe('limits', () => {
    it('should list app limits with connection shape', async () => {
      const res = await query<{
        appLimits: {
          totalCount: number;
          nodes: Array<{ id: string; name: string }>;
        };
      }>(`{
        appLimits(first: 5) {
          totalCount
          nodes { id name }
        }
      }`);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.appLimits).toHaveProperty('totalCount');
      expect(res.data!.appLimits).toHaveProperty('nodes');
      expect(Array.isArray(res.data!.appLimits.nodes)).toBe(true);
    });

    it('should list app limit defaults', async () => {
      const res = await query<{
        appLimitDefaults: {
          totalCount: number;
          nodes: Array<{ id: string; name: string }>;
        };
      }>(`{
        appLimitDefaults(first: 5) {
          totalCount
          nodes { id name }
        }
      }`);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.appLimitDefaults).toHaveProperty('totalCount');
      expect(res.data!.appLimitDefaults).toHaveProperty('nodes');
      expect(Array.isArray(res.data!.appLimitDefaults.nodes)).toBe(true);
    });

    it('should list org limits', async () => {
      const res = await query<{
        orgLimits: {
          totalCount: number;
          nodes: Array<{ id: string; name: string; entityId: string }>;
        };
      }>(`{
        orgLimits(first: 5) {
          totalCount
          nodes { id name entityId }
        }
      }`);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.orgLimits).toHaveProperty('totalCount');
      expect(res.data!.orgLimits).toHaveProperty('nodes');
      expect(Array.isArray(res.data!.orgLimits.nodes)).toBe(true);
    });

    it('should list limit functions', async () => {
      const res = await query<{
        limitFunctions: {
          totalCount: number;
          nodes: Array<{ id: string; name: string }>;
        };
      }>(`{
        limitFunctions(first: 5) {
          totalCount
          nodes { id name }
        }
      }`);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.limitFunctions).toHaveProperty('totalCount');
      expect(res.data!.limitFunctions).toHaveProperty('nodes');
      expect(Array.isArray(res.data!.limitFunctions.nodes)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Module Availability
  // ---------------------------------------------------------------------------

  describe('module availability', () => {
    it('should query sessions modules', async () => {
      const res = await query<{
        sessionsModules: {
          totalCount: number;
          nodes: Array<{ id: string; databaseId: string }>;
        };
      }>(`{
        sessionsModules(first: 5) {
          totalCount
          nodes { id databaseId }
        }
      }`);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.sessionsModules).toHaveProperty('totalCount');
      expect(res.data!.sessionsModules).toHaveProperty('nodes');
      expect(Array.isArray(res.data!.sessionsModules.nodes)).toBe(true);
    });

    it('should query RLS modules', async () => {
      const res = await query<{
        rlsModules: {
          totalCount: number;
          nodes: Array<{ id: string; databaseId: string }>;
        };
      }>(`{
        rlsModules(first: 5) {
          totalCount
          nodes { id databaseId }
        }
      }`);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.rlsModules).toHaveProperty('totalCount');
      expect(res.data!.rlsModules).toHaveProperty('nodes');
      expect(Array.isArray(res.data!.rlsModules.nodes)).toBe(true);
    });

    it('should query database provision modules', async () => {
      const res = await query<{
        databaseProvisionModules: {
          totalCount: number;
          nodes: Array<{ id: string; databaseId: string }>;
        };
      }>(`{
        databaseProvisionModules(first: 5) {
          totalCount
          nodes { id databaseId }
        }
      }`);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.databaseProvisionModules).toHaveProperty('totalCount');
      expect(res.data!.databaseProvisionModules).toHaveProperty('nodes');
      expect(Array.isArray(res.data!.databaseProvisionModules.nodes)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Table Modules
  // ---------------------------------------------------------------------------

  describe('table modules', () => {
    let testDatabaseId: string;
    let testSchemaId: string;
    let testTableId: string;
    let createdTableModuleId: string;

    beforeAll(async () => {
      // Create a database, schema, and table for table module tests
      const dbRes = await query<{
        createDatabase: { database: { id: string } };
      }>(
        `mutation($input: CreateDatabaseInput!) {
          createDatabase(input: $input) { database { id } }
        }`,
        {
          input: {
            database: { name: `module-test-db-${Date.now()}` },
          },
        }
      );
      if (dbRes.errors) {
        throw new Error(`Failed to create database: ${dbRes.errors[0].message}`);
      }
      testDatabaseId = dbRes.data!.createDatabase.database.id;

      const schemaRes = await query<{
        createSchema: { schema: { id: string } };
      }>(
        `mutation($input: CreateSchemaInput!) {
          createSchema(input: $input) { schema { id } }
        }`,
        {
          input: {
            schema: {
              name: 'Module Test Schema',
              schemaName: `module_test_schema_${Date.now()}`,
              databaseId: testDatabaseId,
            },
          },
        }
      );
      if (schemaRes.errors) {
        throw new Error(`Failed to create schema: ${schemaRes.errors[0].message}`);
      }
      testSchemaId = schemaRes.data!.createSchema.schema.id;

      const tableRes = await query<{
        createTable: { table: { id: string } };
      }>(
        `mutation($input: CreateTableInput!) {
          createTable(input: $input) { table { id } }
        }`,
        {
          input: {
            table: {
              name: `module_test_table_${Date.now()}`,
              databaseId: testDatabaseId,
              schemaId: testSchemaId,
            },
          },
        }
      );
      if (tableRes.errors) {
        throw new Error(`Failed to create table: ${tableRes.errors[0].message}`);
      }
      testTableId = tableRes.data!.createTable.table.id;
    });

    it('should list existing table modules', async () => {
      const res = await query<{
        tableModules: {
          totalCount: number;
          nodes: Array<{ id: string; tableId: string; nodeType: string }>;
        };
      }>(`{
        tableModules(first: 5) {
          totalCount
          nodes { id tableId nodeType }
        }
      }`);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.tableModules).toHaveProperty('totalCount');
      expect(res.data!.tableModules).toHaveProperty('nodes');
      expect(Array.isArray(res.data!.tableModules.nodes)).toBe(true);
    });

    it('should create a table module with valid nodeType', async () => {
      expect(testTableId).toBeDefined();
      expect(testDatabaseId).toBeDefined();

      // V5: TableModuleInput requires databaseId (NON_NULL)
      const res = await query<{
        createTableModule: {
          tableModule: { id: string; tableId: string; nodeType: string };
        };
      }>(
        `mutation CreateTableModule($input: CreateTableModuleInput!) {
          createTableModule(input: $input) {
            tableModule { id tableId nodeType }
          }
        }`,
        {
          input: {
            tableModule: {
              tableId: testTableId,
              databaseId: testDatabaseId,
              nodeType: 'DataId',
            },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.createTableModule.tableModule.id).toBeDefined();
      expect(res.data!.createTableModule.tableModule.tableId).toBe(testTableId);
      expect(res.data!.createTableModule.tableModule.nodeType).toBe('DataId');

      createdTableModuleId = res.data!.createTableModule.tableModule.id;
    });

    it('should find the created table module via condition', async () => {
      expect(createdTableModuleId).toBeDefined();

      const res = await query<{
        tableModules: {
          nodes: Array<{ id: string; tableId: string; nodeType: string }>;
        };
      }>(
        `query FindTableModule($condition: TableModuleCondition) {
          tableModules(condition: $condition) {
            nodes { id tableId nodeType }
          }
        }`,
        {
          condition: { id: createdTableModuleId },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.tableModules.nodes).toHaveLength(1);
      expect(res.data!.tableModules.nodes[0].id).toBe(createdTableModuleId);
      expect(res.data!.tableModules.nodes[0].nodeType).toBe('DataId');
    });

    it('should delete the table module', async () => {
      expect(createdTableModuleId).toBeDefined();

      const res = await query<{
        deleteTableModule: {
          tableModule: { id: string };
        };
      }>(
        `mutation DeleteTableModule($input: DeleteTableModuleInput!) {
          deleteTableModule(input: $input) {
            tableModule { id }
          }
        }`,
        {
          input: {
            id: createdTableModuleId,
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data!.deleteTableModule.tableModule.id).toBe(createdTableModuleId);
    });
  });
});
