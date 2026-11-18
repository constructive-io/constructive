/**
 * `server.strictAuth` fails closed: when it is on and the routed API has no
 * `authenticate_strict` function, the request is refused instead of running
 * without authentication.
 */

import path from 'path';
import type { PgTestClient } from 'pgsql-test/test-client';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(60000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const authSeed = path.join(__dirname, '..', '__fixtures__', 'seed', 'auth-cookie', 'schema.sql');
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');
const schemas = ['simple-pets-public', 'simple-pets-pets-public'];
const metaSchemas = [
  'catalog_private',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];

const HOST = 'app.test.constructive.io';
const DATABASE_ID = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';

describe('strictAuth without an authenticate_strict function', () => {
  let request: supertest.Agent;
  let teardown: () => Promise<void>;
  const previous = process.env.SERVER_STRICT_AUTH;

  beforeAll(async () => {
    process.env.SERVER_STRICT_AUTH = 'true';
    let pg: PgTestClient;
    ({ pg, request, teardown } = await getConnections(
      {
        schemas,
        authRole: 'anonymous',
        server: { useRouting: true, api: { isPublic: true, metaSchemas } }
      },
      [
        seed.pgpm(pgpmWorkspace),
        seed.sqlfile([
          path.join(sharedSeedRoot, 'app-schemas', 'simple-pets', 'schema.sql'),
          path.join(sharedSeedRoot, 'scoped', 'test-data.sql'),
          authSeed
        ])
      ]
    ));
    // The auth-cookie seed registers `authenticate` for both slots; drop the strict one.
    await pg.query(
      `SET session_replication_role TO replica;
       UPDATE routing_public.rls_settings SET authenticate_strict_function_id = NULL
       WHERE database_id = '${DATABASE_ID}';
       SET session_replication_role TO DEFAULT;`
    );
  });

  afterAll(async () => {
    if (previous === undefined) delete process.env.SERVER_STRICT_AUTH;
    else process.env.SERVER_STRICT_AUTH = previous;
    await teardown();
  });

  it.each([
    ['anonymous', {}],
    ['bearer', { Authorization: 'Bearer some-token' }],
    ['cookie', { Cookie: 'constructive_session=some-token' }]
  ])('refuses a %s request instead of skipping authentication', async (_kind, headers) => {
    const res = await request
      .post('/graphql')
      .set('Host', HOST)
      .set(headers)
      .send({ query: '{ __typename }' });
    expect(res.status).toBe(503);
    expect(res.body.data).toBeUndefined();
    expect(res.body.errors).toEqual([
      expect.objectContaining({
        message: expect.stringMatching(/strict authentication/i),
        extensions: expect.objectContaining({ code: 'STRICT_AUTH_UNAVAILABLE' })
      })
    ]);
  });
});
