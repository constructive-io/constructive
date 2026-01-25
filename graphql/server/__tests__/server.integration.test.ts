/**
 * Server Integration Tests using graphql-server-test
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=server.integration
 */

import path from 'path';
import { getConnections, seed } from 'graphql-server-test';
import type { ServerInfo } from 'graphql-server-test';
import type supertest from 'supertest';

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
    name: 'services enabled + private via X-Schemata (Q3 Sub-A)',
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
    name: 'services enabled + public via domain (Q4)',
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
    name: 'services enabled + private via X-Api-Name (Q3 Sub-B)',
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
    name: 'services enabled + private via domain fallback (Q3 Sub-D)',
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
      const res = await postGraphQL({
        query: '{ animals { nodes { id name species } } }',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.animals.nodes).toHaveLength(5);
    });

    it('should query animals with filter', async () => {
      const res = await postGraphQL({
        query: `{ animals(filter: { species: { equalTo: "Dog" } }) { nodes { name species } } }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.animals.nodes).toHaveLength(2);
    });

    it('should query with variables', async () => {
      const res = await postGraphQL({
        query: `query GetBySpecies($species: String!) {
          animals(filter: { species: { equalTo: $species } }) { nodes { name } }
        }`,
        variables: { species: 'Cat' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.animals.nodes).toHaveLength(2);
    });
  });

  describe('Mutation Tests', () => {
    it('should create and delete an animal', async () => {
      const createRes = await postGraphQL({
        query: `mutation($input: CreateAnimalInput!) {
          createAnimal(input: $input) { animal { id name species } }
        }`,
        variables: { input: { animal: { name: 'TestHamster', species: 'Hamster' } } },
      });

      expect(createRes.status).toBe(200);
      expect(createRes.body.data.createAnimal.animal.name).toBe('TestHamster');

      const deleteRes = await postGraphQL({
        query: `mutation($input: DeleteAnimalInput!) {
          deleteAnimal(input: $input) { deletedAnimalNodeId }
        }`,
        variables: { input: { id: createRes.body.data.createAnimal.animal.id } },
      });

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.deleteAnimal.deletedAnimalNodeId).toBeDefined();
    });

    it('should update an animal', async () => {
      const queryRes = await postGraphQL({
        query: '{ animals(first: 1) { nodes { id name } } }',
      });

      const animal = queryRes.body.data.animals.nodes[0];
      const originalName = animal.name;

      const updateRes = await postGraphQL({
        query: `mutation($input: UpdateAnimalInput!) {
          updateAnimal(input: $input) { animal { id name } }
        }`,
        variables: { input: { id: animal.id, patch: { name: 'TempName' } } },
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.updateAnimal.animal.name).toBe('TempName');

      await postGraphQL({
        query: `mutation($input: UpdateAnimalInput!) {
          updateAnimal(input: $input) { animal { id } }
        }`,
        variables: { input: { id: animal.id, patch: { name: originalName } } },
      });
    });
  });
});

/**
 * Scenario 6: X-Meta-Schema (Q3 Sub-C)
 *
 * enableServicesApi: true, isPublic: false
 * Headers: X-Database-Id + X-Meta-Schema: true
 * Queries target meta-schema tables (databases, schemas, tables, fields)
 */
describe('services enabled + private via X-Meta-Schema (Q3 Sub-C)', () => {
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
    const res = await postGraphQL({
      query: '{ databases { nodes { id name } } }',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.databases.nodes).toBeInstanceOf(Array);
    expect(res.body.data.databases.nodes.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.databases.nodes[0]).toHaveProperty('id');
    expect(res.body.data.databases.nodes[0]).toHaveProperty('name');
  });

  it('should query schemas', async () => {
    const res = await postGraphQL({
      query: '{ schemas { nodes { id name schemaName isPublic } } }',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.schemas.nodes).toBeInstanceOf(Array);
    expect(res.body.data.schemas.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('should query tables', async () => {
    const res = await postGraphQL({
      query: '{ tables { nodes { id name } } }',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.tables.nodes).toBeInstanceOf(Array);
    expect(res.body.data.tables.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('should query fields with variables', async () => {
    const res = await postGraphQL({
      query: `query GetFields($first: Int!) {
        fields(first: $first) { nodes { id name type } }
      }`,
      variables: { first: 10 },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.fields.nodes).toBeInstanceOf(Array);
  });

  it('should query apis', async () => {
    const res = await postGraphQL({
      query: '{ apis { nodes { id name isPublic databaseId } } }',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.apis.nodes).toBeInstanceOf(Array);
    expect(res.body.data.apis.nodes.length).toBeGreaterThanOrEqual(1);
  });
});

/**
 * Error path tests
 *
 * These test the various error conditions in the api middleware:
 * - Invalid X-Schemata (ApiError with errorHtml)
 * - Domain not found (null apiConfig)
 * - isPublic mismatch via domain
 * - isPublic mismatch via X-Api-Name
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
      expect(res.text).toContain('No valid schemas configured for this API');
    });
  });

  describe('Domain not found (returns 404)', () => {
    it('should return 404 when Host header does not match any domain', async () => {
      const res = await request
        .post('/graphql')
        .set('Host', 'unknown.nowhere.com')
        .send({ query: '{ __typename }' });

      expect(res.status).toBe(404);
      expect(res.text).toContain('Not Found');
    });
  });

  describe('isPublic mismatch via domain', () => {
    it('should return 404 when isPublic=false but domain links to a public API', async () => {
      // The "app.test.constructive.io" domain links to API "app" which has is_public=true.
      // With server configured as isPublic=false, this should not match.
      const res = await request
        .post('/graphql')
        .set('Host', 'app.test.constructive.io')
        .send({ query: '{ __typename }' });

      expect(res.status).toBe(404);
      expect(res.text).toContain('Not Found');
    });
  });

  describe('isPublic mismatch via X-Api-Name', () => {
    it('should return 404 when isPublic=false but X-Api-Name references a public API', async () => {
      // API "app" has is_public=true. With server configured as isPublic=false,
      // queryServiceByApiName checks api.isPublic === apiPublic and returns null.
      const res = await request
        .post('/graphql')
        .set('X-Database-Id', servicesDatabaseId)
        .set('X-Api-Name', 'app')
        .send({ query: '{ __typename }' });

      expect(res.status).toBe(404);
      expect(res.text).toContain('Not Found');
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
      // Use a unique databaseId to avoid svcCache hit from Q3 Sub-C
      // (svcCache is a process-global singleton)
      const res = await noSchemasRequest
        .post('/graphql')
        .set('X-Database-Id', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
        .set('X-Meta-Schema', 'true')
        .send({ query: '{ __typename }' });

      expect(res.status).toBe(404);
      expect(res.text).toContain('No valid schemas found');
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
      expect(res.text).toContain('Not Found');
      expect(res.text).toContain('API service not found');
    });
  });

  describe('Dev fallback (Q4)', () => {
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
      // We get the standard "API service not found" 404.
      expect(res.status).toBe(404);
      expect(res.text).toContain('API service not found');
    });
  });
});

afterAll(async () => {
  for (const teardown of teardowns) {
    await teardown();
  }
});
