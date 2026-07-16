/**
 * Stage B HTTP Route Integration Tests
 *
 * Drives the real GraphQL server (Express + PostGraphile) through SuperTest with
 * services_public.resolve_http_route wired in via the route middleware. Proves:
 *
 *   - shadow (default): routing never changes behavior; GraphQL still serves and
 *     a site route is NOT dispatched.
 *   - on: typed dispatch — `site` target serves a placeholder, `function` target
 *     returns a typed 501, and an unrouted path (/graphql) falls through to the
 *     legacy host -> api resolution so GraphQL keeps working.
 *   - off: resolver is never consulted.
 *
 * The mode is read per-request from HTTP_ROUTE_RESOLVER_MODE, so each test sets
 * it before issuing requests.
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=route-stageb.integration
 */

import path from 'path';
import { getConnections, seed } from '../src';
import type supertest from 'supertest';

jest.setTimeout(30000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const shared = (...segments: string[]) => path.join(sharedSeedRoot, ...segments);

const schemas = ['simple-pets-public', 'simple-pets-pets-public'];
const metaSchemas = ['services_public', 'metaschema_public', 'metaschema_modules_public'];

const seedFiles = [
  shared('services', 'setup.sql'),
  shared('app-schemas', 'simple-pets', 'schema.sql'),
  shared('services', 'test-data.sql'),
  shared('app-schemas', 'simple-pets', 'test-data.sql'),
  shared('services', 'routes.sql'),
];

const API_HOST = 'app.test.constructive.io';
const SITE_ID = '90000000-0000-4000-8000-000000000001';

let request: supertest.Agent;
let teardown: () => Promise<void>;

const OLD_MODE = process.env.HTTP_ROUTE_RESOLVER_MODE;
const setMode = (mode: string) => {
  process.env.HTTP_ROUTE_RESOLVER_MODE = mode;
};

beforeAll(async () => {
  ({ request, teardown } = await getConnections(
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
    [seed.sqlfile(seedFiles)]
  ));
});

afterAll(async () => {
  process.env.HTTP_ROUTE_RESOLVER_MODE = OLD_MODE;
  await teardown();
});

describe('shadow mode (default-safe)', () => {
  beforeAll(() => setMode('shadow'));

  it('GraphQL still serves normally', async () => {
    const res = await request
      .post('/graphql')
      .set('Host', API_HOST)
      .send({ query: '{ __typename }' });

    expect(res.status).toBe(200);
    expect(res.body.data.__typename).toBe('Query');
  });

  it('does NOT dispatch a site route (no override)', async () => {
    const res = await request.get('/welcome').set('Host', API_HOST);
    expect(res.headers['x-constructive-route']).toBeUndefined();
    expect(res.status).not.toBe(200);
  });
});

describe('on mode (authoritative)', () => {
  beforeAll(() => setMode('on'));

  it('site target serves a typed placeholder', async () => {
    const res = await request.get('/welcome').set('Host', API_HOST);
    expect(res.status).toBe(200);
    expect(res.headers['x-constructive-route']).toBe(`site:${SITE_ID}`);
  });

  it('site prefix matches sub-paths', async () => {
    const res = await request.get('/welcome/pricing').set('Host', API_HOST);
    expect(res.status).toBe(200);
    expect(res.headers['x-constructive-route']).toBe(`site:${SITE_ID}`);
  });

  it('function target returns a typed 501 (no handler in open-source)', async () => {
    const res = await request
      .post('/hooks/stripe')
      .set('Host', API_HOST)
      .send({ event: 'charge.succeeded' });

    expect(res.status).toBe(501);
    expect(res.body.targetKind).toBe('function');
    expect(res.body.channel).toBe('webhook');
  });

  it('unrouted /graphql falls through to legacy host->api (GraphQL still serves)', async () => {
    const res = await request
      .post('/graphql')
      .set('Host', API_HOST)
      .send({ query: '{ __typename }' });

    expect(res.status).toBe(200);
    expect(res.body.data.__typename).toBe('Query');
  });
});

describe('off mode', () => {
  beforeAll(() => setMode('off'));

  it('never dispatches typed targets', async () => {
    const res = await request
      .post('/hooks/stripe')
      .set('Host', API_HOST)
      .send({});
    expect(res.status).not.toBe(501);
  });
});
