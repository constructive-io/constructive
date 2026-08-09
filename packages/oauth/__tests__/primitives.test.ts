import {
  createAuthorizationUrl,
  deriveS256CodeChallenge,
  generateCodeVerifier,
  generateOidcNonce,
  generateOpaqueState,
  isOpaqueOAuthValue,
  ProviderAdapterError,
  validateProviderEndpoint
} from '../src';

describe('OAuth protocol primitives', () => {
  it('generates unique 32-byte browser-safe values', () => {
    const values = [
      generateOpaqueState(),
      generateOpaqueState(),
      generateCodeVerifier(),
      generateOidcNonce()
    ];
    expect(new Set(values).size).toBe(values.length);
    for (const value of values) {
      expect(value).toHaveLength(43);
      expect(isOpaqueOAuthValue(value)).toBe(true);
      expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('derives the RFC 7636 S256 example challenge', () => {
    expect(
      deriveS256CodeChallenge(
        'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
      )
    ).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('rejects a verifier outside the RFC 7636 shape', () => {
    expect(() => deriveS256CodeChallenge('too-short')).toThrow(
      ProviderAdapterError
    );
  });
});

describe('Provider endpoint and authorization URL safety', () => {
  const endpoint = validateProviderEndpoint(
    'https://accounts.example.com/oauth/authorize',
    ['https://accounts.example.com/oauth/authorize']
  );

  it('requires an exact, clean, allowlisted HTTPS endpoint', () => {
    for (const unsafe of [
      'http://accounts.example.com/oauth/authorize',
      'https://accounts.example.com/oauth/authorize?next=unsafe',
      'https://user:secret@accounts.example.com/oauth/authorize',
      'https://127.0.0.1/oauth/authorize',
      'https://[::1]/oauth/authorize',
      'https://accounts.example.com/other'
    ]) {
      expect(() =>
        validateProviderEndpoint(unsafe, [
          'https://accounts.example.com/oauth/authorize'
        ])
      ).toThrow(ProviderAdapterError);
    }
  });

  it('owns all security-sensitive authorization parameters', () => {
    expect(() =>
      createAuthorizationUrl({
        endpoint,
        clientId: 'client-id',
        redirectUri: 'https://auth.example.com/auth/oauth/callback',
        scopes: ['openid'],
        state: 's'.repeat(43),
        codeChallenge: 'c'.repeat(43),
        extraParameters: { prompt: 'select_account', state: 'overridden' }
      })
    ).toThrow(/owned by the OAuth flow/);

    const url = new URL(
      createAuthorizationUrl({
        endpoint,
        clientId: 'client-id',
        redirectUri: 'https://auth.example.com/auth/oauth/callback',
        scopes: ['openid', 'email'],
        state: 's'.repeat(43),
        codeChallenge: 'c'.repeat(43),
        nonce: 'n'.repeat(43),
        extraParameters: { prompt: 'select_account' }
      })
    );
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: 'client-id',
      code_challenge: 'c'.repeat(43),
      code_challenge_method: 'S256',
      nonce: 'n'.repeat(43),
      prompt: 'select_account',
      response_type: 'code',
      scope: 'openid email',
      state: 's'.repeat(43)
    });
  });
});
