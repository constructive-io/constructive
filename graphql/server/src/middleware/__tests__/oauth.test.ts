import express from 'express';
import http from 'http';
import type { AddressInfo } from 'net';
import {
  createSignedState,
  deriveCodeChallenge,
  verifySignedState,
} from '@constructive-io/oauth';

import { createOAuthRoutes } from '../oauth';

const OAUTH_SECRET = 'test-oauth-state-secret';
const originalFetch = global.fetch;
const authQueryMock = jest.fn();

jest.mock('@pgpmjs/env', () => ({
  getNodeEnv: jest.fn(() => 'test'),
  getEnvVars: jest.fn(() => ({
    oauth: {
      secret: OAUTH_SECRET,
    },
  })),
}));

jest.mock('@pgpmjs/logger', () => ({
  Logger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  })),
}));

interface TestHttpResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

interface OAuthStatePayload {
  redirect_uri: string;
  provider: string;
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
    prompt: 'select_account',
  },
  pkceEnabled: true,
};

afterEach(() => {
  global.fetch = originalFetch;
  authQueryMock.mockReset();
});

function createConstructiveContext() {
  return {
    withPgClient: jest.fn(async (fn: (client: { query: typeof authQueryMock }) => Promise<unknown>) =>
      fn({ query: authQueryMock }),
    ),
    useModule: jest.fn(async (name: string) => {
      if (name === 'identityProviders') {
        return {
          providers: new Map([[providerConfig.slug, providerConfig]]),
        };
      }
      if (name === 'userAuthModule') {
        return {
          schemaName: 'constructive_auth_public',
          identityFunctionSchemaName: 'constructive_auth_private',
          signInIdentityFunction: 'sign_in_identity',
          signUpIdentityFunction: 'sign_up_identity',
        };
      }
      if (name === 'authSettings') {
        return {
          cookieHttponly: true,
          cookieSecure: false,
          cookieSamesite: 'lax',
        };
      }
      if (name === 'connectedAccountsModule') {
        return undefined;
      }
      return undefined;
    }),
  };
}

async function withOAuthServer<T>(
  run: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const app = express();
  app.use((req, _res, next) => {
    (req as any).constructive = createConstructiveContext();
    next();
  });
  app.use('/auth', createOAuthRoutes({} as any));

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
  headers: Record<string, string> = {},
): Promise<TestHttpResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'GET', headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
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

describe('OAuth routes', () => {
  it('binds PKCE verifier to the signed state cookie without exposing it in the redirect URL', async () => {
    await withOAuthServer(async (baseUrl) => {
      const response = await request(`${baseUrl}/auth/github?redirect_uri=%2Fdashboard`);

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
        secret: OAUTH_SECRET,
      });
      expect(statePayload).toMatchObject({
        redirect_uri: '/dashboard',
        provider: 'github',
      });

      const pkcePayload = verifySignedState<OAuthPkcePayload>(pkceCookie, {
        secret: OAUTH_SECRET,
      });
      expect(pkcePayload).toMatchObject({
        state: stateCookie,
        provider: 'github',
      });
      expect(pkcePayload!.code_verifier).toHaveLength(43);
      expect(redirect.searchParams.get('code_challenge')).toBe(
        deriveCodeChallenge(pkcePayload!.code_verifier),
      );

      expect(
        setCookies.find((value) => value.startsWith('oauth_state=')),
      ).toContain('HttpOnly');
      expect(
        setCookies.find((value) => value.startsWith('oauth_pkce=')),
      ).toContain('HttpOnly');
    });
  });

  it('rejects callback requests when the PKCE verifier is not bound to the returned state', async () => {
    await withOAuthServer(async (baseUrl) => {
      const stateCookie = createSignedState<OAuthStatePayload>(
        { redirect_uri: '/dashboard', provider: 'github' },
        { secret: OAUTH_SECRET, maxAgeMs: 60_000 },
      );
      const pkceCookie = createSignedState<OAuthPkcePayload>(
        {
          state: 'different-state',
          provider: 'github',
          code_verifier: 'test-code-verifier',
        },
        { secret: OAUTH_SECRET, maxAgeMs: 60_000 },
      );
      const callbackUrl = new URL('/auth/github/callback', baseUrl);
      callbackUrl.searchParams.set('code', 'callback-code');
      callbackUrl.searchParams.set('state', stateCookie);

      const response = await request(callbackUrl.toString(), {
        Cookie: [
          `oauth_state=${encodeURIComponent(stateCookie)}`,
          `oauth_pkce=${encodeURIComponent(pkceCookie)}`,
        ].join('; '),
      });

      expect(response.statusCode).toBe(302);
      const redirect = new URL(response.headers.location!);
      expect(redirect.pathname).toBe('/auth/error');
      expect(redirect.searchParams.get('error')).toBe('INVALID_PKCE');
      expect(redirect.searchParams.get('provider')).toBe('github');
    });
  });

  it('uses the identity function schema for successful sign-up callbacks', async () => {
    await withOAuthServer(async (baseUrl) => {
      const beginResponse = await request(`${baseUrl}/auth/github?redirect_uri=%2Fdashboard`);
      const setCookies = getSetCookieValues(beginResponse.headers);
      const stateCookie = readCookie(setCookies, 'oauth_state');
      const pkceCookie = readCookie(setCookies, 'oauth_pkce');
      const pkcePayload = verifySignedState<OAuthPkcePayload>(pkceCookie, {
        secret: OAUTH_SECRET,
      });
      expect(pkcePayload).toBeTruthy();

      global.fetch = jest.fn(async (url: string | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString === 'https://github.example.test/login/oauth/access_token') {
          const body = JSON.parse(init?.body as string);
          expect(body.code_verifier).toBe(pkcePayload!.code_verifier);
          return {
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({
              access_token: 'provider-access-token',
              token_type: 'bearer',
            }),
            text: jest.fn(),
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
              name: 'Octo Cat',
            }),
            text: jest.fn(),
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
                verified: true,
              },
            ]),
            text: jest.fn(),
          } as unknown as Response;
        }
        throw new Error(`Unexpected fetch URL: ${urlString}`);
      }) as unknown as typeof fetch;
      authQueryMock.mockResolvedValueOnce({
        rows: [
          {
            access_token: 'constructive-session-token',
          },
        ],
      });

      const callbackUrl = new URL('/auth/github/callback', baseUrl);
      callbackUrl.searchParams.set('code', 'callback-code');
      callbackUrl.searchParams.set('state', stateCookie);
      const callbackResponse = await request(callbackUrl.toString(), {
        Cookie: [
          `oauth_state=${encodeURIComponent(stateCookie)}`,
          `oauth_pkce=${encodeURIComponent(pkceCookie)}`,
        ].join('; '),
      });

      expect(callbackResponse.statusCode).toBe(302);
      expect(callbackResponse.headers.location).toBe('/dashboard');
      expect(authQueryMock).toHaveBeenCalledTimes(1);
      expect(authQueryMock.mock.calls[0][0]).toContain(
        'constructive_auth_private.sign_up_identity',
      );
      expect(
        getSetCookieValues(callbackResponse.headers).some((cookie) =>
          cookie.startsWith('constructive_session='),
        ),
      ).toBe(true);
    });
  });
});
