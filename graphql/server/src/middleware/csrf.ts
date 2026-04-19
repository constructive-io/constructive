import crypto from 'node:crypto';
import { Logger } from '@pgpmjs/logger';
import type { NextFunction, Request, Response } from 'express';
import './types'; // for Request type

const log = new Logger('csrf');

/** Cookie name for the CSRF double-submit token. */
const CSRF_COOKIE_NAME = 'constructive_csrf';

/** Header the client must echo the CSRF token in on mutations. */
const CSRF_HEADER = 'x-csrf-token';

/**
 * HTTP methods that mutate state and therefore require CSRF validation.
 * GET and HEAD are safe methods — they never require a token.
 */
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Creates a CSRF double-submit-cookie protection middleware.
 *
 * When `enable_cookie_auth` is true in app_auth_settings, this middleware:
 *  1. Sets a CSRF token cookie on every response (setToken)
 *  2. Validates the X-CSRF-Token header matches the cookie on unsafe
 *     methods for cookie-authenticated requests (protect)
 *  3. Provides an error handler for CSRF validation failures (errorHandler)
 *
 * When `enable_cookie_auth` is false (default), all three middlewares are
 * complete no-ops — zero overhead, zero behavior change. The server works
 * exactly as it does today with bearer-only authentication.
 */
export const createCsrfProtectionMiddleware = () => {
  /**
   * Set the CSRF token cookie on every response.
   * Only active when cookie auth is enabled for this tenant.
   */
  const setToken = (req: Request, res: Response, next: NextFunction): void => {
    const authSettings = req.api?.authSettings;

    // No-op when cookie auth is disabled
    if (!authSettings?.enableCookieAuth) {
      return next();
    }

    // Generate a new CSRF token if the client doesn't already have one
    const existingToken = parseCookieValue(req.headers.cookie, CSRF_COOKIE_NAME);
    if (!existingToken) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false, // Client JS needs to read this and send it as a header
        secure: authSettings.cookieSecure ?? (process.env.NODE_ENV === 'production'),
        sameSite: (authSettings.cookieSamesite as 'strict' | 'lax' | 'none') ?? 'lax',
        path: authSettings.cookiePath ?? '/',
        ...(authSettings.cookieDomain ? { domain: authSettings.cookieDomain } : {}),
      });
      log.debug('[csrf] Set CSRF token cookie');
    }

    next();
  };

  /**
   * Validate the CSRF token on unsafe methods for cookie-authenticated requests.
   * Only active when cookie auth is enabled AND the request was authenticated via cookie.
   * Bearer-authenticated requests are exempt — they're not vulnerable to CSRF.
   */
  const protect = (req: Request, res: Response, next: NextFunction): void => {
    const authSettings = req.api?.authSettings;

    // No-op when cookie auth is disabled
    if (!authSettings?.enableCookieAuth) {
      return next();
    }

    // Only validate unsafe methods
    if (!UNSAFE_METHODS.has(req.method)) {
      return next();
    }

    // Only validate cookie-authenticated requests — bearer tokens are CSRF-safe
    if (req.tokenSource !== 'cookie') {
      return next();
    }

    // Skip CSRF if the tenant has explicitly opted out
    if (authSettings.requireCsrfForAuth === false) {
      return next();
    }

    const cookieToken = parseCookieValue(req.headers.cookie, CSRF_COOKIE_NAME);
    const headerToken = req.get(CSRF_HEADER);

    if (!cookieToken || !headerToken) {
      log.warn(`[csrf] Missing CSRF token: cookie=${!!cookieToken} header=${!!headerToken}`);
      res.status(200).json({
        errors: [{
          message: 'CSRF token required for cookie-authenticated mutations',
          extensions: { code: 'CSRF_TOKEN_REQUIRED' },
        }],
      });
      return;
    }

    if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
      log.warn('[csrf] CSRF token mismatch');
      res.status(200).json({
        errors: [{
          message: 'Invalid CSRF token',
          extensions: { code: 'INVALID_CSRF_TOKEN' },
        }],
      });
      return;
    }

    next();
  };

  /**
   * Error handler for CSRF validation failures.
   * Catches any CSRF errors that bubble up and returns a 403.
   */
  const errorHandler = (err: Error & { code?: string }, _req: Request, res: Response, next: NextFunction): void => {
    if (err.code === 'CSRF_TOKEN_REQUIRED' || err.code === 'INVALID_CSRF_TOKEN') {
      res.status(403).json({
        errors: [{
          message: err.message,
          extensions: { code: err.code },
        }],
      });
      return;
    }
    next(err);
  };

  return { setToken, protect, errorHandler };
};

/**
 * Extract a named cookie value from the raw Cookie header.
 * Avoids pulling in cookie-parser as a dependency for this one value.
 */
const parseCookieValue = (header: string | undefined, name: string): string | undefined => {
  if (!header) return undefined;
  const match = header.split(';').find((c) => c.trim().startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1].trim()) : undefined;
};
