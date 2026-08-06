import path from 'path';
import type supertest from 'supertest';
import requestFactory from 'supertest';

import { getConnections, seed } from '../src';
import type { ServerInfo } from '../src/types';

jest.setTimeout(60000);

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
const oauthFixture = path.join(
  __dirname,
  '..',
  '__fixtures__',
  'seed',
  'oauth',
  'setup.sql'
);
const schemas = ['simple-pets-public', 'simple-pets-pets-public'];
const metaSchemas = [
  'catalog_public',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public',
];
const primaryHost = 'app.test.constructive.io';
const alternateHost = 'oauth-alt.test.constructive.io';

const seedAdapters = [
  seed.pgpm(pgpmWorkspace),
  seed.sqlfile([
    shared('app-schemas', 'simple-pets', 'schema.sql'),
    shared('scoped', 'test-data.sql'),
    shared('app-schemas', 'simple-pets', 'test-data.sql'),
    oauthFixture,
  ]),
];

const setCookies = (response: {
  headers: Record<string, unknown>;
}): string[] => {
  const value = response.headers['set-cookie'];
  return Array.isArray(value)
    ? value.map(String)
    : value
      ? [String(value)]
      : [];
};

let server: ServerInfo;
let request: supertest.Agent;
let teardown: () => Promise<void>;
let fetchMock: jest.SpyInstance;

beforeAll(async () => {
  fetchMock = jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (input) => {
      const url = String(input);
      if (url === 'https://oauth2.googleapis.com/token') {
        return new Response(
          JSON.stringify({ access_token: 'provider-access-token' }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      if (url === 'https://github.com/login/oauth/access_token') {
        return new Response(
          JSON.stringify({ access_token: 'github-provider-access-token' }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      if (url === 'https://openidconnect.googleapis.com/v1/userinfo') {
        return new Response(
          JSON.stringify({
            sub: 'google-subject-1',
            email: 'oauth-user@example.com',
            email_verified: false,
            name: 'OAuth User',
            picture: 'https://provider.test/avatar.png',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url === 'https://api.github.com/user') {
        return new Response(
          JSON.stringify({
            id: 42,
            login: 'octo-user',
            email: null,
            avatar_url: null,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url === 'https://api.github.com/user/emails') {
        return new Response(
          JSON.stringify([
            {
              email: 'github-user@example.com',
              primary: true,
              verified: false,
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Unexpected fetch in OAuth integration test: ${url}`);
    });

  ({ server, request, teardown } = await getConnections(
    {
      schemas,
      authRole: 'anonymous',
      server: {
        useRouting: true,
        api: { isPublic: true, metaSchemas },
        oauth: {
          enabled: true,
          stateSecret: 'test-oauth-state-secret-at-least-32-bytes',
          successPath: '/signed-in',
          failurePath: '/sign-in',
        },
      },
    },
    seedAdapters
  ));
});

afterAll(async () => {
  fetchMock.mockRestore();
  await teardown();
});

const beginAuthorization = async (
  agent: supertest.Agent,
  host = primaryHost,
  provider = 'google'
) => {
  const response = await agent
    .get(`/auth/${provider}?return_to=/welcome`)
    .set('Host', host)
    .redirects(0);
  const location = new URL(response.headers.location);
  return { response, state: location.searchParams.get('state')! };
};

const completeAuthorization = async (
  agent: supertest.Agent,
  state: string,
  host = primaryHost,
  provider = 'google'
) =>
  agent
    .get(
      `/auth/${provider}/callback?code=test-code&state=${encodeURIComponent(state)}`
    )
    .set('Host', host)
    .redirects(0);

describe('OAuth provider discovery', () => {
  it('uses GraphQL and exposes only safe, enabled provider metadata', async () => {
    const response = await request
      .post('/graphql')
      .set('Host', primaryHost)
      .send({ query: '{ oauthProviders { slug displayName } }' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        oauthProviders: [
          { slug: 'github', displayName: 'GitHub' },
          { slug: 'google', displayName: 'Google' },
        ],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('test-google-client');
    expect(JSON.stringify(response.body)).not.toContain('test-google-secret');
  });

  it('does not restore the legacy HTTP discovery endpoint', async () => {
    const response = await request
      .get('/auth/providers')
      .set('Host', primaryHost)
      .redirects(0);
    expect(response.status).toBe(404);
  });
});

describe('authorization and callback integrity', () => {
  it('sets short-lived HttpOnly cookies and sends an S256 challenge, never the verifier', async () => {
    const agent = requestFactory.agent(server.url);
    const { response } = await beginAuthorization(agent);
    const location = new URL(response.headers.location);
    const cookies = setCookies(response);

    expect(response.status).toBe(302);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers.pragma).toBe('no-cache');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(location.origin).toBe('https://accounts.google.com');
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('code_challenge')).toBeTruthy();
    expect(location.searchParams.has('code_verifier')).toBe(false);
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('constructive_oauth_state='),
        expect.stringContaining('constructive_oauth_pkce='),
      ])
    );
    for (const cookie of cookies) {
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Path=/auth');
    }
  });

  it('accepts an unverified provider email as metadata and creates a session', async () => {
    const agent = requestFactory.agent(server.url);
    const { state } = await beginAuthorization(agent);
    const callback = await completeAuthorization(agent, state);

    expect(callback.status).toBe(302);
    expect(callback.headers.location).toBe('/welcome');
    expect(callback.headers['cache-control']).toBe('no-store');
    expect(callback.headers.pragma).toBe('no-cache');
    expect(callback.headers['referrer-policy']).toBe('no-referrer');
    expect(setCookies(callback)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('constructive_session=cnc_live_at_'),
      ])
    );
  });

  it('runs GitHub through the same route and callback lifecycle', async () => {
    const agent = requestFactory.agent(server.url);
    const { state } = await beginAuthorization(agent, primaryHost, 'github');
    const callback = await completeAuthorization(
      agent,
      state,
      primaryHost,
      'github'
    );

    expect(callback.status).toBe(302);
    expect(callback.headers.location).toBe('/welcome');
    expect(setCookies(callback)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('constructive_session=cnc_live_at_'),
      ])
    );
  });

  it('returns the same existing identity on repeated login', async () => {
    const agent = requestFactory.agent(server.url);
    const firstStart = await beginAuthorization(agent);
    const firstCallback = await completeAuthorization(
      agent,
      firstStart.state
    );
    const firstSession = setCookies(firstCallback)
      .find((cookie) => cookie.startsWith('constructive_session='))
      ?.split(';', 1)[0];

    // The successful session now stored by this same browser must not change
    // the role used by the next OAuth flow.
    const secondStart = await beginAuthorization(agent);
    const secondCallback = await completeAuthorization(
      agent,
      secondStart.state
    );
    const secondSession = setCookies(secondCallback)
      .find((cookie) => cookie.startsWith('constructive_session='))
      ?.split(';', 1)[0];

    expect(firstSession).toBeDefined();
    expect(secondSession).toBe(firstSession);
  });

  it('starts a new OAuth flow even when the browser has a stale session cookie', async () => {
    const response = await request
      .get('/auth/google?return_to=/welcome')
      .set('Host', primaryHost)
      .set('Cookie', 'constructive_session=invalid-stale-session')
      .redirects(0);

    expect(response.status).toBe(302);
    expect(new URL(response.headers.location).origin).toBe(
      'https://accounts.google.com'
    );
  });

  it('clears transient receipts and rejects callback replay', async () => {
    const agent = requestFactory.agent(server.url);
    const { response: authorization, state } = await beginAuthorization(agent);
    const capturedReceipt = setCookies(authorization)
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ');
    const firstCallback = await completeAuthorization(agent, state);
    const clearedCookies = setCookies(firstCallback);

    expect(clearedCookies).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^constructive_oauth_state=;/),
        expect.stringMatching(/^constructive_oauth_pkce=;/),
      ])
    );

    const replay = await completeAuthorization(agent, state);
    expect(replay.status).toBe(302);
    expect(replay.headers.location).toContain(
      '/sign-in?oauth_error=INVALID_OAUTH_STATE'
    );

    const copiedCookieReplay = await request
      .get(
        `/auth/google/callback?code=test-code&state=${encodeURIComponent(state)}`
      )
      .set('Host', primaryHost)
      .set('Cookie', capturedReceipt)
      .redirects(0);
    expect(copiedCookieReplay.headers.location).toContain(
      '/sign-in?oauth_error=INVALID_OAUTH_STATE'
    );
  });

  it('rejects callback reuse on another exact host even for the same API/database', async () => {
    const agent = requestFactory.agent(server.url);
    const { state } = await beginAuthorization(agent, primaryHost);
    const callback = await completeAuthorization(agent, state, alternateHost);

    expect(callback.status).toBe(302);
    expect(callback.headers.location).toContain(
      '/sign-in?oauth_error=INVALID_OAUTH_STATE'
    );
    expect(callback.headers.location).not.toContain('test-code');
  });

  it('rejects a cross-origin return target before contacting the provider', async () => {
    const agent = requestFactory.agent(server.url);
    const before = fetchMock.mock.calls.length;
    const response = await agent
      .get('/auth/google?return_to=https://evil.example/steal')
      .set('Host', primaryHost)
      .redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain(
      '/sign-in?oauth_error=INVALID_OAUTH_REDIRECT'
    );
    expect(fetchMock.mock.calls).toHaveLength(before);
  });

  it('maps provider callback errors to a canonical code without raw details', async () => {
    const agent = requestFactory.agent(server.url);
    const { state } = await beginAuthorization(agent);
    const response = await agent
      .get(
        `/auth/google/callback?error=access_denied&error_description=private-provider-detail&state=${encodeURIComponent(state)}`
      )
      .set('Host', primaryHost)
      .redirects(0);

    expect(response.headers.location).toContain(
      '/sign-in?oauth_error=OAUTH_AUTHORIZATION_FAILED'
    );
    expect(response.headers.location).not.toContain('access_denied');
    expect(response.headers.location).not.toContain('private-provider-detail');
  });

  it('has no default route fallback for an unknown host', async () => {
    const response = await request
      .get('/auth/google')
      .set('Host', 'unknown.example.com')
      .redirects(0);
    expect(response.status).toBe(404);
  });
});
