import { Logger } from '@pgpmjs/logger';
import type { GraphileConfig } from 'graphile-config';
import * as cookie from 'cookie';
import {
  AuthCookieSettings,
  buildCookieOptions,
  buildDeviceCookieOptions,
  SESSION_COOKIE_NAME,
  DEVICE_COOKIE_NAME,
} from '../middleware/cookie';

const log = new Logger('auth-cookie-plugin');

const AUTH_MUTATIONS = new Set([
  'signIn',
  'signUp',
  'signInSso',
  'signUpSso',
  'signInMagicLink',
  'signUpMagicLink',
  'signInEmailOtp',
  'signInSmsOtp',
  'signUpSms',
  'signInOneTimeToken',
  'signInCrossOrigin',
  'completeMfaChallenge',
  'refreshToken',
]);

const SIGN_OUT_MUTATIONS = new Set([
  'signOut',
  'revokeSession',
  'revokeAllSessions',
]);

function normalizeSameSite(
  sameSite: boolean | 'strict' | 'lax' | 'none' | undefined
): 'strict' | 'lax' | 'none' | undefined {
  if (sameSite === true) return 'strict';
  if (sameSite === false) return undefined;
  return sameSite;
}

function serializeCookie(
  name: string,
  value: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: boolean | 'strict' | 'lax' | 'none';
    domain?: string | null;
    path?: string;
    maxAge?: number;
    expires?: Date;
  }
): string {
  return cookie.serialize(name, value, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: normalizeSameSite(options.sameSite),
    domain: options.domain || undefined,
    path: options.path || '/',
    maxAge: options.maxAge ? Math.floor(options.maxAge / 1000) : undefined,
    expires: options.expires,
  });
}

function serializeClearCookie(
  name: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: boolean | 'strict' | 'lax' | 'none';
    domain?: string | null;
    path?: string;
  }
): string {
  return cookie.serialize(name, '', {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: normalizeSameSite(options.sameSite),
    domain: options.domain || undefined,
    path: options.path || '/',
    expires: new Date(0),
    maxAge: 0,
  });
}

function detectMutationName(query: string): string | null {
  // Match mutation with optional name and optional variable definitions
  // Examples:
  //   mutation { signUp(...) }
  //   mutation SignUp { signUp(...) }
  //   mutation SignUp($input: SignUpInput!) { signUp(...) }
  const mutationMatch = query.match(/mutation\s*(?:\w+\s*)?(?:\([^)]*\)\s*)?\{[\s\S]*?(\w+)\s*\(/);
  if (mutationMatch) {
    return mutationMatch[1];
  }
  return null;
}

const AuthCookiePlugin: GraphileConfig.Plugin = {
  name: 'AuthCookiePlugin',
  version: '1.0.0',

  grafserv: {
    middleware: {
      async processRequest(next, event) {
        const result = await next();

        // Handle both 'json' and 'buffer' result types
        if (!result || (result.type !== 'json' && result.type !== 'buffer')) {
          return result;
        }

        // Get the request body from requestDigest
        const bodyData = await event.requestDigest.getBody();
        if (bodyData.type !== 'json') {
          return result;
        }

        const body = bodyData.json as { query?: string; variables?: Record<string, unknown> };
        if (!body?.query) {
          return result;
        }

        const mutationName = detectMutationName(body.query);
        if (!mutationName) {
          return result;
        }

        const isAuthMutation = AUTH_MUTATIONS.has(mutationName);
        const isSignOutMutation = SIGN_OUT_MUTATIONS.has(mutationName);

        if (!isAuthMutation && !isSignOutMutation) {
          return result;
        }

        log.info(`Processing ${mutationName} mutation for cookie handling`);

        // Parse the JSON response (handle both json and buffer types)
        let data: Record<string, unknown>;
        if (result.type === 'json') {
          data = result.json as Record<string, unknown>;
        } else {
          // result.type === 'buffer'
          try {
            const bufferResult = result as { type: 'buffer'; buffer: Buffer; statusCode: number; headers: Record<string, string> };
            data = JSON.parse(bufferResult.buffer.toString('utf8'));
          } catch {
            log.warn('[auth-cookie-plugin] Failed to parse buffer as JSON');
            return result;
          }
        }
        const mutationData = data?.data as Record<string, unknown> | undefined;
        const mutationResult = mutationData?.[mutationName] as Record<string, unknown> | undefined;

        // Get auth settings from request context (expressv4)
        const requestContext = event.requestDigest.requestContext as {
          expressv4?: { req?: { api?: { authSettings?: AuthCookieSettings } } }
        };
        const authSettings = requestContext?.expressv4?.req?.api?.authSettings;

        const cookiesToSet: string[] = [];

        if (isAuthMutation && mutationResult) {
          const nestedResult = mutationResult.result as Record<string, unknown> | undefined;
          const accessToken = (
            mutationResult.accessToken ?? mutationResult.access_token ??
            nestedResult?.accessToken ?? nestedResult?.access_token
          ) as string | undefined;
          const deviceToken = (
            mutationResult.deviceToken ?? mutationResult.device_token ??
            nestedResult?.deviceToken ?? nestedResult?.device_token
          ) as string | undefined;

          if (accessToken) {
            const rememberMe = (body.variables?.input as Record<string, unknown>)?.rememberMe === true;
            const options = buildCookieOptions(authSettings, rememberMe);
            cookiesToSet.push(serializeCookie(SESSION_COOKIE_NAME, accessToken, options));
            log.info(`Set session cookie for ${mutationName}`);

            if (deviceToken) {
              const deviceOptions = buildDeviceCookieOptions(authSettings);
              cookiesToSet.push(serializeCookie(DEVICE_COOKIE_NAME, deviceToken, deviceOptions));
              log.info(`Set device cookie for ${mutationName}`);
            }
          }
        }

        if (isSignOutMutation) {
          const options = buildCookieOptions(authSettings);
          cookiesToSet.push(serializeClearCookie(SESSION_COOKIE_NAME, options));
          // Also clear device token on sign out
          const deviceOptions = buildDeviceCookieOptions(authSettings);
          cookiesToSet.push(serializeClearCookie(DEVICE_COOKIE_NAME, deviceOptions));
          log.info(`Cleared session and device cookies for ${mutationName}`);
        }

        // Add cookies to the result headers
        if (cookiesToSet.length > 0) {
          // Get existing cookies from grafserv result
          const grafservCookies = result.headers['set-cookie'];

          // Also get cookies set by Express middleware (e.g., CSRF token)
          const expressRes = (event.requestDigest.requestContext as {
            expressv4?: { res?: { getHeader?: (name: string) => string | string[] | undefined } }
          })?.expressv4?.res;
          const expressCookies = expressRes?.getHeader?.('set-cookie');

          // Merge all cookies into an array (each cookie becomes a separate Set-Cookie header)
          const allCookieParts: string[] = [];
          if (grafservCookies) {
            if (Array.isArray(grafservCookies)) {
              allCookieParts.push(...grafservCookies);
            } else {
              allCookieParts.push(String(grafservCookies));
            }
          }
          if (expressCookies) {
            if (Array.isArray(expressCookies)) {
              allCookieParts.push(...expressCookies);
            } else {
              allCookieParts.push(String(expressCookies));
            }
          }
          allCookieParts.push(...cookiesToSet);

          return {
            ...result,
            headers: {
              ...result.headers,
              // Use array for multiple Set-Cookie headers (Node.js HTTP supports this)
              'set-cookie': allCookieParts as unknown as string,
            },
          };
        }

        return result;
      },
    },
  },
};

/**
 * AuthCookiePreset - Wrap the plugin in a preset for proper graphile-config merging
 */
export const AuthCookiePreset: GraphileConfig.Preset = {
  plugins: [AuthCookiePlugin],
};
