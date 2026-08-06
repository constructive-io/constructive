import { ConstructiveError } from '@constructive-io/errors';

import {
  createOAuthClient,
  createSignedState,
  deriveCodeChallenge,
  generateCodeVerifier,
  getProvider,
  resolveSameOriginReturnPath,
  verifyCodeChallenge,
  verifySignedState,
} from '../src';

const config = {
  providers: {
    google: {
      clientId: 'google-client-id',
      clientSecret: 'google-client-secret',
      pkceEnabled: true,
    },
    github: {
      clientId: 'github-client-id',
      clientSecret: 'github-client-secret',
      pkceEnabled: true,
    },
  },
  baseUrl: 'https://api.example.com',
};

describe('OAuthClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(['google', 'github'])(
    'uses S256 PKCE for %s authorization',
    (provider) => {
      const client = createOAuthClient(config);
      const result = client.getAuthorizationUrl({ provider,
        state: 'signed-state',
      });
      const url = new URL(result.url);

      expect(url.searchParams.get('state')).toBe('signed-state');
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('code_challenge')).toBe(result.codeChallenge);
      expect(result.codeChallenge).toBe(
        deriveCodeChallenge(result.codeVerifier)
      );
      expect(url.searchParams.has('code_verifier')).toBe(false);
    }
  );

  it('rejects providers that disable PKCE', () => {
    const client = createOAuthClient({
      ...config,
      providers: { google: { ...config.providers.google, pkceEnabled: false } },
    });

    expect(() => client.getAuthorizationUrl({ provider: 'google' })).toThrow(
      expect.objectContaining({ code: 'INVALID_OAUTH_PKCE' })
    );
  });

  it('rejects an unsupported provider with a stable domain error', () => {
    const client = createOAuthClient({
      ...config,
      providers: {
        custom: {
          clientId: 'custom',
          clientSecret: 'secret',
          pkceEnabled: true,
        },
      },
    });

    expect(() => client.getAuthorizationUrl({ provider: 'custom' })).toThrow(
      expect.objectContaining({ code: 'IDENTITY_PROVIDER_NOT_SUPPORTED' })
    );
  });

  it('sends the verifier only to the token endpoint', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'access-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const client = createOAuthClient(config);
    const codeVerifier = generateCodeVerifier();

    await client.exchangeCode({
      provider: 'google',
      code: 'code',
      codeVerifier,
    });

    const request = fetchMock.mock.calls[0];
    expect(request[0]).toBe('https://oauth2.googleapis.com/token');
    expect(String(request[1]?.body)).toContain(`code_verifier=${codeVerifier}`);
    expect(request[1]).toEqual(
      expect.objectContaining({
        redirect: 'error',
        signal: expect.any(AbortSignal),
      })
    );
  });

  it.each([
    'http://localhost/token',
    'https://127.0.0.1/token',
    'https://169.254.169.254/latest/meta-data',
    'https://[::1]/token',
  ])('rejects non-public provider endpoints: %s', (tokenUrl) => {
    const client = createOAuthClient({
      ...config,
      providers: {
        google: { ...config.providers.google, tokenUrl },
      },
    });

    expect(() => client.getAuthorizationUrl({ provider: 'google' })).toThrow(
      expect.objectContaining({ code: 'IDENTITY_PROVIDER_NOT_CONFIGURED' })
    );
  });

  it('bounds provider requests with the configured timeout', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('request aborted'))
          );
        })
    );
    const client = createOAuthClient({ ...config, requestTimeoutMs: 5 });

    await expect(
      client.exchangeCode({
        provider: 'google',
        code: 'code',
        codeVerifier: generateCodeVerifier(),
      })
    ).rejects.toMatchObject({ code: 'OAUTH_TOKEN_EXCHANGE_FAILED' });
  });

  it('does not copy a provider response body into token errors', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response('secret provider diagnostic', { status: 401 })
      );
    const client = createOAuthClient(config);

    await expect(
      client.exchangeCode({
        provider: 'google',
        code: 'bad-code',
        codeVerifier: generateCodeVerifier(),
      })
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'OAUTH_TOKEN_EXCHANGE_FAILED',
        message: 'The identity provider token exchange failed.',
      })
    );
  });

  it('retains fetch failures as an internal cause', async () => {
    const cause = new Error('network unavailable');
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(cause);
    const client = createOAuthClient(config);

    await expect(
      client.exchangeCode({
        provider: 'google',
        code: 'code',
        codeVerifier: generateCodeVerifier(),
      })
    ).rejects.toMatchObject({ code: 'OAUTH_TOKEN_EXCHANGE_FAILED', cause });
  });
});

describe('PKCE and signed state primitives', () => {
  it('generates RFC 7636 verifiers and verifies their challenge', () => {
    const verifier = generateCodeVerifier();
    const challenge = deriveCodeChallenge(verifier);
    expect(verifier).toMatch(/^[A-Za-z0-9._~-]{43,128}$/);
    expect(verifyCodeChallenge(verifier, challenge)).toBe(true);
  });

  it('signs, expires, and detects tampering of state', () => {
    const secret = 'a'.repeat(32);
    const state = createSignedState(
      { provider: 'google', databaseId: 'db-1', pkceChallenge: 'challenge' },
      { secret, maxAgeMs: 1_000, now: 1_000 }
    );
    expect(verifySignedState(state, { secret, now: 1_500 })).toMatchObject({
      provider: 'google',
      databaseId: 'db-1',
      pkceChallenge: 'challenge',
    });
    expect(verifySignedState(`${state}x`, { secret, now: 1_500 })).toBeNull();
    expect(verifySignedState(state, { secret, now: 2_001 })).toBeNull();
  });
});

describe('same-origin redirect validation', () => {
  it('normalizes relative and same-origin targets to a relative path', () => {
    expect(
      resolveSameOriginReturnPath(
        '/dashboard?tab=auth',
        'https://api.example.com'
      )
    ).toBe('/dashboard?tab=auth');
    expect(
      resolveSameOriginReturnPath(
        'https://api.example.com/settings#identity',
        'https://api.example.com'
      )
    ).toBe('/settings#identity');
  });

  it('rejects cross-host targets', () => {
    expect(() =>
      resolveSameOriginReturnPath(
        'https://other.example.com/',
        'https://api.example.com'
      )
    ).toThrow(expect.objectContaining({ code: 'INVALID_OAUTH_REDIRECT' }));
  });
});

describe('profile normalization', () => {
  it('keeps only normalized Google metadata', () => {
    const profile = getProvider('google')!.mapProfile({
      sub: 'subject',
      email: 'user@example.com',
      email_verified: false,
      name: 'User',
      access_token: 'must-not-survive',
    });

    expect(profile).toEqual({
      provider: 'google',
      providerId: 'subject',
      email: 'user@example.com',
      emailVerified: false,
      name: 'User',
      picture: null,
    });
    expect(profile).not.toHaveProperty('raw');
  });

  it.each([
    ['google', { email: 'missing-subject@example.com' }],
    ['google', { sub: 123, email_verified: 'yes' }],
    ['github', { id: '42', login: 'octo-user' }],
    ['github', { id: 42, login: null }],
  ])('rejects malformed %s identity payloads', (provider, payload) => {
    expect(() => getProvider(provider)!.mapProfile(payload)).toThrow(TypeError);
  });

  it('uses ConstructiveError as the protocol error type', () => {
    const client = createOAuthClient({ ...config, providers: {} });
    expect(() => client.getAuthorizationUrl({ provider: 'google' })).toThrow(
      ConstructiveError
    );
  });
});
