/**
 * CORS is decided per resolved API: the routed API's typed
 * routing_public.cors_settings origins (exact match) plus the global
 * `server.origin` platform fallback. Nothing else gets credentialed CORS.
 */

import path from 'path';
import type { PgTestClient } from 'pgsql-test/test-client';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(60000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
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
const APP_API_ID = '6c9997a4-591b-4cb3-9313-4ef45d6f134e';
const PRIVATE_API_ID = 'e257c53d-6ba6-40de-b679-61b37188a316';

const PLATFORM_ORIGIN = 'https://dashboard.platform.test';
const APP_ORIGIN = 'https://tenant-app.example';
const PRIVATE_ORIGIN = 'https://tenant-private.example';

describe('per-API CORS', () => {
  let pg: PgTestClient;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;
  const previousOrigin = process.env.SERVER_ORIGIN;

  const preflight = (origin: string) =>
    request
      .options('/graphql')
      .set('Host', HOST)
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

  const post = (origin: string) =>
    request
      .post('/graphql')
      .set('Host', HOST)
      .set('Origin', origin)
      .send({ query: '{ __typename }' });

  const expectAllowed = (res: supertest.Response, origin: string) => {
    expect(res.headers['access-control-allow-origin']).toBe(origin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  };

  const expectRefused = (res: supertest.Response) => {
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  };

  beforeAll(async () => {
    process.env.SERVER_ORIGIN = PLATFORM_ORIGIN;
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
          path.join(sharedSeedRoot, 'scoped', 'test-data.sql')
        ])
      ]
    ));
    await pg.query(
      `INSERT INTO routing_public.cors_settings (database_id, api_id, allowed_origins)
       VALUES ($1, $2, ARRAY[$3]), ($1, $4, ARRAY[$5])`,
      [DATABASE_ID, APP_API_ID, APP_ORIGIN, PRIVATE_API_ID, PRIVATE_ORIGIN]
    );
  });

  afterAll(async () => {
    if (previousOrigin === undefined) delete process.env.SERVER_ORIGIN;
    else process.env.SERVER_ORIGIN = previousOrigin;
    await teardown();
  });

  it('answers a preflight from an origin in the routed API cors_settings', async () => {
    const res = await preflight(APP_ORIGIN);
    expect(res.status).toBe(200);
    expectAllowed(res, APP_ORIGIN);
  });

  it('allows a request from an origin in the routed API cors_settings', async () => {
    const res = await post(APP_ORIGIN);
    expect(res.status).toBe(200);
    expectAllowed(res, APP_ORIGIN);
  });

  it('allows the platform fallback origin', async () => {
    expectAllowed(await preflight(PLATFORM_ORIGIN), PLATFORM_ORIGIN);
    expectAllowed(await post(PLATFORM_ORIGIN), PLATFORM_ORIGIN);
  });

  it('refuses an origin listed only for another API', async () => {
    expectRefused(await preflight(PRIVATE_ORIGIN));
    expectRefused(await post(PRIVATE_ORIGIN));
  });

  it('refuses origins that only resemble a listed one', async () => {
    for (const origin of [
      `${APP_ORIGIN}.evil.test`,
      `${APP_ORIGIN}:8443`,
      APP_ORIGIN.replace('https://', 'http://'),
      APP_ORIGIN.toUpperCase()
    ]) {
      expectRefused(await preflight(origin));
      expectRefused(await post(origin));
    }
  });

  it('refuses a localhost origin that is not listed', async () => {
    expectRefused(await preflight('http://localhost:5173'));
    expectRefused(await post('http://localhost:5173'));
  });

  describe('on a host that resolves to no API', () => {
    const UNKNOWN_HOST = 'nothing-here.test.constructive.io';

    it('answers a preflight from the platform fallback origin', async () => {
      const res = await request
        .options('/graphql')
        .set('Host', UNKNOWN_HOST)
        .set('Origin', PLATFORM_ORIGIN)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type');
      expect(res.status).toBe(200);
      expectAllowed(res, PLATFORM_ORIGIN);
    });

    it('sends the 404 with CORS headers for the platform fallback origin', async () => {
      const res = await request
        .post('/graphql')
        .set('Host', UNKNOWN_HOST)
        .set('Origin', PLATFORM_ORIGIN)
        .send({ query: '{ __typename }' });
      expect(res.status).toBe(404);
      expectAllowed(res, PLATFORM_ORIGIN);
    });

    it('sends the 404 without CORS headers for any other origin', async () => {
      for (const origin of [APP_ORIGIN, 'https://evil.example']) {
        const res = await request
          .post('/graphql')
          .set('Host', UNKNOWN_HOST)
          .set('Origin', origin)
          .send({ query: '{ __typename }' });
        expect(res.status).toBe(404);
        expectRefused(res);
      }
    });
  });

  it('refuses an unrelated origin', async () => {
    expectRefused(await preflight('https://evil.example'));
    expectRefused(await post('https://evil.example'));
  });
});
