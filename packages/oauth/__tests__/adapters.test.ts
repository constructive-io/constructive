import {
  exportJWK,
  generateKeyPair,
  type KeyLike,
  SignJWT} from 'jose';

import {
  getProviderAdapter,
  getProviderAdapterKinds,
  githubAdapter,
  googleAdapter,
  type IdentityProviderConfiguration,
  ProviderAdapterError} from '../src';

const providerConfig = (
  overrides: Partial<IdentityProviderConfiguration>
): IdentityProviderConfiguration => ({
  slug: 'provider',
  kind: 'oauth2',
  displayName: 'Provider',
  enabled: true,
  clientId: 'client-id',
  clientSecret: 'client-secret',
  authorizationUrl: null,
  tokenUrl: null,
  userinfoUrl: null,
  issuerUrl: null,
  discoveryDoc: null,
  jwks: null,
  acceptableClientIds: [],
  scopes: [],
  extraAuthorizationParams: {},
  emailOptional: true,
  skipNonceCheck: false,
  pkceEnabled: true,
  ...overrides
});

const jsonResponse = (value: unknown): Response =>
  new Response(JSON.stringify(value), {
    headers: { 'content-type': 'application/json' }
  });

describe('Provider adapter registry', () => {
  it('registers Google and GitHub without a Provider-specific workflow API', () => {
    expect(getProviderAdapterKinds()).toEqual(['google', 'github']);
    expect(getProviderAdapter('google')).toBe(googleAdapter);
    expect(getProviderAdapter('github')).toBe(githubAdapter);
    expect(() => getProviderAdapter('not-registered')).toThrow(
      ProviderAdapterError
    );
  });
});

describe('Google OIDC adapter', () => {
  let privateKey: KeyLike;
  let publicJwk: Awaited<ReturnType<typeof exportJWK>>;

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256');
    privateKey = pair.privateKey;
    publicJwk = await exportJWK(pair.publicKey);
    publicJwk.kid = 'test-key';
    publicJwk.alg = 'RS256';
  });

  const googleConfig = (): IdentityProviderConfiguration =>
    providerConfig({
      slug: 'google',
      kind: 'oidc',
      displayName: 'Google',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      issuerUrl: 'https://accounts.google.com',
      jwks: { keys: [publicJwk] },
      scopes: ['openid', 'email', 'profile']
    });

  it('builds mandatory S256 and nonce authorization parameters', () => {
    const config = googleAdapter.validateConfiguration(googleConfig());
    const url = new URL(
      googleAdapter.createAuthorizationRequest({
        config,
        redirectUri: 'https://auth.example.com/auth/oauth/callback',
        state: 's'.repeat(43),
        codeChallenge: 'c'.repeat(43),
        nonce: 'n'.repeat(43)
      }).url
    );
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      code_challenge: 'c'.repeat(43),
      code_challenge_method: 'S256',
      nonce: 'n'.repeat(43),
      state: 's'.repeat(43)
    });
  });

  it('verifies the ID token and returns only normalized identity data', async () => {
    const idToken = await new SignJWT({
      email: 'person@example.com',
      email_verified: false,
      name: 'Example Person',
      nonce: 'n'.repeat(43),
      picture: 'https://images.example.com/person.png'
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer('https://accounts.google.com')
      .setAudience('client-id')
      .setSubject('google-subject')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
    const fetchMock = jest.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        jsonResponse({ access_token: 'never-return-this', id_token: idToken })
    ) as unknown as jest.MockedFunction<typeof fetch>;

    const identity = await googleAdapter.completeAuthorization({
      config: googleAdapter.validateConfiguration(googleConfig()),
      redirectUri: 'https://auth.example.com/auth/oauth/callback',
      code: 'authorization-code',
      codeVerifier: 'a'.repeat(43),
      nonce: 'n'.repeat(43),
      requestTimeoutMs: 1000,
      fetch: fetchMock
    });

    expect(identity).toEqual({
      providerKey: 'google',
      subject: 'google-subject',
      email: 'person@example.com',
      profile: {
        name: 'Example Person',
        avatarUrl: 'https://images.example.com/person.png',
        emailVerified: false
      }
    });
    expect(JSON.stringify(identity)).not.toContain('never-return-this');
  });

  it('fails closed when PKCE or nonce verification is disabled', () => {
    expect(() =>
      googleAdapter.validateConfiguration(
        { ...googleConfig(), pkceEnabled: false }
      )
    ).toThrow(ProviderAdapterError);
    expect(() =>
      googleAdapter.validateConfiguration(
        { ...googleConfig(), skipNonceCheck: true }
      )
    ).toThrow(ProviderAdapterError);
  });

  it('rejects an ID token that is not bound to the original nonce', async () => {
    const idToken = await new SignJWT({ nonce: 'different-nonce' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer('https://accounts.google.com')
      .setAudience('client-id')
      .setSubject('google-subject')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
    const fetchMock = jest.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        jsonResponse({ id_token: idToken })
    ) as unknown as jest.MockedFunction<typeof fetch>;

    await expect(
      googleAdapter.completeAuthorization({
        config: googleAdapter.validateConfiguration(googleConfig()),
        redirectUri: 'https://auth.example.com/auth/oauth/callback',
        code: 'authorization-code',
        codeVerifier: 'a'.repeat(43),
        nonce: 'n'.repeat(43),
        requestTimeoutMs: 1000,
        fetch: fetchMock
      })
    ).rejects.toMatchObject({ reason: 'IDENTITY_VERIFICATION_FAILED' });
  });
});

describe('GitHub OAuth adapter', () => {
  const githubConfig = (): IdentityProviderConfiguration =>
    providerConfig({
      slug: 'github',
      displayName: 'GitHub',
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userinfoUrl: 'https://api.github.com/user',
      scopes: ['read:user', 'user:email']
    });

  it('uses server-only access token for profile/email and normalizes stable ID', async () => {
    const responses: unknown[] = [
      { access_token: 'github-server-token' },
      {
        id: 42,
        login: 'octocat',
        name: 'Octo Cat',
        email: null,
        avatar_url: 'https://avatars.githubusercontent.com/u/42'
      },
      [{ email: 'octo@example.com', primary: true, verified: true }]
    ];
    const fetchMock = jest.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        jsonResponse(responses.shift())
    ) as unknown as jest.MockedFunction<typeof fetch>;

    const identity = await githubAdapter.completeAuthorization({
      config: githubAdapter.validateConfiguration(githubConfig()),
      redirectUri: 'https://auth.example.com/auth/oauth/callback',
      code: 'authorization-code',
      codeVerifier: 'b'.repeat(43),
      requestTimeoutMs: 1000,
      fetch: fetchMock
    });

    expect(identity).toEqual({
      providerKey: 'github',
      subject: '42',
      email: 'octo@example.com',
      profile: {
        name: 'Octo Cat',
        username: 'octocat',
        avatarUrl: 'https://avatars.githubusercontent.com/u/42',
        emailVerified: true
      }
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({
      Authorization: 'Bearer github-server-token'
    });
    expect(JSON.stringify(identity)).not.toContain('github-server-token');
  });
});
