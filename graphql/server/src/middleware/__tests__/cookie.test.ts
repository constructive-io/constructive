import {
  buildCookieOptions,
  buildDeviceCookieOptions,
  setSessionCookie,
  clearSessionCookie,
  setDeviceTokenCookie,
  SESSION_COOKIE_NAME,
  DEVICE_COOKIE_NAME,
  AuthCookieSettings,
} from '../cookie';

describe('cookie helpers', () => {
  describe('buildCookieOptions', () => {
    it('should return default options when no settings provided', () => {
      const options = buildCookieOptions();

      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(3600 * 1000); // 1 hour in ms
    });

    it('should use settings when provided', () => {
      const settings: AuthCookieSettings = {
        cookieSecure: true,
        cookieSameSite: 'strict',
        cookieDomain: '.example.com',
        cookiePath: '/api',
        defaultSessionDuration: '2 hours',
      };

      const options = buildCookieOptions(settings);

      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe('strict');
      expect(options.domain).toBe('.example.com');
      expect(options.path).toBe('/api');
      expect(options.maxAge).toBe(2 * 3600 * 1000); // 2 hours in ms
    });

    it('should use rememberMeDuration when rememberMe is true', () => {
      const settings: AuthCookieSettings = {
        defaultSessionDuration: '1 hour',
        rememberMeDuration: '30 days',
      };

      const options = buildCookieOptions(settings, true);

      expect(options.maxAge).toBe(30 * 24 * 3600 * 1000); // 30 days in ms
    });

    it('should parse various interval formats', () => {
      expect(buildCookieOptions({ defaultSessionDuration: '30 seconds' }).maxAge).toBe(30 * 1000);
      expect(buildCookieOptions({ defaultSessionDuration: '5 minutes' }).maxAge).toBe(5 * 60 * 1000);
      expect(buildCookieOptions({ defaultSessionDuration: '2 hours' }).maxAge).toBe(2 * 3600 * 1000);
      expect(buildCookieOptions({ defaultSessionDuration: '7 days' }).maxAge).toBe(7 * 86400 * 1000);
      expect(buildCookieOptions({ defaultSessionDuration: '1 week' }).maxAge).toBe(604800 * 1000);
    });
  });

  describe('buildDeviceCookieOptions', () => {
    it('should return long-lived cookie options', () => {
      const options = buildDeviceCookieOptions();

      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.maxAge).toBe(90 * 24 * 3600 * 1000); // 90 days in ms
    });
  });

  describe('setSessionCookie', () => {
    it('should call res.cookie with correct arguments', () => {
      const mockRes = {
        cookie: jest.fn(),
      } as any;

      setSessionCookie(mockRes, 'test-token', undefined, false);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        'test-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        })
      );
    });

    it('should use rememberMe duration when true', () => {
      const mockRes = {
        cookie: jest.fn(),
      } as any;

      const settings: AuthCookieSettings = {
        rememberMeDuration: '30 days',
      };

      setSessionCookie(mockRes, 'test-token', settings, true);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        'test-token',
        expect.objectContaining({
          maxAge: 30 * 24 * 3600 * 1000,
        })
      );
    });
  });

  describe('clearSessionCookie', () => {
    it('should call res.clearCookie with correct arguments', () => {
      const mockRes = {
        clearCookie: jest.fn(),
      } as any;

      clearSessionCookie(mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        })
      );
    });
  });

  describe('setDeviceTokenCookie', () => {
    it('should call res.cookie with long-lived options', () => {
      const mockRes = {
        cookie: jest.fn(),
      } as any;

      setDeviceTokenCookie(mockRes, 'device-token-123');

      expect(mockRes.cookie).toHaveBeenCalledWith(
        DEVICE_COOKIE_NAME,
        'device-token-123',
        expect.objectContaining({
          httpOnly: true,
          maxAge: 90 * 24 * 3600 * 1000,
        })
      );
    });
  });
});
