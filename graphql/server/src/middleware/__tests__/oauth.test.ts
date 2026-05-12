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
      providers: {
        google: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
        },
      },
      baseUrl: 'https://app.example.com',
      allowSignup: true,
      requireVerifiedEmail: true,
    },
    pg: {
      database: 'test_db',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OAUTH_STATE_SECRET = 'test-secret-key-for-testing';
  });

  afterEach(() => {
    delete process.env.OAUTH_STATE_SECRET;
  });

  describe('createOAuthRoutes', () => {
    it('returns empty router when no providers configured', () => {
      const router = createOAuthRoutes({} as any);
      expect(router.stack).toHaveLength(0);
    });

    it('creates routes when providers are configured', () => {
      const router = createOAuthRoutes(mockOpts as any);
      // Should have 3 routes: /providers, /:provider, /:provider/callback
      expect(router.stack.length).toBeGreaterThan(0);
    });
  });

  describe('Signed State', () => {
    // Access internal functions via module for testing
    // We'll test through the route handlers instead

    it('initiates OAuth with signed state cookie', async () => {
      const router = createOAuthRoutes(mockOpts as any);

      const req = {
        params: { provider: 'google' },
        query: { redirect_uri: '/dashboard' },
      } as unknown as Request;

      const cookies: Record<string, any> = {};
      const res = {
        cookie: jest.fn((name, value, opts) => {
          cookies[name] = { value, opts };
        }),
        redirect: jest.fn(),
      } as unknown as Response;

      // Find the initiate route handler
      const initiateRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/:provider' && layer.route?.methods?.get
      );
      expect(initiateRoute).toBeDefined();

      // Call the handler
      const handler = initiateRoute!.route.stack[0].handle;
      handler(req, res, jest.fn());

      // Verify state cookie was set
      expect(res.cookie).toHaveBeenCalledWith(
        'oauth_state',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        })
      );

      // Verify redirect was called
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

      // Create a valid signed state
      const statePayload = {
        redirect_uri: '/dashboard',
        provider: 'google',
        nonce: crypto.randomBytes(16).toString('hex'),
        exp: Date.now() + 10 * 60 * 1000,
      };
      const json = JSON.stringify(statePayload);
      const sig = crypto.createHmac('sha256', 'test-secret-key-for-testing').update(json).digest('base64url');
      const validState = Buffer.from(json).toString('base64url') + '.' + sig;

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
      // Create valid state
      const statePayload = {
        redirect_uri: '/dashboard',
        provider: 'google',
        nonce: crypto.randomBytes(16).toString('hex'),
        exp: Date.now() + 10 * 60 * 1000,
      };
      const json = JSON.stringify(statePayload);
      const sig = crypto.createHmac('sha256', 'test-secret-key-for-testing').update(json).digest('base64url');
      const validState = Buffer.from(json).toString('base64url') + '.' + sig;

      // Mock OAuthClient to return unverified email
      const mockOAuthClient = {
        getAuthorizationUrl: jest.fn(),
        handleCallback: jest.fn().mockResolvedValue({
          provider: 'google',
          providerId: '123456',
          email: 'attacker@example.com',
          emailVerified: false, // Unverified!
          name: 'Attacker',
          picture: null,
          raw: {},
        }),
      };
      (OAuthClient as jest.Mock).mockImplementation(() => mockOAuthClient);

      // Mock DB to throw IDENTITY_ACCOUNT_NOT_FOUND (triggers signup flow)
      const mockQuery = jest.fn().mockRejectedValue(new Error('IDENTITY_ACCOUNT_NOT_FOUND'));
      (getPgPool as jest.Mock).mockReturnValue({ query: mockQuery });

      // Create router with fresh mocks
      const router = createOAuthRoutes(mockOpts as any);

      const req = {
        params: { provider: 'google' },
        query: { code: 'auth-code', state: validState },
        cookies: {
          oauth_state: validState,
          constructive_device_token: 'device-token',
        },
        api: {
          rlsModule: {
            privateSchema: { schemaName: 'auth_private' },
          },
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

      // Should redirect with EMAIL_NOT_VERIFIED error
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=EMAIL_NOT_VERIFIED')
      );
    });

    it('allows signup with verified email', async () => {
      const router = createOAuthRoutes(mockOpts as any);

      // Create valid state
      const statePayload = {
        redirect_uri: '/dashboard',
        provider: 'google',
        nonce: crypto.randomBytes(16).toString('hex'),
        exp: Date.now() + 10 * 60 * 1000,
      };
      const json = JSON.stringify(statePayload);
      const sig = crypto.createHmac('sha256', 'test-secret-key-for-testing').update(json).digest('base64url');
      const validState = Buffer.from(json).toString('base64url') + '.' + sig;

      const req = {
        params: { provider: 'google' },
        query: { code: 'auth-code', state: validState },
        cookies: {
          oauth_state: validState,
        },
        api: {
          rlsModule: {
            privateSchema: { schemaName: 'auth_private' },
          },
          dbname: 'tenant_db',
          authSettings: {},
        },
      } as unknown as Request;

      const res = {
        clearCookie: jest.fn(),
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      // Mock OAuthClient to return verified email
      const mockOAuthClient = {
        getAuthorizationUrl: jest.fn(),
        handleCallback: jest.fn().mockResolvedValue({
          provider: 'google',
          providerId: '123456',
          email: 'user@example.com',
          emailVerified: true, // Verified!
          name: 'User',
          picture: null,
          raw: {},
        }),
      };
      (OAuthClient as jest.Mock).mockImplementation(() => mockOAuthClient);

      // Mock DB: first call throws NOT_FOUND, second call (signup) succeeds
      const mockQuery = jest.fn()
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

      // Re-create router with fresh mocks
      const freshRouter = createOAuthRoutes(mockOpts as any);
      const callbackRoute = freshRouter.stack.find(
        (layer: any) => layer.route?.path === '/:provider/callback'
      );
      const handler = callbackRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      // Should set session cookie and redirect to success URL
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
      const router = createOAuthRoutes(mockOpts as any);

      // Create valid state
      const statePayload = {
        redirect_uri: '/dashboard',
        provider: 'google',
        nonce: crypto.randomBytes(16).toString('hex'),
        exp: Date.now() + 10 * 60 * 1000,
      };
      const json = JSON.stringify(statePayload);
      const sig = crypto.createHmac('sha256', 'test-secret-key-for-testing').update(json).digest('base64url');
      const validState = Buffer.from(json).toString('base64url') + '.' + sig;

      const req = {
        params: { provider: 'google' },
        query: { code: 'auth-code', state: validState },
        cookies: { oauth_state: validState },
        api: {
          rlsModule: {
            privateSchema: { schemaName: 'auth_private' },
          },
          dbname: 'tenant_db',
          authSettings: {},
        },
      } as unknown as Request;

      const res = {
        clearCookie: jest.fn(),
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      // Mock OAuthClient
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

      // Mock DB to return MFA required
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{
          mfa_required: true,
          mfa_challenge_token: 'mfa-challenge-token-123',
          user_id: 'user-123',
        }],
      });
      (getPgPool as jest.Mock).mockReturnValue({ query: mockQuery });

      const freshRouter = createOAuthRoutes(mockOpts as any);
      const callbackRoute = freshRouter.stack.find(
        (layer: any) => layer.route?.path === '/:provider/callback'
      );
      const handler = callbackRoute!.route.stack[0].handle;

      await handler(req, res, jest.fn());

      // Should redirect to MFA page
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/mfa')
      );
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('token=mfa-challenge-token-123')
      );
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('redirect_uri=%2Fdashboard')
      );
    });
  });

  describe('Providers Endpoint', () => {
    it('returns list of configured providers', () => {
      const router = createOAuthRoutes(mockOpts as any);

      const req = {} as Request;
      const res = {
        json: jest.fn(),
      } as unknown as Response;

      const providersRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/providers'
      );
      const handler = providersRoute!.route.stack[0].handle;

      handler(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith({
        providers: ['google'],
      });
    });
  });

  describe('Multi-Tenancy', () => {
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

    const setupSuccessfulOAuth = () => {
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

      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{
          access_token: 'tenant-access-token',
          user_id: 'user-123',
          out_device_token: null,
          mfa_required: false,
        }],
      });
      (getPgPool as jest.Mock).mockReturnValue({ query: mockQuery });

      return { mockQuery };
    };

    it('connects to correct tenant database based on req.api.dbname', async () => {
      const { mockQuery } = setupSuccessfulOAuth();
      const validState = createValidState();

      const router = createOAuthRoutes(mockOpts as any);

      const req = {
        params: { provider: 'google' },
        query: { code: 'auth-code', state: validState },
        cookies: { oauth_state: validState },
        api: {
          rlsModule: {
            privateSchema: { schemaName: 'auth_private' },
          },
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

      // Verify getPgPool was called with tenant's database name
      expect(getPgPool).toHaveBeenCalledWith(
        expect.objectContaining({
          database: 'tenant_acme_db',
        })
      );
    });

    it('uses correct private schema for each tenant', async () => {
      const { mockQuery } = setupSuccessfulOAuth();
      const validState = createValidState();

      const router = createOAuthRoutes(mockOpts as any);

      const req = {
        params: { provider: 'google' },
        query: { code: 'auth-code', state: validState },
        cookies: { oauth_state: validState },
        api: {
          rlsModule: {
            privateSchema: { schemaName: 'custom_auth_schema' },
          },
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

      // Verify SQL query uses tenant's private schema
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('"custom_auth_schema".sign_in_identity'),
        expect.any(Array)
      );
    });

    it('isolates tenant A data from tenant B', async () => {
      setupSuccessfulOAuth();
      const validState = createValidState();

      const router = createOAuthRoutes(mockOpts as any);

      // Tenant A request
      const reqTenantA = {
        params: { provider: 'google' },
        query: { code: 'auth-code-a', state: validState },
        cookies: { oauth_state: validState },
        api: {
          rlsModule: {
            privateSchema: { schemaName: 'auth_private' },
          },
          dbname: 'tenant_a_db',
          authSettings: {},
        },
      } as unknown as Request;

      const resTenantA = {
        clearCookie: jest.fn(),
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      // Tenant B request
      const reqTenantB = {
        params: { provider: 'google' },
        query: { code: 'auth-code-b', state: validState },
        cookies: { oauth_state: validState },
        api: {
          rlsModule: {
            privateSchema: { schemaName: 'auth_private' },
          },
          dbname: 'tenant_b_db',
          authSettings: {},
        },
      } as unknown as Request;

      const resTenantB = {
        clearCookie: jest.fn(),
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      const callbackRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/:provider/callback'
      );
      const handler = callbackRoute!.route.stack[0].handle;

      // Execute both tenant callbacks
      await handler(reqTenantA, resTenantA, jest.fn());

      // Reset mock to track second call
      (getPgPool as jest.Mock).mockClear();
      setupSuccessfulOAuth();

      await handler(reqTenantB, resTenantB, jest.fn());

      // Verify each tenant got their own database connection
      expect(getPgPool).toHaveBeenCalledWith(
        expect.objectContaining({
          database: 'tenant_b_db',
        })
      );
    });

    it('respects tenant-specific authSettings for cookie configuration', async () => {
      setupSuccessfulOAuth();
      const validState = createValidState();

      const router = createOAuthRoutes(mockOpts as any);

      const req = {
        params: { provider: 'google' },
        query: { code: 'auth-code', state: validState },
        cookies: { oauth_state: validState },
        api: {
          rlsModule: {
            privateSchema: { schemaName: 'auth_private' },
          },
          dbname: 'tenant_db',
          authSettings: {
            sessionCookieName: 'custom_session',
            sessionCookieMaxAge: 3600,
            secureCookies: true,
          },
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

      // Verify session cookie was set (cookie name depends on getSessionCookieConfig implementation)
      expect(res.cookie).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });
  });
});
