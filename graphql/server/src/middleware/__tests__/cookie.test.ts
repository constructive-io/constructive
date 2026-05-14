import type { Request, Response } from 'express';
import {
  SESSION_COOKIE_NAME,
  DEVICE_TOKEN_COOKIE_NAME,
  getSessionCookieConfig,
  getDeviceTokenCookieConfig,
  setSessionCookie,
  clearSessionCookie,
  setDeviceTokenCookie,
  clearDeviceTokenCookie,
  parseCookieValue,
  getDeviceTokenFromRequest,
  getSessionTokenFromRequest,
} from '../cookie';
import type { AuthSettings } from '../../types';

describe('cookie utilities', () => {
  describe('getSessionCookieConfig', () => {
    it('returns default config when no authSettings provided', () => {
      const config = getSessionCookieConfig();
      expect(config).toEqual({
        secure: false, // NODE_ENV is 'test'
        sameSite: 'lax',
        domain: undefined,
        httpOnly: true,
        maxAge: 86400,
        path: '/',
      });
    });

    it('uses authSettings values when provided', () => {
      const authSettings: AuthSettings = {
        cookieSecure: true,
        cookieSamesite: 'strict',
        cookieDomain: '.example.com',
        cookieHttponly: false,
        cookieMaxAge: '3600',
        cookiePath: '/api',
      };
      const config = getSessionCookieConfig(authSettings);
      expect(config).toEqual({
        secure: true,
        sameSite: 'strict',
        domain: '.example.com',
        httpOnly: false,
        maxAge: 3600,
        path: '/api',
      });
    });

    it('uses rememberMeDuration when rememberMe is true', () => {
      const authSettings: AuthSettings = {
        cookieMaxAge: '3600',
        rememberMeDuration: '2592000', // 30 days
      };
      const config = getSessionCookieConfig(authSettings, true);
      expect(config.maxAge).toBe(2592000);
    });

    it('uses cookieMaxAge when rememberMe is false', () => {
      const authSettings: AuthSettings = {
        cookieMaxAge: '3600',
        rememberMeDuration: '2592000',
      };
      const config = getSessionCookieConfig(authSettings, false);
      expect(config.maxAge).toBe(3600);
    });

    it('falls back to cookieMaxAge when rememberMeDuration is not set', () => {
      const authSettings: AuthSettings = {
        cookieMaxAge: '7200',
      };
      const config = getSessionCookieConfig(authSettings, true);
      expect(config.maxAge).toBe(7200);
    });
  });

  describe('getDeviceTokenCookieConfig', () => {
    it('returns config with 90 day maxAge', () => {
      const config = getDeviceTokenCookieConfig();
      expect(config.maxAge).toBe(90 * 24 * 60 * 60);
      expect(config.httpOnly).toBe(true);
    });

    it('uses authSettings for other cookie options', () => {
      const authSettings: AuthSettings = {
        cookieSecure: true,
        cookieDomain: '.example.com',
      };
      const config = getDeviceTokenCookieConfig(authSettings);
      expect(config.secure).toBe(true);
      expect(config.domain).toBe('.example.com');
    });
  });

  describe('setSessionCookie', () => {
    it('sets cookie with correct options', () => {
      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      const config = {
        secure: true,
        sameSite: 'lax' as const,
        domain: '.example.com',
        httpOnly: true,
        maxAge: 3600,
        path: '/',
      };

      setSessionCookie(mockRes, 'test-token', config);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        'test-token',
        {
          secure: true,
          sameSite: 'lax',
          domain: '.example.com',
          httpOnly: true,
          maxAge: 3600000, // converted to milliseconds
          path: '/',
        }
      );
    });
  });

  describe('clearSessionCookie', () => {
    it('clears cookie with correct options', () => {
      const mockRes = {
        clearCookie: jest.fn(),
      } as unknown as Response;

      const config = {
        secure: true,
        sameSite: 'lax' as const,
        domain: '.example.com',
        httpOnly: true,
        maxAge: 3600,
        path: '/',
      };

      clearSessionCookie(mockRes, config);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        {
          secure: true,
          sameSite: 'lax',
          domain: '.example.com',
          httpOnly: true,
          path: '/',
        }
      );
    });
  });

  describe('setDeviceTokenCookie', () => {
    it('sets device token cookie', () => {
      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      const config: Parameters<typeof setDeviceTokenCookie>[2] = {
        secure: true,
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 7776000,
        path: '/',
      };

      setDeviceTokenCookie(mockRes, 'device-123', config);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        DEVICE_TOKEN_COOKIE_NAME,
        'device-123',
        expect.objectContaining({
          maxAge: 7776000000,
        })
      );
    });
  });

  describe('clearDeviceTokenCookie', () => {
    it('clears device token cookie', () => {
      const mockRes = {
        clearCookie: jest.fn(),
      } as unknown as Response;

      const config: Parameters<typeof clearDeviceTokenCookie>[1] = {
        secure: false,
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 7776000,
        path: '/',
      };

      clearDeviceTokenCookie(mockRes, config);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        DEVICE_TOKEN_COOKIE_NAME,
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        })
      );
    });
  });

  describe('parseCookieValue', () => {
    it('parses cookie value from header', () => {
      const mockReq = {
        headers: {
          cookie: 'foo=bar; constructive_session=test-token; baz=qux',
        },
      } as unknown as Request;

      const value = parseCookieValue(mockReq, 'constructive_session');
      expect(value).toBe('test-token');
    });

    it('returns undefined when cookie not found', () => {
      const mockReq = {
        headers: {
          cookie: 'foo=bar',
        },
      } as unknown as Request;

      const value = parseCookieValue(mockReq, 'constructive_session');
      expect(value).toBeUndefined();
    });

    it('returns undefined when no cookie header', () => {
      const mockReq = {
        headers: {},
      } as unknown as Request;

      const value = parseCookieValue(mockReq, 'constructive_session');
      expect(value).toBeUndefined();
    });

    it('decodes URL-encoded cookie values', () => {
      const mockReq = {
        headers: {
          cookie: 'token=hello%20world',
        },
      } as unknown as Request;

      const value = parseCookieValue(mockReq, 'token');
      expect(value).toBe('hello world');
    });
  });

  describe('getDeviceTokenFromRequest', () => {
    it('extracts device token from cookie', () => {
      const mockReq = {
        headers: {
          cookie: `${DEVICE_TOKEN_COOKIE_NAME}=device-abc123`,
        },
      } as unknown as Request;

      const token = getDeviceTokenFromRequest(mockReq);
      expect(token).toBe('device-abc123');
    });
  });

  describe('getSessionTokenFromRequest', () => {
    it('extracts session token from cookie', () => {
      const mockReq = {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=session-xyz789`,
        },
      } as unknown as Request;

      const token = getSessionTokenFromRequest(mockReq);
      expect(token).toBe('session-xyz789');
    });
  });
});
