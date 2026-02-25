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

jest.setTimeout(30000);

describe('Sites & APIs', () => {
  let db: PgTestClient;
  let pg: PgTestClient;
  let query: GraphQLQueryFn;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;

  // Shared setup data for site/API FK requirements
  let databaseId: string;
  let schemaId: string;

  beforeAll(async () => {
    ({ db, pg, query, request, teardown } = await getTestConnections());

    // Create a database for site/API tests (needed as FK)
    const dbRes = await query<{
      createDatabase: { database: { id: string; name: string } };
    }>(
      `mutation($input: CreateDatabaseInput!) {
        createDatabase(input: $input) {
          database { id name }
        }
      }`,
      {
        input: {
          database: { name: `test-sites-db-${Date.now()}`, label: 'Sites Test DB' },
        },
      }
    );
    if (dbRes.errors) {
      throw new Error(`Setup failed (createDatabase): ${dbRes.errors[0].message}`);
    }
    databaseId = dbRes.data!.createDatabase.database.id;

    // Create a schema for API schema link tests
    const schemaRes = await query<{
      createSchema: { schema: { id: string; name: string } };
    }>(
      `mutation($input: CreateSchemaInput!) {
        createSchema(input: $input) {
          schema { id name }
        }
      }`,
      {
        input: {
          schema: {
            databaseId,
            name: 'test-schema',
            schemaName: 'test_schema_sites',
          },
        },
      }
    );
    if (schemaRes.errors) {
      throw new Error(`Setup failed (createSchema): ${schemaRes.errors[0].message}`);
    }
    schemaId = schemaRes.data!.createSchema.schema.id;
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(() => db.beforeEach());
  afterEach(() => db.afterEach());

  // -------------------------------------------------------------------------
  // site queries
  // -------------------------------------------------------------------------
  describe('site queries', () => {
    it('should list sites with corrected fields (dbname, title, description)', async () => {
      // V5: use 'dbname' not 'name'
      const res = await query<{
        sites: {
          totalCount: number;
          nodes: Array<{ id: string; dbname: string; title: string; description: string; databaseId: string }>;
        };
      }>(`
        query {
          sites(first: 5) {
            totalCount
            nodes { id dbname title description databaseId }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.sites.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should list site modules (uses name, not moduleId)', async () => {
      // V5: use 'name' not 'moduleId'
      const res = await query<{
        siteModules: {
          totalCount: number;
          nodes: Array<{ id: string; name: string; siteId: string }>;
        };
      }>(`
        query {
          siteModules(first: 5) {
            totalCount
            nodes { id name siteId }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.siteModules.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should list site themes (uses theme, not themeId)', async () => {
      // V5: use 'theme' not 'themeId'
      const res = await query<{
        siteThemes: {
          totalCount: number;
          nodes: Array<{ id: string; theme: string; siteId: string }>;
        };
      }>(`
        query {
          siteThemes(first: 5) {
            totalCount
            nodes { id theme siteId }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.siteThemes.totalCount).toBeGreaterThanOrEqual(0);
    });
  });

  // -------------------------------------------------------------------------
  // site CRUD
  // -------------------------------------------------------------------------
  describe('site CRUD', () => {
    let createdSiteId: string;

    it('should create a site', async () => {
      const res = await query<{
        createSite: { site: { id: string; dbname: string; title: string; databaseId: string } };
      }>(
        `mutation($input: CreateSiteInput!) {
          createSite(input: $input) {
            site { id dbname title databaseId }
          }
        }`,
        {
          input: {
            site: {
              dbname: `test_site_${Date.now()}`,
              title: 'Test Site',
              databaseId,
            },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const site = res.data!.createSite.site;
      expect(site.id).toBeDefined();
      expect(site.title).toBe('Test Site');
      expect(site.databaseId).toBe(databaseId);
      createdSiteId = site.id;
    });

    it('should find the created site by condition', async () => {
      expect(createdSiteId).toBeDefined();

      const res = await query<{
        sites: { nodes: Array<{ id: string; dbname: string; title: string }> };
      }>(
        `query($condition: SiteCondition) {
          sites(condition: $condition) {
            nodes { id dbname title }
          }
        }`,
        { condition: { id: createdSiteId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.sites.nodes.length).toBe(1);
      expect(res.data!.sites.nodes[0].id).toBe(createdSiteId);
    });

    it('should update the site using sitePatch', async () => {
      expect(createdSiteId).toBeDefined();

      const res = await query<{
        updateSite: { site: { id: string; title: string } };
      }>(
        `mutation($input: UpdateSiteInput!) {
          updateSite(input: $input) {
            site { id title }
          }
        }`,
        {
          input: {
            id: createdSiteId,
            sitePatch: { title: 'Updated Site Title' },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.updateSite.site.title).toBe('Updated Site Title');
    });

    it('should delete the site', async () => {
      expect(createdSiteId).toBeDefined();

      // V5: returns { site { id } }, not { deletedSiteId }
      const res = await query<{
        deleteSite: { site: { id: string } };
      }>(
        `mutation($input: DeleteSiteInput!) {
          deleteSite(input: $input) {
            site { id }
          }
        }`,
        { input: { id: createdSiteId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.deleteSite.site.id).toBe(createdSiteId);
    });
  });

  // -------------------------------------------------------------------------
  // API queries
  // -------------------------------------------------------------------------
  describe('API queries', () => {
    it('should list APIs with connection shape', async () => {
      const res = await query<{
        apis: {
          totalCount: number;
          nodes: Array<{ id: string; name: string; databaseId: string }>;
        };
      }>(`
        query {
          apis(first: 5) {
            totalCount
            nodes { id name databaseId }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.apis.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should list API schemas', async () => {
      const res = await query<{
        apiSchemas: {
          totalCount: number;
          nodes: Array<{ id: string; apiId: string; schemaId: string }>;
        };
      }>(`
        query {
          apiSchemas(first: 5) {
            totalCount
            nodes { id apiId schemaId }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.apiSchemas.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should list apps', async () => {
      const res = await query<{
        apps: {
          totalCount: number;
          nodes: Array<{ id: string; name: string; siteId: string }>;
        };
      }>(`
        query {
          apps(first: 5) {
            totalCount
            nodes { id name siteId }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.apps.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should list domains with nested relations', async () => {
      const res = await query<{
        domains: {
          totalCount: number;
          nodes: Array<{ id: string; subdomain: string; apiId: string }>;
        };
      }>(`
        query {
          domains(first: 5) {
            totalCount
            nodes { id subdomain apiId }
          }
        }
      `);

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.domains.totalCount).toBeGreaterThanOrEqual(0);
    });
  });

  // -------------------------------------------------------------------------
  // API CRUD
  // -------------------------------------------------------------------------
  describe('API CRUD', () => {
    let createdApiId: string;

    it('should create an API', async () => {
      const res = await query<{
        createApi: { api: { id: string; name: string; databaseId: string } };
      }>(
        `mutation($input: CreateApiInput!) {
          createApi(input: $input) {
            api { id name databaseId }
          }
        }`,
        {
          input: {
            api: {
              name: `test-api-${Date.now()}`,
              databaseId,
            },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const api = res.data!.createApi.api;
      expect(api.id).toBeDefined();
      expect(api.databaseId).toBe(databaseId);
      createdApiId = api.id;
    });

    it('should update the API using apiPatch', async () => {
      expect(createdApiId).toBeDefined();

      const res = await query<{
        updateApi: { api: { id: string; name: string } };
      }>(
        `mutation($input: UpdateApiInput!) {
          updateApi(input: $input) {
            api { id name }
          }
        }`,
        {
          input: {
            id: createdApiId,
            apiPatch: { name: 'updated-api-name' },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.updateApi.api.name).toBe('updated-api-name');
    });

    it('should delete the API', async () => {
      expect(createdApiId).toBeDefined();

      const res = await query<{
        deleteApi: { api: { id: string } };
      }>(
        `mutation($input: DeleteApiInput!) {
          deleteApi(input: $input) {
            api { id }
          }
        }`,
        { input: { id: createdApiId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.deleteApi.api.id).toBe(createdApiId);
    });
  });

  // -------------------------------------------------------------------------
  // API schema CRUD
  // -------------------------------------------------------------------------
  describe('API schema CRUD', () => {
    let apiId: string;
    let createdApiSchemaId: string;

    beforeAll(async () => {
      // Create an API for the schema link
      const apiRes = await query<{
        createApi: { api: { id: string } };
      }>(
        `mutation($input: CreateApiInput!) {
          createApi(input: $input) { api { id } }
        }`,
        {
          input: {
            api: { name: `api-for-schema-${Date.now()}`, databaseId },
          },
        }
      );
      if (apiRes.errors) {
        throw new Error(`Setup failed (createApi for schema): ${apiRes.errors[0].message}`);
      }
      apiId = apiRes.data!.createApi.api.id;
    });

    it('should create an API schema (link schema to API)', async () => {
      expect(apiId).toBeDefined();
      expect(schemaId).toBeDefined();
      expect(databaseId).toBeDefined();

      // V5: ApiSchemaInput requires databaseId (NON_NULL)
      const res = await query<{
        createApiSchema: {
          apiSchema: { id: string; apiId: string; schemaId: string };
        };
      }>(
        `mutation($input: CreateApiSchemaInput!) {
          createApiSchema(input: $input) {
            apiSchema { id apiId schemaId }
          }
        }`,
        {
          input: {
            apiSchema: { apiId, schemaId, databaseId },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const apiSchema = res.data!.createApiSchema.apiSchema;
      expect(apiSchema.apiId).toBe(apiId);
      expect(apiSchema.schemaId).toBe(schemaId);
      createdApiSchemaId = apiSchema.id;
    });

    it('should delete API schema using V5 ID-based mutation', async () => {
      expect(createdApiSchemaId).toBeDefined();

      // V5: deleteApiSchema uses ID-based input (not composite key)
      const res = await query<{
        deleteApiSchema: { apiSchema: { id: string } };
      }>(
        `mutation($input: DeleteApiSchemaInput!) {
          deleteApiSchema(input: $input) {
            apiSchema { id }
          }
        }`,
        { input: { id: createdApiSchemaId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.deleteApiSchema.apiSchema.id).toBe(createdApiSchemaId);
    });
  });

  // -------------------------------------------------------------------------
  // domain CRUD
  // -------------------------------------------------------------------------
  describe('domain CRUD', () => {
    let apiId: string;
    let createdDomainId: string;

    beforeAll(async () => {
      // Create an API for domain FK
      const apiRes = await query<{
        createApi: { api: { id: string } };
      }>(
        `mutation($input: CreateApiInput!) {
          createApi(input: $input) { api { id } }
        }`,
        {
          input: {
            api: { name: `api-for-domain-${Date.now()}`, databaseId },
          },
        }
      );
      if (apiRes.errors) {
        throw new Error(`Setup failed (createApi for domain): ${apiRes.errors[0].message}`);
      }
      apiId = apiRes.data!.createApi.api.id;
    });

    it('should create a domain', async () => {
      expect(apiId).toBeDefined();

      const res = await query<{
        createDomain: {
          domain: { id: string; subdomain: string; apiId: string };
        };
      }>(
        `mutation($input: CreateDomainInput!) {
          createDomain(input: $input) {
            domain { id subdomain apiId }
          }
        }`,
        {
          input: {
            domain: {
              subdomain: 'test-sub',
              domain: 'example.com',
              apiId,
              databaseId,
            },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const domain = res.data!.createDomain.domain;
      expect(domain.id).toBeDefined();
      expect(domain.subdomain).toBe('test-sub');
      expect(domain.apiId).toBe(apiId);
      createdDomainId = domain.id;
    });

    it('should update the domain using domainPatch', async () => {
      expect(createdDomainId).toBeDefined();

      const res = await query<{
        updateDomain: { domain: { id: string; subdomain: string } };
      }>(
        `mutation($input: UpdateDomainInput!) {
          updateDomain(input: $input) {
            domain { id subdomain }
          }
        }`,
        {
          input: {
            id: createdDomainId,
            domainPatch: { subdomain: 'updated-sub' },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.updateDomain.domain.subdomain).toBe('updated-sub');
    });

    it('should delete the domain', async () => {
      expect(createdDomainId).toBeDefined();

      const res = await query<{
        deleteDomain: { domain: { id: string } };
      }>(
        `mutation($input: DeleteDomainInput!) {
          deleteDomain(input: $input) {
            domain { id }
          }
        }`,
        { input: { id: createdDomainId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.deleteDomain.domain.id).toBe(createdDomainId);
    });
  });

  // -------------------------------------------------------------------------
  // app CRUD
  // -------------------------------------------------------------------------
  describe('app CRUD', () => {
    let siteId: string;
    let createdAppId: string;

    beforeAll(async () => {
      // Create a site for app FK
      const siteRes = await query<{
        createSite: { site: { id: string } };
      }>(
        `mutation($input: CreateSiteInput!) {
          createSite(input: $input) { site { id } }
        }`,
        {
          input: {
            site: {
              dbname: `site_for_app_${Date.now()}`,
              title: 'Site for App Test',
              databaseId,
            },
          },
        }
      );
      if (siteRes.errors) {
        throw new Error(`Setup failed (createSite for app): ${siteRes.errors[0].message}`);
      }
      siteId = siteRes.data!.createSite.site.id;
    });

    it('should create an app', async () => {
      expect(siteId).toBeDefined();

      const res = await query<{
        createApp: { app: { id: string; name: string; siteId: string } };
      }>(
        `mutation($input: CreateAppInput!) {
          createApp(input: $input) {
            app { id name siteId }
          }
        }`,
        {
          input: {
            app: {
              name: `test-app-${Date.now()}`,
              siteId,
              databaseId,
            },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const app = res.data!.createApp.app;
      expect(app.id).toBeDefined();
      expect(app.siteId).toBe(siteId);
      createdAppId = app.id;
    });

    it('should update the app using appPatch', async () => {
      expect(createdAppId).toBeDefined();

      const res = await query<{
        updateApp: { app: { id: string; name: string } };
      }>(
        `mutation($input: UpdateAppInput!) {
          updateApp(input: $input) {
            app { id name }
          }
        }`,
        {
          input: {
            id: createdAppId,
            appPatch: { name: 'updated-app-name' },
          },
        }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.updateApp.app.name).toBe('updated-app-name');
    });

    it('should delete the app', async () => {
      expect(createdAppId).toBeDefined();

      const res = await query<{
        deleteApp: { app: { id: string } };
      }>(
        `mutation($input: DeleteAppInput!) {
          deleteApp(input: $input) {
            app { id }
          }
        }`,
        { input: { id: createdAppId } }
      );

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.deleteApp.app.id).toBe(createdAppId);
    });
  });
});
