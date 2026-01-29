/**
 * Server Integration Tests using graphql-server-test
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=server.integration
 *   pnpm test -- --selectProjects=integration
 *
 * These are E2E integration tests that start a real GraphQL server.
 * The Jest config separates unit and integration tests so that
 * integration tests use real packages (no mocks).
 */

import path from 'path';
import { getConnections, seed } from '../src';
import type { ServerInfo } from '../src/types';
import type supertest from 'supertest';
import {
  DomainNotFoundError,
  NoValidSchemasError,
  ErrorCodes,
  isApiError
} from '../../server/src/errors/api-errors';

jest.setTimeout(30000);

const seedRoot = path.join(__dirname, '..', '__fixtures__', 'seed');
const sql = (seedDir: string, file: string) =>
  path.join(seedRoot, seedDir, file);
const schemas = ['simple-pets-public', 'simple-pets-pets-public'];
const servicesDatabaseId = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
const metaSchemas = [
  'services_public',
  'metaschema_public',
  'metaschema_modules_public',
];
const teardowns: Array<() => Promise<void>> = [];

type Scenario = {
  name: string;
  seedDir: 'simple-seed' | 'simple-seed-services';
  api: {
    enableServicesApi: boolean;
    isPublic: boolean;
    metaSchemas?: string[];
  };
  headers?: Record<string, string>;
};

const scenarios: Scenario[] = [
  {
    name: 'services disabled + private',
    seedDir: 'simple-seed',
    api: { enableServicesApi: false, isPublic: false },
  },
  {
    name: 'services disabled + public',
    seedDir: 'simple-seed',
    api: { enableServicesApi: false, isPublic: true },
  },
  {
    name: 'services enabled + private via X-Schemata',
    seedDir: 'simple-seed-services',
    api: {
      enableServicesApi: true,
      isPublic: false,
      metaSchemas,
    },
    headers: {
      'X-Database-Id': servicesDatabaseId,
      'X-Schemata': schemas.join(','),
    },
  },
  {
    name: 'services enabled + public via domain',
    seedDir: 'simple-seed-services',
    api: {
      enableServicesApi: true,
      isPublic: true,
      metaSchemas,
    },
    headers: {
      Host: 'app.test.constructive.io',
    },
  },
  {
    name: 'services enabled + private via X-Api-Name',
    seedDir: 'simple-seed-services',
    api: {
      enableServicesApi: true,
      isPublic: false,
      metaSchemas,
    },
    headers: {
      'X-Database-Id': servicesDatabaseId,
      'X-Api-Name': 'private',
    },
  },
  {
    name: 'services enabled + private via domain fallback',
    seedDir: 'simple-seed-services',
    api: {
      enableServicesApi: true,
      isPublic: false,
      metaSchemas,
    },
    headers: {
      Host: 'private.test.constructive.io',
    },
  },
];

const seedFilesFor = (seedDir: Scenario['seedDir']) => [
  sql(seedDir, 'setup.sql'),
  sql(seedDir, 'schema.sql'),
  sql(seedDir, 'test-data.sql'),
];

const buildSeedAdapters = (scenario: Scenario) => [
  seed.sqlfile(seedFilesFor(scenario.seedDir)),
];

describe.each(scenarios)('$name', (scenario) => {
  let server: ServerInfo;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;

  const postGraphQL = (payload: { query: string; variables?: Record<string, unknown> }) => {
    let req = request.post('/graphql');
    if (scenario.headers) {
      for (const [header, value] of Object.entries(scenario.headers)) {
        req = req.set(header, value);
      }
    }
    return req.send(payload);
  };

  beforeAll(async () => {
    ({ server, request, teardown } = await getConnections(
      {
        schemas,
        authRole: 'anonymous',
        server: {
          api: scenario.api,
        },
      },
      buildSeedAdapters(scenario)
    ));
    teardowns.push(teardown);
  });

  describe('Query Tests', () => {
    it('should query all animals', async () => {
      // PostGraphile v5 uses allSimplePetsPetsPublicAnimals (schema-prefixed name)
      const res = await postGraphQL({
        query: '{ allSimplePetsPetsPublicAnimals { nodes { rowId name species } } }',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.allSimplePetsPetsPublicAnimals.nodes).toHaveLength(5);
    });

    it('should query with first argument', async () => {
      // PostGraphile v5 uses allSimplePetsPetsPublicAnimals
      const res = await postGraphQL({
        query: '{ allSimplePetsPetsPublicAnimals(first: 2) { nodes { name species } } }',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.allSimplePetsPetsPublicAnimals.nodes).toHaveLength(2);
    });

    it('should query total count', async () => {
      // PostGraphile v5 uses allSimplePetsPetsPublicAnimals
      const res = await postGraphQL({
        query: '{ allSimplePetsPetsPublicAnimals { totalCount } }',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.allSimplePetsPetsPublicAnimals.totalCount).toBe(5);
    });
  });
});

/**
 * X-Meta-Schema test
 *
 * enableServicesApi: true, isPublic: false
 * Headers: X-Database-Id + X-Meta-Schema: true
 * Queries target meta-schema tables (databases, schemas, tables, fields)
 */
describe('services enabled + private via X-Meta-Schema', () => {
  let server: ServerInfo;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;

  const postGraphQL = (
    payload: { query: string; variables?: Record<string, unknown> },
    extraHeaders?: Record<string, string>
  ) => {
    let req = request.post('/graphql');
    const headers: Record<string, string> = {
      'X-Database-Id': servicesDatabaseId,
      'X-Meta-Schema': 'true',
      ...extraHeaders,
    };
    for (const [header, value] of Object.entries(headers)) {
      req = req.set(header, value);
    }
    return req.send(payload);
  };

  beforeAll(async () => {
    ({ server, request, teardown } = await getConnections(
      {
        schemas: metaSchemas,
        authRole: 'anonymous',
        server: {
          api: {
            enableServicesApi: true,
            isPublic: false,
            metaSchemas,
          },
        },
      },
      [seed.sqlfile(seedFilesFor('simple-seed-services'))]
    ));
    teardowns.push(teardown);
  });

  it('should query all databases', async () => {
    // PostGraphile v5 prefixes with schema name: metaschema_public.database -> allMetaschemaPublicDatabases
    const res = await postGraphQL({
      query: '{ allMetaschemaPublicDatabases { nodes { rowId name } } }',
    });

    if (res.status !== 200) {
      console.log('DATABASE QUERY FAILED:');
      console.log('Status:', res.status);
      console.log('Body:', JSON.stringify(res.body, null, 2));
    }
    expect(res.status).toBe(200);
    expect(res.body.data.allMetaschemaPublicDatabases.nodes).toBeInstanceOf(Array);
    expect(res.body.data.allMetaschemaPublicDatabases.nodes.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.allMetaschemaPublicDatabases.nodes[0]).toHaveProperty('rowId');
    expect(res.body.data.allMetaschemaPublicDatabases.nodes[0]).toHaveProperty('name');
  });

  it('should query schemas', async () => {
    // PostGraphile v5 prefixes with schema name: metaschema_public.schema -> allMetaschemaPublicSchemas
    const res = await postGraphQL({
      query: '{ allMetaschemaPublicSchemas { nodes { rowId name schemaName isPublic } } }',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.allMetaschemaPublicSchemas.nodes).toBeInstanceOf(Array);
    expect(res.body.data.allMetaschemaPublicSchemas.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('should query tables', async () => {
    // PostGraphile v5 prefixes with schema name: metaschema_public.table -> allMetaschemaPublicTables
    const res = await postGraphQL({
      query: '{ allMetaschemaPublicTables { nodes { rowId name } } }',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.allMetaschemaPublicTables.nodes).toBeInstanceOf(Array);
    expect(res.body.data.allMetaschemaPublicTables.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('should query fields with variables', async () => {
    // PostGraphile v5 prefixes with schema name: metaschema_public.field -> allMetaschemaPublicFields
    const res = await postGraphQL({
      query: `query GetFields($first: Int!) {
        allMetaschemaPublicFields(first: $first) { nodes { rowId name type } }
      }`,
      variables: { first: 10 },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.allMetaschemaPublicFields.nodes).toBeInstanceOf(Array);
  });

  it('should query apis', async () => {
    // services_public.apis -> allApis (simpler name since "apis" is unique)
    const res = await postGraphQL({
      query: '{ allApis { nodes { rowId name isPublic databaseId } } }',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.allApis.nodes).toBeInstanceOf(Array);
    expect(res.body.data.allApis.nodes.length).toBeGreaterThanOrEqual(1);
  });
});

/**
 * Error path tests
 *
 * These test the various error conditions in the api middleware:
 * - Invalid X-Schemata (ApiError with errorHtml)
 * - Domain not found (null apiConfig)
 * - NO_VALID_SCHEMAS error code
 * - apiConfig null (no domain match)
 */
describe('Error paths', () => {
  let request: supertest.Agent;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    ({ request, teardown } = await getConnections(
      {
        schemas,
        authRole: 'anonymous',
        server: {
          api: {
            enableServicesApi: true,
            isPublic: false,
            metaSchemas,
          },
        },
      },
      [seed.sqlfile(seedFilesFor('simple-seed-services'))]
    ));
    teardowns.push(teardown);
  });

  describe('Invalid X-Schemata (returns 404)', () => {
    it('should return 404 when X-Schemata contains schemas not in the DB', async () => {
      const res = await request
        .post('/graphql')
        .set('X-Database-Id', servicesDatabaseId)
        .set('X-Schemata', 'nonexistent_schema_abc,another_fake_schema')
        .send({ query: '{ __typename }' });

      expect(res.status).toBe(404);
      // Check for error message in response
      expect(res.text).toContain('No valid schemas found');

      // Verify typed error code in JSON response
      if (res.type === 'application/json' && res.body?.error) {
        expect(res.body.error.code).toBe(ErrorCodes.NO_VALID_SCHEMAS);
      }
    });
  });

  describe('Domain not found (returns 404)', () => {
    it('should return 404 when Host header does not match any domain', async () => {
      const res = await request
        .post('/graphql')
        .set('Host', 'unknown.nowhere.com')
        .send({ query: '{ __typename }' });

      expect(res.status).toBe(404);
      expect(res.text).toContain('No API configured for domain');

      // Verify typed error code in JSON response
      if (res.type === 'application/json' && res.body?.error) {
        expect(res.body.error.code).toBe(ErrorCodes.DOMAIN_NOT_FOUND);
      }
    });
  });

  describe('NO_VALID_SCHEMAS error', () => {
    let noSchemasRequest: supertest.Agent;
    let noSchemasTeardown: () => Promise<void>;

    beforeAll(async () => {
      // Use simple-seed which does NOT create the default metaSchemas
      // (services_public, metaschema_public, metaschema_modules_public).
      // getEnvOptions deepmerges default metaSchemas with our overrides,
      // so all must be absent from the DB to trigger NO_VALID_SCHEMAS.
      ({ request: noSchemasRequest, teardown: noSchemasTeardown } = await getConnections(
        {
          schemas,
          authRole: 'anonymous',
          server: {
            api: {
              enableServicesApi: true,
              isPublic: false,
            },
          },
        },
        [seed.sqlfile(seedFilesFor('simple-seed'))]
      ));
      teardowns.push(noSchemasTeardown);
    });

    it('should return 404 when configured metaSchemas do not exist in the DB', async () => {
      // Use a unique databaseId to avoid svcCache hit from X-Meta-Schema test
      // (svcCache is a process-global singleton)
      const res = await noSchemasRequest
        .post('/graphql')
        .set('X-Database-Id', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
        .set('X-Meta-Schema', 'true')
        .send({ query: '{ __typename }' });

      expect(res.status).toBe(404);
      expect(res.text).toContain('No valid schemas found');

      // Verify typed error code in JSON response
      if (res.type === 'application/json' && res.body?.error) {
        expect(res.body.error.code).toBe(ErrorCodes.NO_VALID_SCHEMAS);
      }
    });
  });

  describe('apiConfig null (no domain match in public mode)', () => {
    let publicRequest: supertest.Agent;
    let publicTeardown: () => Promise<void>;

    beforeAll(async () => {
      ({ request: publicRequest, teardown: publicTeardown } = await getConnections(
        {
          schemas,
          authRole: 'anonymous',
          server: {
            api: {
              enableServicesApi: true,
              isPublic: true,
              metaSchemas,
            },
          },
        },
        [seed.sqlfile(seedFilesFor('simple-seed-services'))]
      ));
      teardowns.push(publicTeardown);
    });

    it('should return 404 when domain lookup returns null for public API', async () => {
      const res = await publicRequest
        .post('/graphql')
        .set('Host', 'unknown.nowhere.com')
        .send({ query: '{ __typename }' });

      expect(res.status).toBe(404);
      expect(res.text).toContain('No API configured for domain');

      // Verify typed error code in JSON response
      if (res.type === 'application/json' && res.body?.error) {
        expect(res.body.error.code).toBe(ErrorCodes.DOMAIN_NOT_FOUND);
      }
    });
  });

  describe('Dev fallback', () => {
    // The dev fallback only triggers when NODE_ENV=development.
    // This is documented as out-of-scope for standard CI testing since
    // changing NODE_ENV mid-process can have side effects.
    // We verify the behavior is testable by confirming that when not in
    // dev mode, the fallback does NOT trigger and we get a plain 404.
    it('should NOT trigger dev fallback when NODE_ENV is not development', async () => {
      let devRequest: supertest.Agent;
      let devTeardown: () => Promise<void>;

      ({ request: devRequest, teardown: devTeardown } = await getConnections(
        {
          schemas,
          authRole: 'anonymous',
          server: {
            api: {
              enableServicesApi: true,
              isPublic: true,
              metaSchemas,
            },
          },
        },
        [seed.sqlfile(seedFilesFor('simple-seed-services'))]
      ));
      teardowns.push(devTeardown);

      const res = await devRequest
        .post('/graphql')
        .set('Host', 'nomatch.example.com')
        .send({ query: '{ __typename }' });

      // Without NODE_ENV=development, the dev fallback does not fire.
      // We get the standard DomainNotFoundError 404.
      expect(res.status).toBe(404);
      expect(res.text).toContain('No API configured for domain');

      // Verify typed error code in JSON response
      if (res.type === 'application/json' && res.body?.error) {
        expect(res.body.error.code).toBe(ErrorCodes.DOMAIN_NOT_FOUND);
      }
    });
  });
});

afterAll(async () => {
  for (const teardown of teardowns) {
    await teardown();
  }
});
