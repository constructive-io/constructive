import type { PgTestClient } from 'pgsql-test/test-client';
import type { GraphQLQueryFn } from '../src/types';
import type supertest from 'supertest';
import {
  getTestConnections,
  CONNECTION_FIELDS,
} from './test-utils';

jest.setTimeout(30000);

describe('Sites & APIs', () => {
  let db: PgTestClient;
  let pg: PgTestClient;
  let query: GraphQLQueryFn;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;

  // Shared setup data: database + schema for FK requirements
  let databaseId: string;
  let schemaId: string;

  beforeAll(async () => {
    ({ db, pg, query, request, teardown } = await getTestConnections());

    // Create a database for site/api/domain FK references
    const dbRes = await query(
      `mutation($input: CreateDatabaseInput!) {
        createDatabase(input: $input) {
          database { id name }
        }
      }`,
      {
        input: {
          database: {
            name: `test-sites-db-${Date.now()}`,
            label: 'Sites Test DB',
          },
        },
      }
    );
    if (dbRes.errors) {
      throw new Error(`Setup: createDatabase failed: ${dbRes.errors[0].message}`);
    }
    databaseId = dbRes.data!.createDatabase.database.id;

    // Create a schema in the database
    const schemaRes = await query(
      `mutation($input: CreateSchemaInput!) {
        createSchema(input: $input) {
          schema { id name databaseId schemaName }
        }
      }`,
      {
        input: {
          schema: {
            databaseId,
            name: 'test-sites-schema',
            schemaName: 'test_sites_schema',
          },
        },
      }
    );
    if (schemaRes.errors) {
      throw new Error(`Setup: createSchema failed: ${schemaRes.errors[0].message}`);
    }
    schemaId = schemaRes.data!.createSchema.schema.id;
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(() => db.beforeEach());
  afterEach(() => db.afterEach());

  // ---------------------------------------------------------------
  // Site queries
  // ---------------------------------------------------------------

  describe('site queries', () => {
    it('should list sites with corrected fields (dbname, title, description)', async () => {
      // V5: use 'dbname' not 'name'
      const res = await query(
        `query {
          sites(first: 10) {
            totalCount
            nodes { id dbname title description databaseId }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.sites.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.data!.sites.nodes)).toBe(true);
    });

    it('should list site modules (uses name, not moduleId)', async () => {
      // V5: use 'name' not 'moduleId'
      const res = await query(
        `query {
          siteModules(first: 10) {
            totalCount
            nodes { id name siteId }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.siteModules.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.data!.siteModules.nodes)).toBe(true);
    });

    it('should list site themes (uses theme, not themeId)', async () => {
      // V5: use 'theme' not 'themeId'
      const res = await query(
        `query {
          siteThemes(first: 10) {
            totalCount
            nodes { id theme siteId }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.siteThemes.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.data!.siteThemes.nodes)).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // Site CRUD
  // ---------------------------------------------------------------

  describe('site CRUD', () => {
    let createdSiteId: string;

    it('should create a site', async () => {
      const res = await query(
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
      expect(site.dbname).toContain('test_site');
      expect(site.title).toBe('Test Site');
      expect(site.databaseId).toBe(databaseId);
      createdSiteId = site.id;
    });

    it('should find the created site by condition', async () => {
      expect(createdSiteId).toBeDefined();
      const res = await query(
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
      const res = await query(
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
      const res = await query(
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

  // ---------------------------------------------------------------
  // API queries
  // ---------------------------------------------------------------

  describe('API queries', () => {
    it('should list APIs with connection shape', async () => {
      const res = await query(
        `query {
          apis(first: 10) {
            totalCount
            nodes { id name databaseId }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.apis.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.data!.apis.nodes)).toBe(true);
    });

    it('should list API schemas', async () => {
      const res = await query(
        `query {
          apiSchemas(first: 10) {
            totalCount
            nodes { id apiId schemaId }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.apiSchemas.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.data!.apiSchemas.nodes)).toBe(true);
    });

    it('should list apps', async () => {
      const res = await query(
        `query {
          apps(first: 10) {
            totalCount
            nodes { id name siteId }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.apps.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.data!.apps.nodes)).toBe(true);
    });

    it('should list domains with nested relations', async () => {
      const res = await query(
        `query {
          domains(first: 10) {
            totalCount
            nodes { id domain subdomain apiId }
          }
        }`
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      expect(res.data!.domains.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.data!.domains.nodes)).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // API CRUD
  // ---------------------------------------------------------------

  describe('API CRUD', () => {
    let createdApiId: string;

    it('should create an API', async () => {
      const res = await query(
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
      expect(api.name).toContain('test-api');
      expect(api.databaseId).toBe(databaseId);
      createdApiId = api.id;
    });

    it('should update the API using apiPatch', async () => {
      expect(createdApiId).toBeDefined();
      const res = await query(
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
      // V5: returns { api { id } }
      const res = await query(
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

  // ---------------------------------------------------------------
  // API schema CRUD
  // ---------------------------------------------------------------

  describe('API schema CRUD', () => {
    let apiForSchemaId: string;
    let createdApiSchemaId: string;

    it('should create an API schema (link schema to API)', async () => {
      // First, create an API to link the schema to
      const apiRes = await query(
        `mutation($input: CreateApiInput!) {
          createApi(input: $input) {
            api { id name }
          }
        }`,
        {
          input: {
            api: {
              name: `api-for-schema-${Date.now()}`,
              databaseId,
            },
          },
        }
      );
      expect(apiRes.errors).toBeUndefined();
      apiForSchemaId = apiRes.data!.createApi.api.id;

      // Create the API schema link
      const res = await query(
        `mutation($input: CreateApiSchemaInput!) {
          createApiSchema(input: $input) {
            apiSchema { id apiId schemaId }
          }
        }`,
        {
          input: {
            apiSchema: {
              apiId: apiForSchemaId,
              schemaId,
              databaseId,
            },
          },
        }
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const apiSchema = res.data!.createApiSchema.apiSchema;
      expect(apiSchema.id).toBeDefined();
      expect(apiSchema.apiId).toBe(apiForSchemaId);
      expect(apiSchema.schemaId).toBe(schemaId);
      createdApiSchemaId = apiSchema.id;
    });

    it('should delete API schema using V5 ID-based mutation', async () => {
      expect(createdApiSchemaId).toBeDefined();
      // V5: deleteApiSchema uses ID-based input (not composite key)
      const res = await query(
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

  // ---------------------------------------------------------------
  // Domain CRUD
  // ---------------------------------------------------------------

  describe('domain CRUD', () => {
    let apiForDomainId: string;
    let createdDomainId: string;

    it('should create a domain', async () => {
      // First, create an API for the domain FK
      const apiRes = await query(
        `mutation($input: CreateApiInput!) {
          createApi(input: $input) {
            api { id name }
          }
        }`,
        {
          input: {
            api: {
              name: `api-for-domain-${Date.now()}`,
              databaseId,
            },
          },
        }
      );
      expect(apiRes.errors).toBeUndefined();
      apiForDomainId = apiRes.data!.createApi.api.id;

      const res = await query(
        `mutation($input: CreateDomainInput!) {
          createDomain(input: $input) {
            domain { id domain subdomain apiId }
          }
        }`,
        {
          input: {
            domain: {
              domain: 'example.com',
              subdomain: `test-${Date.now()}`,
              apiId: apiForDomainId,
              databaseId,
            },
          },
        }
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const domain = res.data!.createDomain.domain;
      expect(domain.id).toBeDefined();
      expect(domain.apiId).toBe(apiForDomainId);
      createdDomainId = domain.id;
    });

    it('should update the domain using domainPatch', async () => {
      expect(createdDomainId).toBeDefined();
      const res = await query(
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
      // V5: returns { domain { id } }
      const res = await query(
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

  // ---------------------------------------------------------------
  // App CRUD
  // ---------------------------------------------------------------

  describe('app CRUD', () => {
    let siteForAppId: string;
    let createdAppId: string;

    it('should create an app', async () => {
      // First, create a site for the app FK
      const siteRes = await query(
        `mutation($input: CreateSiteInput!) {
          createSite(input: $input) {
            site { id dbname }
          }
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
      expect(siteRes.errors).toBeUndefined();
      siteForAppId = siteRes.data!.createSite.site.id;

      const res = await query(
        `mutation($input: CreateAppInput!) {
          createApp(input: $input) {
            app { id name siteId }
          }
        }`,
        {
          input: {
            app: {
              name: `test-app-${Date.now()}`,
              siteId: siteForAppId,
              databaseId,
            },
          },
        }
      );
      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
      const app = res.data!.createApp.app;
      expect(app.id).toBeDefined();
      expect(app.name).toContain('test-app');
      expect(app.siteId).toBe(siteForAppId);
      createdAppId = app.id;
    });

    it('should update the app using appPatch', async () => {
      expect(createdAppId).toBeDefined();
      const res = await query(
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
      // V5: returns { app { id } }
      const res = await query(
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
