import type { Request, Response, NextFunction } from 'express';
import { createCsrfMiddleware } from '@constructive-io/csrf';
import { parseCookieValue, SESSION_COOKIE_NAME } from '../cookie';

describe('CSRF middleware integration', () => {
  const csrf = createCsrfMiddleware({
    cookieOptions: {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
    },
  });

  const createMockReq = (overrides: Partial<Request> = {}): Request => {
    return {
      method: 'POST',
      headers: {},
      cookies: {},
      body: {},
      ...overrides,
    } as unknown as Request;
  };

  const createMockRes = (): Response => {
    const res: Partial<Response> = {
      cookie: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return res as Response;
  };

  describe('csrfSetToken', () => {
    it('sets csrf_token cookie on request', (done) => {
      const req = createMockReq();
      const res = createMockRes();

      csrf.setToken(req as any, res as any, (err?: Error) => {
        expect(err).toBeUndefined();
        expect(res.cookie).toHaveBeenCalledWith(
          'csrf_token',
          expect.any(String),
          expect.objectContaining({
            httpOnly: false,
          })
        );
        done();
      });
    });

    it('does not overwrite existing csrf_token cookie', (done) => {
      const req = createMockReq({
        cookies: { csrf_token: 'existing-token' },
      });
      const res = createMockRes();

      csrf.setToken(req as any, res as any, (err?: Error) => {
        expect(err).toBeUndefined();
        expect(res.cookie).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('csrfProtect', () => {
    it('allows GET requests without CSRF token', (done) => {
      const req = createMockReq({ method: 'GET' });
      const res = createMockRes();

      csrf.protect(req as any, res as any, (err?: Error) => {
        expect(err).toBeUndefined();
        done();
      });
    });

    it('blocks POST without CSRF cookie', (done) => {
      const req = createMockReq({ method: 'POST' });
      const res = createMockRes();

      csrf.protect(req as any, res as any, (err?: Error) => {
        expect(err).toBeDefined();
        expect((err as any).code).toBe('CSRF_TOKEN_MISSING');
        done();
      });
    });

    it('blocks POST with cookie but no header', (done) => {
      const req = createMockReq({
        method: 'POST',
        cookies: { csrf_token: 'valid-token' },
      });
      const res = createMockRes();

      csrf.protect(req as any, res as any, (err?: Error) => {
        expect(err).toBeDefined();
        expect((err as any).code).toBe('CSRF_TOKEN_INVALID');
        done();
      });
    });

    it('allows POST with matching cookie and header', (done) => {
      const token = 'valid-csrf-token';
      const req = createMockReq({
        method: 'POST',
        cookies: { csrf_token: token },
        headers: { 'x-csrf-token': token },
      });
      const res = createMockRes();

      csrf.protect(req as any, res as any, (err?: Error) => {
        expect(err).toBeUndefined();
        done();
      });
    });

    it('blocks POST with mismatched cookie and header', (done) => {
      const req = createMockReq({
        method: 'POST',
        cookies: { csrf_token: 'token-a' },
        headers: { 'x-csrf-token': 'token-b' },
      });
      const res = createMockRes();

      csrf.protect(req as any, res as any, (err?: Error) => {
        expect(err).toBeDefined();
        expect((err as any).code).toBe('CSRF_TOKEN_INVALID');
        done();
      });
    });
  });

  describe('CSRF skip conditions for server.ts', () => {
    const shouldSkipCsrf = (req: Request): boolean => {
      const auth = req.headers.authorization;
      if (auth && auth.toLowerCase().startsWith('bearer ')) return true;
      const sessionCookie = parseCookieValue(req, SESSION_COOKIE_NAME);
      if (!sessionCookie) return true;
      return false;
    };

    it('skips CSRF for Bearer token auth', () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer some-token' },
      });
      expect(shouldSkipCsrf(req)).toBe(true);
    });

    it('skips CSRF for anonymous requests (no session cookie)', () => {
      const req = createMockReq();
      expect(shouldSkipCsrf(req)).toBe(true);
    });

    it('enforces CSRF for cookie-authenticated requests', () => {
      const req = createMockReq({
        headers: { cookie: `${SESSION_COOKIE_NAME}=some-session` },
      });
      expect(shouldSkipCsrf(req)).toBe(false);
    });

    it('skips CSRF for Bearer even with session cookie', () => {
      const req = createMockReq({
        headers: {
          authorization: 'Bearer some-token',
          cookie: `${SESSION_COOKIE_NAME}=some-session`,
        },
      });
      expect(shouldSkipCsrf(req)).toBe(true);
    });
  });
});
