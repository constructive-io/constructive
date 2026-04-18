import { Logger } from '@pgpmjs/logger';
import { getNodeEnv } from '@pgpmjs/env';
import { createCsrfMiddleware, csrfErrorHandler } from '@constructive-io/csrf';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import './types'; // for Request type

const log = new Logger('csrf');

/**
 * Creates CSRF protection middleware that is aware of auth settings and token source.
 *
 * CSRF is only enforced when ALL of the following are true:
 * 1. `require_csrf_for_auth` is enabled in app_auth_settings
 * 2. `enable_cookie_auth` is enabled in app_auth_settings
 * 3. The current request was authenticated via a session cookie (not Bearer token)
 *
 * When the request uses a Bearer token (API tokens, service credentials),
 * CSRF protection is skipped because Bearer tokens are not automatically
 * attached by the browser and are therefore not vulnerable to CSRF attacks.
 *
 * This ensures the engineering team can continue using API tokens with zero changes
 * while gradually enabling cookie-based auth with CSRF protection.
 */
export const createCsrfProtectionMiddleware = (): {
  setToken: RequestHandler;
  protect: RequestHandler;
  errorHandler: (err: Error, req: Request, res: Response, next: NextFunction) => void;
} => {
  const csrf = createCsrfMiddleware({
    cookieName: 'csrf_token',
    headerName: 'x-csrf-token',
    cookieOptions: {
      httpOnly: true,
      secure: getNodeEnv() === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    },
  });

  /**
   * Sets the CSRF token cookie on every request when CSRF is enabled.
   * This ensures the client has a token to submit on mutations.
   */
  const setToken: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    const authSettings = req.api?.authSettings;

    // Only set CSRF cookie when both cookie auth AND CSRF are enabled
    if (!authSettings?.enableCookieAuth || !authSettings?.requireCsrfForAuth) {
      return next();
    }

    csrf.setToken(req as any, res as any, next);
  };

  /**
   * Validates the CSRF token on mutations when the request is cookie-authenticated.
   * Skips validation for Bearer-authenticated or anonymous requests.
   */
  const protect: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    const authSettings = req.api?.authSettings;

    // Skip if cookie auth or CSRF is not enabled
    if (!authSettings?.enableCookieAuth || !authSettings?.requireCsrfForAuth) {
      return next();
    }

    // Only enforce CSRF for cookie-authenticated requests.
    // Bearer token requests are immune to CSRF by design.
    if (req.tokenSource !== 'cookie') {
      return next();
    }

    log.debug('[csrf] Enforcing CSRF protection for cookie-authenticated request');
    csrf.protect(req as any, res as any, next);
  };

  /**
   * Error handler that converts CSRF errors into GraphQL-style error responses.
   * Must be registered as Express error-handling middleware (4 args).
   */
  const errorHandler = (err: Error, _req: Request, res: Response, next: NextFunction): void => {
    csrfErrorHandler(err, _req, res as any, next);
  };

  return { setToken, protect, errorHandler };
};
