import { Request, Response } from 'express';
import crypto from 'crypto';

// Mock dependencies before importing the module
jest.mock('@constructive-io/oauth', () => ({
  OAuthClient: jest.fn().mockImplementation(() => ({
    getAuthorizationUrl: jest.fn().mockReturnValue({
      url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test',
      state: 'mock-state',
    }),
    handleCallback: jest.fn(),
  })),
}));

jest.mock('pg-cache', () => ({
  getPgPool: jest.fn().mockReturnValue({
    query: jest.fn(),
  }),
}));

jest.mock('@pgpmjs/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Import after mocks
import { createOAuthRoutes } from '../oauth';
import { OAuthClient } from '@constructive-io/oauth';
import { getPgPool } from 'pg-cache';

describe('OAuth Middleware', () => {
  const mockOpts = {
    oauth: {
      baseUrl: 'https://app.example.com',
      allowSignup: true,
      requireVerifiedEmail: true,
    },
    pg: {
      database: 'test_db',
    },
  };

  const mockProviderRow = {
    slug: 'google',
    kind: 'oidc',
    display_name: 'Google',
    enabled: true,
    client_id: 'test-client-id',
    client_secret: 'test-client-secret',
    authorization_url: null as string | null,
    token_url: null as string | null,
    userinfo_url: null as string | null,
    scopes: ['openid', 'email', 'profile'],
    pkce_enabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OAUTH_STATE_SECRET = 'test-secret-key-for-testing';
  });

  afterEach(() => {
    delete process.env.OAUTH_STATE_SECRET;
  });

  const createValidState = () => {
    const statePayload = {
      redirect_uri: '/dashboard',
      provider: 'google',
      nonce: crypto.randomBytes(16).toString('hex'),
      exp: Date.now() + 10 * 60 * 1000,
    };
    const json = JSON.stringify(statePayload);
    const sig = crypto.createHmac('sha256', 'test-secret-key-for-testing').update(json).digest('base64url');
    return Buffer.from(json).toString('base64url') + '.' + sig;
  };

  const setupMockQuery = (responses: any[]) => {
    const mockQuery = jest.fn();
    responses.forEach((response, index) => {
      if (response instanceof Error) {
        mockQuery.mockRejectedValueOnce(response);
      } else {
        mockQuery.mockResolvedValueOnce(response);
      }
    });
    (getPgPool as jest.Mock).mockReturnValue({ query: mockQuery });
    return mockQuery;
  };

  describe('createOAuthRoutes', () => {
    it('always creates routes (providers come from database)', () => {
      const router = createOAuthRoutes(mockOpts as any);
      // Should have 3 routes: /providers, /:provider, /:provider/callback
      expect(router.stack.length).toBe(3);
    });
  });

  describe('Providers Endpoint', () => {
    it('returns empty list when no API context', async () => {
      const router = createOAuthRoutes(mockOpts as any);

      const req = {} as Request;
      const res = {
        json: jest.fn(),
      } as unknown as Response;

      const providersRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/providers'
      );
      const handler = providersRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith({ providers: [] });
    });

    it('returns providers from database', async () => {
      setupMockQuery([{ rows: [{ slug: 'google' }, { slug: 'github' }] }]);

      const router = createOAuthRoutes(mockOpts as any);

      const req = {
        api: {
          rlsModule: { privateSchema: { schemaName: 'auth_private' } },
          dbname: 'tenant_db',
        },
      } as unknown as Request;
      const res = {
        json: jest.fn(),
      } as unknown as Response;

      const providersRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/providers'
      );
      const handler = providersRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith({ providers: ['google', 'github'] });
    });
  });

  describe('OAuth Initiation', () => {
    it('rejects when API context is missing', async () => {
      const router = createOAuthRoutes(mockOpts as any);

      const req = {
        params: { provider: 'google' },
        query: { redirect_uri: '/dashboard' },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      const initiateRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/:provider' && layer.route?.methods?.get
      );
      const handler = initiateRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=API_NOT_CONFIGURED')
      );
    });

    it('rejects when provider not found in database', async () => {
      // Query 1: getEncryptedSecretsSchema returns schema
      // Query 2: getIdentityProvider returns empty (not found)
      setupMockQuery([
        { rows: [{ encrypted_schema: 'test_encrypted' }] },
        { rows: [] },
      ]);

      const router = createOAuthRoutes(mockOpts as any);

      const req = {
        params: { provider: 'google' },
        query: { redirect_uri: '/dashboard' },
        api: {
          rlsModule: { privateSchema: { schemaName: 'auth_private' } },
          dbname: 'tenant_db',
        },
      } as unknown as Request;

      const res = {
        redirect: jest.fn(),
      } as unknown as Response;

      const initiateRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/:provider' && layer.route?.methods?.get
      );
      const handler = initiateRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=PROVIDER_NOT_CONFIGURED')
      );
    });

    it('initiates OAuth with signed state cookie when provider found', async () => {
      // Query 1: getEncryptedSecretsSchema
      // Query 2: getIdentityProvider
      setupMockQuery([
        { rows: [{ encrypted_schema: 'test_encrypted' }] },
        { rows: [mockProviderRow] },
      ]);

      const router = createOAuthRoutes(mockOpts as any);

      const req = {
        params: { provider: 'google' },
        query: { redirect_uri: '/dashboard' },
        api: {
          rlsModule: { privateSchema: { schemaName: 'auth_private' } },
          dbname: 'tenant_db',
        },
      } as unknown as Request;

      const cookies: Record<string, any> = {};
      const res = {
        cookie: jest.fn((name, value, opts) => {
          cookies[name] = { value, opts };
        }),
        redirect: jest.fn(),
      } as unknown as Response;

      const initiateRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/:provider' && layer.route?.methods?.get
      );
      const handler = initiateRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      expect(res.cookie).toHaveBeenCalledWith(
        'oauth_state',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        })
      );
      expect(res.redirect).toHaveBeenCalled();
    });
  });

  describe('OAuth Callback', () => {
    const createMockReqRes = (overrides: Partial<{
      params: any;
      query: any;
      cookies: any;
      api: any;
    }> = {}) => {
      const req = {
        params: { provider: 'google' },
        query: { code: 'auth-code', state: 'valid-state' },
        cookies: { oauth_state: 'valid-state' },
        api: {
          rlsModule: {
            privateSchema: { schemaName: 'auth_private' },
          },
          dbname: 'tenant_db',
          authSettings: {},
        },
        ...overrides,
      } as unknown as Request;

      const res = {
        clearCookie: jest.fn(),
        cookie: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      return { req, res };
    };

    it('rejects when state does not match', async () => {
      const router = createOAuthRoutes(mockOpts as any);
      const { req, res } = createMockReqRes({
        query: { code: 'auth-code', state: 'invalid-state' },
        cookies: { oauth_state: 'different-state' },
      });

      const callbackRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/:provider/callback'
      );
      const handler = callbackRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=INVALID_STATE')
      );
    });

    it('rejects when API context is missing', async () => {
      const router = createOAuthRoutes(mockOpts as any);
      const validState = createValidState();

      const { req, res } = createMockReqRes({
        query: { code: 'auth-code', state: validState },
        cookies: { oauth_state: validState },
        api: undefined,
      });

      const callbackRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/:provider/callback'
      );
      const handler = callbackRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=API_NOT_CONFIGURED')
      );
    });

    it('rejects when provider not found in database', async () => {
      // Query 1: getEncryptedSecretsSchema returns schema
      // Query 2: getIdentityProvider returns empty (not found)
      setupMockQuery([
        { rows: [{ encrypted_schema: 'test_encrypted' }] },
        { rows: [] },
      ]);

      const router = createOAuthRoutes(mockOpts as any);
      const validState = createValidState();

      const { req, res } = createMockReqRes({
        query: { code: 'auth-code', state: validState },
        cookies: { oauth_state: validState },
      });

      const callbackRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/:provider/callback'
      );
      const handler = callbackRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=PROVIDER_NOT_CONFIGURED')
      );
    });

    it('handles OAuth provider errors', async () => {
      const router = createOAuthRoutes(mockOpts as any);
      const { req, res } = createMockReqRes({
        query: {
          error: 'access_denied',
          error_description: 'User denied access'
        },
      });

      const callbackRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/:provider/callback'
      );
      const handler = callbackRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=access_denied')
      );
    });
  });

  describe('Shadow Attack Defense', () => {
    it('rejects signup with unverified email when requireVerifiedEmail is true', async () => {
      const validState = createValidState();

      // Mock OAuthClient to return unverified email
      const mockOAuthClient = {
        getAuthorizationUrl: jest.fn(),
        handleCallback: jest.fn().mockResolvedValue({
          provider: 'google',
          providerId: '123456',
          email: 'attacker@example.com',
          emailVerified: false,
          name: 'Attacker',
          picture: null,
          raw: {},
        }),
      };
      (OAuthClient as jest.Mock).mockImplementation(() => mockOAuthClient);

      // Query 1: getEncryptedSecretsSchema
      // Query 2: getIdentityProvider (success)
      // Query 3: sign_in_identity throws NOT_FOUND
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ encrypted_schema: 'test_encrypted' }] })
        .mockResolvedValueOnce({ rows: [mockProviderRow] })
        .mockRejectedValueOnce(new Error('IDENTITY_ACCOUNT_NOT_FOUND'));
      (getPgPool as jest.Mock).mockReturnValue({ query: mockQuery });

      const router = createOAuthRoutes(mockOpts as any);

      const req = {
        params: { provider: 'google' },
        query: { code: 'auth-code', state: validState },
        cookies: {
          oauth_state: validState,
          constructive_device_token: 'device-token',
        },
        api: {
          rlsModule: { privateSchema: { schemaName: 'auth_private' } },
          dbname: 'tenant_db',
          authSettings: {},
        },
      } as unknown as Request;

      const res = {
        clearCookie: jest.fn(),
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      const callbackRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/:provider/callback'
      );
      const handler = callbackRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=EMAIL_NOT_VERIFIED')
      );
    });

    it('allows signup with verified email', async () => {
      const validState = createValidState();

      // Mock OAuthClient to return verified email
      const mockOAuthClient = {
        getAuthorizationUrl: jest.fn(),
        handleCallback: jest.fn().mockResolvedValue({
          provider: 'google',
          providerId: '123456',
          email: 'user@example.com',
          emailVerified: true,
          name: 'User',
          picture: null,
          raw: {},
        }),
      };
      (OAuthClient as jest.Mock).mockImplementation(() => mockOAuthClient);

      // Query 1: getEncryptedSecretsSchema
      // Query 2: getIdentityProvider
      // Query 3: sign_in_identity throws NOT_FOUND
      // Query 4: sign_up_identity succeeds
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ encrypted_schema: 'test_encrypted' }] })
        .mockResolvedValueOnce({ rows: [mockProviderRow] })
        .mockRejectedValueOnce(new Error('IDENTITY_ACCOUNT_NOT_FOUND'))
        .mockResolvedValueOnce({
          rows: [{
            access_token: 'new-access-token',
            user_id: 'user-123',
            out_device_token: null,
            mfa_required: false,
          }],
        });
      (getPgPool as jest.Mock).mockReturnValue({ query: mockQuery });

      const router = createOAuthRoutes(mockOpts as any);

      const req = {
        params: { provider: 'google' },
        query: { code: 'auth-code', state: validState },
        cookies: { oauth_state: validState },
        api: {
          rlsModule: { privateSchema: { schemaName: 'auth_private' } },
          dbname: 'tenant_db',
          authSettings: {},
        },
      } as unknown as Request;

      const res = {
        clearCookie: jest.fn(),
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      const callbackRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/:provider/callback'
      );
      const handler = callbackRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      expect(res.cookie).toHaveBeenCalledWith(
        'constructive_session',
        'new-access-token',
        expect.any(Object)
      );
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('MFA Flow', () => {
    it('redirects to MFA page when mfa_required is true', async () => {
      const validState = createValidState();

      const mockOAuthClient = {
        getAuthorizationUrl: jest.fn(),
        handleCallback: jest.fn().mockResolvedValue({
          provider: 'google',
          providerId: '123456',
          email: 'user@example.com',
          emailVerified: true,
          name: 'User',
          picture: null,
          raw: {},
        }),
      };
      (OAuthClient as jest.Mock).mockImplementation(() => mockOAuthClient);

      // Query 1: getEncryptedSecretsSchema
      // Query 2: getIdentityProvider
      // Query 3: sign_in_identity returns MFA required
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ encrypted_schema: 'test_encrypted' }] })
        .mockResolvedValueOnce({ rows: [mockProviderRow] })
        .mockResolvedValueOnce({
          rows: [{
            mfa_required: true,
            mfa_challenge_token: 'mfa-challenge-token-123',
            user_id: 'user-123',
          }],
        });
      (getPgPool as jest.Mock).mockReturnValue({ query: mockQuery });

      const router = createOAuthRoutes(mockOpts as any);

      const req = {
        params: { provider: 'google' },
        query: { code: 'auth-code', state: validState },
        cookies: { oauth_state: validState },
        api: {
          rlsModule: { privateSchema: { schemaName: 'auth_private' } },
          dbname: 'tenant_db',
          authSettings: {},
        },
      } as unknown as Request;

      const res = {
        clearCookie: jest.fn(),
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      const callbackRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/:provider/callback'
      );
      const handler = callbackRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/mfa')
      );
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('token=mfa-challenge-token-123')
      );
    });
  });

  describe('Multi-Tenancy', () => {
    it('connects to correct tenant database based on req.api.dbname', async () => {
      const validState = createValidState();

      const mockOAuthClient = {
        getAuthorizationUrl: jest.fn(),
        handleCallback: jest.fn().mockResolvedValue({
          provider: 'google',
          providerId: '123456',
          email: 'user@example.com',
          emailVerified: true,
          name: 'User',
          picture: null,
          raw: {},
        }),
      };
      (OAuthClient as jest.Mock).mockImplementation(() => mockOAuthClient);

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ encrypted_schema: 'test_encrypted' }] })
        .mockResolvedValueOnce({ rows: [mockProviderRow] })
        .mockResolvedValueOnce({
          rows: [{
            access_token: 'tenant-access-token',
            user_id: 'user-123',
            out_device_token: null,
            mfa_required: false,
          }],
        });
      (getPgPool as jest.Mock).mockReturnValue({ query: mockQuery });

      const router = createOAuthRoutes(mockOpts as any);

      const req = {
        params: { provider: 'google' },
        query: { code: 'auth-code', state: validState },
        cookies: { oauth_state: validState },
        api: {
          rlsModule: { privateSchema: { schemaName: 'auth_private' } },
          dbname: 'tenant_acme_db',
          authSettings: {},
        },
      } as unknown as Request;

      const res = {
        clearCookie: jest.fn(),
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      const callbackRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/:provider/callback'
      );
      const handler = callbackRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      expect(getPgPool).toHaveBeenCalledWith(
        expect.objectContaining({
          database: 'tenant_acme_db',
        })
      );
    });

    it('uses correct private schema for each tenant', async () => {
      const validState = createValidState();

      const mockOAuthClient = {
        getAuthorizationUrl: jest.fn(),
        handleCallback: jest.fn().mockResolvedValue({
          provider: 'google',
          providerId: '123456',
          email: 'user@example.com',
          emailVerified: true,
          name: 'User',
          picture: null,
          raw: {},
        }),
      };
      (OAuthClient as jest.Mock).mockImplementation(() => mockOAuthClient);

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ encrypted_schema: 'test_encrypted' }] })
        .mockResolvedValueOnce({ rows: [mockProviderRow] })
        .mockResolvedValueOnce({
          rows: [{
            access_token: 'tenant-access-token',
            user_id: 'user-123',
            out_device_token: null,
            mfa_required: false,
          }],
        });
      (getPgPool as jest.Mock).mockReturnValue({ query: mockQuery });

      const router = createOAuthRoutes(mockOpts as any);

      const req = {
        params: { provider: 'google' },
        query: { code: 'auth-code', state: validState },
        cookies: { oauth_state: validState },
        api: {
          rlsModule: { privateSchema: { schemaName: 'custom_auth_schema' } },
          dbname: 'tenant_db',
          authSettings: {},
        },
      } as unknown as Request;

      const res = {
        clearCookie: jest.fn(),
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      const callbackRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/:provider/callback'
      );
      const handler = callbackRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      // First query is getIdentityProvider which uses custom_auth_schema
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('"custom_auth_schema".identity_providers'),
        expect.any(Array)
      );
    });

    it('reads provider config from tenant database', async () => {
      const validState = createValidState();

      const mockOAuthClient = {
        getAuthorizationUrl: jest.fn().mockReturnValue({
          url: 'https://accounts.google.com/o/oauth2/v2/auth',
          state: validState,
        }),
        handleCallback: jest.fn(),
      };
      (OAuthClient as jest.Mock).mockImplementation(() => mockOAuthClient);

      const tenantProviderRow = {
        ...mockProviderRow,
        client_id: 'tenant-specific-client-id',
        client_secret: 'tenant-specific-secret',
      };

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ encrypted_schema: 'test_encrypted' }] })
        .mockResolvedValueOnce({ rows: [tenantProviderRow] });
      (getPgPool as jest.Mock).mockReturnValue({ query: mockQuery });

      const router = createOAuthRoutes(mockOpts as any);

      const req = {
        params: { provider: 'google' },
        query: { redirect_uri: '/dashboard' },
        api: {
          rlsModule: { privateSchema: { schemaName: 'auth_private' } },
          dbname: 'tenant_db',
        },
      } as unknown as Request;

      const res = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      const initiateRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/:provider' && layer.route?.methods?.get
      );
      const handler = initiateRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      // Verify OAuthClient was created with tenant's credentials
      expect(OAuthClient).toHaveBeenCalledWith(
        expect.objectContaining({
          providers: {
            google: {
              clientId: 'tenant-specific-client-id',
              clientSecret: 'tenant-specific-secret',
            },
          },
        })
      );
    });
  });
});
