import { getNodeEnv } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import { PgpmOptions } from '@pgpmjs/types';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { getPgPool } from 'pg-cache';
import pgQueryContext from 'pg-query-context';
import './types'; // for Request type
import type { ConstructiveAPIToken } from './types';

const log = new Logger('auth');
const isDev = () => getNodeEnv() === 'development';

/** Default cookie name for session tokens. */
const SESSION_COOKIE_NAME = 'constructive_session';

/** Cookie name for trusted device tracking. */
const DEVICE_TOKEN_COOKIE_NAME = 'constructive_device_token';

/**
 * Platform-level authentication function used for API surfaces that do not
 * declare an RLS module (meta-schema routes, provisioning endpoints, ...).
 */
const PLATFORM_AUTH_SCHEMA = 'constructive_auth_private';
const PLATFORM_AUTH_FUNCTION = 'authenticate';

/**
 * Extract a named cookie value from the raw Cookie header.
 * Avoids pulling in cookie-parser as a dependency.
 */
const parseCookieToken = (req: Request, cookieName: string): string | undefined => {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const match = header.split(';').find((c) => c.trim().startsWith(`${cookieName}=`));
  return match ? decodeURIComponent(match.split('=')[1].trim()) : undefined;
};

/** Build the JWT claim context propagated to the authentication function. */
const buildAuthContext = (req: Request): Record<string, any> => {
  const context: Record<string, any> = {
    'jwt.claims.ip_address': req.clientIp
  };
  if (req.get('origin')) {
    context['jwt.claims.origin'] = req.get('origin');
  }
  if (req.get('User-Agent')) {
    context['jwt.claims.user_agent'] = req.get('User-Agent');
  }
  return context;
};

/** Resolve the request credential: Bearer header first, session cookie second. */
export const resolveCredential = (
  req: Request
): { token?: string; source: 'bearer' | 'cookie' | 'none' } => {
  const { authorization = '' } = req.headers;
  const [authType, authToken] = authorization.split(' ');
  if (authType?.toLowerCase() === 'bearer' && authToken) {
    return { token: authToken, source: 'bearer' };
  }
  const cookieToken = parseCookieToken(req, SESSION_COOKIE_NAME);
  if (cookieToken) return { token: cookieToken, source: 'cookie' };
  return { source: 'none' };
};

/**
 * Authenticate a request hitting a route without an RLS module.
 *
 * These routes still need `jwt.claims.principal_id` (and the rest of the token
 * claims) to be populated, so the credential is resolved against the platform
 * authentication function when it exists. Failures are non-fatal: the request
 * simply proceeds anonymously.
 */
export const authenticatePlatform = async (
  req: Request,
  pool: any
): Promise<ConstructiveAPIToken | undefined> => {
  const { token: credential, source } = resolveCredential(req);
  if (!credential) return undefined;

  try {
    const exists = await pool.query(
      `SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = $1 AND p.proname = $2
        LIMIT 1`,
      [PLATFORM_AUTH_SCHEMA, PLATFORM_AUTH_FUNCTION]
    );
    if (!exists?.rowCount) {
      log.info('[auth] No platform authenticate function available');
      return undefined;
    }

    const result = await pgQueryContext({
      client: pool,
      context: buildAuthContext(req),
      query: `SELECT * FROM "${PLATFORM_AUTH_SCHEMA}"."${PLATFORM_AUTH_FUNCTION}"($1)`,
      variables: [credential]
    });

    if (!result?.rowCount) {
      log.info('[auth] Platform auth returned no rows');
      return undefined;
    }

    log.info(`[auth] Platform auth success via ${source}`);
    return result.rows[0];
  } catch (e: any) {
    log.warn(`[auth] Platform auth failed: ${e.message}`);
    return undefined;
  }
};

export const createAuthenticateMiddleware = (
  opts: PgpmOptions
): RequestHandler => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const api = req.api;
    log.info(`[auth] middleware called, api=${api ? 'present' : 'missing'}`);
    if (!api) {
      res.status(500).send('Missing API info');
      return;
    }

    const pool = getPgPool({
      ...opts.pg,
      database: api.dbname,
    });
    const rlsModule = api.rlsModule;

    log.info(
      `[auth] rlsModule=${rlsModule ? 'present' : 'missing'}, ` +
        `authenticate=${rlsModule?.authenticate ?? 'none'}, ` +
        `authenticateStrict=${rlsModule?.authenticateStrict ?? 'none'}, ` +
        `privateSchema=${rlsModule?.privateSchema?.schemaName ?? 'none'}`
    );

    if (!rlsModule) {
      // No RLS module, but the token claims (notably principal_id) must still
      // be populated when a credential is present.
      log.info('[auth] No RLS module configured, attempting platform auth');
      const platformToken = await authenticatePlatform(req, pool);
      if (platformToken) {
        req.token = platformToken;
      }
      const noRlsDeviceToken = parseCookieToken(req, DEVICE_TOKEN_COOKIE_NAME);
      if (noRlsDeviceToken) {
        req.deviceToken = noRlsDeviceToken;
      }
      return next();
    }

    const authFn = opts.server?.strictAuth
      ? rlsModule.authenticateStrict
      : rlsModule.authenticate;

    log.info(
      `[auth] strictAuth=${opts.server?.strictAuth ?? false}, authFn=${authFn ?? 'none'}`
    );

    if (authFn && rlsModule.privateSchema.schemaName) {
      let token: any = {};

      const { token: effectiveToken, source: tokenSource } = resolveCredential(req);

      if (effectiveToken) {
        log.info(`[auth] Processing ${tokenSource} authentication`);
        const context = buildAuthContext(req);

        const authQuery = `SELECT * FROM "${rlsModule.privateSchema.schemaName}"."${authFn}"($1)`;
        log.info(`[auth] Executing auth query: ${authQuery}`);

        try {
          const result = await pgQueryContext({
            client: pool,
            context,
            query: authQuery,
            variables: [effectiveToken],
          });

          log.info(`[auth] Query result: rowCount=${result?.rowCount}`);

          if (result?.rowCount === 0) {
            log.info('[auth] No rows returned, returning UNAUTHENTICATED');
            res.status(200).json({
              errors: [{ extensions: { code: 'UNAUTHENTICATED' } }],
            });
            return;
          }

          token = result.rows[0];
          log.info(`[auth] Auth success: role=${token.role}, user_id=${token.user_id}`);
        } catch (e: any) {
          log.error('[auth] Auth error:', e.message);
          res.status(200).json({
            errors: [
              {
                extensions: {
                  code: 'BAD_TOKEN_DEFINITION',
                  message: e.message,
                },
              },
            ],
          });
          return;
        }
      } else {
        log.info('[auth] No credential provided (no bearer token or session cookie), using anonymous auth');
      }

      req.token = token;
    } else {
      log.info(
        `[auth] Skipping auth: authFn=${authFn ?? 'none'}, ` +
          `privateSchema=${rlsModule.privateSchema?.schemaName ?? 'none'}`
      );
    }

    // Read device token cookie for trusted device tracking
    const deviceToken = parseCookieToken(req, DEVICE_TOKEN_COOKIE_NAME);
    if (deviceToken) {
      req.deviceToken = deviceToken;
      log.info('[auth] Device token cookie present');
    }

    next();
  };
};
