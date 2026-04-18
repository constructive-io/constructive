import { Logger } from '@pgpmjs/logger';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AuthSettings } from '../types';
import './types'; // for Request type

const log = new Logger('cookie');

/** Default cookie name for session tokens (matches auth.ts). */
const SESSION_COOKIE_NAME = 'constructive_session';

/** Default cookie name for device tokens (long-lived trusted device). */
const DEVICE_COOKIE_NAME = 'constructive_device_token';

/**
 * GraphQL mutation names that return an access_token on success.
 * When cookie auth is enabled, the server sets an HttpOnly session cookie
 * from the access_token in the response payload.
 */
const AUTH_MUTATIONS_SIGN_IN = new Set([
  'signIn',
  'signUp',
  'signInSso',
  'signUpSso',
  'signInMagicLink',
  'signInEmailOtp',
  'signInSmsOtp',
  'signInOneTimeToken',
  'signInCrossOrigin',
  'completeMfaChallenge',
]);

/**
 * GraphQL mutation names that should clear the session cookie.
 */
const AUTH_MUTATIONS_SIGN_OUT = new Set([
  'signOut',
  'revokeSession',
]);

/**
 * Attempt to extract the GraphQL operation name from the request body.
 * Works for both JSON and already-parsed bodies.
 */
const getOperationName = (req: Request): string | undefined => {
  const body = (req as any).body;
  if (!body) return undefined;
  if (typeof body === 'object' && body.operationName) {
    return body.operationName;
  }
  return undefined;
};

/**
 * Build cookie options from AuthSettings.
 * Falls back to secure defaults when settings are missing.
 */
const buildCookieOptions = (
  settings: AuthSettings | undefined,
): Record<string, unknown> => {
  const secure = settings?.cookieSecure ?? (process.env.NODE_ENV === 'production');
  const sameSite = (settings?.cookieSamesite ?? 'lax') as 'strict' | 'lax' | 'none';
  const httpOnly = settings?.cookieHttponly ?? true;
  const path = settings?.cookiePath ?? '/';
  const domain = settings?.cookieDomain ?? undefined;

  const opts: Record<string, unknown> = {
    httpOnly,
    secure,
    sameSite,
    path,
  };
  if (domain) {
    opts.domain = domain;
  }

  // maxAge from settings is an interval string (e.g. "7 days").
  // Express cookie maxAge is in milliseconds. We parse common interval formats.
  const maxAgeStr = settings?.cookieMaxAge;
  if (maxAgeStr) {
    const ms = parseIntervalToMs(maxAgeStr);
    if (ms > 0) {
      opts.maxAge = ms;
    }
  }

  return opts;
};

/**
 * Parse a PostgreSQL interval string (e.g. "7 days", "24 hours", "30 minutes")
 * into milliseconds. Supports common auth-relevant durations.
 */
const parseIntervalToMs = (interval: string): number => {
  const normalized = interval.trim().toLowerCase();

  // Try numeric-only (assume seconds)
  const numOnly = Number(normalized);
  if (!isNaN(numOnly) && numOnly > 0) {
    return numOnly * 1000;
  }

  // Match patterns like "7 days", "24 hours", "30 minutes", "1 year"
  const match = normalized.match(/^(\d+)\s*(second|minute|hour|day|week|month|year)s?$/);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[unit] || 0);
};

/**
 * Extract the access_token from a GraphQL JSON response body.
 * Auth mutations return { data: { mutationName: { accessToken: "..." } } }
 * PostGraphile camelCases the output columns, so we look for accessToken.
 */
const extractAccessToken = (body: any, operationName: string): string | undefined => {
  if (!body?.data) return undefined;

  // The mutation result is nested under the camelCase mutation name
  const mutationResult = body.data[operationName];
  if (!mutationResult) return undefined;

  // PostGraphile wraps in { result: { ... } } for function mutations
  const result = mutationResult.result ?? mutationResult;

  // Look for access_token or accessToken in the result
  return result?.accessToken ?? result?.access_token ?? undefined;
};

/**
 * Extract device_id from a GraphQL JSON response body.
 * Sign-in mutations may return a device_id when device tracking is enabled.
 */
const extractDeviceId = (body: any, operationName: string): string | undefined => {
  if (!body?.data) return undefined;
  const mutationResult = body.data[operationName];
  if (!mutationResult) return undefined;
  const result = mutationResult.result ?? mutationResult;
  return result?.deviceId ?? result?.device_id ?? undefined;
};

/**
 * Creates the cookie lifecycle middleware.
 *
 * When `enable_cookie_auth` is true in app_auth_settings:
 * - On sign-in/sign-up mutations: intercepts the response and sets an HttpOnly
 *   session cookie from the returned access_token.
 * - On sign-out/revoke mutations: clears the session cookie.
 * - On sign-in with device tracking: sets a long-lived device token cookie.
 *
 * When `enable_cookie_auth` is false (default): this middleware is a no-op.
 * Bearer token authentication continues to work regardless of this setting.
 */
export const createCookieMiddleware = (): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authSettings = req.api?.authSettings;

    // Skip if cookie auth is not enabled
    if (!authSettings?.enableCookieAuth) {
      return next();
    }

    const opName = getOperationName(req);
    if (!opName) {
      return next();
    }

    // Sign-out: clear session cookie before passing through
    if (AUTH_MUTATIONS_SIGN_OUT.has(opName)) {
      const cookieOpts = buildCookieOptions(authSettings);
      res.clearCookie(SESSION_COOKIE_NAME, cookieOpts);
      log.info(`[cookie] Cleared session cookie for operation=${opName}`);
      return next();
    }

    // Sign-in: intercept the response to set session cookie
    if (AUTH_MUTATIONS_SIGN_IN.has(opName)) {
      // Monkey-patch res.json to intercept the GraphQL response
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        try {
          const accessToken = extractAccessToken(body, opName);
          if (accessToken) {
            const cookieOpts = buildCookieOptions(authSettings);
            res.cookie(SESSION_COOKIE_NAME, accessToken, cookieOpts);
            log.info(`[cookie] Set session cookie for operation=${opName}`);
          }

          // Also handle device token cookie
          const deviceId = extractDeviceId(body, opName);
          if (deviceId) {
            const deviceCookieOpts = buildCookieOptions(authSettings);
            // Device tokens are long-lived (90 days default)
            deviceCookieOpts.maxAge = 90 * 24 * 60 * 60 * 1000;
            res.cookie(DEVICE_COOKIE_NAME, deviceId, deviceCookieOpts);
            log.info(`[cookie] Set device token cookie for operation=${opName}`);
          }
        } catch (e: any) {
          log.error(`[cookie] Error processing response for ${opName}:`, e.message);
        }

        return originalJson(body);
      };
    }

    next();
  };
};
