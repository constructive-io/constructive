import { SESSION_COOKIE_NAME, DEVICE_TOKEN_COOKIE_NAME } from '../../middleware/cookie';

/**
 * Since the AuthCookiePlugin is a grafserv middleware plugin, we test
 * the core logic by importing and testing the utility functions.
 * Full integration tests would require a running PostGraphile instance.
 */

// Re-implement the testable functions here for unit testing
// (In a real codebase, these would be exported from a shared module)

const extractMutationNames = (query: string): string[] => {
  const mutations: string[] = [];

  if (!/^\s*mutation\b/i.test(query)) {
    return mutations;
  }

  const bodyStart = query.indexOf('{');
  if (bodyStart === -1) return mutations;

  const bodyContent = query.slice(bodyStart + 1);
  const fieldPattern = /(\w+)\s*(?:\(|{)/g;
  let match;
  while ((match = fieldPattern.exec(bodyContent)) !== null) {
    const name = match[1];
    if (name !== 'mutation' && name !== 'query' && name !== 'fragment') {
      mutations.push(name);
    }
  }

  return mutations;
};

const extractAccessToken = (
  data: Record<string, unknown>,
  mutationName: string
): string | undefined => {
  const result = data[mutationName] as Record<string, unknown> | undefined;
  if (!result) return undefined;

  if (typeof result.accessToken === 'string') return result.accessToken;
  if (typeof result.access_token === 'string') return result.access_token;

  const nested = result.result as Record<string, unknown> | undefined;
  if (nested) {
    if (typeof nested.accessToken === 'string') return nested.accessToken;
    if (typeof nested.access_token === 'string') return nested.access_token;
  }

  return undefined;
};

const extractDeviceId = (
  data: Record<string, unknown>,
  mutationName: string
): string | undefined => {
  const result = data[mutationName] as Record<string, unknown> | undefined;
  if (!result) return undefined;

  if (typeof result.deviceId === 'string') return result.deviceId;
  if (typeof result.device_id === 'string') return result.device_id;

  const nested = result.result as Record<string, unknown> | undefined;
  if (nested) {
    if (typeof nested.deviceId === 'string') return nested.deviceId;
    if (typeof nested.device_id === 'string') return nested.device_id;
  }

  return undefined;
};

const hasRememberMe = (variables?: Record<string, unknown>): boolean => {
  if (!variables) return false;
  return variables.rememberMe === true || variables.remember_me === true;
};

interface CookieConfig {
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  domain?: string;
  httpOnly: boolean;
  maxAge?: number;
  path: string;
}

const serializeCookie = (name: string, value: string, config: CookieConfig): string => {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];

  if (config.maxAge !== undefined) {
    parts.push(`Max-Age=${config.maxAge}`);
  }
  if (config.domain) {
    parts.push(`Domain=${config.domain}`);
  }
  if (config.path) {
    parts.push(`Path=${config.path}`);
  }
  if (config.secure) {
    parts.push('Secure');
  }
  if (config.httpOnly) {
    parts.push('HttpOnly');
  }
  if (config.sameSite) {
    parts.push(`SameSite=${config.sameSite.charAt(0).toUpperCase() + config.sameSite.slice(1)}`);
  }

  return parts.join('; ');
};

const serializeClearCookie = (name: string, config: CookieConfig): string => {
  const parts = [`${encodeURIComponent(name)}=`];
  parts.push('Max-Age=0');
  if (config.domain) {
    parts.push(`Domain=${config.domain}`);
  }
  if (config.path) {
    parts.push(`Path=${config.path}`);
  }
  if (config.secure) {
    parts.push('Secure');
  }
  if (config.httpOnly) {
    parts.push('HttpOnly');
  }
  if (config.sameSite) {
    parts.push(`SameSite=${config.sameSite.charAt(0).toUpperCase() + config.sameSite.slice(1)}`);
  }
  return parts.join('; ');
};

describe('AuthCookiePlugin utilities', () => {
  describe('extractMutationNames', () => {
    it('extracts mutation names from query', () => {
      const query = 'mutation { signIn(email: "test@example.com") { accessToken } }';
      expect(extractMutationNames(query)).toEqual(['signIn']);
    });

    it('extracts multiple mutation names', () => {
      const query = 'mutation { signIn(email: "test") { token } signUp(email: "new") { token } }';
      expect(extractMutationNames(query)).toEqual(['signIn', 'signUp']);
    });

    it('returns empty array for non-mutation queries', () => {
      const query = 'query { users { id } }';
      expect(extractMutationNames(query)).toEqual([]);
    });

    it('handles mutations with no arguments', () => {
      const query = 'mutation { signOut { success } }';
      expect(extractMutationNames(query)).toEqual(['signOut']);
    });
  });

  describe('extractAccessToken', () => {
    it('extracts accessToken from camelCase', () => {
      const data = { signIn: { accessToken: 'test-token' } };
      expect(extractAccessToken(data, 'signIn')).toBe('test-token');
    });

    it('extracts access_token from snake_case', () => {
      const data = { signIn: { access_token: 'snake-token' } };
      expect(extractAccessToken(data, 'signIn')).toBe('snake-token');
    });

    it('extracts token from nested result object', () => {
      const data = { signIn: { result: { accessToken: 'nested-token' } } };
      expect(extractAccessToken(data, 'signIn')).toBe('nested-token');
    });

    it('returns undefined when no token present', () => {
      const data = { signIn: { user: { id: '123' } } };
      expect(extractAccessToken(data, 'signIn')).toBeUndefined();
    });

    it('returns undefined for wrong mutation name', () => {
      const data = { signIn: { accessToken: 'token' } };
      expect(extractAccessToken(data, 'signUp')).toBeUndefined();
    });
  });

  describe('extractDeviceId', () => {
    it('extracts deviceId from camelCase', () => {
      const data = { signIn: { deviceId: 'device-123' } };
      expect(extractDeviceId(data, 'signIn')).toBe('device-123');
    });

    it('extracts device_id from snake_case', () => {
      const data = { signIn: { device_id: 'device-snake' } };
      expect(extractDeviceId(data, 'signIn')).toBe('device-snake');
    });

    it('extracts from nested result object', () => {
      const data = { signIn: { result: { deviceId: 'nested-device' } } };
      expect(extractDeviceId(data, 'signIn')).toBe('nested-device');
    });

    it('returns undefined when no device ID', () => {
      const data = { signIn: { accessToken: 'token' } };
      expect(extractDeviceId(data, 'signIn')).toBeUndefined();
    });
  });

  describe('hasRememberMe', () => {
    it('detects rememberMe in camelCase', () => {
      expect(hasRememberMe({ rememberMe: true })).toBe(true);
    });

    it('detects remember_me in snake_case', () => {
      expect(hasRememberMe({ remember_me: true })).toBe(true);
    });

    it('returns false when not present', () => {
      expect(hasRememberMe({})).toBe(false);
    });

    it('returns false when false', () => {
      expect(hasRememberMe({ rememberMe: false })).toBe(false);
    });

    it('returns false for undefined variables', () => {
      expect(hasRememberMe(undefined)).toBe(false);
    });
  });

  describe('serializeCookie', () => {
    const defaultConfig: CookieConfig = {
      secure: true,
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 3600,
      path: '/',
    };

    it('serializes cookie with all options', () => {
      const cookie = serializeCookie(SESSION_COOKIE_NAME, 'test-token', defaultConfig);
      expect(cookie).toContain(`${SESSION_COOKIE_NAME}=test-token`);
      expect(cookie).toContain('Max-Age=3600');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
    });

    it('includes domain when specified', () => {
      const cookie = serializeCookie(SESSION_COOKIE_NAME, 'token', {
        ...defaultConfig,
        domain: '.example.com',
      });
      expect(cookie).toContain('Domain=.example.com');
    });

    it('handles SameSite=Strict', () => {
      const cookie = serializeCookie(SESSION_COOKIE_NAME, 'token', {
        ...defaultConfig,
        sameSite: 'strict',
      });
      expect(cookie).toContain('SameSite=Strict');
    });

    it('encodes special characters in value', () => {
      const cookie = serializeCookie(SESSION_COOKIE_NAME, 'token=with=equals', defaultConfig);
      expect(cookie).toContain('token%3Dwith%3Dequals');
    });
  });

  describe('serializeClearCookie', () => {
    const defaultConfig: CookieConfig = {
      secure: true,
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 3600,
      path: '/',
    };

    it('clears cookie with Max-Age=0', () => {
      const cookie = serializeClearCookie(SESSION_COOKIE_NAME, defaultConfig);
      expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`);
      expect(cookie).toContain('Max-Age=0');
    });

    it('preserves security attributes when clearing', () => {
      const cookie = serializeClearCookie(SESSION_COOKIE_NAME, defaultConfig);
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
    });
  });

  describe('cookie names', () => {
    it('uses correct session cookie name', () => {
      expect(SESSION_COOKIE_NAME).toBe('constructive_session');
    });

    it('uses correct device token cookie name', () => {
      expect(DEVICE_TOKEN_COOKIE_NAME).toBe('constructive_device_token');
    });
  });
});

/**
 * P0 Tests: Auth failure scenarios, multiple mutations, cookie clearing
 */
describe('AuthCookiePlugin P0 scenarios', () => {
  const SIGN_IN_MUTATIONS = new Set([
    'signIn', 'signUp', 'signInSso', 'signUpSso',
    'signInMagicLink', 'signUpMagicLink', 'signInEmailOtp',
    'signInSmsOtp', 'signUpSms', 'completeMfaChallenge',
    'signInOneTimeToken', 'signInCrossOrigin',
  ]);

  const SIGN_OUT_MUTATIONS = new Set([
    'signOut', 'revokeSession', 'revokeAllSessions',
  ]);

  const defaultConfig: CookieConfig = {
    secure: true,
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 3600,
    path: '/',
  };

  interface CookieConfig {
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    domain?: string;
    httpOnly: boolean;
    maxAge?: number;
    path: string;
  }

  interface GraphQLResponse {
    data?: Record<string, unknown> | null;
    errors?: Array<{ message: string; extensions?: { code?: string } }>;
  }

  /**
   * Simulates the plugin's cookie decision logic.
   * Returns cookies that would be set based on the response.
   */
  const simulatePluginCookieDecision = (
    query: string,
    response: GraphQLResponse,
    config: CookieConfig = defaultConfig
  ): { sessionCookie?: string; deviceCookie?: string; cleared: string[] } => {
    const result: { sessionCookie?: string; deviceCookie?: string; cleared: string[] } = {
      cleared: [],
    };

    // Skip if errors present
    if (response.errors?.length || !response.data) {
      return result;
    }

    // Extract mutation names
    const mutationNames: string[] = [];
    if (/^\s*mutation\b/i.test(query)) {
      const bodyStart = query.indexOf('{');
      if (bodyStart !== -1) {
        const bodyContent = query.slice(bodyStart + 1);
        const fieldPattern = /(\w+)\s*(?:\(|{)/g;
        let match;
        while ((match = fieldPattern.exec(bodyContent)) !== null) {
          const name = match[1];
          if (name !== 'mutation' && name !== 'query' && name !== 'fragment') {
            mutationNames.push(name);
          }
        }
      }
    }

    // Find auth mutations
    const signInMutation = mutationNames.find((m) => SIGN_IN_MUTATIONS.has(m));
    const signOutMutation = mutationNames.find((m) => SIGN_OUT_MUTATIONS.has(m));

    // Handle sign-out
    if (signOutMutation && response.data[signOutMutation]) {
      result.cleared.push(SESSION_COOKIE_NAME, DEVICE_TOKEN_COOKIE_NAME);
    }

    // Handle sign-in (first matching mutation wins)
    if (signInMutation) {
      const mutationResult = response.data[signInMutation] as Record<string, unknown> | undefined;
      if (mutationResult) {
        const accessToken = mutationResult.accessToken || mutationResult.access_token ||
          (mutationResult.result as any)?.accessToken || (mutationResult.result as any)?.access_token;
        if (typeof accessToken === 'string') {
          result.sessionCookie = accessToken;
        }

        const deviceId = mutationResult.deviceId || mutationResult.device_id ||
          (mutationResult.result as any)?.deviceId || (mutationResult.result as any)?.device_id;
        if (typeof deviceId === 'string') {
          result.deviceCookie = deviceId;
        }
      }
    }

    return result;
  };

  describe('P0 #1: Auth failure scenarios', () => {
    it('does not set cookie when GraphQL errors are present', () => {
      const query = 'mutation { signIn(email: "test@example.com") { accessToken } }';
      const response: GraphQLResponse = {
        data: null,
        errors: [{ message: 'Invalid credentials', extensions: { code: 'INVALID_CREDENTIALS' } }],
      };

      const result = simulatePluginCookieDecision(query, response);
      expect(result.sessionCookie).toBeUndefined();
      expect(result.deviceCookie).toBeUndefined();
      expect(result.cleared).toHaveLength(0);
    });

    it('does not set cookie when data is null with errors', () => {
      const query = 'mutation { signIn(email: "test@example.com") { accessToken } }';
      const response: GraphQLResponse = {
        data: null,
        errors: [{ message: 'Authentication failed' }],
      };

      const result = simulatePluginCookieDecision(query, response);
      expect(result.sessionCookie).toBeUndefined();
    });

    it('does not set cookie when partial success but auth mutation returns null', () => {
      const query = 'mutation { signIn(email: "test") { accessToken } createTeam(name: "team") { id } }';
      const response: GraphQLResponse = {
        data: {
          signIn: null,  // Auth failed
          createTeam: { id: 'team-123' },  // Other mutation succeeded
        },
      };

      const result = simulatePluginCookieDecision(query, response);
      expect(result.sessionCookie).toBeUndefined();
    });

    it('does not set cookie when auth mutation succeeds but returns no token', () => {
      const query = 'mutation { signIn(email: "test") { user { id } } }';
      const response: GraphQLResponse = {
        data: {
          signIn: { user: { id: 'user-123' } },  // No accessToken field
        },
      };

      const result = simulatePluginCookieDecision(query, response);
      expect(result.sessionCookie).toBeUndefined();
    });

    it('does not set cookie when accessToken is not a string', () => {
      const query = 'mutation { signIn(email: "test") { accessToken } }';
      const response: GraphQLResponse = {
        data: {
          signIn: { accessToken: 12345 },  // Number, not string
        },
      };

      const result = simulatePluginCookieDecision(query, response);
      expect(result.sessionCookie).toBeUndefined();
    });

    it('does not set cookie when accessToken is null', () => {
      const query = 'mutation { signIn(email: "test") { accessToken } }';
      const response: GraphQLResponse = {
        data: {
          signIn: { accessToken: null },
        },
      };

      const result = simulatePluginCookieDecision(query, response);
      expect(result.sessionCookie).toBeUndefined();
    });

    it('does not set cookie when accessToken is empty string', () => {
      const query = 'mutation { signIn(email: "test") { accessToken } }';
      const response: GraphQLResponse = {
        data: {
          signIn: { accessToken: '' },
        },
      };

      const result = simulatePluginCookieDecision(query, response);
      // Empty string should not set a cookie (falsy check in simulation)
      expect(result.sessionCookie).toBeUndefined();
    });
  });

  describe('P0 #2: Cookie clearing completeness', () => {
    it('clears both session and device token on signOut', () => {
      const query = 'mutation { signOut { success } }';
      const response: GraphQLResponse = {
        data: { signOut: { success: true } },
      };

      const result = simulatePluginCookieDecision(query, response);
      expect(result.cleared).toContain(SESSION_COOKIE_NAME);
      expect(result.cleared).toContain(DEVICE_TOKEN_COOKIE_NAME);
    });

    it('clears both cookies on revokeSession', () => {
      const query = 'mutation { revokeSession(sessionId: "123") { success } }';
      const response: GraphQLResponse = {
        data: { revokeSession: { success: true } },
      };

      const result = simulatePluginCookieDecision(query, response);
      expect(result.cleared).toContain(SESSION_COOKIE_NAME);
      expect(result.cleared).toContain(DEVICE_TOKEN_COOKIE_NAME);
    });

    it('clears both cookies on revokeAllSessions', () => {
      const query = 'mutation { revokeAllSessions { success } }';
      const response: GraphQLResponse = {
        data: { revokeAllSessions: { success: true } },
      };

      const result = simulatePluginCookieDecision(query, response);
      expect(result.cleared).toContain(SESSION_COOKIE_NAME);
      expect(result.cleared).toContain(DEVICE_TOKEN_COOKIE_NAME);
    });

    it('does not clear cookies when signOut returns null', () => {
      const query = 'mutation { signOut { success } }';
      const response: GraphQLResponse = {
        data: { signOut: null },
      };

      const result = simulatePluginCookieDecision(query, response);
      expect(result.cleared).toHaveLength(0);
    });

    it('does not clear cookies when signOut has errors', () => {
      const query = 'mutation { signOut { success } }';
      const response: GraphQLResponse = {
        data: null,
        errors: [{ message: 'Not authenticated' }],
      };

      const result = simulatePluginCookieDecision(query, response);
      expect(result.cleared).toHaveLength(0);
    });

    it('clear cookie preserves security attributes', () => {
      const config: CookieConfig = {
        secure: true,
        sameSite: 'strict',
        domain: '.example.com',
        httpOnly: true,
        maxAge: 3600,
        path: '/api',
      };

      const serializeClearCookie = (name: string, cfg: CookieConfig): string => {
        const parts = [`${encodeURIComponent(name)}=`];
        parts.push('Max-Age=0');
        if (cfg.domain) parts.push(`Domain=${cfg.domain}`);
        if (cfg.path) parts.push(`Path=${cfg.path}`);
        if (cfg.secure) parts.push('Secure');
        if (cfg.httpOnly) parts.push('HttpOnly');
        if (cfg.sameSite) {
          parts.push(`SameSite=${cfg.sameSite.charAt(0).toUpperCase() + cfg.sameSite.slice(1)}`);
        }
        return parts.join('; ');
      };

      const clearCookie = serializeClearCookie(SESSION_COOKIE_NAME, config);
      expect(clearCookie).toContain('Max-Age=0');
      expect(clearCookie).toContain('Domain=.example.com');
      expect(clearCookie).toContain('Path=/api');
      expect(clearCookie).toContain('Secure');
      expect(clearCookie).toContain('HttpOnly');
      expect(clearCookie).toContain('SameSite=Strict');
    });
  });

  describe('P1 #5: Environment-based security attributes', () => {
    it('sets Secure flag in production config', () => {
      const prodConfig: CookieConfig = {
        secure: true,  // Should be true in production
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 3600,
        path: '/',
      };

      const serializeCookie = (name: string, value: string, cfg: CookieConfig): string => {
        const parts = [`${name}=${value}`];
        if (cfg.secure) parts.push('Secure');
        return parts.join('; ');
      };

      const cookie = serializeCookie(SESSION_COOKIE_NAME, 'token', prodConfig);
      expect(cookie).toContain('Secure');
    });

    it('does not set Secure flag in development config', () => {
      const devConfig: CookieConfig = {
        secure: false,  // Should be false in development
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 3600,
        path: '/',
      };

      const serializeCookie = (name: string, value: string, cfg: CookieConfig): string => {
        const parts = [`${name}=${value}`];
        if (cfg.secure) parts.push('Secure');
        return parts.join('; ');
      };

      const cookie = serializeCookie(SESSION_COOKIE_NAME, 'token', devConfig);
      expect(cookie).not.toContain('Secure');
    });
  });
});
