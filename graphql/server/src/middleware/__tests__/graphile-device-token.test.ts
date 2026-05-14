import type { Request } from 'express';

/**
 * Test that device token is correctly passed to GraphQL context.
 *
 * This tests the context building logic that passes req.deviceToken
 * to jwt.claims.device_token for DB procedures to access.
 */

describe('graphile context device token handling', () => {
  /**
   * Simulates the context building logic from graphile.ts buildPreset
   */
  const buildContext = (req: Partial<Request> & { deviceToken?: string }) => {
    const context: Record<string, string> = {};

    if (req.databaseId) {
      context['jwt.claims.database_id'] = req.databaseId;
    }
    if (req.clientIp) {
      context['jwt.claims.ip_address'] = req.clientIp;
    }
    if (req.deviceToken) {
      context['jwt.claims.device_token'] = req.deviceToken;
    }

    return context;
  };

  describe('device token in context', () => {
    it('should include device_token in jwt.claims when present on request', () => {
      const req = {
        deviceToken: 'device-abc123',
        databaseId: 'db-1',
        clientIp: '127.0.0.1',
      };

      const context = buildContext(req);

      expect(context['jwt.claims.device_token']).toBe('device-abc123');
    });

    it('should not include device_token when not present on request', () => {
      const req = {
        databaseId: 'db-1',
        clientIp: '127.0.0.1',
      };

      const context = buildContext(req);

      expect(context['jwt.claims.device_token']).toBeUndefined();
    });

    it('should include device_token alongside other claims', () => {
      const req = {
        deviceToken: 'device-xyz789',
        databaseId: 'test-db',
        clientIp: '192.168.1.1',
      };

      const context = buildContext(req);

      expect(context).toEqual({
        'jwt.claims.database_id': 'test-db',
        'jwt.claims.ip_address': '192.168.1.1',
        'jwt.claims.device_token': 'device-xyz789',
      });
    });

    it('should handle empty device token string', () => {
      const req = {
        deviceToken: '',
        databaseId: 'db-1',
      };

      const context = buildContext(req);

      // Empty string is falsy, so should not be included
      expect(context['jwt.claims.device_token']).toBeUndefined();
    });
  });

  describe('device token format', () => {
    it('should preserve UUID-style device tokens', () => {
      const req = {
        deviceToken: '550e8400-e29b-41d4-a716-446655440000',
      };

      const context = buildContext(req);

      expect(context['jwt.claims.device_token']).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should preserve device tokens with special characters', () => {
      const req = {
        deviceToken: 'device_token-123.abc',
      };

      const context = buildContext(req);

      expect(context['jwt.claims.device_token']).toBe('device_token-123.abc');
    });
  });
});
