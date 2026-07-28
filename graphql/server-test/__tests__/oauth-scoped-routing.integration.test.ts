/**
 * OAuth route integration on the production scoped-routing server.
 *
 * The shared fixture deliberately does not provision OAuth modules. These
 * assertions prove the route still receives an explicit database/API scope
 * from routing_public and that OAUTH_STATE_SECRET is required lazily only
 * after a configured provider can start a flow.
 */

import path from 'path';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(30000);

const sharedSeedRoot = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '__fixtures__',
  'seed'
);
const shared = (...segments: string[]) =>
  path.join(sharedSeedRoot, ...segments);
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');
const schemas = ['simple-pets-public', 'simple-pets-pets-public'];
const metaSchemas = [
  'catalog_public',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];
const API_HOST = 'app.test.constructive.io';

const seedAdapters = [
  seed.pgpm(pgpmWorkspace),
  seed.sqlfile([
    shared('app-schemas', 'simple-pets', 'schema.sql'),
    shared('scoped', 'test-data.sql'),
    shared('app-schemas', 'simple-pets', 'test-data.sql'),
    path.join(__dirname, '..', 'sql', 'oauth-scoped.sql')
  ])
];

let request: supertest.Agent;
let teardown: (() => Promise<void>) | undefined;

beforeAll(async () => {
  ({ request, teardown } = await getConnections(
    {
      schemas,
      authRole: 'anonymous',
      server: {
        useRouting: true,
        api: {
          isPublic: true,
          metaSchemas
        }
      }
    },
    seedAdapters
  ));
});

afterAll(async () => {
  await teardown?.();
});

describe('OAuth routes over scoped routing', () => {
  it('resolves the API host and returns the database-scoped provider list', async () => {
    const response = await request.get('/auth/providers').set('Host', API_HOST);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ providers: ['github'] });
  });

  it('requires the state secret lazily only when a configured flow starts', async () => {
    const response = await request.get('/auth/github').set('Host', API_HOST);

    expect(response.status).toBe(302);
    const redirect = new URL(response.headers.location);
    expect(redirect.searchParams.get('error')).toBe('OAUTH_INIT_FAILED');
    const setCookieHeader = response.headers['set-cookie'];
    const setCookies: string[] = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : setCookieHeader
        ? [setCookieHeader]
        : [];
    expect(setCookies.join('\n')).not.toContain('oauth_state=');
    expect(setCookies.join('\n')).not.toContain('oauth_pkce=');
  });

  it('does not fall back to a default database for an unknown host', async () => {
    const response = await request
      .get('/auth/providers')
      .set('Host', 'unknown.test.constructive.io');

    expect(response.status).toBe(404);
  });
});
