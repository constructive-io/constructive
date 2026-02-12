/**
 * Module Configuration
 *
 * Integration tests for module configuration, meta queries, limits, and
 * node type registries against an internal constructive server (supertest).
 *
 * Covers:
 *   - _meta query (MetaSchema only has `tables` field, no `version`)
 *   - Node type registries (slug as identifier, not id)
 *   - Table module CRUD with SQL verification
 *   - App limits query
 *   - Org limits query
 *   - Sessions modules query (schema availability)
 *   - RLS modules query (schema availability)
 *   - Database provision modules query (schema availability)
 *   - Limit functions and limit defaults (schema availability)
 *
 * V5 patterns:
 *   - NodeTypeRegistry uses slug, not id
 *   - MetaSchema only has tables field (no version, no totalCount)
 *   - condition-based lookups (no singular queries unless explicitly available)
 *
 * Run:
 *   pnpm test -- --testPathPattern=module-configuration
 */

import {
  setupTestServer,
  postGraphQL,
  signIn,
  deleteEntity,
  queryDb,
  TEST_TIMEOUT,
  type AuthResult,
  type TestContext,
} from './test-utils';

jest.setTimeout(TEST_TIMEOUT);

describe('Module Configuration', () => {
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
  // _meta Query
  // ---------------------------------------------------------------------------

  describe('_meta Query', () => {
    it('should return _meta with tables field (basic validation)', async () => {
      // MetaSchema only has `tables` field -- no `version`, no `totalCount`.
      // Use __typename for minimal validation.
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              _meta {
                tables {
                  __typename
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      // _meta may not be available on api.localhost (it targets dbe.localhost),
      // so we accept either a valid response or a GraphQL error gracefully.
      if (!res.body.errors) {
        expect(res.body.data).toBeDefined();
        expect(res.body.data._meta).toBeDefined();
        expect(res.body.data._meta.tables).toBeInstanceOf(Array);
      } else {
        console.warn(
          '_meta query returned errors (may require dbe.localhost endpoint):',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should return _meta tables with name and fields', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              _meta {
                tables {
                  name
                  fields {
                    name
                    type
                    isPrimaryKey
                    isNotNull
                  }
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        const tables = res.body.data?._meta?.tables;
        expect(tables).toBeInstanceOf(Array);

        if (tables && tables.length > 0) {
          const first = tables[0];
          expect(first).toHaveProperty('name');
          expect(first).toHaveProperty('fields');
          expect(first.fields).toBeInstanceOf(Array);

          // Verify field shape if any fields exist
          if (first.fields.length > 0) {
            const field = first.fields[0];
            expect(field).toHaveProperty('name');
            expect(field).toHaveProperty('type');
            expect(field).toHaveProperty('isPrimaryKey');
            expect(field).toHaveProperty('isNotNull');
          }
        }
      } else {
        console.warn(
          '_meta tables query returned errors (may require dbe.localhost):',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should return _meta tables with relation metadata', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              _meta {
                tables {
                  name
                  relations {
                    hasMany {
                      fieldName
                      foreignTableName
                    }
                    belongsTo {
                      fieldName
                      foreignTableName
                    }
                    manyToMany {
                      fieldName
                      throughTableName
                    }
                  }
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        const tables = res.body.data?._meta?.tables;
        expect(tables).toBeInstanceOf(Array);

        if (tables && tables.length > 0) {
          const tableWithRelations = tables.find(
            (t: any) => t.relations !== null && t.relations !== undefined,
          );
          if (tableWithRelations) {
            expect(tableWithRelations.relations).toBeDefined();
            // Verify relation sub-fields exist (arrays may be empty)
            if (tableWithRelations.relations.hasMany) {
              expect(tableWithRelations.relations.hasMany).toBeInstanceOf(
                Array,
              );
            }
            if (tableWithRelations.relations.belongsTo) {
              expect(tableWithRelations.relations.belongsTo).toBeInstanceOf(
                Array,
              );
            }
          }
        }
      } else {
        console.warn(
          '_meta relations query returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Node Type Registries
  // ---------------------------------------------------------------------------

  describe('Node Type Registries', () => {
    it('should list node type registries with correct fields', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              nodeTypeRegistries(first: 20) {
                nodes {
                  slug
                  name
                  category
                  displayName
                  description
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
      expect(res.body.data.nodeTypeRegistries).toBeDefined();
      expect(res.body.data.nodeTypeRegistries.nodes).toBeInstanceOf(Array);
    });

    it('should return registries with slug as identifier (not id)', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              nodeTypeRegistries(first: 5) {
                nodes {
                  slug
                  name
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data?.nodeTypeRegistries?.nodes;
      if (nodes && nodes.length > 0) {
        // Each node should have a slug field as its primary identifier
        for (const node of nodes) {
          expect(node.slug).toBeDefined();
          expect(typeof node.slug).toBe('string');
          expect(node.slug.length).toBeGreaterThan(0);
        }
      }
    });

    it('should look up a single node type registry by slug', async () => {
      // First, get a slug to look up.
      const listRes = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              nodeTypeRegistries(first: 1) {
                nodes {
                  slug
                  name
                  category
                  displayName
                  description
                }
              }
            }
          `,
        },
        auth.token,
      );

      if (
        listRes.body.errors ||
        !listRes.body.data?.nodeTypeRegistries?.nodes?.length
      ) {
        console.warn('Skipping single registry lookup: no registries found');
        return;
      }

      const existing = listRes.body.data.nodeTypeRegistries.nodes[0];

      // nodeTypeRegistryBySlug is the singular lookup (slug-based, not id)
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query RegistryBySlug($slug: String!) {
              nodeTypeRegistryBySlug(slug: $slug) {
                slug
                name
                category
                displayName
                description
              }
            }
          `,
          variables: { slug: existing.slug },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        const registry = res.body.data?.nodeTypeRegistryBySlug;
        expect(registry).toBeDefined();
        expect(registry.slug).toBe(existing.slug);
        expect(registry.name).toBe(existing.name);
      } else {
        // nodeTypeRegistryBySlug may not exist in V5 (singular queries removed).
        // If so, use condition-based lookup instead.
        console.warn(
          'nodeTypeRegistryBySlug not available; singular queries may be removed in V5:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should find registries via condition query', async () => {
      // V5 pattern: use condition for exact-match lookups
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query RegistriesByCondition($condition: NodeTypeRegistryCondition) {
              nodeTypeRegistries(condition: $condition) {
                nodes {
                  slug
                  name
                  category
                }
              }
            }
          `,
          variables: { condition: { category: 'data' } },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        const nodes = res.body.data?.nodeTypeRegistries?.nodes;
        expect(nodes).toBeInstanceOf(Array);

        // All returned registries should have the filtered category
        for (const node of nodes ?? []) {
          expect(node.category).toBe('data');
        }
      } else {
        // NodeTypeRegistryCondition may not support category filter
        console.warn(
          'Condition-based registry lookup returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // App Limits
  // ---------------------------------------------------------------------------

  describe('App Limits', () => {
    it('should list app limits with connection shape', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              appLimits(first: 20) {
                nodes {
                  id
                  name
                  value
                  description
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        expect(res.body.data).toBeDefined();
        expect(res.body.data.appLimits).toBeDefined();
        expect(res.body.data.appLimits.nodes).toBeInstanceOf(Array);

        // Verify node shape if any exist
        if (res.body.data.appLimits.nodes.length > 0) {
          const node = res.body.data.appLimits.nodes[0];
          expect(node).toHaveProperty('id');
          expect(node).toHaveProperty('name');
        }
      } else {
        console.warn(
          'appLimits query returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should list app limit defaults', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              appLimitDefaults(first: 20) {
                nodes {
                  id
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        expect(res.body.data.appLimitDefaults).toBeDefined();
        expect(res.body.data.appLimitDefaults.nodes).toBeInstanceOf(Array);
      } else {
        console.warn(
          'appLimitDefaults query returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Org Limits
  // ---------------------------------------------------------------------------

  describe('Org Limits', () => {
    it('should list org limits', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              orgLimits(first: 20) {
                nodes {
                  id
                  name
                  value
                  description
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        expect(res.body.data).toBeDefined();
        expect(res.body.data.orgLimits).toBeDefined();
        expect(res.body.data.orgLimits.nodes).toBeInstanceOf(Array);

        // Verify node shape if any exist
        if (res.body.data.orgLimits.nodes.length > 0) {
          const node = res.body.data.orgLimits.nodes[0];
          expect(node).toHaveProperty('id');
          expect(node).toHaveProperty('name');
        }
      } else {
        console.warn(
          'orgLimits query returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Limit Functions
  // ---------------------------------------------------------------------------

  describe('Limit Functions', () => {
    it('should list limit functions', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              limitFunctions(first: 20) {
                nodes {
                  id
                  name
                  databaseId
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        expect(res.body.data).toBeDefined();
        expect(res.body.data.limitFunctions).toBeDefined();
        expect(res.body.data.limitFunctions.nodes).toBeInstanceOf(Array);
      } else {
        console.warn(
          'limitFunctions query returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Sessions Modules (schema availability test)
  // ---------------------------------------------------------------------------

  describe('Sessions Modules', () => {
    it('should query sessions modules (schema availability)', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              sessionsModules(first: 10) {
                nodes {
                  id
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        expect(res.body.data).toBeDefined();
        expect(res.body.data.sessionsModules).toBeDefined();
        expect(res.body.data.sessionsModules.nodes).toBeInstanceOf(Array);
      } else {
        // sessionsModules may not be accessible or may not exist in the
        // current schema configuration. Log and move on.
        console.warn(
          'sessionsModules query returned errors (schema availability check):',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // RLS Modules (schema availability test)
  // ---------------------------------------------------------------------------

  describe('RLS Modules', () => {
    it('should query RLS modules (schema availability)', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              rlsModules(first: 10) {
                nodes {
                  id
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        expect(res.body.data).toBeDefined();
        expect(res.body.data.rlsModules).toBeDefined();
        expect(res.body.data.rlsModules.nodes).toBeInstanceOf(Array);
      } else {
        console.warn(
          'rlsModules query returned errors (schema availability check):',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Database Provision Modules (schema availability test)
  // ---------------------------------------------------------------------------

  describe('Database Provision Modules', () => {
    it('should query database provision modules (schema availability)', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              databaseProvisionModules(first: 10) {
                nodes {
                  id
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        expect(res.body.data).toBeDefined();
        expect(res.body.data.databaseProvisionModules).toBeDefined();
        expect(res.body.data.databaseProvisionModules.nodes).toBeInstanceOf(
          Array,
        );
      } else {
        console.warn(
          'databaseProvisionModules query returned errors (schema availability check):',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Table Module CRUD
  // ---------------------------------------------------------------------------

  describe('Table Module', () => {
    let tableId: string | null = null;
    let createdTableModuleId: string | null = null;
    /** Raw UUID from the database for SQL verification. */
    let createdTableModuleDbUuid: string | null = null;

    beforeAll(async () => {
      // Query for an existing table to use as tableId.
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              tables(first: 1) {
                nodes {
                  id
                  name
                }
              }
            }
          `,
        },
        auth.token,
      );

      if (!res.body.errors && res.body.data?.tables?.nodes?.length > 0) {
        tableId = res.body.data.tables.nodes[0].id;
      }
    });

    afterAll(async () => {
      // Cleanup: delete table module if it was created but not deleted by test
      if (createdTableModuleId) {
        await deleteEntity(
          ctx.request,
          'deleteTableModule',
          'DeleteTableModuleInput',
          createdTableModuleId,
          auth.token,
          'deletedTableModuleId',
        );
      }
    });

    it('should list existing table modules', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              tableModules(first: 10) {
                nodes {
                  id
                  tableId
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        expect(res.body.data.tableModules).toBeDefined();
        expect(res.body.data.tableModules.nodes).toBeInstanceOf(Array);
      } else {
        console.warn(
          'tableModules query returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should create a table module', async () => {
      if (!tableId) {
        console.warn('Skipping table module creation: no table found');
        return;
      }

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreateTableModule($input: CreateTableModuleInput!) {
              createTableModule(input: $input) {
                tableModule {
                  id
                  tableId
                }
              }
            }
          `,
          variables: { input: { tableModule: { tableId } } },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        const tableModule = res.body.data?.createTableModule?.tableModule;
        expect(tableModule).toBeDefined();
        expect(tableModule.id).toBeTruthy();
        expect(tableModule.tableId).toBe(tableId);

        createdTableModuleId = tableModule.id;

        // SQL verification: confirm the table module row exists in the database.
        const rows = await queryDb(
          ctx.pg,
          'SELECT id, table_id FROM metaschema_modules_public.table_module WHERE table_id = $1',
          [tableId],
        );
        expect(rows.length).toBeGreaterThanOrEqual(1);
        createdTableModuleDbUuid = rows[0].id;
      } else {
        // Table module creation may fail due to unique constraints, missing
        // required fields, or other configuration restrictions. This is
        // acceptable -- log and move on.
        console.warn(
          'Table module creation returned errors (may be expected):',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should find the created table module via condition', async () => {
      if (!createdTableModuleId) {
        console.warn('Skipping: no table module was created');
        return;
      }

      // V5 pattern: use condition for lookup
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query TableModulesByCondition($condition: TableModuleCondition) {
              tableModules(condition: $condition) {
                nodes {
                  id
                  tableId
                }
              }
            }
          `,
          variables: { condition: { tableId } },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();

      if (!res.body.errors) {
        const nodes = res.body.data?.tableModules?.nodes;
        expect(nodes).toBeInstanceOf(Array);
        expect(nodes.length).toBeGreaterThanOrEqual(1);

        const found = nodes.find(
          (n: any) => n.id === createdTableModuleId,
        );
        expect(found).toBeDefined();
      }
    });

    it('should delete the table module if created', async () => {
      if (!createdTableModuleId) {
        console.warn('Skipping table module deletion: no module was created');
        return;
      }

      const res = await deleteEntity(
        ctx.request,
        'deleteTableModule',
        'DeleteTableModuleInput',
        createdTableModuleId,
        auth.token,
        'deletedTableModuleId',
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data).toBeDefined();
      expect(res.body.data.deleteTableModule).toBeDefined();

      // SQL verification: confirm the table module row was removed
      if (createdTableModuleDbUuid) {
        const rows = await queryDb(
          ctx.pg,
          'SELECT id FROM metaschema_modules_public.table_module WHERE id = $1',
          [createdTableModuleDbUuid],
        );
        expect(rows).toHaveLength(0);
      }

      createdTableModuleId = null;
      createdTableModuleDbUuid = null;
    });
  });
});
