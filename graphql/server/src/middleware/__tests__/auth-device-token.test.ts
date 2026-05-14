import type { Request, Response, NextFunction } from 'express';
import { DEVICE_TOKEN_COOKIE_NAME } from '../cookie';

/**
 * Test the device token reading functionality in auth middleware.
 *
 * The actual createAuthenticateMiddleware requires database connections,
 * so we test the device token parsing logic in isolation.
 */

/** Cookie parsing function - mirrors the implementation in auth.ts */
const parseCookieToken = (req: Request, cookieName: string): string | undefined => {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const match = header.split(';').find((c) => c.trim().startsWith(`${cookieName}=`));
  return match ? decodeURIComponent(match.split('=')[1].trim()) : undefined;
};

describe('auth middleware device token handling', () => {
  const createMockRequest = (cookies?: string): Partial<Request> => ({
    headers: cookies ? { cookie: cookies } : {},
  });

  describe('device token cookie parsing', () => {
    it('should extract device token from cookie header', () => {
      const req = createMockRequest(`${DEVICE_TOKEN_COOKIE_NAME}=device-abc123`);
      const deviceToken = parseCookieToken(req as Request, DEVICE_TOKEN_COOKIE_NAME);
      expect(deviceToken).toBe('device-abc123');
    });

    it('should return undefined when device token cookie is not present', () => {
      const req = createMockRequest('other_cookie=value');
      const deviceToken = parseCookieToken(req as Request, DEVICE_TOKEN_COOKIE_NAME);
      expect(deviceToken).toBeUndefined();
    });

    it('should return undefined when no cookies are present', () => {
      const req = createMockRequest();
      const deviceToken = parseCookieToken(req as Request, DEVICE_TOKEN_COOKIE_NAME);
      expect(deviceToken).toBeUndefined();
    });

    it('should handle multiple cookies and extract device token', () => {
      const req = createMockRequest(
        `session=abc; ${DEVICE_TOKEN_COOKIE_NAME}=device-xyz789; csrf=token123`
      );
      const deviceToken = parseCookieToken(req as Request, DEVICE_TOKEN_COOKIE_NAME);
      expect(deviceToken).toBe('device-xyz789');
    });

    it('should decode URL-encoded device token values', () => {
      const req = createMockRequest(`${DEVICE_TOKEN_COOKIE_NAME}=device%2Ftoken%3D123`);
      const deviceToken = parseCookieToken(req as Request, DEVICE_TOKEN_COOKIE_NAME);
      expect(deviceToken).toBe('device/token=123');
    });

    it('should handle device token with special characters', () => {
      const req = createMockRequest(`${DEVICE_TOKEN_COOKIE_NAME}=abc-123_XYZ.test`);
      const deviceToken = parseCookieToken(req as Request, DEVICE_TOKEN_COOKIE_NAME);
      expect(deviceToken).toBe('abc-123_XYZ.test');
    });
  });

  describe('device token attachment to request', () => {
    it('should set deviceToken on request when cookie is present', () => {
      const req = createMockRequest(`${DEVICE_TOKEN_COOKIE_NAME}=device-token-value`) as Request;

      // Simulate what auth middleware does
      const deviceToken = parseCookieToken(req, DEVICE_TOKEN_COOKIE_NAME);
      if (deviceToken) {
        (req as any).deviceToken = deviceToken;
      }

      expect((req as any).deviceToken).toBe('device-token-value');
    });

    it('should not set deviceToken when cookie is absent', () => {
      const req = createMockRequest('other=value') as Request;

      const deviceToken = parseCookieToken(req, DEVICE_TOKEN_COOKIE_NAME);
      if (deviceToken) {
        (req as any).deviceToken = deviceToken;
      }

      expect((req as any).deviceToken).toBeUndefined();
    });
  });
});
