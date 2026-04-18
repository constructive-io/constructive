import { Logger } from '@pgpmjs/logger';
import { createOAuthMiddleware } from '@constructive-io/oauth';
import type { OAuthProfile, OAuthCallbackContext } from '@constructive-io/oauth';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import type { Request, Response, Router } from 'express';
import { getPgPool } from 'pg-cache';
import pgQueryContext from 'pg-query-context';
import './types'; // for Request type

const log = new Logger('oauth');

/** Default cookie name for session tokens (matches cookie.ts / auth.ts). */
const SESSION_COOKIE_NAME = 'constructive_session';

/**
 * Read OAuth provider credentials from environment variables.
 * Returns only providers that have both client ID and secret configured.
 */
const getOAuthProvidersFromEnv = (): Record<string, { clientId: string; clientSecret: string }> => {
  const providers: Record<string, { clientId: string; clientSecret: string }> = {};

  const providerNames = ['google', 'github', 'facebook', 'linkedin'] as const;
  for (const name of providerNames) {
    const clientId = process.env[`OAUTH_${name.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`OAUTH_${name.toUpperCase()}_CLIENT_SECRET`];
    if (clientId && clientSecret) {
      providers[name] = { clientId, clientSecret };
    }
  }

  return providers;
};

/**
 * Call the private schema's sign_in_sso function to authenticate the user
 * after a successful OAuth callback.
 *
 * sign_in_sso(service, identifier, details, email, email_verified)
 * returns a session row with access_token, user_id, etc.
 */
const callSignInSso = async (
  opts: ConstructiveOptions,
  req: Request,
  profile: OAuthProfile,
  provider: string,
): Promise<{ access_token?: string; user_id?: string } | null> => {
  const api = req.api;
  if (!api?.rlsModule?.privateSchema?.schemaName) {
    log.error('[oauth] No private schema available for sign_in_sso');
    return null;
  }

  const pool = getPgPool({
    ...opts.pg,
    database: api.dbname,
  });

  const privateSchema = api.rlsModule.privateSchema.schemaName;
  const query = `SELECT * FROM "${privateSchema}"."sign_in_sso"($1, $2, $3, $4, $5)`;

  const context: Record<string, string> = {};
  if (req.clientIp) {
    context['jwt.claims.ip_address'] = req.clientIp;
  }
  const userAgent = req.get('User-Agent');
  if (userAgent) {
    context['jwt.claims.user_agent'] = userAgent;
  }

  try {
    const result = await pgQueryContext({
      client: pool,
      context,
      query,
      variables: [
        provider,                       // service
        profile.providerId,             // identifier (provider user ID)
        JSON.stringify(profile.raw),    // details (raw provider data as JSON)
        profile.email || null,          // email
        false,                          // email_verified (conservative default)
      ],
    });

    if (result?.rowCount === 0) {
      log.warn(`[oauth] sign_in_sso returned no rows for provider=${provider}`);
      return null;
    }

    return result.rows[0];
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    log.error(`[oauth] sign_in_sso error for provider=${provider}:`, message);
    return null;
  }
};

/**
 * Mount OAuth routes on the given Express router.
 *
 * Routes:
 *   GET  /auth/providers       — list available OAuth providers
 *   GET  /auth/:provider       — initiate OAuth flow (redirect to provider)
 *   GET  /auth/:provider/callback — handle OAuth callback
 *
 * The onSuccess callback calls sign_in_sso on the tenant DB and sets
 * the session cookie (when cookie auth is enabled).
 *
 * If no OAuth providers are configured via environment variables,
 * this function is a no-op (routes are not mounted).
 */
/**
 * Build cookie options from auth settings for the session cookie.
 */
const buildSessionCookieOptions = (req: Request): Record<string, unknown> => {
  const settings = req.api?.authSettings;
  const secure = settings?.cookieSecure ?? (process.env.NODE_ENV === 'production');
  const sameSite = (settings?.cookieSamesite ?? 'lax') as 'strict' | 'lax' | 'none';
  const httpOnly = settings?.cookieHttponly ?? true;
  const path = settings?.cookiePath ?? '/';
  const domain = settings?.cookieDomain ?? undefined;

  const opts: Record<string, unknown> = { httpOnly, secure, sameSite, path };
  if (domain) opts.domain = domain;
  return opts;
};

export const mountOAuthRoutes = (
  router: Router,
  opts: ConstructiveOptions,
): void => {
  const providers = getOAuthProvidersFromEnv();

  if (Object.keys(providers).length === 0) {
    log.info('[oauth] No OAuth providers configured, SSO routes not mounted');
    return;
  }

  const baseUrl = process.env.OAUTH_CALLBACK_BASE_URL || process.env.OAUTH_BASE_URL || '';
  if (!baseUrl) {
    log.warn('[oauth] OAUTH_CALLBACK_BASE_URL / OAUTH_BASE_URL not set, OAuth callbacks may fail');
  }

  const successRedirect = process.env.OAUTH_SUCCESS_REDIRECT;
  const errorRedirect = process.env.OAUTH_ERROR_REDIRECT;

  // We stash the request object so onSuccess can access it for the DB call
  // and cookie-setting. Express middleware runs synchronously before the
  // OAuth callback, so we use a WeakMap keyed on the query object.
  const requestMap = new WeakMap<object, Request>();

  const oauthMiddleware = createOAuthMiddleware({
    providers,
    baseUrl,
    successRedirect,
    errorRedirect,

    onSuccess: async (profile: OAuthProfile, context: OAuthCallbackContext) => {
      // Retrieve the original Express request from the WeakMap
      const req = requestMap.get(context.query as object);
      if (!req) {
        log.warn('[oauth] Could not retrieve request in onSuccess; skipping sign_in_sso');
        return { profile, provider: context.provider };
      }

      // Call sign_in_sso on the tenant database
      const ssoResult = await callSignInSso(opts, req, profile, context.provider);

      // If cookie auth is enabled and we got an access_token, set the session cookie
      if (ssoResult?.access_token && req.api?.authSettings?.enableCookieAuth) {
        const res = (req as any).res as Response | undefined;
        if (res && typeof res.cookie === 'function') {
          const cookieOpts = buildSessionCookieOptions(req);
          res.cookie(SESSION_COOKIE_NAME, ssoResult.access_token, cookieOpts);
          log.info(`[oauth] Set session cookie for provider=${context.provider}`);
        }
      }

      return ssoResult || { profile, provider: context.provider };
    },

    onError: (error: Error, context) => {
      log.error(`[oauth] Error for provider=${context.provider ?? 'unknown'}:`, error.message);
    },
  });

  // Callback handler that stashes the request before delegating to OAuth middleware
  router.get('/auth/:provider/callback', (req: Request, res: Response) => {
    requestMap.set(req.query as object, req);
    oauthMiddleware.handleCallback(req as any, res as any);
  });

  // Initiate OAuth flow
  router.get('/auth/:provider', (req: Request, res: Response) => {
    oauthMiddleware.initiateAuth(req as any, res as any);
  });

  // List available providers
  router.get('/auth/providers', (req: Request, res: Response) => {
    oauthMiddleware.getProviders(req, res);
  });

  log.info(`[oauth] SSO routes mounted for providers: ${Object.keys(providers).join(', ')}`);
};
