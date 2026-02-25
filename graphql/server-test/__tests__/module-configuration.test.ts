/**
 * module-configuration.test.ts
 *
 * Phase 3b -- _meta, NodeTypeRegistry, Limits, Modules, Table Modules.
 * Tests: 18
 *
 * V5 rules applied:
 *   - `_meta` type has only `tables` field (no `version`, no `totalCount`)
 *   - `NodeTypeRegistry` uses `slug` not `id` as identifier
 *   - AppLimit/OrgLimit uses `num` + `max` not `value`
 *   - AppLimitDefault/OrgLimitDefault uses `max` not `value`
 *   - No singular nodeTypeRegistryBySlug query -- use condition
 *   - Delete returns `{ entity { id } }` not `{ deletedEntityId }`
 */

import type { PgTestClient } from 'pgsql-test/test-client';
import type { GraphQLQueryFn } from '../src/types';
import type supertest from 'supertest';
import {
  getTestConnections,
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
      // V5: MetaSchema type only has `tables` field (no version, no totalCount)
      const res = await query('{ _meta { tables { __typename } } }');

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!._meta).toBeDefined();
      expect(res.data!._meta.tables).toBeDefined();
      expect(Array.isArray(res.data!._meta.tables)).toBe(true);
    });

    it('should return _meta tables with __typename', async () => {
      const res = await query('{ _meta { tables { __typename } } }');

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();

      const tables = res.data!._meta.tables;
      expect(Array.isArray(tables)).toBe(true);
      // Each entry in the tables array should have __typename defined
      for (const table of tables) {
        expect(table).toHaveProperty('__typename');
        expect(typeof table.__typename).toBe('string');
        expect(table.__typename.length).toBeGreaterThan(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Node Type Registries
  // ---------------------------------------------------------------------------

  describe('node type registries', () => {
    it('should list node type registries with correct fields', async () => {
      // V5: uses 'slug' not 'id' as identifier
      const res = await query(
        `{
          nodeTypeRegistries(first: 50) {
            ${CONNECTION_FIELDS}
            nodes { slug name category }
          }
        }`
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();

      const conn = res.data!.nodeTypeRegistries;
      expect(conn).toHaveProperty('totalCount');
      // Seed data has 33 node type registries
      expect(conn.totalCount).toBe(33);
      expect(conn).toHaveProperty('nodes');
      expect(Array.isArray(conn.nodes)).toBe(true);
      expect(conn.nodes.length).toBeGreaterThan(0);

      // Verify each node has slug and name
      for (const node of conn.nodes) {
        expect(node).toHaveProperty('slug');
        expect(typeof node.slug).toBe('string');
        expect(node).toHaveProperty('name');
        expect(typeof node.name).toBe('string');
      }
    });

    it('should return registries with slug as identifier (not id)', async () => {
      // V5: NodeTypeRegistry uses slug, not id
      const res = await query(
        `{
          nodeTypeRegistries(first: 1) {
            nodes { slug name }
          }
        }`
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.nodeTypeRegistries.nodes).toHaveLength(1);

      const node = res.data!.nodeTypeRegistries.nodes[0];
      expect(node.slug).toBeDefined();
      expect(typeof node.slug).toBe('string');
      expect(node.slug.length).toBeGreaterThan(0);
      expect(node.name).toBeDefined();
    });

    it('should find registries via condition query', async () => {
      // V5: no singular nodeTypeRegistryBySlug query -- use condition
      const res = await query(
        `query FindRegistry($cond: NodeTypeRegistryCondition) {
          nodeTypeRegistries(condition: $cond) {
            totalCount
            nodes { slug name }
          }
        }`,
        { cond: { name: 'DataId' } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.nodeTypeRegistries.totalCount).toBeGreaterThanOrEqual(1);
      expect(res.data!.nodeTypeRegistries.nodes.length).toBeGreaterThanOrEqual(1);
      expect(res.data!.nodeTypeRegistries.nodes[0].name).toBe('DataId');
      expect(res.data!.nodeTypeRegistries.nodes[0].slug).toBe('data_id');
    });
  });

  // ---------------------------------------------------------------------------
  // Limits
  // ---------------------------------------------------------------------------

  describe('limits', () => {
    it('should list app limits with connection shape', async () => {
      // V5: uses 'num' + 'max' not 'value'
      const res = await query(
        `{
          appLimits(first: 5) {
            ${CONNECTION_FIELDS}
            nodes { id name }
          }
        }`
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();

      const conn = res.data!.appLimits;
      expect(conn).toHaveProperty('totalCount');
      expect(typeof conn.totalCount).toBe('number');
      expect(conn.totalCount).toBeGreaterThanOrEqual(0);
      expect(conn).toHaveProperty('nodes');
      expect(Array.isArray(conn.nodes)).toBe(true);
    });

    it('should list app limit defaults', async () => {
      // V5: uses 'max' not 'value'
      const res = await query(
        `{
          appLimitDefaults(first: 5) {
            ${CONNECTION_FIELDS}
            nodes { id name }
          }
        }`
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();

      const conn = res.data!.appLimitDefaults;
      expect(conn).toHaveProperty('totalCount');
      expect(typeof conn.totalCount).toBe('number');
      expect(conn.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(conn.nodes)).toBe(true);
    });

    it('should list org limits', async () => {
      // V5: uses 'num' + 'max' not 'value'
      const res = await query(
        `{
          orgLimits(first: 5) {
            ${CONNECTION_FIELDS}
            nodes { id name entityId }
          }
        }`
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();

      const conn = res.data!.orgLimits;
      expect(conn).toHaveProperty('totalCount');
      expect(typeof conn.totalCount).toBe('number');
      expect(conn.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(conn.nodes)).toBe(true);
    });

    it('should list limit functions', async () => {
      const res = await query(
        `{
          limitFunctions(first: 5) {
            ${CONNECTION_FIELDS}
            nodes { id name }
          }
        }`
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();

      const conn = res.data!.limitFunctions;
      expect(conn).toHaveProperty('totalCount');
      expect(typeof conn.totalCount).toBe('number');
      expect(conn.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(conn.nodes)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Module Availability
  // ---------------------------------------------------------------------------

  describe('module availability', () => {
    it('should query sessions modules', async () => {
      const res = await query(
        `{
          sessionsModules(first: 5) {
            ${CONNECTION_FIELDS}
            nodes { id databaseId }
          }
        }`
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();

      const conn = res.data!.sessionsModules;
      expect(conn).toHaveProperty('totalCount');
      expect(typeof conn.totalCount).toBe('number');
      expect(conn.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(conn.nodes)).toBe(true);
    });

    it('should query RLS modules', async () => {
      const res = await query(
        `{
          rlsModules(first: 5) {
            ${CONNECTION_FIELDS}
            nodes { id databaseId }
          }
        }`
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();

      const conn = res.data!.rlsModules;
      expect(conn).toHaveProperty('totalCount');
      expect(typeof conn.totalCount).toBe('number');
      expect(conn.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(conn.nodes)).toBe(true);
    });

    it('should query database provision modules', async () => {
      const res = await query(
        `{
          databaseProvisionModules(first: 5) {
            ${CONNECTION_FIELDS}
            nodes { id databaseId }
          }
        }`
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();

      const conn = res.data!.databaseProvisionModules;
      expect(conn).toHaveProperty('totalCount');
      expect(typeof conn.totalCount).toBe('number');
      expect(conn.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(conn.nodes)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Table Modules
  // ---------------------------------------------------------------------------

  describe('table modules', () => {
    // Shared state for the CRUD chain
    let testDatabaseId: string;
    let testSchemaId: string;
    let testTableId: string;
    let createdTableModuleId: string;

    beforeAll(async () => {
      // Create infrastructure for table module tests
      const dbRes = await query(
        `mutation CreateDb($input: CreateDatabaseInput!) {
          createDatabase(input: $input) { database { id } }
        }`,
        { input: { database: { name: `tm-db-${Date.now()}` } } }
      );
      expect(dbRes.errors).toBeUndefined();
      testDatabaseId = dbRes.data!.createDatabase.database.id;

      const schemaRes = await query(
        `mutation CreateSchema($input: CreateSchemaInput!) {
          createSchema(input: $input) { schema { id } }
        }`,
        {
          input: {
            schema: {
              name: 'TM Test Schema',
              schemaName: 'tm_test_schema',
              databaseId: testDatabaseId,
            },
          },
        }
      );
      expect(schemaRes.errors).toBeUndefined();
      testSchemaId = schemaRes.data!.createSchema.schema.id;

      const tableRes = await query(
        `mutation CreateTable($input: CreateTableInput!) {
          createTable(input: $input) { table { id } }
        }`,
        {
          input: {
            table: {
              name: 'tm_test_table',
              databaseId: testDatabaseId,
              schemaId: testSchemaId,
            },
          },
        }
      );
      expect(tableRes.errors).toBeUndefined();
      testTableId = tableRes.data!.createTable.table.id;
    });

    it('should list existing table modules', async () => {
      const res = await query(
        `{
          tableModules(first: 5) {
            ${CONNECTION_FIELDS}
            nodes { id tableId nodeType }
          }
        }`
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();

      const conn = res.data!.tableModules;
      expect(conn).toHaveProperty('totalCount');
      expect(typeof conn.totalCount).toBe('number');
      expect(conn.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(conn.nodes)).toBe(true);
    });

    it('should create a table module with valid nodeType', async () => {
      expect(testTableId).toBeDefined();

      // nodeType must be a valid NodeTypeRegistrySlug enum value.
      // From seed data, 'DataId' is a known valid slug.
      const res = await query(
        `mutation CreateTableModule($input: CreateTableModuleInput!) {
          createTableModule(input: $input) {
            tableModule { id nodeType tableId }
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
      const tm = res.data!.createTableModule.tableModule;
      expect(tm.id).toBeDefined();
      expect(tm.tableId).toBe(testTableId);
      expect(tm.nodeType).toBe('DataId');
      createdTableModuleId = tm.id;
    });

    it('should find the created table module via condition', async () => {
      expect(createdTableModuleId).toBeDefined();

      const res = await query(
        `query FindTableModule($cond: TableModuleCondition) {
          tableModules(condition: $cond) {
            totalCount
            nodes { id nodeType tableId }
          }
        }`,
        { cond: { id: createdTableModuleId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.tableModules.nodes).toHaveLength(1);
      expect(res.data!.tableModules.nodes[0].nodeType).toBe('DataId');
      expect(res.data!.tableModules.nodes[0].tableId).toBe(testTableId);
    });

    it('should delete the table module', async () => {
      expect(createdTableModuleId).toBeDefined();

      const res = await query(
        `mutation DeleteTableModule($input: DeleteTableModuleInput!) {
          deleteTableModule(input: $input) {
            tableModule { id }
          }
        }`,
        { input: { id: createdTableModuleId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      // V5: returns { tableModule { id } }
      expect(res.data!.deleteTableModule.tableModule.id).toBe(createdTableModuleId);
    });
  });
});
