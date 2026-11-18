/**
 * Platform-only plugins
 *
 * Some plugins only make sense on the platform database's own APIs. The
 * function-source mutations are one: they are built over
 * `metaschema_public.function`, which is the platform's catalog. Every other
 * database gets the shared preset without them, even when the same schema
 * is exposed.
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=platform-plugins.integration
 */

import path from 'path';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(60000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const shared = (...segments: string[]) => path.join(sharedSeedRoot, ...segments);
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');

const platformDatabaseId = '0b5e0000-0000-4000-8000-000000000001';
const tenantDatabaseId = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
const schemas = ['metaschema_public'];

const INTROSPECT_MUTATIONS = `
  query IntrospectMutations {
    __type(name: "Mutation") {
      fields { name }
    }
  }
`;

const FUNCTION_SOURCE_FIELDS = ['createFunctionFromSource', 'updateFunctionFromSource'];

describe('platform-only plugins', () => {
  let request: supertest.Agent;
  let teardown: () => Promise<void>;

  const mutationNames = async (databaseId: string): Promise<string[]> => {
    const res = await request
      .post('/graphql')
      .set('X-Database-Id', databaseId)
      .set('X-Schemata', schemas.join(','))
      .send({ query: INTROSPECT_MUTATIONS });
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    return res.body.data.__type.fields.map((f: { name: string }) => f.name);
  };

  beforeAll(async () => {
    ({ request, teardown } = await getConnections(
      {
        schemas,
        authRole: 'anonymous',
        server: {
          useRouting: true,
          api: { isPublic: false }
        }
      },
      [
        seed.pgpm(pgpmWorkspace),
        seed.sqlfile([
          shared('app-schemas', 'simple-pets', 'schema.sql'),
          shared('scoped', 'test-data.sql')
        ])
      ]
    ));
  });

  afterAll(async () => {
    if (teardown) await teardown();
  });

  it('builds the function-source mutations for the platform database', async () => {
    const names = await mutationNames(platformDatabaseId);
    expect(names).toContain('createFunction');
    expect(names).toEqual(expect.arrayContaining(FUNCTION_SOURCE_FIELDS));
  });

  it('leaves them out for any other database exposing the same schema', async () => {
    const names = await mutationNames(tenantDatabaseId);
    expect(names).toContain('createFunction');
    for (const field of FUNCTION_SOURCE_FIELDS) {
      expect(names).not.toContain(field);
    }
  });
});
