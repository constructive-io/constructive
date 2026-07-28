import {
  createSignedState,
  deriveCodeChallenge,
  verifySignedState
} from '@constructive-io/oauth';
import { getNodeEnv } from '@pgpmjs/env';
import express from 'express';
import http from 'http';
import type { AddressInfo } from 'net';
import { getPgPool } from 'pg-cache';

import { errorHandler } from '../error-handler';
import { createOAuthRoutes } from '../oauth';
import type { ResolvedRoute } from '../routing';

const OAUTH_STATE_SECRET = 'test-oauth-state-secret';
const DATABASE_ID = '00000000-0000-4000-8000-000000000001';
const API_ID = '00000000-0000-4000-8000-000000000002';
const TARGET_API_ID = '00000000-0000-4000-8000-000000000003';
const OTHER_DATABASE_ID = '00000000-0000-4000-8000-000000000099';
const originalFetch = global.fetch;
const authQueryMock = jest.fn();
const routingQueryMock = jest.fn();

jest.mock('@pgpmjs/env', () => ({
  getNodeEnv: jest.fn(() => 'test')
}));

jest.mock('@pgpmjs/logger', () => ({
  Logger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }))
}));

jest.mock('pg-cache', () => ({
  getPgPool: jest.fn()
}));

const mockGetNodeEnv = getNodeEnv as jest.MockedFunction<typeof getNodeEnv>;
const mockGetPgPool = getPgPool as jest.MockedFunction<typeof getPgPool>;

interface TestHttpResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

interface OAuthStatePayload {
  redirect_uri: string;
  provider: string;
  database_id: string;
  api_id: string | null;
  origin: string;
  redirect_target_database_id: string;
  redirect_target_api_id: string | null;
  redirect_target_origin: string;
}

interface OAuthPkcePayload {
  state: string;
  provider: string;
  code_verifier: string;
}

const providerConfig = {
  slug: 'github',
  kind: 'oauth2' as const,
  displayName: 'GitHub',
  enabled: true,
  clientId: 'github-client-id',
  clientSecret: 'github-client-secret',
  authorizationUrl: 'https://github.example.test/login/oauth/authorize',
  tokenUrl: 'https://github.example.test/login/oauth/access_token',
  userinfoUrl: 'https://github.example.test/api/v3/user',
  scopes: ['read:user', 'user:email'],
  authorizationParams: {
    prompt: 'select_account'
  },
  pkceEnabled: true
};

afterEach(() => {
  global.fetch = originalFetch;
  authQueryMock.mockReset();
  routingQueryMock.mockReset();
  mockGetNodeEnv.mockReturnValue('test');
});

beforeEach(() => {
  mockGetPgPool.mockReturnValue({ query: routingQueryMock } as never);
});

function createConstructiveContext(
  authSettingsOverrides: Record<string, unknown> = {}
) {
  return {
    api: {
      apiId: API_ID
    },
    databaseId: DATABASE_ID,
    withPgClient: jest.fn(
      async (
        fn: (client: { query: typeof authQueryMock }) => Promise<unknown>
      ) => fn({ query: authQueryMock })
    ),
    useModule: jest.fn(async (name: string) => {
      if (name === 'identityProviders') {
        return {
          providers: new Map([[providerConfig.slug, providerConfig]])
        };
      }
      if (name === 'userAuthModule') {
        return {
          schemaName: 'constructive_auth_public',
          identityFunctionSchemaName: 'constructive_auth_private',
          signInIdentityFunction: 'sign_in_identity',
          signUpIdentityFunction: 'sign_up_identity'
        };
      }
      if (name === 'authSettings') {
        return {
          cookieHttponly: true,
          cookieSecure: false,
          cookieSamesite: 'lax',
          ...authSettingsOverrides
        };
      }
      if (name === 'connectedAccountsModule') {
        return undefined;
      }
      return undefined;
    })
  };
}

async function withOAuthServer<T>(
  run: (baseUrl: string) => Promise<T>,
  stateSecret: string | null = OAUTH_STATE_SECRET,
  contextFactory: () => ReturnType<
    typeof createConstructiveContext
  > = createConstructiveContext
): Promise<T> {
  const app = express();
  app.use((req, _res, next) => {
    (req as any).constructive = contextFactory();
    (req as any).requestId = 'oauth-test-request';
    next();
  });
  app.use(
    '/auth',
    createOAuthRoutes({
      oauth: {
        stateSecret: stateSecret ?? undefined
      }
    } as any)
  );
  app.use(errorHandler);

  const server = await new Promise<http.Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });

  try {
    const { port } = server.address() as AddressInfo;
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function request(
  url: string,
  headers: Record<string, string> = {}
): Promise<TestHttpResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'GET', headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8')
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function getSetCookieValues(headers: http.IncomingHttpHeaders): string[] {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return [];
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

function readCookie(setCookies: string[], name: string): string {
  const cookie = setCookies.find((value) => value.startsWith(`${name}=`));
  if (!cookie) {
    throw new Error(`Missing ${name} cookie`);
  }
  const value = cookie.split(';')[0].slice(name.length + 1);
  return decodeURIComponent(value);
}

function createStatePayload(
  baseUrl: string,
  provider = 'github',
  overrides: Partial<OAuthStatePayload> = {}
): OAuthStatePayload {
  return {
    redirect_uri: '/dashboard',
    provider,
    database_id: DATABASE_ID,
    api_id: API_ID,
    origin: baseUrl,
    redirect_target_database_id: DATABASE_ID,
    redirect_target_api_id: API_ID,
    redirect_target_origin: baseUrl,
    ...overrides
  };
}

function createResolvedApiRoute({
  databaseId = DATABASE_ID,
  apiId = TARGET_API_ID,
  targetModule = 'apis',
  includeDatabaseId = true
}: {
  databaseId?: string;
  apiId?: string;
  targetModule?: string;
  includeDatabaseId?: boolean;
} = {}): ResolvedRoute {
  return {
    route_binding_id: '00000000-0000-4000-8000-000000000010',
    hostname: 'api1.tenanta.test',
    matched_wildcard: false,
    matched_path: '/',
    method: null,
    priority: 0,
    domain_id: '00000000-0000-4000-8000-000000000011',
    target_catalog_id: '00000000-0000-4000-8000-000000000012',
    target_module: targetModule,
    target_source_id: apiId,
    target_owner_scope: 'database',
    target_owner_key: databaseId,
    resolved_config: {
      api_id: apiId,
      ...(includeDatabaseId ? { database_id: databaseId } : {}),
      dbname: 'tenant_a',
      role_name: 'authenticated',
      anon_role: 'anonymous',
      is_public: true,
      schemas: ['tenant_a_public']
    },
    verification_status: 'verified',
    tls_status: 'ready',
    tls_secret_name: null
  };
}

function noMatchingRoute(): ResolvedRoute {
  return {
    ...createResolvedApiRoute(),
    route_binding_id: null
  };
}

describe('OAuth routes', () => {
  it('passes provider errors through without treating them as registered errors', async () => {
    await withOAuthServer(async (baseUrl) => {
      const callbackUrl = new URL('/auth/github/callback', baseUrl);
      callbackUrl.searchParams.set('error', 'access_denied');
      callbackUrl.searchParams.set('error_description', 'User denied access');

      const response = await request(callbackUrl.toString());

      expect(response.statusCode).toBe(302);
      const redirect = new URL(response.headers.location!);
      expect(redirect.pathname).toBe('/auth/error');
      expect(redirect.searchParams.get('error')).toBe('access_denied');
      expect(redirect.searchParams.get('provider')).toBe('github');
      expect(redirect.searchParams.get('error_description')).toBe(
        'User denied access'
      );
    });
  });

  it('binds PKCE verifier to the signed state cookie without exposing it in the redirect URL', async () => {
    await withOAuthServer(async (baseUrl) => {
      const response = await request(
        `${baseUrl}/auth/github?redirect_uri=%2Fdashboard`
      );

      expect(response.statusCode).toBe(302);
      const location = response.headers.location;
      expect(location).toBeDefined();

      const redirect = new URL(location!);
      const setCookies = getSetCookieValues(response.headers);
      const stateCookie = readCookie(setCookies, 'oauth_state');
      const pkceCookie = readCookie(setCookies, 'oauth_pkce');

      expect(redirect.origin).toBe('https://github.example.test');
      expect(redirect.pathname).toBe('/login/oauth/authorize');
      expect(redirect.searchParams.get('state')).toBe(stateCookie);
      expect(redirect.searchParams.get('code_challenge_method')).toBe('S256');
      expect(redirect.searchParams.get('prompt')).toBe('select_account');
      expect(location).not.toContain('code_verifier');

      const statePayload = verifySignedState<OAuthStatePayload>(stateCookie, {
        secret: OAUTH_STATE_SECRET
      });
      expect(statePayload).toMatchObject({
        redirect_uri: '/dashboard',
        provider: 'github',
        database_id: DATABASE_ID,
        api_id: API_ID,
        origin: baseUrl,
        redirect_target_database_id: DATABASE_ID,
        redirect_target_api_id: API_ID,
        redirect_target_origin: baseUrl
      });

      const pkcePayload = verifySignedState<OAuthPkcePayload>(pkceCookie, {
        secret: OAUTH_STATE_SECRET
      });
      expect(pkcePayload).toMatchObject({
        state: stateCookie,
        provider: 'github'
      });
      expect(pkcePayload!.code_verifier).toHaveLength(43);
      expect(redirect.searchParams.get('code_challenge')).toBe(
        deriveCodeChallenge(pkcePayload!.code_verifier)
      );

      expect(
        setCookies.find((value) => value.startsWith('oauth_state='))
      ).toContain('HttpOnly');
      expect(
        setCookies.find((value) => value.startsWith('oauth_state='))
      ).toContain('Path=/auth');
      expect(
        setCookies.find((value) => value.startsWith('oauth_state='))
      ).not.toContain('Domain=');
      expect(
        setCookies.find((value) => value.startsWith('oauth_pkce='))
      ).toContain('HttpOnly');
      expect(
        setCookies.find((value) => value.startsWith('oauth_pkce='))
      ).not.toContain('Domain=');
    });
  });

  it('normalizes an absolute same-origin redirect to the compatible relative form', async () => {
    await withOAuthServer(async (baseUrl) => {
      const target = `${baseUrl}/dashboard?tab=profile#security`;
      const response = await request(
        `${baseUrl}/auth/github?redirect_uri=${encodeURIComponent(target)}`
      );

      expect(response.statusCode).toBe(302);
      const state = readCookie(
        getSetCookieValues(response.headers),
        'oauth_state'
      );
      expect(
        verifySignedState<OAuthStatePayload>(state, {
          secret: OAUTH_STATE_SECRET
        })
      ).toMatchObject({
        redirect_uri: '/dashboard?tab=profile#security',
        redirect_target_database_id: DATABASE_ID,
        redirect_target_api_id: API_ID,
        redirect_target_origin: baseUrl
      });
      expect(routingQueryMock).not.toHaveBeenCalled();
    });
  });

  it('allows a registered cross-origin API in the same database and binds its scope in state', async () => {
    routingQueryMock.mockResolvedValue({ rows: [createResolvedApiRoute()] });

    await withOAuthServer(async (baseUrl) => {
      const target =
        'http://api1.tenanta.test/dashboard?tab=profile#security';
      const response = await request(
        `${baseUrl}/auth/github?redirect_uri=${encodeURIComponent(target)}`
      );

      expect(response.statusCode).toBe(302);
      const state = readCookie(
        getSetCookieValues(response.headers),
        'oauth_state'
      );
      expect(
        verifySignedState<OAuthStatePayload>(state, {
          secret: OAUTH_STATE_SECRET
        })
      ).toMatchObject({
        redirect_uri: target,
        database_id: DATABASE_ID,
        api_id: API_ID,
        origin: baseUrl,
        redirect_target_database_id: DATABASE_ID,
        redirect_target_api_id: TARGET_API_ID,
        redirect_target_origin: 'http://api1.tenanta.test'
      });
      expect(routingQueryMock).toHaveBeenCalledWith(
        expect.stringContaining('"routing_public".resolve_route'),
        ['api1.tenanta.test']
      );
    });
  });

  it.each([
    {
      name: 'another database',
      target: 'http://api1.tenanta.test/dashboard',
      route: createResolvedApiRoute({ databaseId: OTHER_DATABASE_ID })
    },
    {
      name: 'an unregistered hostname',
      target: 'http://unregistered.tenanta.test/dashboard',
      route: noMatchingRoute()
    },
    {
      name: 'a non-API route',
      target: 'http://api1.tenanta.test/dashboard',
      route: createResolvedApiRoute({ targetModule: 'sites' })
    },
    {
      name: 'an API route without databaseId',
      target: 'http://api1.tenanta.test/dashboard',
      route: createResolvedApiRoute({ includeDatabaseId: false })
    },
    {
      name: 'a similar but unregistered hostname',
      target: 'http://api1.tenanta.test.attacker.test/dashboard',
      route: noMatchingRoute()
    }
  ])('rejects a cross-origin redirect resolved to $name', async ({ target, route }) => {
    routingQueryMock.mockResolvedValue({ rows: [route] });

    await withOAuthServer(async (baseUrl) => {
      const response = await request(
        `${baseUrl}/auth/github?redirect_uri=${encodeURIComponent(target)}`
      );

      expect(response.statusCode).toBe(302);
      const redirect = new URL(response.headers.location!);
      expect(redirect.origin).toBe(baseUrl);
      expect(redirect.pathname).toBe('/auth/error');
      expect(redirect.searchParams.get('error')).toBe(
        'INVALID_REDIRECT_URI'
      );
      expect(getSetCookieValues(response.headers)).toHaveLength(0);
    });
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,hello',
    'file:///tmp/session',
    '//api1.tenanta.test/dashboard',
    'http://user:password@api1.tenanta.test/dashboard',
    'http://[invalid'
  ])('rejects unsafe redirect URI %s before routing', async (target) => {
    await withOAuthServer(async (baseUrl) => {
      const response = await request(
        `${baseUrl}/auth/github?redirect_uri=${encodeURIComponent(target)}`
      );

      const redirect = new URL(response.headers.location!);
      expect(redirect.origin).toBe(baseUrl);
      expect(redirect.searchParams.get('error')).toBe(
        'INVALID_REDIRECT_URI'
      );
      expect(routingQueryMock).not.toHaveBeenCalled();
    });
  });

  it('rejects an HTTP cross-origin target in production', async () => {
    mockGetNodeEnv.mockReturnValueOnce('production');

    await withOAuthServer(async (baseUrl) => {
      const response = await request(
        `${baseUrl}/auth/github?redirect_uri=${encodeURIComponent(
          'http://api1.tenanta.test/dashboard'
        )}`
      );

      const redirect = new URL(response.headers.location!);
      expect(redirect.searchParams.get('error')).toBe(
        'INVALID_REDIRECT_URI'
      );
      expect(routingQueryMock).not.toHaveBeenCalled();
    });
  });

  it('rejects callback requests when the PKCE verifier is not bound to the returned state', async () => {
    await withOAuthServer(async (baseUrl) => {
      const stateCookie = createSignedState<OAuthStatePayload>(
        createStatePayload(baseUrl),
        { secret: OAUTH_STATE_SECRET, maxAgeMs: 60_000 }
      );
      const pkceCookie = createSignedState<OAuthPkcePayload>(
        {
          state: 'different-state',
          provider: 'github',
          code_verifier: 'test-code-verifier'
        },
        { secret: OAUTH_STATE_SECRET, maxAgeMs: 60_000 }
      );
      const callbackUrl = new URL('/auth/github/callback', baseUrl);
      callbackUrl.searchParams.set('code', 'callback-code');
      callbackUrl.searchParams.set('state', stateCookie);

      const response = await request(callbackUrl.toString(), {
        Cookie: [
          `oauth_state=${encodeURIComponent(stateCookie)}`,
          `oauth_pkce=${encodeURIComponent(pkceCookie)}`
        ].join('; ')
      });

      expect(response.statusCode).toBe(302);
      const redirect = new URL(response.headers.location!);
      expect(redirect.pathname).toBe('/auth/error');
      expect(redirect.searchParams.get('error')).toBe('OAUTH_INVALID_PKCE');
      expect(redirect.searchParams.get('provider')).toBe('github');
    });
  });

  it('rejects callback requests when signed state belongs to another provider', async () => {
    await withOAuthServer(async (baseUrl) => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;
      const stateCookie = createSignedState<OAuthStatePayload>(
        createStatePayload(baseUrl),
        { secret: OAUTH_STATE_SECRET, maxAgeMs: 60_000 }
      );
      const callbackUrl = new URL('/auth/google/callback', baseUrl);
      callbackUrl.searchParams.set('code', 'callback-code');
      callbackUrl.searchParams.set('state', stateCookie);

      const response = await request(callbackUrl.toString(), {
        Cookie: `oauth_state=${encodeURIComponent(stateCookie)}`
      });

      expect(response.statusCode).toBe(302);
      const redirect = new URL(response.headers.location!);
      expect(redirect.pathname).toBe('/auth/error');
      expect(redirect.searchParams.get('error')).toBe('OAUTH_INVALID_STATE');
      expect(redirect.searchParams.get('provider')).toBe('google');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(authQueryMock).not.toHaveBeenCalled();
    });
  });

  it('rejects a state value that was modified after signing', async () => {
    await withOAuthServer(async (baseUrl) => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockRejectedValue(new Error('fetch must not be called'));
      const signedState = createSignedState<OAuthStatePayload>(
        createStatePayload(baseUrl),
        { secret: OAUTH_STATE_SECRET, maxAgeMs: 60_000 }
      );
      const replacement = signedState.endsWith('a') ? 'b' : 'a';
      const tamperedState = `${signedState.slice(0, -1)}${replacement}`;
      const callbackUrl = new URL('/auth/github/callback', baseUrl);
      callbackUrl.searchParams.set('code', 'callback-code');
      callbackUrl.searchParams.set('state', tamperedState);

      const response = await request(callbackUrl.toString(), {
        Cookie: `oauth_state=${encodeURIComponent(tamperedState)}`
      });

      const redirect = new URL(response.headers.location!);
      expect(redirect.searchParams.get('error')).toBe('INVALID_STATE');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(authQueryMock).not.toHaveBeenCalled();
    });
  });

  it('rejects callback state bound to another database', async () => {
    await withOAuthServer(async (baseUrl) => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;
      const stateCookie = createSignedState<OAuthStatePayload>(
        createStatePayload(baseUrl, 'github', {
          database_id: '00000000-0000-4000-8000-000000000099'
        }),
        { secret: OAUTH_STATE_SECRET, maxAgeMs: 60_000 }
      );
      const callbackUrl = new URL('/auth/github/callback', baseUrl);
      callbackUrl.searchParams.set('code', 'callback-code');
      callbackUrl.searchParams.set('state', stateCookie);

      const response = await request(callbackUrl.toString(), {
        Cookie: `oauth_state=${encodeURIComponent(stateCookie)}`
      });

      expect(response.statusCode).toBe(302);
      const redirect = new URL(response.headers.location!);
      expect(redirect.searchParams.get('error')).toBe('OAUTH_INVALID_STATE');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(authQueryMock).not.toHaveBeenCalled();
    });
  });

  it('rejects callback state bound to another API', async () => {
    await withOAuthServer(async (baseUrl) => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;
      const stateCookie = createSignedState<OAuthStatePayload>(
        createStatePayload(baseUrl, 'github', {
          api_id: '00000000-0000-4000-8000-000000000099'
        }),
        { secret: OAUTH_STATE_SECRET, maxAgeMs: 60_000 }
      );
      const callbackUrl = new URL('/auth/github/callback', baseUrl);
      callbackUrl.searchParams.set('code', 'callback-code');
      callbackUrl.searchParams.set('state', stateCookie);

      const response = await request(callbackUrl.toString(), {
        Cookie: `oauth_state=${encodeURIComponent(stateCookie)}`
      });

      expect(response.statusCode).toBe(302);
      const redirect = new URL(response.headers.location!);
      expect(redirect.searchParams.get('error')).toBe('OAUTH_INVALID_STATE');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(authQueryMock).not.toHaveBeenCalled();
    });
  });

  it('rejects callback state bound to another origin', async () => {
    await withOAuthServer(async (baseUrl) => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;
      const stateCookie = createSignedState<OAuthStatePayload>(
        createStatePayload(baseUrl, 'github', {
          origin: 'https://other.example.test'
        }),
        { secret: OAUTH_STATE_SECRET, maxAgeMs: 60_000 }
      );
      const callbackUrl = new URL('/auth/github/callback', baseUrl);
      callbackUrl.searchParams.set('code', 'callback-code');
      callbackUrl.searchParams.set('state', stateCookie);

      const response = await request(callbackUrl.toString(), {
        Cookie: `oauth_state=${encodeURIComponent(stateCookie)}`
      });

      expect(response.statusCode).toBe(302);
      const redirect = new URL(response.headers.location!);
      expect(redirect.searchParams.get('error')).toBe('OAUTH_INVALID_STATE');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(authQueryMock).not.toHaveBeenCalled();
    });
  });

  it('only requires the state secret when an OAuth flow starts', async () => {
    await withOAuthServer(async (baseUrl) => {
      const providersResponse = await request(`${baseUrl}/auth/providers`);
      expect(providersResponse.statusCode).toBe(200);
      expect(JSON.parse(providersResponse.body)).toEqual({
        providers: ['github']
      });

      const beginResponse = await request(`${baseUrl}/auth/github`);
      expect(beginResponse.statusCode).toBe(302);
      const redirect = new URL(beginResponse.headers.location!);
      expect(redirect.searchParams.get('error')).toBe('OAUTH_INIT_FAILED');
      expect(getSetCookieValues(beginResponse.headers)).toHaveLength(0);
    }, null);
  });

  it('reports provider metadata failures instead of silently returning no providers', async () => {
    await withOAuthServer(
      async (baseUrl) => {
        const response = await request(`${baseUrl}/auth/providers`);

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body)).toEqual({
          error: {
            code: 'OAUTH_CONFIGURATION_ERROR',
            message: 'An unexpected error occurred',
            requestId: 'oauth-test-request'
          }
        });
      },
      OAUTH_STATE_SECRET,
      () => {
        const context = createConstructiveContext();
        context.useModule.mockRejectedValue(
          new Error('internal secrets scope mismatch')
        );
        return context;
      }
    );
  });

  it('uses the identity function schema for successful sign-up callbacks', async () => {
    routingQueryMock.mockResolvedValue({ rows: [createResolvedApiRoute()] });

    await withOAuthServer(async (baseUrl) => {
      const redirectTarget = 'http://api1.tenanta.test/dashboard';
      const beginResponse = await request(
        `${baseUrl}/auth/github?redirect_uri=${encodeURIComponent(
          redirectTarget
        )}`
      );
      const setCookies = getSetCookieValues(beginResponse.headers);
      const stateCookie = readCookie(setCookies, 'oauth_state');
      const pkceCookie = readCookie(setCookies, 'oauth_pkce');
      const pkcePayload = verifySignedState<OAuthPkcePayload>(pkceCookie, {
        secret: OAUTH_STATE_SECRET
      });
      expect(pkcePayload).toBeTruthy();

      global.fetch = jest.fn(async (url: string | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (
          urlString === 'https://github.example.test/login/oauth/access_token'
        ) {
          const body = JSON.parse(init?.body as string);
          expect(body.code_verifier).toBe(pkcePayload!.code_verifier);
          return {
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({
              access_token: 'provider-access-token',
              token_type: 'bearer'
            }),
            text: jest.fn()
          } as unknown as Response;
        }
        if (urlString === 'https://github.example.test/api/v3/user') {
          return {
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({
              id: 12345,
              login: 'octocat',
              email: 'octocat@example.test',
              name: 'Octo Cat'
            }),
            text: jest.fn()
          } as unknown as Response;
        }
        if (urlString === 'https://github.example.test/api/v3/user/emails') {
          return {
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue([
              {
                email: 'octocat@example.test',
                primary: true,
                verified: true
              }
            ]),
            text: jest.fn()
          } as unknown as Response;
        }
        throw new Error(`Unexpected fetch URL: ${urlString}`);
      }) as unknown as typeof fetch;
      authQueryMock.mockResolvedValueOnce({
        rows: [
          {
            access_token: 'constructive-session-token'
          }
        ]
      });

      const callbackUrl = new URL('/auth/github/callback', baseUrl);
      callbackUrl.searchParams.set('code', 'callback-code');
      callbackUrl.searchParams.set('state', stateCookie);
      const callbackResponse = await request(callbackUrl.toString(), {
        Cookie: [
          `oauth_state=${encodeURIComponent(stateCookie)}`,
          `oauth_pkce=${encodeURIComponent(pkceCookie)}`
        ].join('; ')
      });

      expect(callbackResponse.statusCode).toBe(302);
      expect(callbackResponse.headers.location).toBe(redirectTarget);
      expect(authQueryMock).toHaveBeenCalledTimes(1);
      expect(authQueryMock.mock.calls[0][0]).toContain(
        'constructive_auth_private.sign_up_identity'
      );
      const sessionCookie = getSetCookieValues(callbackResponse.headers).find(
        (cookie) => cookie.startsWith('constructive_session=')
      );
      expect(sessionCookie).toContain('Domain=tenanta.test');
      expect(sessionCookie).toContain('Path=/');
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('SameSite=Lax');
      expect(routingQueryMock).toHaveBeenCalledTimes(2);
    }, OAUTH_STATE_SECRET, () =>
      createConstructiveContext({ cookieDomain: 'tenanta.test' })
    );
  });

  it('rejects callback when the redirect route changes database after initiation', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('fetch must not be called'));
    routingQueryMock
      .mockResolvedValueOnce({ rows: [createResolvedApiRoute()] })
      .mockResolvedValueOnce({
        rows: [createResolvedApiRoute({ databaseId: OTHER_DATABASE_ID })]
      });

    await withOAuthServer(async (baseUrl) => {
      const target = 'http://api1.tenanta.test/dashboard';
      const beginResponse = await request(
        `${baseUrl}/auth/github?redirect_uri=${encodeURIComponent(target)}`
      );
      const stateCookie = readCookie(
        getSetCookieValues(beginResponse.headers),
        'oauth_state'
      );
      const callbackUrl = new URL('/auth/github/callback', baseUrl);
      callbackUrl.searchParams.set('code', 'unused-code');
      callbackUrl.searchParams.set('state', stateCookie);

      const response = await request(callbackUrl.toString(), {
        Cookie: `oauth_state=${encodeURIComponent(stateCookie)}`
      });

      const redirect = new URL(response.headers.location!);
      expect(redirect.origin).toBe(baseUrl);
      expect(redirect.searchParams.get('error')).toBe('INVALID_STATE');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(authQueryMock).not.toHaveBeenCalled();
    });
  });
});
