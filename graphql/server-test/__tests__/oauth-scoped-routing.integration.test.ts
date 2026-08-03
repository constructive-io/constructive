/**
 * OAuth route integration on the production scoped-routing server.
 *
 * The shared fixture proves the explicitly enabled route receives a
 * database/API scope from routing_public. The SSO-specific assertion stays at
 * this HTTP seam: a second registered API in the same database is accepted as
 * a redirect target. Browser cookie/session behavior belongs in CNC Hub.
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
const SAME_DATABASE_TARGET_HOST = 'private.test.constructive.io';

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
      oauth: {
        enabled: true
      },
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

  it('starts a configured flow with signed state and PKCE cookies', async () => {
    const response = await request.get('/auth/github').set('Host', API_HOST);

    expect(response.status).toBe(302);
    const redirect = new URL(response.headers.location);
    expect(redirect.origin).toBe('https://github.example.test');
    expect(redirect.pathname).toBe('/authorize');
    expect(redirect.searchParams.get('client_id')).toBe('scoped-routing-client');
    expect(redirect.searchParams.get('state')).toBeTruthy();
    const setCookieHeader = response.headers['set-cookie'];
    const setCookies: string[] = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : setCookieHeader
        ? [setCookieHeader]
        : [];
    expect(setCookies.join('\n')).toContain('oauth_state=');
    expect(setCookies.join('\n')).toContain('oauth_pkce=');
  });

  it('accepts a registered cross-origin API in the same database', async () => {
    const target = `http://${SAME_DATABASE_TARGET_HOST}/after-login`;
    const response = await request
      .get('/auth/github')
      .query({ redirect_uri: target })
      .set('Host', API_HOST);

    expect(response.status).toBe(302);
    const redirect = new URL(response.headers.location);
    expect(redirect.origin).toBe('https://github.example.test');
    expect(redirect.searchParams.get('state')).toBeTruthy();
  });

  it('does not fall back to a default database for an unknown host', async () => {
    const response = await request
      .get('/auth/providers')
      .set('Host', 'unknown.test.constructive.io');

    expect(response.status).toBe(404);
  });
});
