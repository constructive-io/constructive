import { getNodeEnv } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import { PgpmOptions } from '@pgpmjs/types';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { LRUCache } from 'lru-cache';
import { getPgPool } from 'pg-cache';
import pgQueryContext from 'pg-query-context';
import './types'; // for Request type
import type { ConstructiveAPIToken } from './types';

const log = new Logger('auth');
const isDev = () => getNodeEnv() === 'development';

/**
 * Cookie name for session credentials.
 * This cookie contains the session credential secret.
 */
const SESSION_COOKIE_NAME = 'session';

/**
 * Auth settings loaded from the database.
 * Maps to the app_auth_settings table columns.
 */
interface AuthSettings {
  enableCookieAuth: boolean;
  requireCsrfForAuth: boolean;
  allowAnonymousSessions: boolean;
  allowMultipleSessions: boolean;
  defaultSessionDuration: string | null;
  rememberMeDuration: string | null;
  defaultCredentialDuration: string | null;
  defaultFingerprintMode: string | null;
  minPasswordLength: number | null;
  maxFailedLoginAttempts: number | null;
  lockoutDuration: string | null;
}

/**
 * Cache for auth settings per service key.
 * Settings are loaded once per database/API and cached.
 */
const ONE_HOUR_IN_MS = 1000 * 60 * 60;
const authSettingsCache = new LRUCache<string, AuthSettings>({
  max: 100,
  ttl: ONE_HOUR_IN_MS,
});

/**
 * Default auth settings used when query fails or settings don't exist.
 */
const DEFAULT_AUTH_SETTINGS: AuthSettings = {
  enableCookieAuth: false,
  requireCsrfForAuth: true,
  allowAnonymousSessions: false,
  allowMultipleSessions: true,
  defaultSessionDuration: null,
  rememberMeDuration: null,
  defaultCredentialDuration: null,
  defaultFingerprintMode: null,
  minPasswordLength: null,
  maxFailedLoginAttempts: null,
  lockoutDuration: null,
};

/**
 * Query auth settings from the database.
 * Uses the auth_settings() function from the RLS module's private schema.
 */
async function loadAuthSettings(
  pool: ReturnType<typeof getPgPool>,
  svcKey: string,
  privateSchemaName: string
): Promise<AuthSettings> {
  const cached = authSettingsCache.get(svcKey);
  if (cached) {
    if (isDev()) log.debug(`Auth settings cache hit for key=${svcKey}`);
    return cached;
  }

  if (isDev()) log.debug(`Auth settings cache miss for key=${svcKey}, querying database`);

  try {
    const result = await pool.query(
      `SELECT * FROM "${privateSchemaName}".auth_settings()`
    );

    const row = result.rows[0];
    if (!row) {
      if (isDev()) log.debug('Auth settings query returned no rows, using defaults');
      authSettingsCache.set(svcKey, DEFAULT_AUTH_SETTINGS);
      return DEFAULT_AUTH_SETTINGS;
    }

    const settings: AuthSettings = {
      enableCookieAuth: row.enable_cookie_auth ?? false,
      requireCsrfForAuth: row.require_csrf_for_auth ?? true,
      allowAnonymousSessions: row.allow_anonymous_sessions ?? false,
      allowMultipleSessions: row.allow_multiple_sessions ?? true,
      defaultSessionDuration: row.default_session_duration ?? null,
      rememberMeDuration: row.remember_me_duration ?? null,
      defaultCredentialDuration: row.default_credential_duration ?? null,
      defaultFingerprintMode: row.default_fingerprint_mode ?? null,
      minPasswordLength: row.min_password_length ?? null,
      maxFailedLoginAttempts: row.max_failed_login_attempts ?? null,
      lockoutDuration: row.lockout_duration ?? null,
    };

    authSettingsCache.set(svcKey, settings);
    if (isDev()) log.debug(`Auth settings loaded: enableCookieAuth=${settings.enableCookieAuth}, requireCsrfForAuth=${settings.requireCsrfForAuth}`);
    return settings;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (isDev()) log.debug(`Auth settings query failed (using defaults): ${message}`);
    authSettingsCache.set(svcKey, DEFAULT_AUTH_SETTINGS);
    return DEFAULT_AUTH_SETTINGS;
  }
}

/**
 * Clear the auth settings cache for a specific key or all keys.
 */
export function clearAuthSettingsCache(svcKey?: string): void {
  if (svcKey) {
    authSettingsCache.delete(svcKey);
  } else {
    authSettingsCache.clear();
  }
}

/**
 * Build the context object for pg-query-context.
 * All values must be strings.
 */
function buildContext(req: Request, extraContext?: Record<string, string>): Record<string, string> {
  const context: Record<string, string> = {};

  if (req.clientIp) {
    context['jwt.claims.ip_address'] = req.clientIp;
  }
  if (req.get('origin')) {
    context['jwt.claims.origin'] = req.get('origin')!;
  }
  if (req.get('User-Agent')) {
    context['jwt.claims.user_agent'] = req.get('User-Agent')!;
  }

  return { ...context, ...extraContext };
}

/**
 * Attempt to authenticate using a session cookie.
 * Returns the token if successful, null if no cookie or invalid.
 */
async function authenticateWithCookie(
  req: Request,
  pool: ReturnType<typeof getPgPool>,
  privateSchemaName: string,
  authFn: string
): Promise<{ token: ConstructiveAPIToken } | { error: string } | null> {
  const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
  if (!sessionCookie) {
    return null;
  }

  const context = buildContext(req, { 'jwt.claims.credential_kind': 'cookie' });

  try {
    const result = await pgQueryContext({
      client: pool,
      context,
      query: `SELECT * FROM "${privateSchemaName}"."${authFn}"($1)`,
      variables: [sessionCookie],
    });

    if (result?.rowCount === 0) {
      if (isDev()) log.debug('Cookie auth: no matching session found');
      return null;
    }

    const token = result.rows[0] as ConstructiveAPIToken;
    if (isDev()) log.debug(`Cookie auth success: role=${token.role}`);
    return { token };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    log.error('Cookie auth error:', message);
    return { error: message };
  }
}

/**
 * Attempt to authenticate using a Bearer token.
 * Returns the token if successful, null if no token or invalid.
 */
async function authenticateWithBearer(
  req: Request,
  pool: ReturnType<typeof getPgPool>,
  privateSchemaName: string,
  authFn: string
): Promise<{ token: ConstructiveAPIToken } | { error: string } | null> {
  const { authorization = '' } = req.headers;
  const [authType, authToken] = authorization.split(' ');

  if (authType?.toLowerCase() !== 'bearer' || !authToken) {
    return null;
  }

  const context = buildContext(req);

  try {
    const result = await pgQueryContext({
      client: pool,
      context,
      query: `SELECT * FROM "${privateSchemaName}"."${authFn}"($1)`,
      variables: [authToken],
    });

    if (result?.rowCount === 0) {
      return { error: 'UNAUTHENTICATED' };
    }

    const token = result.rows[0] as ConstructiveAPIToken;
    if (isDev()) log.debug(`Bearer auth success: role=${token.role}`);
    return { token };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    log.error('Bearer auth error:', message);
    return { error: message };
  }
}

export const createAuthenticateMiddleware = (
  opts: PgpmOptions
): RequestHandler => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const api = req.api;
    if (!api) {
      res.status(500).send('Missing API info');
      return;
    }

    const svcKey = req.svc_key;
    if (!svcKey) {
      res.status(500).send('Missing service cache key');
      return;
    }

    const pool = getPgPool({
      ...opts.pg,
      database: api.dbname,
    });
    const rlsModule = api.rlsModule;

    if (!rlsModule) {
      if (isDev()) log.debug('No RLS module configured, skipping auth');
      return next();
    }

    const authFn = opts.server.strictAuth
      ? rlsModule.authenticateStrict
      : rlsModule.authenticate;

    if (authFn && rlsModule.privateSchema.schemaName) {
      const privateSchemaName = rlsModule.privateSchema.schemaName;
      let token: ConstructiveAPIToken | undefined;

      // Load auth settings from database (cached per svc_key)
      const authSettings = await loadAuthSettings(pool, svcKey, privateSchemaName);

      // Try cookie auth first if enabled in database settings
      if (authSettings.enableCookieAuth) {
        const cookieResult = await authenticateWithCookie(
          req,
          pool,
          privateSchemaName,
          authFn
        );

        if (cookieResult && 'token' in cookieResult) {
          token = cookieResult.token;
          req.token = token;
          return next();
        }
        // If cookie auth returned an error (not null), we could optionally
        // return an error here, but for now we fall through to bearer auth
      }

      // Try bearer auth
      const bearerResult = await authenticateWithBearer(
        req,
        pool,
        privateSchemaName,
        authFn
      );

      if (bearerResult) {
        if ('error' in bearerResult) {
          if (bearerResult.error === 'UNAUTHENTICATED') {
            res.status(200).json({
              errors: [{ extensions: { code: 'UNAUTHENTICATED' } }],
            });
            return;
          }
          res.status(200).json({
            errors: [
              {
                extensions: {
                  code: 'BAD_TOKEN_DEFINITION',
                  message: bearerResult.error,
                },
              },
            ],
          });
          return;
        }
        token = bearerResult.token;
      }

      req.token = token;
    }

    next();
  };
};
