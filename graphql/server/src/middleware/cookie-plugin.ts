import { Logger } from '@pgpmjs/logger';
import { getNodeEnv } from '@pgpmjs/env';
import type { GraphileConfig } from 'graphile-config';
import type { Request } from 'express';
import type { AuthSettings } from '../types';

const log = new Logger('cookie-plugin');

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

// ---------------------------------------------------------------------------
// Cookie Helpers
// ---------------------------------------------------------------------------

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
 * Build cookie options from AuthSettings.
 * Falls back to secure defaults when settings are missing.
 */
const buildCookieOptions = (
  settings: AuthSettings | undefined,
): Record<string, unknown> => {
  const secure = settings?.cookieSecure ?? (getNodeEnv() === 'production');
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
  // Cookie maxAge is in milliseconds. We parse common interval formats.
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
 * Extract the access_token from a GraphQL JSON response body.
 * Auth mutations return { data: { mutationName: { accessToken: "..." } } }
 * PostGraphile camelCases the output columns, so we look for accessToken.
 */
const extractAccessToken = (body: Record<string, unknown>, operationName: string): string | undefined => {
  const data = body.data as Record<string, unknown> | undefined;
  if (!data) return undefined;

  const mutationResult = data[operationName] as Record<string, unknown> | undefined;
  if (!mutationResult) return undefined;

  // PostGraphile wraps in { result: { ... } } for function mutations
  const result = (mutationResult.result ?? mutationResult) as Record<string, unknown>;

  return (result.accessToken ?? result.access_token) as string | undefined;
};

/**
 * Extract device_id from a GraphQL JSON response body.
 * Sign-in mutations may return a device_id when device tracking is enabled.
 */
const extractDeviceId = (body: Record<string, unknown>, operationName: string): string | undefined => {
  const data = body.data as Record<string, unknown> | undefined;
  if (!data) return undefined;
  const mutationResult = data[operationName] as Record<string, unknown> | undefined;
  if (!mutationResult) return undefined;
  const result = (mutationResult.result ?? mutationResult) as Record<string, unknown>;
  return (result.deviceId ?? result.device_id) as string | undefined;
};

/**
 * Serialize a single Set-Cookie value from cookie options.
 */
const serializeCookie = (
  name: string,
  value: string,
  opts: Record<string, unknown>,
): string => {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (opts.maxAge != null) {
    const maxAge = Math.floor(Number(opts.maxAge) / 1000); // Cookie Max-Age is in seconds
    parts.push(`Max-Age=${maxAge}`);
  }
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) {
    const ss = String(opts.sameSite);
    parts.push(`SameSite=${ss.charAt(0).toUpperCase() + ss.slice(1)}`);
  }

  return parts.join('; ');
};

/**
 * Serialize a Set-Cookie header for clearing (expiring) a cookie.
 */
const serializeClearCookie = (
  name: string,
  opts: Record<string, unknown>,
): string => {
  const parts = [`${name}=`];
  parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  parts.push('Max-Age=0');
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) {
    const ss = String(opts.sameSite);
    parts.push(`SameSite=${ss.charAt(0).toUpperCase() + ss.slice(1)}`);
  }
  return parts.join('; ');
};

// ---------------------------------------------------------------------------
// grafserv processRequest Plugin
// ---------------------------------------------------------------------------

/**
 * grafserv plugin that injects Set-Cookie headers into GraphQL responses
 * for auth mutations when cookie auth is enabled.
 *
 * Uses the official `processRequest` middleware hook — no monkey-patching
 * of res.writeHead/res.end. The plugin wraps the entire request->result
 * pipeline and modifies the Result's headers before grafserv writes them
 * to the Node.js response.
 *
 * When `enable_cookie_auth` is false (default), this plugin is a no-op.
 * Bearer token authentication continues to work regardless of this setting.
 */
export const CookiePlugin: GraphileConfig.Plugin = {
  name: 'CookieLifecyclePlugin',
  version: '1.0.0',
  grafserv: {
    middleware: {
      processRequest(next, event) {
        return (async () => {
          const result = await next();
          if (!result) return result;

          // Access Express req from the grafserv request context
          const reqContext = event.requestDigest.requestContext as {
            expressv4?: { req?: Request };
          };
          const req = reqContext.expressv4?.req;
          if (!req) return result;

          const authSettings = req.api?.authSettings;

          // Skip if cookie auth is not enabled — complete no-op
          if (!authSettings?.enableCookieAuth) return result;

          const opName = (req as unknown as { body?: { operationName?: string } }).body?.operationName;
          if (!opName) return result;

          const isSignIn = AUTH_MUTATIONS_SIGN_IN.has(opName);
          const isSignOut = AUTH_MUTATIONS_SIGN_OUT.has(opName);
          if (!isSignIn && !isSignOut) return result;

          // Parse the response body from the result
          let body: Record<string, unknown> | undefined;
          try {
            if (result.type === 'json') {
              body = result.json as Record<string, unknown>;
            } else if (result.type === 'buffer') {
              body = JSON.parse(result.buffer.toString('utf8')) as Record<string, unknown>;
            }
          } catch {
            // Not valid JSON — skip cookie processing
          }
          if (!body) return result;

          const cookieHeaders: string[] = [];
          const cookieOpts = buildCookieOptions(authSettings);

          if (isSignOut) {
            cookieHeaders.push(serializeClearCookie(SESSION_COOKIE_NAME, cookieOpts));
            log.info(`[cookie] Cleared session cookie for operation=${opName}`);
          } else if (isSignIn) {
            const accessToken = extractAccessToken(body, opName);
            if (accessToken) {
              cookieHeaders.push(serializeCookie(SESSION_COOKIE_NAME, accessToken, cookieOpts));
              log.info(`[cookie] Set session cookie for operation=${opName}`);
            }

            const deviceId = extractDeviceId(body, opName);
            if (deviceId) {
              const deviceOpts = { ...cookieOpts, maxAge: 90 * 24 * 60 * 60 * 1000 };
              cookieHeaders.push(serializeCookie(DEVICE_COOKIE_NAME, deviceId, deviceOpts));
              log.info(`[cookie] Set device token cookie for operation=${opName}`);
            }
          }

          // Inject Set-Cookie headers into the result
          if (cookieHeaders.length > 0) {
            // Node.js writeHead accepts string[] for Set-Cookie.
            // grafserv types Result.headers as Record<string, string> but the
            // Node adapter passes them straight to writeHead which handles arrays.
            const headers = result.headers as Record<string, string | string[]>;
            const existing = headers['Set-Cookie'];
            if (Array.isArray(existing)) {
              headers['Set-Cookie'] = [...existing, ...cookieHeaders];
            } else if (typeof existing === 'string') {
              headers['Set-Cookie'] = [existing, ...cookieHeaders];
            } else {
              headers['Set-Cookie'] = cookieHeaders;
            }
          }

          return result;
        })();
      },
    },
  },
};
