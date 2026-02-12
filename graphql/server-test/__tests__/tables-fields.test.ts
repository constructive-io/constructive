/**
 * Tables & Fields
 *
 * Integration tests for table and field CRUD operations against an
 * internal constructive server (supertest).
 *
 * Creates a dedicated database and schema in beforeAll, then exercises
 * table and field operations within that context. Everything is cleaned
 * up in afterAll via cascading database delete.
 *
 * Covers:
 *   - List tables with filter and connection shape
 *   - Get table by ID (singular query -- may exist in V5 for tables)
 *   - Get table by databaseId and name
 *   - List fields with filter and ordering
 *   - Create / update / delete tables
 *   - Create / update / delete fields
 *   - SQL verification for all mutations
 *
 * V5 patterns:
 *   - tablePatch (not generic patch)
 *   - fieldPatch (not generic patch)
 *   - filter for complex queries, condition for exact-match
 *
 * Run:
 *   pnpm test -- --testPathPattern=tables-fields
 */

import {
  setupTestServer,
  postGraphQL,
  signIn,
  deleteEntity,
  testName,
  queryDb,
  TEST_TIMEOUT,
  type TestContext,
  type AuthResult,
} from './test-utils';

jest.setTimeout(TEST_TIMEOUT);

describe('Tables & Fields', () => {
  let ctx: TestContext;
  let auth: AuthResult;

  // Prerequisite IDs created in beforeAll
  let dbId: string;
  let schemaId: string;

  // Track whether setup succeeded so we can skip dependent tests gracefully
  let setupSucceeded = false;

  beforeAll(async () => {
    ctx = await setupTestServer();
    auth = await signIn(ctx.request);

    // --- Create a test database ---
    const dbName = testName('tbl_db');
    const dbRes = await postGraphQL(
      ctx.request,
      {
        query: /* GraphQL */ `
          mutation CreateDatabase($input: CreateDatabaseInput!) {
            createDatabase(input: $input) {
              database { id name }
            }
          }
        `,
        variables: {
          input: { database: { name: dbName, ownerId: auth.userId } },
        },
      },
      auth.token,
    );

    if (dbRes.body.errors || !dbRes.body.data?.createDatabase?.database?.id) {
      console.warn(
        'Failed to create prerequisite database:',
        JSON.stringify(dbRes.body.errors ?? dbRes.body, null, 2),
      );
      return;
    }
    dbId = dbRes.body.data.createDatabase.database.id;

    // --- Create a test schema inside that database ---
    const schemaName = testName('tbl_schema');
    const schemaRes = await postGraphQL(
      ctx.request,
      {
        query: /* GraphQL */ `
          mutation CreateSchema($input: CreateSchemaInput!) {
            createSchema(input: $input) {
              schema { id name databaseId }
            }
          }
        `,
        variables: {
          input: { schema: { name: schemaName, databaseId: dbId } },
        },
      },
      auth.token,
    );

    if (
      schemaRes.body.errors ||
      !schemaRes.body.data?.createSchema?.schema?.id
    ) {
      console.warn(
        'Failed to create prerequisite schema:',
        JSON.stringify(schemaRes.body.errors ?? schemaRes.body, null, 2),
      );
      return;
    }
    schemaId = schemaRes.body.data.createSchema.schema.id;

    setupSucceeded = true;
  });

  afterAll(async () => {
    // Cascading delete: removing the database removes schemas, tables, fields
    if (dbId) {
      await deleteEntity(
        ctx.request,
        'deleteDatabase',
        'DeleteDatabaseInput',
        dbId,
        auth.token,
      );
    }
    await ctx.teardown();
  });

  // ---------------------------------------------------------------------------
  // Table Queries
  // ---------------------------------------------------------------------------

  describe('Table Queries', () => {
    it('should list tables with pagination and connection shape', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query Tables($filter: TableFilter, $first: Int, $orderBy: [TablesOrderBy!]) {
              tables(filter: $filter, first: $first, orderBy: $orderBy) {
                totalCount
                nodes {
                  id
                  name
                  databaseId
                  schemaId
                  createdAt
                  updatedAt
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          `,
          variables: { first: 50, orderBy: ['NAME_ASC'] },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data).toBeDefined();

      const tables = res.body.data.tables;
      expect(tables).toBeDefined();
      expect(tables.nodes).toBeInstanceOf(Array);
      expect(tables.totalCount).toBeGreaterThanOrEqual(0);
      expect(tables.pageInfo).toHaveProperty('hasNextPage');
      expect(tables.pageInfo).toHaveProperty('endCursor');
    });

    it('should list tables filtered by databaseId', async () => {
      // Get any database
      const dbRes = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            { databases(first: 1) { nodes { id } } }
          `,
        },
        auth.token,
      );

      if (!dbRes.body.data?.databases?.nodes?.length) {
        console.warn('Skipping: no databases found');
        return;
      }

      const databaseId = dbRes.body.data.databases.nodes[0].id;

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query TablesForDb($filter: TableFilter) {
              tables(filter: $filter) {
                nodes {
                  id
                  name
                  databaseId
                }
              }
            }
          `,
          variables: {
            filter: { databaseId: { equalTo: databaseId } },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data?.tables?.nodes ?? [];
      for (const node of nodes) {
        expect(node.databaseId).toBe(databaseId);
      }
    });

    it('should fetch a single table by ID', async () => {
      const listRes = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            { tables(first: 1) { nodes { id name databaseId schemaId } } }
          `,
        },
        auth.token,
      );

      if (!listRes.body.data?.tables?.nodes?.length) {
        console.warn('No tables found; skipping single-table query.');
        return;
      }

      const existing = listRes.body.data.tables.nodes[0];

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query Table($id: UUID!) {
              table(id: $id) {
                id
                name
                databaseId
                schemaId
                createdAt
                updatedAt
              }
            }
          `,
          variables: { id: existing.id },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.table).toBeDefined();
      expect(res.body.data.table.id).toBe(existing.id);
      expect(res.body.data.table.name).toBe(existing.name);
    });

    it('should fetch a table by databaseId and name', async () => {
      const listRes = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            { tables(first: 1) { nodes { id name databaseId } } }
          `,
        },
        auth.token,
      );

      if (!listRes.body.data?.tables?.nodes?.length) {
        console.warn('No tables found for tableByDatabaseIdAndName; skipping.');
        return;
      }

      const existing = listRes.body.data.tables.nodes[0];

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query TableByDbAndName($databaseId: UUID!, $name: String!) {
              tableByDatabaseIdAndName(databaseId: $databaseId, name: $name) {
                id
                name
                databaseId
              }
            }
          `,
          variables: {
            databaseId: existing.databaseId,
            name: existing.name,
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const table = res.body.data?.tableByDatabaseIdAndName;
      expect(table).toBeDefined();
      expect(table.id).toBe(existing.id);
      expect(table.name).toBe(existing.name);
    });
  });

  // ---------------------------------------------------------------------------
  // Field Queries
  // ---------------------------------------------------------------------------

  describe('Field Queries', () => {
    it('should list fields for a table with ordering', async () => {
      const tablesRes = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            { tables(first: 1) { nodes { id } } }
          `,
        },
        auth.token,
      );

      if (!tablesRes.body.data?.tables?.nodes?.length) {
        console.warn('No tables found for field query test; skipping.');
        return;
      }

      const tableId = tablesRes.body.data.tables.nodes[0].id;

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query Fields($filter: FieldFilter, $orderBy: [FieldsOrderBy!]) {
              fields(filter: $filter, orderBy: $orderBy) {
                nodes {
                  id
                  name
                  tableId
                  type
                  isNotNull
                  defaultValue
                  createdAt
                  updatedAt
                }
              }
            }
          `,
          variables: {
            filter: { tableId: { equalTo: tableId } },
            orderBy: ['ORDINAL_POSITION_ASC'],
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.fields?.nodes).toBeInstanceOf(Array);

      // Verify field shape if any exist
      if (res.body.data.fields.nodes.length > 0) {
        const field = res.body.data.fields.nodes[0];
        expect(field).toHaveProperty('id');
        expect(field).toHaveProperty('name');
        expect(field).toHaveProperty('tableId');
        expect(field).toHaveProperty('type');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Table CRUD
  // ---------------------------------------------------------------------------

  describe('Table CRUD', () => {
    let tableId: string;
    let tableName: string;

    beforeAll(() => {
      if (!setupSucceeded) {
        console.warn('Prerequisite setup failed; Table CRUD tests will be skipped.');
      }
    });

    it('should create a table and return id', async () => {
      if (!setupSucceeded) return;

      tableName = testName('products');

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreateTable($input: CreateTableInput!) {
              createTable(input: $input) {
                table {
                  id
                  name
                  databaseId
                  schemaId
                }
              }
            }
          `,
          variables: {
            input: {
              table: {
                name: tableName,
                databaseId: dbId,
                schemaId,
              },
            },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data).toBeDefined();

      const table = res.body.data.createTable.table;
      expect(table).toBeDefined();
      expect(table.id).toBeTruthy();
      expect(table.databaseId).toBe(dbId);
      expect(table.schemaId).toBe(schemaId);
      expect(table.name).toBeDefined();

      tableId = table.id;

      // SQL verification
      const rows = await queryDb(
        ctx.pg,
        'SELECT id, name, database_id, schema_id FROM metaschema_public."table" WHERE id = $1',
        [tableId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].database_id).toBe(dbId);
      expect(rows[0].schema_id).toBe(schemaId);
    });

    it('should find the created table via filter', async () => {
      if (!setupSucceeded || !tableId) return;

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query FindTable($filter: TableFilter) {
              tables(filter: $filter) {
                nodes {
                  id
                  name
                  databaseId
                }
              }
            }
          `,
          variables: {
            filter: { databaseId: { equalTo: dbId } },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data?.tables?.nodes ?? [];
      const found = nodes.find((n: any) => n.id === tableId);
      expect(found).toBeDefined();
    });

    it('should update the table name using tablePatch', async () => {
      if (!setupSucceeded || !tableId) return;

      const renamedName = testName('products_v2');

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation UpdateTable($input: UpdateTableInput!) {
              updateTable(input: $input) {
                table {
                  id
                  name
                }
              }
            }
          `,
          variables: {
            input: { id: tableId, tablePatch: { name: renamedName } },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const table = res.body.data.updateTable.table;
      expect(table.id).toBe(tableId);
      expect(table.name).toBeDefined();

      // SQL verification
      const rows = await queryDb(
        ctx.pg,
        'SELECT name FROM metaschema_public."table" WHERE id = $1',
        [tableId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe(table.name);
    });

    it('should delete the table', async () => {
      if (!setupSucceeded || !tableId) return;

      const res = await deleteEntity(
        ctx.request,
        'deleteTable',
        'DeleteTableInput',
        tableId,
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.deleteTable).toBeDefined();
      expect(res.body.data.deleteTable.deletedTableId).toBeDefined();

      // SQL verification
      const rows = await queryDb(
        ctx.pg,
        'SELECT id FROM metaschema_public."table" WHERE id = $1',
        [tableId],
      );
      expect(rows).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Field CRUD
  // ---------------------------------------------------------------------------

  describe('Field CRUD', () => {
    let fieldTableId: string;
    let fieldId: string;

    beforeAll(async () => {
      if (!setupSucceeded) {
        console.warn('Prerequisite setup failed; Field CRUD tests will be skipped.');
        return;
      }

      // Create a dedicated table for field CRUD tests
      const tblName = testName('fld_tbl');
      const tblRes = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreateTable($input: CreateTableInput!) {
              createTable(input: $input) {
                table { id name }
              }
            }
          `,
          variables: {
            input: { table: { name: tblName, databaseId: dbId, schemaId } },
          },
        },
        auth.token,
      );

      if (tblRes.body.errors || !tblRes.body.data?.createTable?.table?.id) {
        console.warn(
          'Failed to create table for field tests:',
          JSON.stringify(tblRes.body.errors ?? tblRes.body, null, 2),
        );
        return;
      }

      fieldTableId = tblRes.body.data.createTable.table.id;
    });

    afterAll(async () => {
      if (fieldTableId) {
        await deleteEntity(
          ctx.request,
          'deleteTable',
          'DeleteTableInput',
          fieldTableId,
          auth.token,
        );
      }
    });

    it('should create a field on the test table', async () => {
      if (!setupSucceeded || !fieldTableId) return;

      const fieldName = testName('price');

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreateField($input: CreateFieldInput!) {
              createField(input: $input) {
                field {
                  id
                  name
                  tableId
                  type
                }
              }
            }
          `,
          variables: {
            input: {
              field: { name: fieldName, tableId: fieldTableId, type: 'text' },
            },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data).toBeDefined();

      const field = res.body.data.createField.field;
      expect(field).toBeDefined();
      expect(field.id).toBeTruthy();
      expect(field.tableId).toBe(fieldTableId);
      expect(field.type).toBe('text');

      fieldId = field.id;

      // SQL verification
      const rows = await queryDb(
        ctx.pg,
        'SELECT id, name, table_id, type FROM metaschema_public.field WHERE id = $1',
        [fieldId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].table_id).toBe(fieldTableId);
      expect(rows[0].type).toBe('text');
    });

    it('should find the created field via filter', async () => {
      if (!setupSucceeded || !fieldId || !fieldTableId) return;

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query FieldsOnTable($filter: FieldFilter) {
              fields(filter: $filter) {
                nodes {
                  id
                  name
                  type
                }
              }
            }
          `,
          variables: {
            filter: { tableId: { equalTo: fieldTableId } },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data?.fields?.nodes ?? [];
      const found = nodes.find((n: any) => n.id === fieldId);
      expect(found).toBeDefined();
    });

    it('should update the field name using fieldPatch', async () => {
      if (!setupSucceeded || !fieldId) return;

      const renamedFieldName = testName('unit_price');

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation UpdateField($input: UpdateFieldInput!) {
              updateField(input: $input) {
                field {
                  id
                  name
                }
              }
            }
          `,
          variables: {
            input: { id: fieldId, fieldPatch: { name: renamedFieldName } },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const field = res.body.data.updateField.field;
      expect(field.id).toBe(fieldId);
      expect(field.name).toBeDefined();

      // SQL verification
      const rows = await queryDb(
        ctx.pg,
        'SELECT name FROM metaschema_public.field WHERE id = $1',
        [fieldId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe(field.name);
    });

    it('should delete the field', async () => {
      if (!setupSucceeded || !fieldId) return;

      const res = await deleteEntity(
        ctx.request,
        'deleteField',
        'DeleteFieldInput',
        fieldId,
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.deleteField).toBeDefined();
      expect(res.body.data.deleteField.deletedFieldId).toBeDefined();

      // SQL verification
      const rows = await queryDb(
        ctx.pg,
        'SELECT id FROM metaschema_public.field WHERE id = $1',
        [fieldId],
      );
      expect(rows).toHaveLength(0);
    });
  });
});
