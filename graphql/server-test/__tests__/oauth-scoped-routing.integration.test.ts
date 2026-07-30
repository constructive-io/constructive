/**
 * OAuth route integration on the production scoped-routing server.
 *
 * Exercises the production middleware chain with four scoped API hosts:
 * Auth/API1/API2 share database A, while api.other.test belongs to database B.
 */

import { verifySignedState } from '@constructive-io/oauth';
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
const OAUTH_STATE_SECRET = 'scoped-sso-state-secret-for-integration-tests';
const DATABASE_A_ID = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
const AUTH_API_ID = '6c9997a4-591b-4cb3-9313-4ef45d6f134e';
const API1_ID = '28199444-da40-40b1-8a4c-53edbf91c738';
const API2_ID = 'cc1e8389-e69d-4e12-9089-a98bf11fc75f';
const AUTH_HOST = 'auth.tenanta.test';
const API1_HOST = 'api1.tenanta.test';
const API2_HOST = 'api2.tenanta.test';
const OTHER_HOST = 'api.other.test';

interface OAuthStatePayload {
  redirect_uri: string;
  database_id: string;
  api_id: string | null;
  origin: string;
  redirect_target_database_id: string;
  redirect_target_api_id: string | null;
  redirect_target_origin: string;
}

const seedAdapters = [
  seed.pgpm(pgpmWorkspace),
  seed.sqlfile([
    shared('app-schemas', 'simple-pets', 'schema.sql'),
    shared('scoped', 'test-data.sql'),
    shared('app-schemas', 'simple-pets', 'test-data.sql'),
    path.join(__dirname, '..', 'sql', 'oauth-scoped.sql'),
    path.join(__dirname, '..', 'sql', 'oauth-sso-scoped.sql')
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
        enabled: true,
        stateSecret: OAUTH_STATE_SECRET
      },
      server: {
        useRouting: true,
        strictAuth: false,
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
    const response = await request.get('/auth/providers').set('Host', AUTH_HOST);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ providers: ['github'] });
  });

  it.each([
    [API1_HOST, API1_ID],
    [API2_HOST, API2_ID]
  ])(
    'allows %s as a same-database redirect and binds both API scopes in state',
    async (targetHost, targetApiId) => {
      const target = `http://${targetHost}/after-login?from=oauth#ready`;
      const response = await request
        .get('/auth/github')
        .query({ redirect_uri: target })
        .set('Host', AUTH_HOST);

      expect(response.status).toBe(302);
      const providerRedirect = new URL(response.headers.location);
      expect(providerRedirect.origin).toBe('https://github.example.test');

      const setCookieHeader = response.headers['set-cookie'];
      const setCookies: string[] = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : setCookieHeader
          ? [setCookieHeader]
          : [];
      const stateCookie = setCookies
        .find((cookie) => cookie.startsWith('oauth_state='))
        ?.split(';')[0]
        .slice('oauth_state='.length);
      expect(stateCookie).toBeDefined();
      expect(setCookies.join('\n')).not.toContain('Domain=');

      const state = verifySignedState<OAuthStatePayload>(
        decodeURIComponent(stateCookie!),
        { secret: OAUTH_STATE_SECRET }
      );
      expect(state).toMatchObject({
        redirect_uri: target,
        database_id: DATABASE_A_ID,
        api_id: AUTH_API_ID,
        origin: `http://${AUTH_HOST}`,
        redirect_target_database_id: DATABASE_A_ID,
        redirect_target_api_id: targetApiId,
        redirect_target_origin: `http://${targetHost}`
      });
    }
  );

  it('rejects a registered API from another database', async () => {
    const response = await request
      .get('/auth/github')
      .query({ redirect_uri: `http://${OTHER_HOST}/after-login` })
      .set('Host', AUTH_HOST);

    const redirect = new URL(response.headers.location);
    expect(redirect.origin).toBe(`http://${AUTH_HOST}`);
    expect(redirect.searchParams.get('error')).toBe('INVALID_REDIRECT_URI');
    const setCookieHeader = response.headers['set-cookie'];
    const setCookieText = Array.isArray(setCookieHeader)
      ? setCookieHeader.join('\n')
      : (setCookieHeader ?? '');
    expect(setCookieText).not.toContain('oauth_state=');
  });

  it('rejects an unregistered redirect without a default-database fallback', async () => {
    const response = await request
      .get('/auth/github')
      .query({
        redirect_uri: 'http://unknown.tenanta.test/after-login'
      })
      .set('Host', AUTH_HOST);

    const redirect = new URL(response.headers.location);
    expect(redirect.origin).toBe(`http://${AUTH_HOST}`);
    expect(redirect.searchParams.get('error')).toBe('INVALID_REDIRECT_URI');
  });

  it('does not leak database-A provider config into database B', async () => {
    const response = await request
      .get('/auth/providers')
      .set('Host', OTHER_HOST);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ providers: [] });
  });

  it('keeps API1 and API2 business schema exposure distinct', async () => {
    const query = '{ animals { nodes { name } } }';
    const postGraphQL = async (host: string) => {
      const bootstrap = await request.get('/auth/providers').set('Host', host);
      const bootstrapCookieHeader = bootstrap.headers['set-cookie'];
      const bootstrapCookies: string[] = Array.isArray(bootstrapCookieHeader)
        ? bootstrapCookieHeader
        : bootstrapCookieHeader
          ? [bootstrapCookieHeader]
          : [];
      const csrfCookie = bootstrapCookies.find((cookie: string) =>
        cookie.startsWith('csrf_token=')
      );
      const csrfToken = csrfCookie?.split(';')[0].slice('csrf_token='.length);
      expect(csrfToken).toBeDefined();

      return request
        .post('/graphql')
        .set('Host', host)
        .set('Cookie', `csrf_token=${csrfToken}`)
        .set('x-csrf-token', csrfToken!)
        .send({ query });
    };

    const api1Response = await postGraphQL(API1_HOST);
    const api2Response = await postGraphQL(API2_HOST);

    expect(api1Response.status).toBe(400);
    expect(api1Response.body.errors).toBeDefined();
    expect(api2Response.status).toBe(200);
    expect(api2Response.body.errors).toBeUndefined();
    expect(api2Response.body.data.animals.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Buddy' }),
        expect.objectContaining({ name: 'Whiskers' })
      ])
    );
  });
});
