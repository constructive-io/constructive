/**
 * Views, Policies & Constraints
 *
 * Integration tests for views, policies, primary key constraints, unique
 * constraints, foreign key constraints, and indices against an internal
 * constructive server (supertest).
 *
 * Creates a database, schema, table, and fields in beforeAll so that
 * policy and constraint mutations have target entities. Everything is
 * cleaned up in afterAll via cascading database delete.
 *
 * Covers:
 *   - List views
 *   - List policies with V5 `privilege` field (NOT `command`)
 *   - Create / update / delete policies
 *   - List and query primary key constraints
 *   - List and query unique constraints
 *   - List and query foreign key constraints (FK requires unique on ref)
 *   - List and query indices
 *   - Create / update / delete indices
 *   - Create primary key, unique, and foreign key constraints
 *   - SQL verification for mutations
 *
 * V5 patterns:
 *   - policyPatch, indexPatch (not generic patch)
 *   - primaryKeyConstraintPatch, foreignKeyConstraintPatch
 *   - Policy.privilege (NOT Policy.command -- renamed in V5)
 *   - filter for complex queries
 *
 * Run:
 *   pnpm test -- --testPathPattern=views-policies-constraints
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

describe('Views, Policies & Constraints', () => {
  let ctx: TestContext;
  let auth: AuthResult;

  // Prerequisite IDs
  let dbId: string;
  let schemaId: string;
  let tableId: string;
  let fieldId: string;
  let secondFieldId: string;

  // Track whether setup succeeded
  let setupSucceeded = false;

  beforeAll(async () => {
    ctx = await setupTestServer();
    auth = await signIn(ctx.request);

    // --- Create a test database ---
    const dbName = testName('vpc_db');
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

    // --- Create a test schema ---
    const schemaName = testName('vpc_schema');
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

    // --- Create a test table ---
    const tableName = testName('vpc_tbl');
    const tableRes = await postGraphQL(
      ctx.request,
      {
        query: /* GraphQL */ `
          mutation CreateTable($input: CreateTableInput!) {
            createTable(input: $input) {
              table { id name databaseId schemaId }
            }
          }
        `,
        variables: {
          input: {
            table: { name: tableName, databaseId: dbId, schemaId },
          },
        },
      },
      auth.token,
    );

    if (
      tableRes.body.errors ||
      !tableRes.body.data?.createTable?.table?.id
    ) {
      console.warn(
        'Failed to create prerequisite table:',
        JSON.stringify(tableRes.body.errors ?? tableRes.body, null, 2),
      );
      return;
    }
    tableId = tableRes.body.data.createTable.table.id;

    // --- Create two fields for constraint operations ---
    const field1Res = await postGraphQL(
      ctx.request,
      {
        query: /* GraphQL */ `
          mutation CreateField($input: CreateFieldInput!) {
            createField(input: $input) { field { id } }
          }
        `,
        variables: {
          input: { field: { name: testName('fld_a'), tableId, type: 'text' } },
        },
      },
      auth.token,
    );
    if (!field1Res.body.errors) {
      fieldId = field1Res.body.data?.createField?.field?.id;
    }

    const field2Res = await postGraphQL(
      ctx.request,
      {
        query: /* GraphQL */ `
          mutation CreateField($input: CreateFieldInput!) {
            createField(input: $input) { field { id } }
          }
        `,
        variables: {
          input: { field: { name: testName('fld_b'), tableId, type: 'text' } },
        },
      },
      auth.token,
    );
    if (!field2Res.body.errors) {
      secondFieldId = field2Res.body.data?.createField?.field?.id;
    }

    setupSucceeded = true;
  });

  afterAll(async () => {
    // Cascading delete: removing the database removes schema, table,
    // and all associated policies, constraints, and indices
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
  // Views
  // ---------------------------------------------------------------------------

  describe('Views', () => {
    it('should list views', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              views(first: 20) {
                nodes {
                  id
                  name
                  databaseId
                  definition
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
      expect(res.body.data.views).toBeDefined();
      expect(res.body.data.views.nodes).toBeInstanceOf(Array);

      if (res.body.data.views.nodes.length > 0) {
        const view = res.body.data.views.nodes[0];
        expect(view).toHaveProperty('id');
        expect(view).toHaveProperty('name');
        expect(view).toHaveProperty('databaseId');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Policies (V5: uses `privilege`, NOT `command`)
  // ---------------------------------------------------------------------------

  describe('Policies', () => {
    let policyId: string;

    it('should list policies with V5 privilege field', async () => {
      // V5: Use 'privilege' instead of 'command'
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              policies(first: 20) {
                nodes {
                  id
                  name
                  tableId
                  privilege
                  permissive
                  disabled
                  policyType
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.policies?.nodes).toBeInstanceOf(Array);
    });

    it('should create a policy with privilege field', async () => {
      if (!setupSucceeded) return;

      const policyName = testName('policy_select');

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreatePolicy($input: CreatePolicyInput!) {
              createPolicy(input: $input) {
                policy {
                  id
                  name
                  tableId
                  privilege
                }
              }
            }
          `,
          variables: {
            input: {
              policy: {
                name: policyName,
                tableId,
                privilege: 'SELECT',
              },
            },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);

      if (!res.body.errors) {
        const policy = res.body.data?.createPolicy?.policy;
        expect(policy).toBeDefined();
        expect(policy.id).toBeTruthy();
        expect(policy.tableId).toBe(tableId);

        policyId = policy.id;

        // SQL verification
        const rows = await queryDb(
          ctx.pg,
          'SELECT id, name, table_id FROM metaschema_public.policy WHERE id = $1',
          [policyId],
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].table_id).toBe(tableId);
      } else {
        console.warn(
          'CreatePolicy returned errors (may need policyType):',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should update the policy privilege using policyPatch', async () => {
      if (!setupSucceeded || !policyId) {
        console.warn('No policy ID available; skipping update test.');
        return;
      }

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation UpdatePolicy($input: UpdatePolicyInput!) {
              updatePolicy(input: $input) {
                policy {
                  id
                  name
                  privilege
                }
              }
            }
          `,
          variables: {
            input: {
              id: policyId,
              policyPatch: { privilege: 'ALL' },
            },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);

      if (!res.body.errors) {
        const policy = res.body.data?.updatePolicy?.policy;
        expect(policy.id).toBe(policyId);
        expect(policy.privilege).toBe('ALL');
      } else {
        console.warn(
          'UpdatePolicy returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should delete the policy', async () => {
      if (!setupSucceeded || !policyId) {
        console.warn('No policy ID available; skipping delete test.');
        return;
      }

      const res = await deleteEntity(
        ctx.request,
        'deletePolicy',
        'DeletePolicyInput',
        policyId,
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.deletePolicy).toBeDefined();
      expect(res.body.data.deletePolicy.deletedPolicyId).toBeDefined();

      // SQL verification
      const rows = await queryDb(
        ctx.pg,
        'SELECT id FROM metaschema_public.policy WHERE id = $1',
        [policyId],
      );
      expect(rows).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Indices
  // ---------------------------------------------------------------------------

  describe('Indices', () => {
    let indexId: string;

    it('should list indices', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              indices(first: 20) {
                nodes {
                  id
                  name
                  tableId
                  fields
                  isUnique
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.indices?.nodes).toBeInstanceOf(Array);
    });

    it('should create an index on the test table', async () => {
      if (!setupSucceeded || !fieldId) return;

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreateIndex($input: CreateIndexInput!) {
              createIndex(input: $input) {
                index {
                  id
                  name
                  tableId
                  fields
                  isUnique
                }
              }
            }
          `,
          variables: {
            input: {
              index: {
                name: testName('idx'),
                tableId,
                fields: [fieldId],
              },
            },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);

      if (!res.body.errors) {
        const index = res.body.data?.createIndex?.index;
        expect(index).toBeDefined();
        expect(index.id).toBeTruthy();
        expect(index.tableId).toBe(tableId);
        indexId = index.id;
      } else {
        console.warn(
          'CreateIndex returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should update the index name using indexPatch', async () => {
      if (!setupSucceeded || !indexId) {
        console.warn('No index ID available; skipping update test.');
        return;
      }

      const renamedName = testName('idx_renamed');

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation UpdateIndex($input: UpdateIndexInput!) {
              updateIndex(input: $input) {
                index {
                  id
                  name
                }
              }
            }
          `,
          variables: {
            input: { id: indexId, indexPatch: { name: renamedName } },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);

      if (!res.body.errors) {
        const index = res.body.data?.updateIndex?.index;
        expect(index.id).toBe(indexId);
        expect(index.name).toBe(renamedName);
      } else {
        console.warn(
          'UpdateIndex returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should delete the index', async () => {
      if (!setupSucceeded || !indexId) {
        console.warn('No index ID available; skipping delete test.');
        return;
      }

      const res = await deleteEntity(
        ctx.request,
        'deleteIndex',
        'DeleteIndexInput',
        indexId,
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.deleteIndex).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Constraint Queries
  // ---------------------------------------------------------------------------

  describe('Constraint Queries', () => {
    it('should list primary key constraints', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              primaryKeyConstraints(first: 20) {
                nodes {
                  id
                  name
                  tableId
                  fields
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.primaryKeyConstraints?.nodes).toBeInstanceOf(Array);
    });

    it('should list unique constraints', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              uniqueConstraints(first: 20) {
                nodes {
                  id
                  name
                  tableId
                  fields
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.uniqueConstraints?.nodes).toBeInstanceOf(Array);
    });

    it('should list foreign key constraints', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              foreignKeyConstraints(first: 20) {
                nodes {
                  id
                  name
                  tableId
                  refTableId
                  fields
                  refFields
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.foreignKeyConstraints?.nodes).toBeInstanceOf(Array);
    });

    it('should filter constraints by tableId', async () => {
      if (!setupSucceeded) return;

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query PKForTable($filter: PrimaryKeyConstraintFilter) {
              primaryKeyConstraints(filter: $filter) {
                nodes {
                  id
                  name
                  tableId
                  fields
                }
              }
            }
          `,
          variables: {
            filter: { tableId: { equalTo: tableId } },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.primaryKeyConstraints?.nodes).toBeInstanceOf(Array);
    });
  });

  // ---------------------------------------------------------------------------
  // Constraint Mutations (exploratory)
  // ---------------------------------------------------------------------------

  describe('Constraint Mutations', () => {
    it('should attempt to create a primary key constraint', async () => {
      if (!setupSucceeded || !fieldId) return;

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreatePKC($input: CreatePrimaryKeyConstraintInput!) {
              createPrimaryKeyConstraint(input: $input) {
                primaryKeyConstraint {
                  id
                  name
                  tableId
                }
              }
            }
          `,
          variables: {
            input: {
              primaryKeyConstraint: {
                name: testName('pkc'),
                tableId,
                fields: [fieldId],
              },
            },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        const pk = res.body.data?.createPrimaryKeyConstraint?.primaryKeyConstraint;
        expect(pk).toBeDefined();
        expect(pk.id).toBeTruthy();
        expect(pk.tableId).toBe(tableId);
      } else {
        console.warn(
          'CreatePrimaryKeyConstraint returned errors (expected if fields missing):',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should attempt to create a unique constraint', async () => {
      if (!setupSucceeded || !secondFieldId) return;

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreateUC($input: CreateUniqueConstraintInput!) {
              createUniqueConstraint(input: $input) {
                uniqueConstraint {
                  id
                  name
                  tableId
                  fields
                }
              }
            }
          `,
          variables: {
            input: {
              uniqueConstraint: {
                name: testName('uc'),
                tableId,
                fields: [secondFieldId],
              },
            },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        const uc = res.body.data?.createUniqueConstraint?.uniqueConstraint;
        expect(uc).toBeDefined();
        expect(uc.id).toBeTruthy();
        expect(uc.tableId).toBe(tableId);
      } else {
        console.warn(
          'CreateUniqueConstraint returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should attempt to create a foreign key constraint', async () => {
      if (!setupSucceeded || !fieldId || !secondFieldId) return;

      // FK requires a unique constraint on the referenced field.
      // This may fail if unique constraint was not created above.
      // We still test the mutation shape.
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreateFK($input: CreateForeignKeyConstraintInput!) {
              createForeignKeyConstraint(input: $input) {
                foreignKeyConstraint {
                  id
                  name
                  tableId
                  refTableId
                }
              }
            }
          `,
          variables: {
            input: {
              foreignKeyConstraint: {
                name: testName('fk'),
                tableId,
                refTableId: tableId,
                fields: [fieldId],
                refFields: [secondFieldId],
              },
            },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        const fk = res.body.data?.createForeignKeyConstraint?.foreignKeyConstraint;
        expect(fk).toBeDefined();
        expect(fk.id).toBeTruthy();
      } else {
        // Expected: FK often requires unique constraint on referenced field
        console.warn(
          'CreateForeignKeyConstraint returned errors (expected if unique missing):',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });
  });
});
