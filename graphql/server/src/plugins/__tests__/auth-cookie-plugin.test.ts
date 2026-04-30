import { AuthCookiePreset } from '../auth-cookie-plugin';
import { SESSION_COOKIE_NAME, DEVICE_COOKIE_NAME } from '../../middleware/cookie';

describe('AuthCookiePlugin', () => {
  describe('AuthCookiePreset', () => {
    it('should export a valid preset with plugins array', () => {
      expect(AuthCookiePreset).toBeDefined();
      expect(AuthCookiePreset.plugins).toBeDefined();
      expect(AuthCookiePreset.plugins).toHaveLength(1);
    });

    it('should have plugin with correct name and version', () => {
      const plugin = AuthCookiePreset.plugins![0];
      expect(plugin.name).toBe('AuthCookiePlugin');
      expect(plugin.version).toBe('1.0.0');
    });

    it('should have grafserv middleware', () => {
      const plugin = AuthCookiePreset.plugins![0];
      expect(plugin.grafserv).toBeDefined();
      expect(plugin.grafserv?.middleware).toBeDefined();
      expect(plugin.grafserv?.middleware?.processRequest).toBeDefined();
    });
  });

  describe('processRequest middleware', () => {
    const getMiddleware = (): ((next: any, event: any) => Promise<any>) => {
      const plugin = AuthCookiePreset.plugins![0];
      const processRequest = plugin.grafserv!.middleware!.processRequest!;
      // Handle both function and descriptor formats
      if (typeof processRequest === 'function') {
        return processRequest as (next: any, event: any) => Promise<any>;
      }
      // If it's a descriptor, extract the callback
      return (processRequest as { callback: (next: any, event: any) => Promise<any> }).callback;
    };

    const createMockEvent = (overrides: any = {}) => ({
      requestDigest: {
        getBody: async () => ({
          type: 'json',
          json: overrides.body || {},
        }),
        requestContext: {
          expressv4: {
            req: {
              api: {
                authSettings: overrides.authSettings || {},
              },
            },
            res: {
              getHeader: () => overrides.expressCookies || undefined,
            },
          },
        },
      },
      ...overrides.event,
    });

    const createMockResult = (overrides: any = {}) => ({
      type: overrides.type || 'buffer',
      buffer: Buffer.from(JSON.stringify(overrides.data || {})),
      statusCode: 200,
      headers: overrides.headers || {},
      ...overrides.result,
    });

    it('should return result unchanged for non-mutation queries', async () => {
      const middleware = getMiddleware();
      const mockResult = createMockResult({
        data: { users: [] },
      });
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: { query: '{ users { id } }' },
      });

      const result = await middleware(next, event);

      expect(result).toBe(mockResult);
    });

    it('should return result unchanged for non-auth mutations', async () => {
      const middleware = getMiddleware();
      const mockResult = createMockResult({
        data: { updateProfile: { id: '123' } },
      });
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: { query: 'mutation { updateProfile(input: {}) { id } }' },
      });

      const result = await middleware(next, event);

      expect(result).toBe(mockResult);
    });

    it('should set session cookie on signUp success', async () => {
      const middleware = getMiddleware();
      const mockResult = createMockResult({
        data: {
          data: {
            signUp: {
              result: { accessToken: 'test-token-123' },
            },
          },
        },
      });
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: {
          query: 'mutation { signUp(input: {}) { result { accessToken } } }',
        },
      });

      const result = await middleware(next, event);

      expect(result.headers['set-cookie']).toBeDefined();
      const cookies = result.headers['set-cookie'] as string[];
      expect(cookies.some((c: string) => c.includes(SESSION_COOKIE_NAME))).toBe(true);
      expect(cookies.some((c: string) => c.includes('test-token-123'))).toBe(true);
    });

    it('should set session cookie on signIn success', async () => {
      const middleware = getMiddleware();
      const mockResult = createMockResult({
        data: {
          data: {
            signIn: {
              result: { accessToken: 'signin-token-456' },
            },
          },
        },
      });
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: {
          query: 'mutation SignIn($input: SignInInput!) { signIn(input: $input) { result { accessToken } } }',
        },
      });

      const result = await middleware(next, event);

      expect(result.headers['set-cookie']).toBeDefined();
      const cookies = result.headers['set-cookie'] as string[];
      expect(cookies.some((c: string) => c.includes('signin-token-456'))).toBe(true);
    });

    it('should handle snake_case access_token', async () => {
      const middleware = getMiddleware();
      const mockResult = createMockResult({
        data: {
          data: {
            signIn: {
              access_token: 'snake-case-token',
            },
          },
        },
      });
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: {
          query: 'mutation { signIn(input: {}) { access_token } }',
        },
      });

      const result = await middleware(next, event);

      expect(result.headers['set-cookie']).toBeDefined();
      const cookies = result.headers['set-cookie'] as string[];
      expect(cookies.some((c: string) => c.includes('snake-case-token'))).toBe(true);
    });

    it('should set device token cookie when returned', async () => {
      const middleware = getMiddleware();
      const mockResult = createMockResult({
        data: {
          data: {
            signIn: {
              result: {
                accessToken: 'access-token',
                deviceToken: 'device-token-789',
              },
            },
          },
        },
      });
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: {
          query: 'mutation { signIn(input: {}) { result { accessToken deviceToken } } }',
        },
      });

      const result = await middleware(next, event);

      const cookies = result.headers['set-cookie'] as string[];
      expect(cookies.some((c: string) => c.includes(SESSION_COOKIE_NAME))).toBe(true);
      expect(cookies.some((c: string) => c.includes(DEVICE_COOKIE_NAME))).toBe(true);
      expect(cookies.some((c: string) => c.includes('device-token-789'))).toBe(true);
    });

    it('should clear session and device cookies on signOut', async () => {
      const middleware = getMiddleware();
      const mockResult = createMockResult({
        data: {
          data: {
            signOut: { clientMutationId: null },
          },
        },
      });
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: {
          query: 'mutation { signOut(input: {}) { clientMutationId } }',
        },
      });

      const result = await middleware(next, event);

      const cookies = result.headers['set-cookie'] as string[];
      expect(cookies).toHaveLength(2);
      expect(cookies.some((c: string) => c.includes(SESSION_COOKIE_NAME) && c.includes('Max-Age=0'))).toBe(true);
      expect(cookies.some((c: string) => c.includes(DEVICE_COOKIE_NAME) && c.includes('Max-Age=0'))).toBe(true);
    });

    it('should clear cookies on revokeSession', async () => {
      const middleware = getMiddleware();
      const mockResult = createMockResult({
        data: {
          data: {
            revokeSession: { success: true },
          },
        },
      });
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: {
          query: 'mutation { revokeSession(input: {}) { success } }',
        },
      });

      const result = await middleware(next, event);

      const cookies = result.headers['set-cookie'] as string[];
      expect(cookies.some((c: string) => c.includes('Max-Age=0'))).toBe(true);
    });

    it('should clear cookies on revokeAllSessions', async () => {
      const middleware = getMiddleware();
      const mockResult = createMockResult({
        data: {
          data: {
            revokeAllSessions: { success: true },
          },
        },
      });
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: {
          query: 'mutation { revokeAllSessions(input: {}) { success } }',
        },
      });

      const result = await middleware(next, event);

      const cookies = result.headers['set-cookie'] as string[];
      expect(cookies.some((c: string) => c.includes('Max-Age=0'))).toBe(true);
    });

    it('should not set cookie when accessToken is missing', async () => {
      const middleware = getMiddleware();
      const mockResult = createMockResult({
        data: {
          data: {
            signIn: {
              error: 'Invalid credentials',
            },
          },
        },
      });
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: {
          query: 'mutation { signIn(input: {}) { error } }',
        },
      });

      const result = await middleware(next, event);

      expect(result).toBe(mockResult);
    });

    it('should preserve existing cookies from grafserv', async () => {
      const middleware = getMiddleware();
      const mockResult = createMockResult({
        data: {
          data: {
            signIn: {
              result: { accessToken: 'new-token' },
            },
          },
        },
        headers: {
          'set-cookie': 'existing_cookie=value; Path=/',
        },
      });
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: {
          query: 'mutation { signIn(input: {}) { result { accessToken } } }',
        },
      });

      const result = await middleware(next, event);

      const cookies = result.headers['set-cookie'] as string[];
      expect(cookies.some((c: string) => c.includes('existing_cookie'))).toBe(true);
      expect(cookies.some((c: string) => c.includes(SESSION_COOKIE_NAME))).toBe(true);
    });

    it('should preserve Express cookies (CSRF)', async () => {
      const middleware = getMiddleware();
      const mockResult = createMockResult({
        data: {
          data: {
            signIn: {
              result: { accessToken: 'new-token' },
            },
          },
        },
      });
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: {
          query: 'mutation { signIn(input: {}) { result { accessToken } } }',
        },
        expressCookies: 'csrf_token=abc123; Path=/',
      });

      const result = await middleware(next, event);

      const cookies = result.headers['set-cookie'] as string[];
      expect(cookies.some((c: string) => c.includes('csrf_token'))).toBe(true);
      expect(cookies.some((c: string) => c.includes(SESSION_COOKIE_NAME))).toBe(true);
    });

    it('should handle json result type', async () => {
      const middleware = getMiddleware();
      const mockResult = {
        type: 'json',
        json: {
          data: {
            signIn: {
              result: { accessToken: 'json-token' },
            },
          },
        },
        statusCode: 200,
        headers: {},
      };
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: {
          query: 'mutation { signIn(input: {}) { result { accessToken } } }',
        },
      });

      const result = await middleware(next, event);

      const cookies = result.headers['set-cookie'] as string[];
      expect(cookies.some((c: string) => c.includes('json-token'))).toBe(true);
    });

    it('should return unchanged for null result', async () => {
      const middleware = getMiddleware();
      const next = jest.fn().mockResolvedValue(null);
      const event = createMockEvent({
        body: { query: 'mutation { signIn(input: {}) { result { accessToken } } }' },
      });

      const result = await middleware(next, event);

      expect(result).toBeNull();
    });

    it('should return unchanged for non-json/buffer result types', async () => {
      const middleware = getMiddleware();
      const mockResult = { type: 'stream', stream: {} };
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: { query: 'mutation { signIn(input: {}) { result { accessToken } } }' },
      });

      const result = await middleware(next, event);

      expect(result).toBe(mockResult);
    });

    it('should handle malformed buffer JSON gracefully', async () => {
      const middleware = getMiddleware();
      const mockResult = {
        type: 'buffer',
        buffer: Buffer.from('not valid json'),
        statusCode: 200,
        headers: {},
      };
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: {
          query: 'mutation { signIn(input: {}) { result { accessToken } } }',
        },
      });

      const result = await middleware(next, event);

      expect(result).toBe(mockResult);
    });

    it('should set HttpOnly flag on cookies', async () => {
      const middleware = getMiddleware();
      const mockResult = createMockResult({
        data: {
          data: {
            signIn: {
              result: { accessToken: 'test-token' },
            },
          },
        },
      });
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: {
          query: 'mutation { signIn(input: {}) { result { accessToken } } }',
        },
      });

      const result = await middleware(next, event);

      const cookies = result.headers['set-cookie'] as string[];
      expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true);
    });

    it('should set SameSite=Lax by default', async () => {
      const middleware = getMiddleware();
      const mockResult = createMockResult({
        data: {
          data: {
            signIn: {
              result: { accessToken: 'test-token' },
            },
          },
        },
      });
      const next = jest.fn().mockResolvedValue(mockResult);
      const event = createMockEvent({
        body: {
          query: 'mutation { signIn(input: {}) { result { accessToken } } }',
        },
      });

      const result = await middleware(next, event);

      const cookies = result.headers['set-cookie'] as string[];
      expect(cookies.some((c: string) => c.includes('SameSite=Lax'))).toBe(true);
    });

    describe('mutation detection', () => {
      const testMutationDetection = async (query: string, expectedMutation: string) => {
        const middleware = getMiddleware();
        const mockResult = createMockResult({
          data: {
            data: {
              [expectedMutation]: {
                result: { accessToken: 'token' },
              },
            },
          },
        });
        const next = jest.fn().mockResolvedValue(mockResult);
        const event = createMockEvent({ body: { query } });

        const result = await middleware(next, event);
        return result.headers['set-cookie'];
      };

      it('should detect mutation without name', async () => {
        const cookies = await testMutationDetection(
          'mutation { signUp(input: {}) { result { accessToken } } }',
          'signUp'
        );
        expect(cookies).toBeDefined();
      });

      it('should detect mutation with name', async () => {
        const cookies = await testMutationDetection(
          'mutation SignUp { signUp(input: {}) { result { accessToken } } }',
          'signUp'
        );
        expect(cookies).toBeDefined();
      });

      it('should detect mutation with variables', async () => {
        const cookies = await testMutationDetection(
          'mutation SignUp($input: SignUpInput!) { signUp(input: $input) { result { accessToken } } }',
          'signUp'
        );
        expect(cookies).toBeDefined();
      });

      it('should detect all auth mutations', async () => {
        const authMutations = [
          'signIn', 'signUp', 'signInSso', 'signUpSso',
          'signInMagicLink', 'signUpMagicLink', 'signInEmailOtp',
          'signInSmsOtp', 'signUpSms', 'signInOneTimeToken',
          'signInCrossOrigin', 'completeMfaChallenge', 'refreshToken',
        ];

        for (const mutation of authMutations) {
          const cookies = await testMutationDetection(
            `mutation { ${mutation}(input: {}) { result { accessToken } } }`,
            mutation
          );
          expect(cookies).toBeDefined();
        }
      });
    });
  });
});
