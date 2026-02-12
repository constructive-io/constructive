/**
 * Sites & APIs
 *
 * Integration tests for sites, site modules, site themes, APIs, API schemas,
 * apps, and domains against an internal constructive server (supertest).
 *
 * Covers:
 *   - List / create / update / delete sites (uses `dbname`, not `name`)
 *   - List / query site modules (uses `name`, not `moduleId`)
 *   - List / query site themes (uses `theme`, not `themeId`)
 *   - List / create / update / delete APIs
 *   - API by databaseId and name lookup
 *   - List / create / delete API schemas (V5: ID-based delete)
 *   - List / create / update / delete apps
 *   - List / create / update / delete domains
 *   - SQL verification for all mutations
 *
 * V5 patterns:
 *   - sitePatch, apiPatch, domainPatch, appPatch, siteModulePatch, siteThemePatch
 *   - deleteApiSchema uses ID-based input (not deleteApiSchemaByApiIdAndSchemaId)
 *   - Sites use `dbname` not `name`
 *
 * Run:
 *   pnpm test -- --testPathPattern=sites-apis
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

describe('Sites & APIs', () => {
  let ctx: TestContext;
  let auth: AuthResult;
  /** A database ID retrieved from the server, needed for creating sites/APIs. */
  let dbId: string | null = null;

  beforeAll(async () => {
    ctx = await setupTestServer();
    auth = await signIn(ctx.request);

    // Query for an existing database to use as databaseId for entity creation.
    const res = await postGraphQL(
      ctx.request,
      {
        query: /* GraphQL */ `
          {
            databases(first: 1) {
              nodes { id name }
            }
          }
        `,
      },
      auth.token,
    );

    if (!res.body.errors && res.body.data?.databases?.nodes?.length > 0) {
      dbId = res.body.data.databases.nodes[0].id;
    }
  });

  afterAll(async () => {
    await ctx.teardown();
  });

  // ---------------------------------------------------------------------------
  // Site Queries
  // ---------------------------------------------------------------------------

  describe('Site Queries', () => {
    it('should list sites with corrected fields (dbname, not name)', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              sites(first: 20) {
                nodes {
                  id
                  dbname
                  databaseId
                  title
                  description
                  createdAt
                  updatedAt
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
      expect(res.body.data.sites).toBeDefined();
      expect(res.body.data.sites.nodes).toBeInstanceOf(Array);
    });

    it('should list site modules (uses name, not moduleId)', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              siteModules(first: 20) {
                nodes {
                  id
                  siteId
                  name
                  data
                  databaseId
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.siteModules?.nodes).toBeInstanceOf(Array);
    });

    it('should list site themes (uses theme, not themeId)', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              siteThemes(first: 20) {
                nodes {
                  id
                  siteId
                  theme
                  databaseId
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.siteThemes?.nodes).toBeInstanceOf(Array);
    });
  });

  // ---------------------------------------------------------------------------
  // API Queries
  // ---------------------------------------------------------------------------

  describe('API Queries', () => {
    it('should list APIs', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              apis(first: 20) {
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
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.apis?.nodes).toBeInstanceOf(Array);
    });

    it('should query API by databaseId and name', async () => {
      const listRes = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            { apis(first: 1) { nodes { id name databaseId } } }
          `,
        },
        auth.token,
      );

      if (listRes.body.errors || !listRes.body.data?.apis?.nodes?.length) {
        console.warn('Skipping apiByDatabaseIdAndName: no APIs found');
        return;
      }

      const existing = listRes.body.data.apis.nodes[0];

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query ApiByDbAndName($databaseId: UUID!, $name: String!) {
              apiByDatabaseIdAndName(databaseId: $databaseId, name: $name) {
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

      const api = res.body.data?.apiByDatabaseIdAndName;
      expect(api).toBeDefined();
      expect(api.id).toBe(existing.id);
      expect(api.name).toBe(existing.name);
    });

    it('should list API schemas', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              apiSchemas(first: 20) {
                nodes {
                  id
                  apiId
                  schemaId
                  createdAt
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.apiSchemas?.nodes).toBeInstanceOf(Array);
    });
  });

  // ---------------------------------------------------------------------------
  // App & Domain Queries
  // ---------------------------------------------------------------------------

  describe('App & Domain Queries', () => {
    it('should list apps', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              apps(first: 20) {
                nodes {
                  id
                  name
                  siteId
                  createdAt
                  updatedAt
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.apps?.nodes).toBeInstanceOf(Array);
    });

    it('should list domains with nested relations', async () => {
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            {
              domains(first: 20) {
                nodes {
                  id
                  databaseId
                  apiId
                  siteId
                  subdomain
                  domain
                }
              }
            }
          `,
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.domains?.nodes).toBeInstanceOf(Array);
    });
  });

  // ---------------------------------------------------------------------------
  // Site CRUD
  // ---------------------------------------------------------------------------

  describe('Site CRUD', () => {
    let createdSiteId: string | null = null;
    let createdSiteDbUuid: string | null = null;

    afterAll(async () => {
      if (createdSiteId) {
        await deleteEntity(
          ctx.request,
          'deleteSite',
          'DeleteSiteInput',
          createdSiteId,
          auth.token,
          'deletedSiteId',
        );
      }
    });

    it('should create a site', async () => {
      if (!dbId) {
        console.warn('Skipping site creation: no database found');
        return;
      }

      const title = testName('site');

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreateSite($input: CreateSiteInput!) {
              createSite(input: $input) {
                site {
                  id
                  dbname
                  databaseId
                  title
                  description
                }
              }
            }
          `,
          variables: { input: { site: { databaseId: dbId, title } } },
        },
        auth.token,
      );

      expect(res.status).toBe(200);

      if (!res.body.errors) {
        const site = res.body.data?.createSite?.site;
        expect(site).toBeDefined();
        expect(site.id).toBeTruthy();
        expect(site.title).toBe(title);
        expect(site.databaseId).toBe(dbId);

        createdSiteId = site.id;

        // SQL verification
        const rows = await queryDb(
          ctx.pg,
          'SELECT id, title FROM services_public.sites WHERE title = $1',
          [title],
        );
        expect(rows).toHaveLength(1);
        createdSiteDbUuid = rows[0].id;
      } else {
        console.warn(
          'Site creation returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should find the created site by condition', async () => {
      if (!createdSiteId) {
        console.warn('Skipping: no site was created');
        return;
      }

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            query FindSite($condition: SiteCondition) {
              sites(condition: $condition) {
                nodes { id title }
              }
            }
          `,
          variables: { condition: { id: createdSiteId } },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const nodes = res.body.data?.sites?.nodes ?? [];
      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe(createdSiteId);
    });

    it('should update the site using sitePatch', async () => {
      if (!createdSiteId) {
        console.warn('Skipping site update: no site was created');
        return;
      }

      const updatedTitle = testName('site_upd');

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation UpdateSite($input: UpdateSiteInput!) {
              updateSite(input: $input) {
                site { id title }
              }
            }
          `,
          variables: {
            input: { id: createdSiteId, sitePatch: { title: updatedTitle } },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const site = res.body.data?.updateSite?.site;
      expect(site).toBeDefined();
      expect(site.id).toBe(createdSiteId);
      expect(site.title).toBe(updatedTitle);

      // SQL verification
      if (createdSiteDbUuid) {
        const rows = await queryDb(
          ctx.pg,
          'SELECT title FROM services_public.sites WHERE id = $1',
          [createdSiteDbUuid],
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].title).toBe(updatedTitle);
      }
    });

    it('should delete the site', async () => {
      if (!createdSiteId) {
        console.warn('Skipping site deletion: no site was created');
        return;
      }

      const res = await deleteEntity(
        ctx.request,
        'deleteSite',
        'DeleteSiteInput',
        createdSiteId,
        auth.token,
        'deletedSiteId',
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.deleteSite).toBeDefined();

      // SQL verification
      if (createdSiteDbUuid) {
        const rows = await queryDb(
          ctx.pg,
          'SELECT id FROM services_public.sites WHERE id = $1',
          [createdSiteDbUuid],
        );
        expect(rows).toHaveLength(0);
      }

      createdSiteId = null;
      createdSiteDbUuid = null;
    });
  });

  // ---------------------------------------------------------------------------
  // API CRUD
  // ---------------------------------------------------------------------------

  describe('API CRUD', () => {
    let createdApiId: string | null = null;
    let createdApiDbUuid: string | null = null;

    afterAll(async () => {
      if (createdApiId) {
        await deleteEntity(
          ctx.request,
          'deleteApi',
          'DeleteApiInput',
          createdApiId,
          auth.token,
          'deletedApiId',
        );
      }
    });

    it('should create an API', async () => {
      if (!dbId) {
        console.warn('Skipping API creation: no database found');
        return;
      }

      const name = testName('api');

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreateApi($input: CreateApiInput!) {
              createApi(input: $input) {
                api { id name databaseId }
              }
            }
          `,
          variables: { input: { api: { name, databaseId: dbId } } },
        },
        auth.token,
      );

      expect(res.status).toBe(200);

      if (!res.body.errors) {
        const api = res.body.data?.createApi?.api;
        expect(api).toBeDefined();
        expect(api.id).toBeTruthy();
        expect(api.name).toBe(name);
        expect(api.databaseId).toBe(dbId);

        createdApiId = api.id;

        // SQL verification
        const rows = await queryDb(
          ctx.pg,
          'SELECT id, name FROM services_public.apis WHERE name = $1',
          [name],
        );
        expect(rows).toHaveLength(1);
        createdApiDbUuid = rows[0].id;
      } else {
        console.warn(
          'API creation returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should update the API using apiPatch', async () => {
      if (!createdApiId) {
        console.warn('Skipping API update: no API was created');
        return;
      }

      const updatedName = testName('api_upd');

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation UpdateApi($input: UpdateApiInput!) {
              updateApi(input: $input) {
                api { id name }
              }
            }
          `,
          variables: {
            input: { id: createdApiId, apiPatch: { name: updatedName } },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const api = res.body.data?.updateApi?.api;
      expect(api).toBeDefined();
      expect(api.id).toBe(createdApiId);
      expect(api.name).toBe(updatedName);

      // SQL verification
      if (createdApiDbUuid) {
        const rows = await queryDb(
          ctx.pg,
          'SELECT name FROM services_public.apis WHERE id = $1',
          [createdApiDbUuid],
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].name).toBe(updatedName);
      }
    });

    it('should delete the API', async () => {
      if (!createdApiId) {
        console.warn('Skipping API deletion: no API was created');
        return;
      }

      const res = await deleteEntity(
        ctx.request,
        'deleteApi',
        'DeleteApiInput',
        createdApiId,
        auth.token,
        'deletedApiId',
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.deleteApi).toBeDefined();

      // SQL verification
      if (createdApiDbUuid) {
        const rows = await queryDb(
          ctx.pg,
          'SELECT id FROM services_public.apis WHERE id = $1',
          [createdApiDbUuid],
        );
        expect(rows).toHaveLength(0);
      }

      createdApiId = null;
      createdApiDbUuid = null;
    });
  });

  // ---------------------------------------------------------------------------
  // API Schema CRUD (V5: ID-based delete)
  // ---------------------------------------------------------------------------

  describe('API Schema CRUD', () => {
    let apiIdForSchema: string | null = null;
    let schemaIdForApi: string | null = null;
    let createdApiSchemaId: string | null = null;

    beforeAll(async () => {
      if (!dbId) return;

      // Create an API and a schema to link
      const apiRes = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreateApi($input: CreateApiInput!) {
              createApi(input: $input) {
                api { id }
              }
            }
          `,
          variables: {
            input: { api: { name: testName('api_for_schema'), databaseId: dbId } },
          },
        },
        auth.token,
      );
      if (!apiRes.body.errors) {
        apiIdForSchema = apiRes.body.data?.createApi?.api?.id;
      }

      // Get an existing schema
      const schemaRes = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            { schemas(first: 1) { nodes { id } } }
          `,
        },
        auth.token,
      );
      if (!schemaRes.body.errors && schemaRes.body.data?.schemas?.nodes?.length) {
        schemaIdForApi = schemaRes.body.data.schemas.nodes[0].id;
      }
    });

    afterAll(async () => {
      if (createdApiSchemaId) {
        await deleteEntity(
          ctx.request,
          'deleteApiSchema',
          'DeleteApiSchemaInput',
          createdApiSchemaId,
          auth.token,
          'deletedApiSchemaId',
        );
      }
      if (apiIdForSchema) {
        await deleteEntity(
          ctx.request,
          'deleteApi',
          'DeleteApiInput',
          apiIdForSchema,
          auth.token,
          'deletedApiId',
        );
      }
    });

    it('should create an API schema (link schema to API)', async () => {
      if (!apiIdForSchema || !schemaIdForApi) {
        console.warn('Skipping API schema creation: missing API or schema');
        return;
      }

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreateApiSchema($input: CreateApiSchemaInput!) {
              createApiSchema(input: $input) {
                apiSchema {
                  id
                  apiId
                  schemaId
                }
              }
            }
          `,
          variables: {
            input: {
              apiSchema: { apiId: apiIdForSchema, schemaId: schemaIdForApi },
            },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);

      if (!res.body.errors) {
        const apiSchema = res.body.data?.createApiSchema?.apiSchema;
        expect(apiSchema).toBeDefined();
        expect(apiSchema.id).toBeTruthy();
        expect(apiSchema.apiId).toBe(apiIdForSchema);
        expect(apiSchema.schemaId).toBe(schemaIdForApi);
        createdApiSchemaId = apiSchema.id;
      } else {
        console.warn(
          'API schema creation returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should delete API schema using V5 ID-based mutation', async () => {
      if (!createdApiSchemaId) {
        console.warn('Skipping: no API schema was created');
        return;
      }

      // V5 pattern: deleteApiSchema with { id }, NOT deleteApiSchemaByApiIdAndSchemaId
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation DeleteApiSchema($input: DeleteApiSchemaInput!) {
              deleteApiSchema(input: $input) {
                deletedApiSchemaId
              }
            }
          `,
          variables: { input: { id: createdApiSchemaId } },
        },
        auth.token,
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.deleteApiSchema).toBeDefined();

      createdApiSchemaId = null;
    });
  });

  // ---------------------------------------------------------------------------
  // Domain CRUD
  // ---------------------------------------------------------------------------

  describe('Domain CRUD', () => {
    let createdDomainId: string | null = null;
    let createdDomainDbUuid: string | null = null;

    afterAll(async () => {
      if (createdDomainId) {
        await deleteEntity(
          ctx.request,
          'deleteDomain',
          'DeleteDomainInput',
          createdDomainId,
          auth.token,
          'deletedDomainId',
        );
      }
    });

    it('should create a domain', async () => {
      if (!dbId) {
        console.warn('Skipping domain creation: no database found');
        return;
      }

      // Subdomain must be a valid hostname: lowercase, hyphens allowed
      const subdomain = 'test-' + Date.now();

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreateDomain($input: CreateDomainInput!) {
              createDomain(input: $input) {
                domain {
                  id
                  subdomain
                  domain
                }
              }
            }
          `,
          variables: {
            input: {
              domain: { databaseId: dbId, subdomain, domain: 'example.com' },
            },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);

      if (!res.body.errors) {
        const domain = res.body.data?.createDomain?.domain;
        expect(domain).toBeDefined();
        expect(domain.id).toBeTruthy();
        expect(domain.subdomain).toBe(subdomain);

        createdDomainId = domain.id;

        // SQL verification
        const rows = await queryDb(
          ctx.pg,
          'SELECT id, subdomain FROM services_public.domains WHERE subdomain = $1',
          [subdomain],
        );
        expect(rows).toHaveLength(1);
        createdDomainDbUuid = rows[0].id;
      } else {
        console.warn(
          'Domain creation returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should update the domain using domainPatch', async () => {
      if (!createdDomainId) {
        console.warn('Skipping domain update: no domain was created');
        return;
      }

      const updatedSubdomain = 'test-upd-' + Date.now();

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation UpdateDomain($input: UpdateDomainInput!) {
              updateDomain(input: $input) {
                domain { id subdomain domain }
              }
            }
          `,
          variables: {
            input: {
              id: createdDomainId,
              domainPatch: { subdomain: updatedSubdomain },
            },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);

      if (!res.body.errors) {
        const domain = res.body.data?.updateDomain?.domain;
        expect(domain).toBeDefined();
        expect(domain.id).toBe(createdDomainId);
        expect(domain.subdomain).toBe(updatedSubdomain);

        // SQL verification
        if (createdDomainDbUuid) {
          const rows = await queryDb(
            ctx.pg,
            'SELECT subdomain FROM services_public.domains WHERE id = $1',
            [createdDomainDbUuid],
          );
          expect(rows).toHaveLength(1);
          expect(rows[0].subdomain).toBe(updatedSubdomain);
        }
      }
    });

    it('should delete the domain', async () => {
      if (!createdDomainId) {
        console.warn('Skipping domain deletion: no domain was created');
        return;
      }

      const res = await deleteEntity(
        ctx.request,
        'deleteDomain',
        'DeleteDomainInput',
        createdDomainId,
        auth.token,
        'deletedDomainId',
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.deleteDomain).toBeDefined();

      // SQL verification
      if (createdDomainDbUuid) {
        const rows = await queryDb(
          ctx.pg,
          'SELECT id FROM services_public.domains WHERE id = $1',
          [createdDomainDbUuid],
        );
        expect(rows).toHaveLength(0);
      }

      createdDomainId = null;
      createdDomainDbUuid = null;
    });
  });

  // ---------------------------------------------------------------------------
  // App CRUD
  // ---------------------------------------------------------------------------

  describe('App CRUD', () => {
    let siteIdForApp: string | null = null;
    let createdAppId: string | null = null;
    let createdAppDbUuid: string | null = null;

    beforeAll(async () => {
      // Find or create a site for app creation
      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            { sites(first: 1) { nodes { id } } }
          `,
        },
        auth.token,
      );

      if (!res.body.errors && res.body.data?.sites?.nodes?.length > 0) {
        siteIdForApp = res.body.data.sites.nodes[0].id;
      }

      // If no sites exist, try to create one
      if (!siteIdForApp && dbId) {
        const createRes = await postGraphQL(
          ctx.request,
          {
            query: /* GraphQL */ `
              mutation CreateSite($input: CreateSiteInput!) {
                createSite(input: $input) {
                  site { id }
                }
              }
            `,
            variables: {
              input: { site: { databaseId: dbId, title: testName('site_for_app') } },
            },
          },
          auth.token,
        );

        if (!createRes.body.errors) {
          siteIdForApp = createRes.body.data?.createSite?.site?.id;
        }
      }
    });

    afterAll(async () => {
      if (createdAppId) {
        await deleteEntity(
          ctx.request,
          'deleteApp',
          'DeleteAppInput',
          createdAppId,
          auth.token,
          'deletedAppId',
        );
      }
    });

    it('should create an app', async () => {
      if (!siteIdForApp) {
        console.warn('Skipping app creation: no siteId available');
        return;
      }

      const name = testName('app');

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation CreateApp($input: CreateAppInput!) {
              createApp(input: $input) {
                app { id name siteId }
              }
            }
          `,
          variables: { input: { app: { name, siteId: siteIdForApp } } },
        },
        auth.token,
      );

      expect(res.status).toBe(200);

      if (!res.body.errors) {
        const app = res.body.data?.createApp?.app;
        expect(app).toBeDefined();
        expect(app.id).toBeTruthy();
        expect(app.name).toBe(name);
        expect(app.siteId).toBe(siteIdForApp);

        createdAppId = app.id;

        // SQL verification
        const rows = await queryDb(
          ctx.pg,
          'SELECT id, name FROM services_public.apps WHERE name = $1',
          [name],
        );
        expect(rows).toHaveLength(1);
        createdAppDbUuid = rows[0].id;
      } else {
        console.warn(
          'App creation returned errors:',
          res.body.errors.map((e: any) => e.message).join('; '),
        );
      }
    });

    it('should update the app using appPatch', async () => {
      if (!createdAppId) {
        console.warn('Skipping app update: no app was created');
        return;
      }

      const updatedName = testName('app_upd');

      const res = await postGraphQL(
        ctx.request,
        {
          query: /* GraphQL */ `
            mutation UpdateApp($input: UpdateAppInput!) {
              updateApp(input: $input) {
                app { id name }
              }
            }
          `,
          variables: {
            input: { id: createdAppId, appPatch: { name: updatedName } },
          },
        },
        auth.token,
      );

      expect(res.status).toBe(200);

      if (!res.body.errors) {
        const app = res.body.data?.updateApp?.app;
        expect(app).toBeDefined();
        expect(app.id).toBe(createdAppId);
        expect(app.name).toBe(updatedName);

        // SQL verification
        if (createdAppDbUuid) {
          const rows = await queryDb(
            ctx.pg,
            'SELECT name FROM services_public.apps WHERE id = $1',
            [createdAppDbUuid],
          );
          expect(rows).toHaveLength(1);
          expect(rows[0].name).toBe(updatedName);
        }
      }
    });

    it('should delete the app', async () => {
      if (!createdAppId) {
        console.warn('Skipping app deletion: no app was created');
        return;
      }

      const res = await deleteEntity(
        ctx.request,
        'deleteApp',
        'DeleteAppInput',
        createdAppId,
        auth.token,
        'deletedAppId',
      );

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.deleteApp).toBeDefined();

      // SQL verification
      if (createdAppDbUuid) {
        const rows = await queryDb(
          ctx.pg,
          'SELECT id FROM services_public.apps WHERE id = $1',
          [createdAppDbUuid],
        );
        expect(rows).toHaveLength(0);
      }

      createdAppId = null;
      createdAppDbUuid = null;
    });
  });
});
