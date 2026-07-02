import { OAuthClient, createOAuthClient } from '../src/oauth-client';
import { resolveOAuthProvider } from '../src/provider-resolver';
import { GITHUB_EMAILS_URL, getProvider, getProviderIds } from '../src/providers';
import { generateState, verifyState } from '../src/utils/state';
import { createSignedState, verifySignedState } from '../src/utils/signed-state';
import { deriveCodeChallenge } from '../src/utils/pkce';

const originalFetch = global.fetch;

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('OAuthClient', () => {
  const config = {
    providers: {
      google: {
        clientId: 'test-google-client-id',
        clientSecret: 'test-google-client-secret',
      },
      github: {
        clientId: 'test-github-client-id',
        clientSecret: 'test-github-client-secret',
      },
    },
    baseUrl: 'https://api.example.com',
  };

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL for Google', () => {
      const client = createOAuthClient(config);
      const { url, state } = client.getAuthorizationUrl({ provider: 'google' });

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-google-client-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid+email+profile');
      expect(url).toContain(`state=${state}`);
      expect(state).toHaveLength(64);
    });

    it('should generate authorization URL for GitHub', () => {
      const client = createOAuthClient(config);
      const { url, state } = client.getAuthorizationUrl({ provider: 'github' });

      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test-github-client-id');
      expect(url).toContain('scope=user%3Aemail+read%3Auser');
      expect(state).toHaveLength(64);
    });

    it('should use custom state when provided', () => {
      const client = createOAuthClient(config);
      const customState = 'my-custom-state-123';
      const { url, state } = client.getAuthorizationUrl({
        provider: 'google',
        state: customState,
      });

      expect(state).toBe(customState);
      expect(url).toContain(`state=${customState}`);
    });

    it('should use custom redirect URI when provided', () => {
      const client = createOAuthClient(config);
      const customRedirectUri = 'https://custom.example.com/callback';
      const { url } = client.getAuthorizationUrl({
        provider: 'google',
        redirectUri: customRedirectUri,
      });

      expect(url).toContain(`redirect_uri=${encodeURIComponent(customRedirectUri)}`);
    });

    it('should use custom scopes when provided', () => {
      const client = createOAuthClient(config);
      const { url } = client.getAuthorizationUrl({
        provider: 'google',
        scopes: ['email'],
      });

      expect(url).toContain('scope=email');
      expect(url).not.toContain('profile');
    });

    it('should use runtime authorization URL, scopes, and extra params', () => {
      const client = createOAuthClient({
        providers: {
          github: {
            clientId: 'runtime-client-id',
            clientSecret: 'runtime-client-secret',
            authorizationUrl: 'https://github.enterprise.test/login/oauth/authorize',
            tokenUrl: 'https://github.enterprise.test/login/oauth/access_token',
            userinfoUrl: 'https://github.enterprise.test/api/user',
            scopes: ['read:user'],
            authorizationParams: {
              prompt: 'select_account',
              client_id: 'ignored-client-id',
            },
          },
        },
        baseUrl: 'https://api.example.com',
      });

      const { url, state } = client.getAuthorizationUrl({
        provider: 'github',
        state: 'runtime-state',
      });
      const parsed = new URL(url);

      expect(`${parsed.origin}${parsed.pathname}`).toBe(
        'https://github.enterprise.test/login/oauth/authorize'
      );
      expect(parsed.searchParams.get('client_id')).toBe('runtime-client-id');
      expect(parsed.searchParams.get('scope')).toBe('read:user');
      expect(parsed.searchParams.get('prompt')).toBe('select_account');
      expect(parsed.searchParams.get('state')).toBe('runtime-state');
      expect(state).toBe('runtime-state');
    });

    it('should add a PKCE challenge when runtime config enables PKCE', () => {
      const client = createOAuthClient({
        providers: {
          google: {
            clientId: 'runtime-google-client-id',
            clientSecret: 'runtime-google-client-secret',
            pkceEnabled: true,
          },
        },
        baseUrl: 'https://api.example.com',
      });

      const { url, codeVerifier } = client.getAuthorizationUrl({
        provider: 'google',
        state: 'pkce-state',
      });
      const parsed = new URL(url);

      expect(codeVerifier).toBeDefined();
      expect(codeVerifier).toHaveLength(43);
      expect(parsed.searchParams.get('code_challenge')).toBe(
        deriveCodeChallenge(codeVerifier!)
      );
      expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    });

    it('should throw error for unknown provider', () => {
      const client = createOAuthClient(config);

      expect(() => {
        client.getAuthorizationUrl({ provider: 'unknown' });
      }).toThrow('Unknown provider: unknown');
    });

    it('should throw error for unconfigured provider', () => {
      const client = createOAuthClient(config);

      expect(() => {
        client.getAuthorizationUrl({ provider: 'facebook' });
      }).toThrow('No credentials configured for provider: facebook');
    });
  });

  describe('exchangeCode', () => {
    it('should exchange legacy credential-only config with static provider defaults', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce(
        jsonResponse({
          access_token: 'legacy-token',
          token_type: 'bearer',
        })
      );
      global.fetch = fetchMock;

      const client = createOAuthClient(config);
      const tokens = await client.exchangeCode({
        provider: 'google',
        code: 'legacy-code',
      });

      expect(tokens.access_token).toBe('legacy-token');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({ method: 'POST' })
      );
      const request = fetchMock.mock.calls[0][1] as RequestInit;
      expect(request.headers).toMatchObject({
        'Content-Type': 'application/x-www-form-urlencoded',
      });
      const body = new URLSearchParams(request.body as string);
      expect(body.get('client_id')).toBe('test-google-client-id');
      expect(body.get('client_secret')).toBe('test-google-client-secret');
      expect(body.get('code')).toBe('legacy-code');
    });

    it('should use runtime token URL, content type, and extra token params', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce(
        jsonResponse({
          access_token: 'runtime-token',
          token_type: 'bearer',
        })
      );
      global.fetch = fetchMock;

      const client = createOAuthClient({
        providers: {
          github: {
            clientId: 'runtime-client-id',
            clientSecret: 'runtime-client-secret',
            authorizationUrl: 'https://github.enterprise.test/login/oauth/authorize',
            tokenUrl: 'https://github.enterprise.test/login/oauth/access_token',
            userinfoUrl: 'https://github.enterprise.test/api/user',
            scopes: ['read:user'],
            tokenRequestContentType: 'form',
            tokenParams: {
              audience: 'constructive-api',
              client_secret: 'ignored-client-secret',
            },
          },
        },
        baseUrl: 'https://api.example.com',
      });

      const tokens = await client.exchangeCode({
        provider: 'github',
        code: 'runtime-code',
      });

      expect(tokens.access_token).toBe('runtime-token');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://github.enterprise.test/login/oauth/access_token',
        expect.objectContaining({ method: 'POST' })
      );
      const request = fetchMock.mock.calls[0][1] as RequestInit;
      expect(request.headers).toMatchObject({
        'Content-Type': 'application/x-www-form-urlencoded',
      });
      const body = new URLSearchParams(request.body as string);
      expect(body.get('client_id')).toBe('runtime-client-id');
      expect(body.get('client_secret')).toBe('runtime-client-secret');
      expect(body.get('audience')).toBe('constructive-api');
      expect(body.get('code')).toBe('runtime-code');
    });

    it('should use client_secret_basic without leaking client_secret into the body', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce(
        jsonResponse({
          access_token: 'basic-token',
          token_type: 'bearer',
        })
      );
      global.fetch = fetchMock;

      const client = createOAuthClient({
        providers: {
          google: {
            clientId: 'basic-client-id',
            clientSecret: 'basic-client-secret',
            tokenEndpointAuthMethod: 'client_secret_basic',
          },
        },
        baseUrl: 'https://api.example.com',
      });

      await client.exchangeCode({ provider: 'google', code: 'basic-code' });

      const request = fetchMock.mock.calls[0][1] as RequestInit;
      expect(request.headers).toMatchObject({
        Authorization: `Basic ${Buffer.from('basic-client-id:basic-client-secret').toString('base64')}`,
      });
      const body = new URLSearchParams(request.body as string);
      expect(body.get('client_secret')).toBeNull();
      expect(body.get('code')).toBe('basic-code');
    });

    it('should allow token endpoint auth method none without a client secret', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce(
        jsonResponse({
          access_token: 'public-token',
          token_type: 'bearer',
        })
      );
      global.fetch = fetchMock;

      const client = createOAuthClient({
        providers: {
          google: {
            clientId: 'public-client-id',
            tokenEndpointAuthMethod: 'none',
          },
        },
        baseUrl: 'https://api.example.com',
      });

      const tokens = await client.exchangeCode({
        provider: 'google',
        code: 'public-code',
      });

      expect(tokens.access_token).toBe('public-token');
      const request = fetchMock.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(request.body as string);
      expect(body.get('client_id')).toBe('public-client-id');
      expect(body.get('client_secret')).toBeNull();
    });

    it('should reject unsupported private_key_jwt token endpoint auth', async () => {
      const client = createOAuthClient({
        providers: {
          google: {
            clientId: 'jwt-client-id',
            tokenEndpointAuthMethod: 'private_key_jwt',
          },
        },
        baseUrl: 'https://api.example.com',
      });

      await expect(
        client.exchangeCode({ provider: 'google', code: 'jwt-code' })
      ).rejects.toMatchObject({
        code: 'TOKEN_AUTH_UNSUPPORTED',
      });
    });

    it('should send PKCE code_verifier during token exchange', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce(
        jsonResponse({
          access_token: 'pkce-token',
          token_type: 'bearer',
        })
      );
      global.fetch = fetchMock;

      const client = createOAuthClient({
        providers: {
          google: {
            clientId: 'pkce-client-id',
            clientSecret: 'pkce-client-secret',
            pkceEnabled: true,
          },
        },
        baseUrl: 'https://api.example.com',
      });

      await client.exchangeCode({
        provider: 'google',
        code: 'pkce-code',
        codeVerifier: 'test-code-verifier',
      });

      const request = fetchMock.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(request.body as string);
      expect(body.get('code_verifier')).toBe('test-code-verifier');
    });

    it('should require a PKCE code_verifier during token exchange when PKCE is enabled', async () => {
      const client = createOAuthClient({
        providers: {
          google: {
            clientId: 'pkce-client-id',
            clientSecret: 'pkce-client-secret',
            pkceEnabled: true,
          },
        },
        baseUrl: 'https://api.example.com',
      });

      await expect(
        client.exchangeCode({ provider: 'google', code: 'pkce-code' })
      ).rejects.toMatchObject({
        code: 'PKCE_VERIFIER_REQUIRED',
      });
    });
  });

  describe('getConfig', () => {
    it('should return config with defaults', () => {
      const client = createOAuthClient(config);
      const returnedConfig = client.getConfig();

      expect(returnedConfig.callbackPath).toBe('/auth/{provider}/callback');
      expect(returnedConfig.stateCookieName).toBe('oauth_state');
      expect(returnedConfig.stateCookieMaxAge).toBe(600);
    });

    it('should allow overriding defaults', () => {
      const client = createOAuthClient({
        ...config,
        callbackPath: '/custom/callback/{provider}',
        stateCookieName: 'custom_state',
        stateCookieMaxAge: 300,
      });
      const returnedConfig = client.getConfig();

      expect(returnedConfig.callbackPath).toBe('/custom/callback/{provider}');
      expect(returnedConfig.stateCookieName).toBe('custom_state');
      expect(returnedConfig.stateCookieMaxAge).toBe(300);
    });
  });

  describe('getUserProfile', () => {
    it('should enrich GitHub public email verification serially', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            id: 12345,
            login: 'octocat',
            name: 'Octo Cat',
            email: 'octo@example.com',
          })
        )
        .mockResolvedValueOnce(
          jsonResponse([
            {
              email: 'octo@example.com',
              primary: true,
              verified: true,
            },
          ])
        );
      global.fetch = fetchMock;

      const client = createOAuthClient(config);
      const profile = await client.getUserProfile('github', 'github-token');

      expect(profile.email).toBe('octo@example.com');
      expect(profile.emailVerified).toBe(true);
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://api.github.com/user',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer github-token',
            'User-Agent': 'Constructive-OAuth',
          }),
        })
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        GITHUB_EMAILS_URL,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer github-token',
            'User-Agent': 'Constructive-OAuth',
          }),
        })
      );
    });

    it('should preserve explicit GitHub unverified email status', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            id: 12345,
            login: 'octocat',
            email: 'octo@example.com',
          })
        )
        .mockResolvedValueOnce(
          jsonResponse([
            {
              email: 'octo@example.com',
              primary: true,
              verified: false,
            },
          ])
        );

      const client = createOAuthClient(config);
      const profile = await client.getUserProfile('github', 'github-token');

      expect(profile.email).toBe('octo@example.com');
      expect(profile.emailVerified).toBe(false);
    });

    it('should not replace a public GitHub email when no email-list match exists', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            id: 12345,
            login: 'octocat',
            email: 'public@example.com',
          })
        )
        .mockResolvedValueOnce(
          jsonResponse([
            {
              email: 'primary@example.com',
              primary: true,
              verified: true,
            },
          ])
        );

      const client = createOAuthClient(config);
      const profile = await client.getUserProfile('github', 'github-token');

      expect(profile.email).toBe('public@example.com');
      expect(profile.emailVerified).toBeNull();
    });

    it('should use the best GitHub fallback email when profile email is private', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            id: 12345,
            login: 'octocat',
            email: null,
          })
        )
        .mockResolvedValueOnce(
          jsonResponse([
            {
              email: 'secondary@example.com',
              primary: false,
              verified: true,
            },
            {
              email: 'primary@example.com',
              primary: true,
              verified: true,
            },
          ])
        );

      const client = createOAuthClient(config);
      const profile = await client.getUserProfile('github', 'github-token');

      expect(profile.email).toBe('primary@example.com');
      expect(profile.emailVerified).toBe(true);
    });

    it('should use a verified GitHub fallback email when there is no primary verified email', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            id: 12345,
            login: 'octocat',
            email: null,
          })
        )
        .mockResolvedValueOnce(
          jsonResponse([
            {
              email: 'first@example.com',
              primary: false,
              verified: false,
            },
            {
              email: 'verified@example.com',
              primary: false,
              verified: true,
            },
            {
              email: 'primary@example.com',
              primary: true,
              verified: false,
            },
          ])
        );

      const client = createOAuthClient(config);
      const profile = await client.getUserProfile('github', 'github-token');

      expect(profile.email).toBe('verified@example.com');
      expect(profile.emailVerified).toBe(true);
    });

    it('should use the primary GitHub fallback email when no verified email exists', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            id: 12345,
            login: 'octocat',
            email: null,
          })
        )
        .mockResolvedValueOnce(
          jsonResponse([
            {
              email: 'secondary@example.com',
              primary: false,
              verified: false,
            },
            {
              email: 'primary@example.com',
              primary: true,
              verified: false,
            },
          ])
        );

      const client = createOAuthClient(config);
      const profile = await client.getUserProfile('github', 'github-token');

      expect(profile.email).toBe('primary@example.com');
      expect(profile.emailVerified).toBe(false);
    });

    it('should keep the base GitHub profile when email enrichment fails', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            id: 12345,
            login: 'octocat',
            email: 'octo@example.com',
          })
        )
        .mockResolvedValueOnce(jsonResponse('forbidden', false, 403));

      const client = createOAuthClient(config);
      const profile = await client.getUserProfile('github', 'github-token');

      expect(profile.email).toBe('octo@example.com');
      expect(profile.emailVerified).toBeNull();
    });

    it('should fail when the GitHub profile request fails', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse('server error', false, 500));
      global.fetch = fetchMock;

      const client = createOAuthClient(config);

      await expect(client.getUserProfile('github', 'github-token')).rejects.toMatchObject({
        code: 'USER_PROFILE_FAILED',
        statusCode: 500,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should not call the GitHub emails endpoint for other providers', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce(
        jsonResponse({
          sub: '123456789',
          email: 'test@gmail.com',
          email_verified: true,
        })
      );
      global.fetch = fetchMock;

      const client = createOAuthClient(config);
      const profile = await client.getUserProfile('google', 'google-token');

      expect(profile.email).toBe('test@gmail.com');
      expect(profile.emailVerified).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should use runtime userinfo URL and method', async () => {
      const fetchMock = jest.fn().mockResolvedValueOnce(
        jsonResponse({
          sub: 'runtime-google-id',
          email: 'runtime@gmail.com',
          email_verified: true,
        })
      );
      global.fetch = fetchMock;

      const client = createOAuthClient({
        providers: {
          google: {
            clientId: 'runtime-google-client-id',
            clientSecret: 'runtime-google-client-secret',
            userinfoUrl: 'https://idp.example.test/oauth/userinfo',
            userInfoMethod: 'POST',
          },
        },
        baseUrl: 'https://api.example.com',
      });
      const profile = await client.getUserProfile('google', 'runtime-token');

      expect(profile.email).toBe('runtime@gmail.com');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://idp.example.test/oauth/userinfo',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer runtime-token',
          }),
        })
      );
    });

    it('should derive the GitHub emails URL from runtime userinfo URL', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            id: 12345,
            login: 'octocat',
            email: null,
          })
        )
        .mockResolvedValueOnce(
          jsonResponse([
            {
              email: 'enterprise@example.com',
              primary: true,
              verified: true,
            },
          ])
        );
      global.fetch = fetchMock;

      const client = createOAuthClient({
        providers: {
          github: {
            clientId: 'runtime-github-client-id',
            clientSecret: 'runtime-github-client-secret',
            userinfoUrl: 'https://github.enterprise.test/api/v3/user',
          },
        },
        baseUrl: 'https://api.example.com',
      });
      const profile = await client.getUserProfile('github', 'runtime-github-token');

      expect(profile.email).toBe('enterprise@example.com');
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'https://github.enterprise.test/api/v3/user/emails',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer runtime-github-token',
          }),
        })
      );
      expect(fetchMock).not.toHaveBeenCalledWith(
        GITHUB_EMAILS_URL,
        expect.anything()
      );
    });
  });
});

describe('providers', () => {
  it('should have all expected providers', () => {
    const ids = getProviderIds();
    expect(ids).toContain('google');
    expect(ids).toContain('github');
    expect(ids).toContain('facebook');
    expect(ids).toContain('linkedin');
  });

  it('should return provider config by id', () => {
    const google = getProvider('google');
    expect(google).toBeDefined();
    expect(google!.id).toBe('google');
    expect(google!.name).toBe('Google');
    expect(google!.authorizationUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth');
  });

  it('should return undefined for unknown provider', () => {
    const unknown = getProvider('unknown');
    expect(unknown).toBeUndefined();
  });
});

describe('provider resolver', () => {
  it('should merge runtime config over static provider defaults', () => {
    const resolved = resolveOAuthProvider({
      providerId: 'github',
      runtimeConfig: {
        slug: 'github',
        kind: 'oauth2',
        clientId: 'runtime-client-id',
        clientSecret: 'runtime-client-secret',
        authorizationUrl: 'https://github.enterprise.test/login/oauth/authorize',
        tokenUrl: 'https://github.enterprise.test/login/oauth/access_token',
        userinfoUrl: 'https://github.enterprise.test/api/user',
        scopes: ['read:user'],
        pkceEnabled: true,
      },
    });

    expect(resolved.providerId).toBe('github');
    expect(resolved.provider.id).toBe('github');
    expect(resolved.config.authorizationUrl).toBe(
      'https://github.enterprise.test/login/oauth/authorize'
    );
    expect(resolved.config.tokenUrl).toBe(
      'https://github.enterprise.test/login/oauth/access_token'
    );
    expect(resolved.config.userinfoUrl).toBe(
      'https://github.enterprise.test/api/user'
    );
    expect(resolved.config.scopes).toEqual(['read:user']);
    expect(resolved.config.pkceEnabled).toBe(true);
  });

  it('should use static scopes when runtime scopes are not configured', () => {
    const resolved = resolveOAuthProvider({
      providerId: 'github',
      runtimeConfig: {
        slug: 'github',
        kind: 'oauth2',
        clientId: 'runtime-client-id',
        clientSecret: 'runtime-client-secret',
        scopes: null,
      },
    });

    expect(resolved.config.scopes).toEqual(['user:email', 'read:user']);
  });

  it('should allow public client config without a client secret', () => {
    const resolved = resolveOAuthProvider({
      providerId: 'google',
      runtimeConfig: {
        slug: 'google',
        kind: 'oidc',
        clientId: 'public-client-id',
        tokenEndpointAuthMethod: 'none',
      },
    });

    expect(resolved.config.tokenEndpointAuthMethod).toBe('none');
    expect(resolved.config.clientSecret).toBeUndefined();
  });

  it('should require a client secret for default confidential clients', () => {
    expect(() =>
      resolveOAuthProvider({
        providerId: 'google',
        runtimeConfig: {
          slug: 'google',
          kind: 'oidc',
          clientId: 'confidential-client-id',
        },
      })
    ).toThrow('missing required config: clientSecret');
  });

  it('should reject disabled providers', () => {
    expect(() =>
      resolveOAuthProvider({
        providerId: 'github',
        runtimeConfig: {
          slug: 'github',
          kind: 'oauth2',
          enabled: false,
          clientId: 'runtime-client-id',
          clientSecret: 'runtime-client-secret',
        },
      })
    ).toThrow('Provider github is disabled');
  });

  it('should reject kind mismatches for known providers', () => {
    expect(() =>
      resolveOAuthProvider({
        providerId: 'github',
        runtimeConfig: {
          slug: 'github',
          kind: 'oidc',
          clientId: 'runtime-client-id',
          clientSecret: 'runtime-client-secret',
        },
      })
    ).toThrow('does not match provider kind');
  });

  it('should reject unknown providers', () => {
    expect(() =>
      resolveOAuthProvider({
        providerId: 'unknown',
        runtimeConfig: {
          slug: 'unknown',
          kind: 'oauth2',
          clientId: 'runtime-client-id',
          clientSecret: 'runtime-client-secret',
        },
      })
    ).toThrow('Unknown provider: unknown');
  });
});

describe('state utilities', () => {
  describe('generateState', () => {
    it('should generate random state of default length', () => {
      const state = generateState();
      expect(state).toHaveLength(64);
    });

    it('should generate random state of custom length', () => {
      const state = generateState(16);
      expect(state).toHaveLength(32);
    });

    it('should generate unique states', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(state1).not.toBe(state2);
    });
  });

  describe('verifyState', () => {
    it('should return true for matching states', () => {
      const state = generateState();
      expect(verifyState(state, state)).toBe(true);
    });

    it('should return false for non-matching states', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(verifyState(state1, state2)).toBe(false);
    });

    it('should return false for undefined expected state', () => {
      expect(verifyState(undefined, 'some-state')).toBe(false);
    });

    it('should return false for undefined actual state', () => {
      expect(verifyState('some-state', undefined)).toBe(false);
    });

    it('should return false for different length states', () => {
      expect(verifyState('short', 'much-longer-state')).toBe(false);
    });
  });

  describe('signed state', () => {
    interface RedirectStatePayload {
      redirect_uri: string;
      provider: string;
    }

    const payload: RedirectStatePayload = {
      redirect_uri: '/dashboard',
      provider: 'github',
    };

    it('should verify a signed state payload', () => {
      const state = createSignedState(payload, {
        secret: 'test-secret',
        maxAgeMs: 60_000,
      });

      const verified = verifySignedState<RedirectStatePayload>(state, {
        secret: 'test-secret',
      });

      expect(verified).toMatchObject(payload);
      expect(verified?.nonce).toHaveLength(32);
      expect(typeof verified?.exp).toBe('number');
    });

    it('should reject a signed state with the wrong secret', () => {
      const state = createSignedState(payload, {
        secret: 'test-secret',
        maxAgeMs: 60_000,
      });

      expect(
        verifySignedState<RedirectStatePayload>(state, {
          secret: 'other-secret',
        })
      ).toBeNull();
    });

    it('should reject an expired signed state', () => {
      const state = createSignedState(payload, {
        secret: 'test-secret',
        maxAgeMs: -1,
      });

      expect(
        verifySignedState<RedirectStatePayload>(state, {
          secret: 'test-secret',
        })
      ).toBeNull();
    });

    it('should return null when verifying without a secret', () => {
      const state = createSignedState(payload, {
        secret: 'test-secret',
        maxAgeMs: 60_000,
      });

      expect(verifySignedState<RedirectStatePayload>(state, {})).toBeNull();
    });

    it('should require a secret when creating signed state', () => {
      expect(() =>
        createSignedState(payload, {
          secret: '',
          maxAgeMs: 60_000,
        })
      ).toThrow('OAuth state secret is required');
    });
  });
});

describe('provider profile mapping', () => {
  it('should map Google profile correctly', () => {
    const google = getProvider('google')!;
    const profile = google.mapProfile({
      sub: '123456789',
      email: 'test@gmail.com',
      email_verified: true,
      name: 'Test User',
      picture: 'https://example.com/photo.jpg',
    });

    expect(profile.provider).toBe('google');
    expect(profile.providerId).toBe('123456789');
    expect(profile.email).toBe('test@gmail.com');
    expect(profile.name).toBe('Test User');
    expect(profile.picture).toBe('https://example.com/photo.jpg');
    expect(profile.emailVerified).toBe(true);
  });

  it('should map GitHub profile correctly', () => {
    const github = getProvider('github')!;
    const profile = github.mapProfile({
      id: 12345,
      login: 'testuser',
      name: 'Test User',
      email: 'test@github.com',
      avatar_url: 'https://avatars.githubusercontent.com/u/12345',
    });

    expect(profile.provider).toBe('github');
    expect(profile.providerId).toBe('12345');
    expect(profile.email).toBe('test@github.com');
    expect(profile.name).toBe('Test User');
    expect(profile.picture).toBe('https://avatars.githubusercontent.com/u/12345');
    expect(profile.emailVerified).toBeNull();
  });

  it('should map Facebook profile correctly', () => {
    const facebook = getProvider('facebook')!;
    const profile = facebook.mapProfile({
      id: '987654321',
      name: 'Test User',
      email: 'test@facebook.com',
      picture: { data: { url: 'https://example.com/fb-photo.jpg' } },
    });

    expect(profile.provider).toBe('facebook');
    expect(profile.providerId).toBe('987654321');
    expect(profile.email).toBe('test@facebook.com');
    expect(profile.name).toBe('Test User');
    expect(profile.picture).toBe('https://example.com/fb-photo.jpg');
    expect(profile.emailVerified).toBe(true);
  });

  it('should map LinkedIn profile correctly', () => {
    const linkedin = getProvider('linkedin')!;
    const profile = linkedin.mapProfile({
      sub: 'linkedin-123',
      email: 'test@linkedin.com',
      email_verified: true,
      name: 'Test User',
      picture: 'https://example.com/li-photo.jpg',
    });

    expect(profile.provider).toBe('linkedin');
    expect(profile.providerId).toBe('linkedin-123');
    expect(profile.email).toBe('test@linkedin.com');
    expect(profile.name).toBe('Test User');
    expect(profile.picture).toBe('https://example.com/li-photo.jpg');
    expect(profile.emailVerified).toBe(true);
  });

  it('should handle missing optional fields', () => {
    const google = getProvider('google')!;
    const profile = google.mapProfile({
      sub: '123456789',
    });

    expect(profile.provider).toBe('google');
    expect(profile.providerId).toBe('123456789');
    expect(profile.email).toBeNull();
    expect(profile.name).toBeNull();
    expect(profile.picture).toBeNull();
    expect(profile.emailVerified).toBeNull();
  });
});
