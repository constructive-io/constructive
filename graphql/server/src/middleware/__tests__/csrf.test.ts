import { createCsrfMiddleware } from '@constructive-io/csrf';
import type { Request, Response, NextFunction } from 'express';

describe('CSRF middleware integration', () => {
  const csrf = createCsrfMiddleware({
    cookieOptions: {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    },
  });

  const createSelectiveCsrfProtect = () => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const authHeader = req.headers.authorization || '';
      if (authHeader.toLowerCase().startsWith('bearer ')) {
        return next();
      }
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())) {
        return next();
      }
      const hasCookieAuth = !!(req.cookies as Record<string, string>)?.constructive_session;
      if (!hasCookieAuth) {
        return next();
      }
      csrf.protect(req as any, res as any, next);
    };
  };

  const createMockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
    method: 'POST',
    headers: {},
    cookies: {},
    body: {},
    ...overrides,
  });

  const createMockRes = (): Partial<Response> => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn(),
  });

  describe('selectiveCsrfProtect', () => {
    it('should skip CSRF for Bearer token authentication', () => {
      const protect = createSelectiveCsrfProtect();
      const req = createMockReq({
        method: 'POST',
        headers: { authorization: 'Bearer some-jwt-token' },
        cookies: { constructive_session: 'session-token' },
      });
      const res = createMockRes();
      const next = jest.fn();

      protect(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should skip CSRF for GET requests', () => {
      const protect = createSelectiveCsrfProtect();
      const req = createMockReq({
        method: 'GET',
        cookies: { constructive_session: 'session-token' },
      });
      const res = createMockRes();
      const next = jest.fn();

      protect(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should skip CSRF for HEAD requests', () => {
      const protect = createSelectiveCsrfProtect();
      const req = createMockReq({
        method: 'HEAD',
        cookies: { constructive_session: 'session-token' },
      });
      const res = createMockRes();
      const next = jest.fn();

      protect(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should skip CSRF for OPTIONS requests', () => {
      const protect = createSelectiveCsrfProtect();
      const req = createMockReq({
        method: 'OPTIONS',
        cookies: { constructive_session: 'session-token' },
      });
      const res = createMockRes();
      const next = jest.fn();

      protect(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should skip CSRF when no session cookie (anonymous request)', () => {
      const protect = createSelectiveCsrfProtect();
      const req = createMockReq({
        method: 'POST',
        cookies: {},
      });
      const res = createMockRes();
      const next = jest.fn();

      protect(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should require CSRF for cookie-authenticated POST mutation', () => {
      const protect = createSelectiveCsrfProtect();
      const req = createMockReq({
        method: 'POST',
        cookies: { constructive_session: 'session-token' },
      });
      const res = createMockRes();
      const next = jest.fn();

      protect(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CSRF_TOKEN_MISSING',
        })
      );
    });

    it('should reject invalid CSRF token', () => {
      const protect = createSelectiveCsrfProtect();
      const req = createMockReq({
        method: 'POST',
        headers: { 'x-csrf-token': 'wrong-token' },
        cookies: {
          constructive_session: 'session-token',
          csrf_token: 'correct-token',
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      protect(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CSRF_TOKEN_INVALID',
        })
      );
    });

    it('should allow request with valid CSRF token', () => {
      const protect = createSelectiveCsrfProtect();
      const csrfToken = csrf.generateToken();
      const req = createMockReq({
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        cookies: {
          constructive_session: 'session-token',
          csrf_token: csrfToken,
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      protect(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow CSRF token in request body', () => {
      const protect = createSelectiveCsrfProtect();
      const csrfToken = csrf.generateToken();
      const req = createMockReq({
        method: 'POST',
        cookies: {
          constructive_session: 'session-token',
          csrf_token: csrfToken,
        },
        body: { _csrf: csrfToken },
      });
      const res = createMockRes();
      const next = jest.fn();

      protect(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('csrf.setToken', () => {
    it('should set CSRF cookie if not present', () => {
      const req = createMockReq({ cookies: {} });
      const res = createMockRes();
      const next = jest.fn();

      csrf.setToken(req as any, res as any, next);

      expect(res.cookie).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: false,
          sameSite: 'lax',
        })
      );
      expect(next).toHaveBeenCalled();
    });

    it('should not set CSRF cookie if already present', () => {
      const req = createMockReq({
        cookies: { csrf_token: 'existing-token' },
      });
      const res = createMockRes();
      const next = jest.fn();

      csrf.setToken(req as any, res as any, next);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });
});
