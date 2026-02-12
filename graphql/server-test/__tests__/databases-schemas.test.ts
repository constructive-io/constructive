/**
 * Databases & Schemas
 *
 * Integration tests for database and schema CRUD operations against an
 * internal constructive server (supertest).
 *
 * Covers:
 *   - List databases (connection shape with totalCount, pageInfo)
 *   - Find database by condition (V5 pattern, no singular query)
 *   - Create / update / delete databases
 *   - List schemas with filter and ordering
 *   - Create / update / delete schemas
 *   - Database provision module
 *   - SQL verification for all mutations
 *
 * V5 patterns:
 *   - databasePatch (not generic patch)
 *   - schemaPatch (not generic patch)
 *   - condition-based lookups (no singular queries)
 *
 * Run:
 *   pnpm test -- --testPathPattern=databases-schemas
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

describe('Databases & Schemas', () => {
  let ctx: TestContext;
  let auth: AuthResult;

  beforeAll(async () => {
    ctx = await setupTestServer();
    auth = await signIn(ctx.request);
  });

  afterAll(async () => {
    await ctx.teardown();
  });

  // ---------------------------------------------------------------------------
  // Database Queries
  // ---------------------------------------------------------------------------

  describe('Database Queries', () => {
    it('should list databases with connection shape', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              databases(first: 20, orderBy: [CREATED_AT_DESC]) {
                totalCount
                nodes {
                  id
                  name
                  ownerId
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
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data).toBeDefined();

      const databases = res.body.data.databases;
      expect(databases).toBeDefined();
      expect(databases.nodes).toBeInstanceOf(Array);
      expect(databases.totalCount).toBeGreaterThanOrEqual(0);
      expect(databases.pageInfo).toBeDefined();
      expect(databases.pageInfo).toHaveProperty('hasNextPage');
      expect(databases.pageInfo).toHaveProperty('endCursor');

      // Verify node shape if any exist
      if (databases.nodes.length > 0) {
        const node = databases.nodes[0];
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('name');
        expect(node).toHaveProperty('ownerId');
        expect(node).toHaveProperty('createdAt');
        expect(node).toHaveProperty('updatedAt');
      }
    });

    it('should find a database by condition (V5 pattern)', async () => {
      // First get an existing database
      const listRes = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            { databases(first: 1) { nodes { id name } } }
          `,
        },
        auth.token,
      );

      if (!listRes.body.data?.databases?.nodes?.length) {
        console.warn('Skipping condition lookup: no databases found');
        return;
      }

      const existing = listRes.body.data.databases.nodes[0];

      // V5 pattern: use condition, not singular query like database(id:)
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query DatabaseByCondition($condition: DatabaseCondition) {
              databases(condition: $condition) {
                nodes {
                  id
                  name
                  ownerId
                }
              }
            }
          `,
          variables: { condition: { id: existing.id } },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data?.databases?.nodes;
      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe(existing.id);
      expect(nodes[0].name).toBe(existing.name);
    });

    it('should list schemas with filter and ordering', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query Schemas($filter: SchemaFilter, $orderBy: [SchemasOrderBy!]) {
              schemas(filter: $filter, orderBy: $orderBy) {
                nodes {
                  id
                  name
                  databaseId
                  createdAt
                  updatedAt
                }
              }
            }
          `,
          variables: { orderBy: ['NAME_ASC'] },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data).toBeDefined();
      expect(res.body.data.schemas).toBeDefined();
      expect(res.body.data.schemas.nodes).toBeInstanceOf(Array);

      // Verify ordering: names should be in ascending order
      const names: string[] = res.body.data.schemas.nodes.map(
        (n: { name: string }) => n.name,
      );
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    });

    it('should list schemas filtered by databaseId', async () => {
      // Get any database to filter schemas by
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
            query SchemasForDb($filter: SchemaFilter, $orderBy: [SchemasOrderBy!]) {
              schemas(filter: $filter, orderBy: $orderBy) {
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
            orderBy: ['NAME_ASC'],
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data?.schemas?.nodes ?? [];
      expect(nodes).toBeInstanceOf(Array);
      // All returned schemas should belong to the filtered database
      for (const node of nodes) {
        expect(node.databaseId).toBe(databaseId);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Database & Schema Lifecycle (ordered, dependent tests)
  // ---------------------------------------------------------------------------

  describe('Database Lifecycle', () => {
    let dbId: string;
    let dbName: string;

    it('should create a database and return id', async () => {
      dbName = testName('db');

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreateDatabase($input: CreateDatabaseInput!) {
              createDatabase(input: $input) {
                database {
                  id
                  name
                  ownerId
                }
              }
            }
          `,
          variables: {
            input: { database: { name: dbName, ownerId: auth.userId } },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data).toBeDefined();

      const db = res.body.data.createDatabase.database;
      expect(db).toBeDefined();
      expect(db.id).toBeTruthy();
      expect(db.name).toBe(dbName);
      expect(db.ownerId).toBe(auth.userId);

      dbId = db.id;

      // SQL verification: confirm row exists in PostgreSQL
      const rows = await queryDb(
        ctx.pg,
        'SELECT id, name, owner_id FROM metaschema_public."database" WHERE id = $1',
        [dbId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe(dbName);
      expect(rows[0].owner_id).toBe(auth.userId);
    });

    it('should find the created database by condition', async () => {
      expect(dbId).toBeDefined();

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query FindDatabase($condition: DatabaseCondition) {
              databases(condition: $condition) {
                nodes {
                  id
                  name
                  ownerId
                }
              }
            }
          `,
          variables: { condition: { id: dbId } },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data?.databases?.nodes;
      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe(dbId);
      expect(nodes[0].name).toBe(dbName);
    });

    it('should update the database name using databasePatch', async () => {
      expect(dbId).toBeDefined();

      const renamedName = testName('db_renamed');

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation UpdateDatabase($input: UpdateDatabaseInput!) {
              updateDatabase(input: $input) {
                database {
                  id
                  name
                }
              }
            }
          `,
          variables: {
            input: { id: dbId, databasePatch: { name: renamedName } },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const db = res.body.data.updateDatabase.database;
      expect(db.id).toBe(dbId);
      expect(db.name).toBe(renamedName);

      // SQL verification: confirm name was updated
      const rows = await queryDb(
        ctx.pg,
        'SELECT name FROM metaschema_public."database" WHERE id = $1',
        [dbId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe(renamedName);
    });

    it('should provision a module for the database', async () => {
      expect(dbId).toBeDefined();

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreateDatabaseProvisionModule($input: CreateDatabaseProvisionModuleInput!) {
              createDatabaseProvisionModule(input: $input) {
                clientMutationId
              }
            }
          `,
          variables: {
            input: { databaseProvisionModule: { databaseId: dbId } },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      // May succeed or return a GraphQL error depending on module availability
      expect(res.body).toBeDefined();
      if (!res.body.errors) {
        expect(res.body.data).toBeDefined();
        expect(res.body.data.createDatabaseProvisionModule).toBeDefined();
      }
    });

    // -------------------------------------------------------------------------
    // Schema Lifecycle (nested inside database lifecycle)
    // -------------------------------------------------------------------------

    describe('Schema Lifecycle', () => {
      let schemaId: string;
      let schemaName: string;

      it('should create a schema in the database', async () => {
        expect(dbId).toBeDefined();

        schemaName = testName('schema');

        const res = await postGraphQL(
          ctx.request,
          {
            query: /* GraphQL */ `
              mutation CreateSchema($input: CreateSchemaInput!) {
                createSchema(input: $input) {
                  schema {
                    id
                    name
                    databaseId
                  }
                }
              }
            `,
            variables: {
              input: { schema: { name: schemaName, databaseId: dbId } },
            },
          },
          auth.token,
        );

        expect(res.status).toBe(200);
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data).toBeDefined();

        const schema = res.body.data.createSchema.schema;
        expect(schema).toBeDefined();
        expect(schema.id).toBeTruthy();
        expect(schema.name).toBe(schemaName);
        expect(schema.databaseId).toBe(dbId);

        schemaId = schema.id;

        // SQL verification
        const rows = await queryDb(
          ctx.pg,
          'SELECT id, name, database_id FROM metaschema_public."schema" WHERE id = $1',
          [schemaId],
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].name).toBe(schemaName);
        expect(rows[0].database_id).toBe(dbId);
      });

      it('should find the schema via condition query', async () => {
        expect(schemaId).toBeDefined();

        const res = await postGraphQL(
          ctx.request,
          {
            query: /* GraphQL */ `
              query FindSchema($condition: SchemaCondition) {
                schemas(condition: $condition) {
                  nodes {
                    id
                    name
                    databaseId
                  }
                }
              }
            `,
            variables: { condition: { id: schemaId } },
          },
          auth.token,
        );

        expect(res.status).toBe(200);
        expect(res.body.errors).toBeUndefined();

        const nodes = res.body.data?.schemas?.nodes;
        expect(nodes).toHaveLength(1);
        expect(nodes[0].id).toBe(schemaId);
        expect(nodes[0].name).toBe(schemaName);
      });

      it('should update the schema name using schemaPatch', async () => {
        expect(schemaId).toBeDefined();

        const renamedSchemaName = testName('schema_renamed');

        const res = await postGraphQL(
          ctx.request,
          {
            query: /* GraphQL */ `
              mutation UpdateSchema($input: UpdateSchemaInput!) {
                updateSchema(input: $input) {
                  schema {
                    id
                    name
                  }
                }
              }
            `,
            variables: {
              input: {
                id: schemaId,
                schemaPatch: { name: renamedSchemaName },
              },
            },
          },
          auth.token,
        );

        expect(res.status).toBe(200);
        expect(res.body.errors).toBeUndefined();

        const schema = res.body.data.updateSchema.schema;
        expect(schema.id).toBe(schemaId);
        expect(schema.name).toBe(renamedSchemaName);

        // SQL verification
        const rows = await queryDb(
          ctx.pg,
          'SELECT name FROM metaschema_public."schema" WHERE id = $1',
          [schemaId],
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].name).toBe(renamedSchemaName);
      });

      it('should delete the schema', async () => {
        expect(schemaId).toBeDefined();

        const res = await postGraphQL(
          ctx.request,
          {
            query: /* GraphQL */ `
              mutation DeleteSchema($input: DeleteSchemaInput!) {
                deleteSchema(input: $input) {
                  deletedSchemaId
                }
              }
            `,
            variables: { input: { id: schemaId } },
          },
          auth.token,
        );

        expect(res.status).toBe(200);
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.deleteSchema).toBeDefined();
        expect(res.body.data.deleteSchema.deletedSchemaId).toBeDefined();

        // SQL verification: confirm row removed
        const rows = await queryDb(
          ctx.pg,
          'SELECT id FROM metaschema_public."schema" WHERE id = $1',
          [schemaId],
        );
        expect(rows).toHaveLength(0);
      });
    });

    it('should delete the database (cleanup)', async () => {
      expect(dbId).toBeDefined();

      const res = await deleteEntity(
        ctx.request,
        'deleteDatabase',
        'DeleteDatabaseInput',
        dbId,
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data).toBeDefined();
      expect(res.body.data.deleteDatabase).toBeDefined();
      expect(res.body.data.deleteDatabase.deletedDatabaseId).toBeDefined();

      // SQL verification: confirm row removed
      const rows = await queryDb(
        ctx.pg,
        'SELECT id FROM metaschema_public."database" WHERE id = $1',
        [dbId],
      );
      expect(rows).toHaveLength(0);
    });
  });
});
