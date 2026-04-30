import { createAuthCookieMiddleware } from '../auth-cookie';
import { SESSION_COOKIE_NAME, DEVICE_COOKIE_NAME } from '../cookie';

describe('auth-cookie middleware', () => {
  const createMockReq = (overrides: any = {}) => ({
    method: 'POST',
    path: '/graphql',
    body: {},
    api: {},
    ...overrides,
  });

  const createMockRes = () => {
    const cookies: Record<string, { value: string; options: any }> = {};
    const clearedCookies: string[] = [];

    return {
      cookie: jest.fn((name: string, value: string, options: any) => {
        cookies[name] = { value, options };
      }),
      clearCookie: jest.fn((name: string) => {
        clearedCookies.push(name);
      }),
      json: jest.fn((body: any) => body),
      _cookies: cookies,
      _clearedCookies: clearedCookies,
    };
  };

  describe('createAuthCookieMiddleware', () => {
    it('should skip non-POST requests', () => {
      const middleware = createAuthCookieMiddleware();
      const req = createMockReq({ method: 'GET' });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should skip non-graphql paths', () => {
      const middleware = createAuthCookieMiddleware();
      const req = createMockReq({ path: '/api/other' });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip requests without body', () => {
      const middleware = createAuthCookieMiddleware();
      const req = createMockReq({ body: undefined });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip non-auth mutations', () => {
      const middleware = createAuthCookieMiddleware();
      const req = createMockReq({
        body: {
          query: 'mutation { updateProfile(input: {}) { result { id } } }',
          operationName: 'updateProfile',
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should set session cookie on signIn success', () => {
      const middleware = createAuthCookieMiddleware();
      const req = createMockReq({
        body: {
          query: 'mutation { signIn(input: {}) { result { accessToken } } }',
          operationName: 'signIn',
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as any, res as any, next);

      // Simulate calling the wrapped json
      res.json({
        data: {
          signIn: {
            accessToken: 'test-access-token',
          },
        },
      });

      expect(res.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        'test-access-token',
        expect.any(Object)
      );
    });

    it('should set session cookie on signUp success', () => {
      const middleware = createAuthCookieMiddleware();
      const req = createMockReq({
        body: {
          query: 'mutation { signUp(input: {}) { result { accessToken } } }',
          operationName: 'signUp',
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as any, res as any, next);

      res.json({
        data: {
          signUp: {
            accessToken: 'new-user-token',
          },
        },
      });

      expect(res.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        'new-user-token',
        expect.any(Object)
      );
    });

    it('should handle snake_case access_token', () => {
      const middleware = createAuthCookieMiddleware();
      const req = createMockReq({
        body: {
          query: 'mutation { signIn(input: {}) { result { access_token } } }',
          operationName: 'signIn',
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as any, res as any, next);

      res.json({
        data: {
          signIn: {
            access_token: 'snake-case-token',
          },
        },
      });

      expect(res.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        'snake-case-token',
        expect.any(Object)
      );
    });

    it('should set device token cookie when returned', () => {
      const middleware = createAuthCookieMiddleware();
      const req = createMockReq({
        body: {
          query: 'mutation { signIn(input: {}) { result { accessToken deviceToken } } }',
          operationName: 'signIn',
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as any, res as any, next);

      res.json({
        data: {
          signIn: {
            accessToken: 'test-token',
            deviceToken: 'device-token-123',
          },
        },
      });

      expect(res.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        'test-token',
        expect.any(Object)
      );
      expect(res.cookie).toHaveBeenCalledWith(
        DEVICE_COOKIE_NAME,
        'device-token-123',
        expect.any(Object)
      );
    });

    it('should clear session cookie on signOut', () => {
      const middleware = createAuthCookieMiddleware();
      const req = createMockReq({
        body: {
          query: 'mutation { signOut { success } }',
          operationName: 'signOut',
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as any, res as any, next);

      res.json({
        data: {
          signOut: {
            success: true,
          },
        },
      });

      expect(res.clearCookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        expect.any(Object)
      );
    });

    it('should clear session cookie on revokeSession', () => {
      const middleware = createAuthCookieMiddleware();
      const req = createMockReq({
        body: {
          query: 'mutation { revokeSession(input: {}) { success } }',
          operationName: 'revokeSession',
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as any, res as any, next);

      res.json({
        data: {
          revokeSession: {
            success: true,
          },
        },
      });

      expect(res.clearCookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        expect.any(Object)
      );
    });

    it('should not set cookie when accessToken is missing', () => {
      const middleware = createAuthCookieMiddleware();
      const req = createMockReq({
        body: {
          query: 'mutation { signIn(input: {}) { result { accessToken } } }',
          operationName: 'signIn',
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as any, res as any, next);

      res.json({
        data: {
          signIn: {
            error: 'Invalid credentials',
          },
        },
      });

      expect(res.cookie).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      const middleware = createAuthCookieMiddleware();
      const req = createMockReq({
        body: {
          query: 'mutation { signIn(input: {}) { result { accessToken } } }',
          operationName: 'signIn',
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as any, res as any, next);

      // Should not throw even with malformed response
      expect(() => {
        res.json({
          errors: [{ message: 'Something went wrong' }],
        });
      }).not.toThrow();
    });

    it('should use rememberMe from input variables', () => {
      const middleware = createAuthCookieMiddleware();
      const req = createMockReq({
        body: {
          query: 'mutation { signIn(input: {}) { result { accessToken } } }',
          operationName: 'signIn',
          variables: {
            input: {
              email: 'test@test.com',
              password: 'password',
              rememberMe: true,
            },
          },
        },
        api: {
          authSettings: {
            rememberMeDuration: '30 days',
          },
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as any, res as any, next);

      res.json({
        data: {
          signIn: {
            accessToken: 'test-token',
          },
        },
      });

      expect(res.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        'test-token',
        expect.objectContaining({
          maxAge: 30 * 24 * 3600 * 1000,
        })
      );
    });
  });
});
