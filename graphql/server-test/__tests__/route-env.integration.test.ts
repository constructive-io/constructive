/**
 * Routing environment (local vs production) integration tests.
 *
 * Drives the real GraphQL server through SuperTest to prove the developer-
 * experience behaviors that let host-based routing work on a laptop without
 * real DNS / domain verification / TLS:
 *
 *   - Host normalization: a Host header carrying a port (app.test...:5678, the
 *     normal shape on localhost) still matches an unported domain row and
 *     dispatches — without this, host routing is unusable in local dev.
 *   - Secure-context simulation: in `local` env a plain-HTTP request to a public
 *     host is treated as secure (TLS simulated); in `production` the same request
 *     is flagged insecure unless X-Forwarded-Proto=https. Known local hosts are
 *     always secure.
 *
 * mode + env are read per-request from HTTP_ROUTE_RESOLVER_MODE / ROUTING_ENV.
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=route-env.integration
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
const OLD_ENV = process.env.ROUTING_ENV;
const setMode = (mode: string) => {
  process.env.HTTP_ROUTE_RESOLVER_MODE = mode;
};
const setEnv = (env: string) => {
  process.env.ROUTING_ENV = env;
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
  process.env.ROUTING_ENV = OLD_ENV;
  await teardown();
});

describe('host normalization (local dev unblocker)', () => {
  beforeAll(() => setMode('on'));

  it('matches a ported Host header against an unported domain row', async () => {
    // The Host on localhost is typically "host:port". Pre-normalization this
    // would NOT match the "app.test.constructive.io" domain row -> 404.
    const res = await request.get('/welcome').set('Host', `${API_HOST}:5678`);
    expect(res.status).toBe(200);
    expect(res.headers['x-constructive-route']).toBe(`site:${SITE_ID}`);
  });

  it('is case-insensitive on the host', async () => {
    const res = await request.get('/welcome').set('Host', 'App.Test.Constructive.IO:443');
    expect(res.status).toBe(200);
    expect(res.headers['x-constructive-route']).toBe(`site:${SITE_ID}`);
  });
});

describe('secure-context simulation (local vs production)', () => {
  // Use shadow mode: behavior is unchanged, but the router still annotates the
  // environment + secure decision, so we can compare local vs production on the
  // exact same plain-HTTP request.
  beforeAll(() => setMode('shadow'));

  it('local: a plain-HTTP request to a public host is annotated secure', async () => {
    setEnv('local');
    const res = await request
      .post('/graphql')
      .set('Host', API_HOST)
      .send({ query: '{ __typename }' });

    expect(res.status).toBe(200); // behavior preserved
    expect(res.headers['x-constructive-route-env']).toBe('local');
    expect(res.headers['x-constructive-route-secure']).toBe('true');
  });

  it('production: the SAME plain-HTTP request to the SAME host is flagged insecure', async () => {
    setEnv('production');
    const res = await request
      .post('/graphql')
      .set('Host', API_HOST)
      .send({ query: '{ __typename }' });

    expect(res.status).toBe(200); // behavior still preserved
    expect(res.headers['x-constructive-route-env']).toBe('production');
    expect(res.headers['x-constructive-route-secure']).toBe('false');
  });

  it('production: X-Forwarded-Proto=https is honored as secure', async () => {
    setEnv('production');
    const res = await request
      .post('/graphql')
      .set('Host', API_HOST)
      .set('X-Forwarded-Proto', 'https')
      .send({ query: '{ __typename }' });

    expect(res.headers['x-constructive-route-env']).toBe('production');
    expect(res.headers['x-constructive-route-secure']).toBe('true');
  });

  it('production: a known local dev host is always secure (TLS never blocks localhost)', async () => {
    setEnv('production');
    const res = await request.post('/graphql').set('Host', 'app.localhost:3000').send({ query: '{ __typename }' });

    expect(res.headers['x-constructive-route-env']).toBe('production');
    expect(res.headers['x-constructive-route-secure']).toBe('true');
  });
});
