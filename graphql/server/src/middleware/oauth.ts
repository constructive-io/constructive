/**
 * OAuth / SSO Middleware
 *
 * Express router for OAuth2/OIDC identity-based sign-in. Uses module loaders
 * from @constructive-io/express-context to discover schemas and config at
 * runtime rather than hardcoding assumptions about where tables live.
 *
 * Resolves per-database:
 *   - identityProviders  → schema where identity_providers table lives
 *   - userAuthModule     → schema + function names for sign_in_identity / sign_up_identity
 *   - authSettings       → cookie, captcha, and session config
 *   - connectedAccountsModule → schema for OAuth identity associations
 *
 * All DB queries run through `req.constructive.withPgClient()` which
 * applies pgSettings (role, claims, request_id) via SET LOCAL, replacing
 * the manual `set_config()` calls in the original implementation.
 */

import { ConstructiveError, errors } from '@constructive-io/errors';
import type {
  AuthSettings,
  ConnectedAccountsModuleConfig,
  ConstructiveContext,
  IdentityProviderFullConfig,
  IdentityProvidersConfig,
  UserAuthModuleConfig
} from '@constructive-io/express-context';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import {
  createSignedState,
  OAuthClient,
  OAuthProfile,
  verifySignedState
} from '@constructive-io/oauth';
import { getNodeEnv } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import { QuoteUtils } from '@pgsql/quotes';
import { Request, Response, Router } from 'express';

import { pgIntervalToMilliseconds } from '../utils/pg-interval';
import {
  DEVICE_TOKEN_COOKIE_NAME,
  getDeviceTokenCookieConfig,
  getSessionCookieConfig,
  parseCookieValue,
  setDeviceTokenCookie,
  setSessionCookie
} from './cookie';
import { resolveApiHost } from './routing';

const log = new Logger('oauth');

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_PKCE_COOKIE = 'oauth_pkce';
const OAUTH_COOKIE_PATH = '/auth';
const DEFAULT_OAUTH_STATE_MAX_AGE = 10 * 60 * 1000; // 10 minutes
const DEFAULT_ERROR_REDIRECT_PATH = '/auth/error';

interface OAuthStatePayload {
  redirect_uri: string;
  provider: string;
  database_id: string;
  api_id: string | null;
  origin: string;
  redirect_target_database_id: string;
  redirect_target_api_id: string | null;
  redirect_target_origin: string;
}

interface OAuthPkcePayload {
  state: string;
  provider: string;
  code_verifier: string;
}

function getStateSecret(opts: ConstructiveOptions): string | undefined {
  return opts.oauth?.stateSecret;
}

function requireStateSecret(opts: ConstructiveOptions): string {
  const secret = getStateSecret(opts);
  if (!secret) {
    throw new Error('OAuth state secret is missing from validated server options');
  }
  return secret;
}

// =============================================================================
// Module Resolution Helpers
// =============================================================================

interface OAuthModules {
  identityProviders: IdentityProvidersConfig;
  userAuthModule: UserAuthModuleConfig;
  authSettings: AuthSettings | undefined;
  connectedAccountsModule: ConnectedAccountsModuleConfig | undefined;
}

async function resolveOAuthModules(
  ctx: ConstructiveContext
): Promise<OAuthModules | null> {
  const [
    identityProviders,
    userAuthModule,
    authSettings,
    connectedAccountsModule
  ] = await Promise.all([
    ctx.useModule('identityProviders'),
    ctx.useModule('userAuthModule'),
    ctx.useModule('authSettings'),
    ctx.useModule('connectedAccountsModule')
  ]);

  if (!identityProviders || !userAuthModule) {
    return null;
  }

  return {
    identityProviders,
    userAuthModule,
    authSettings,
    connectedAccountsModule
  };
}

// =============================================================================
// OAuth Client Factory
// =============================================================================

function createOAuthClientForProvider(
  providerConfig: IdentityProviderFullConfig,
  baseUrl: string
): OAuthClient {
  return new OAuthClient({
    providers: {
      [providerConfig.slug]: {
        slug: providerConfig.slug,
        kind: providerConfig.kind,
        displayName: providerConfig.displayName,
        enabled: providerConfig.enabled,
        clientId: providerConfig.clientId,
        clientSecret: providerConfig.clientSecret,
        authorizationUrl: providerConfig.authorizationUrl,
        tokenUrl: providerConfig.tokenUrl,
        userinfoUrl: providerConfig.userinfoUrl,
        scopes: providerConfig.scopes,
        authorizationParams: providerConfig.authorizationParams,
        pkceEnabled: providerConfig.pkceEnabled
      }
    },
    baseUrl,
    callbackPath: '/auth/{provider}/callback'
  });
}

interface SignInIdentityResult {
  id?: string;
  user_id?: string;
  access_token?: string;
  access_token_expires_at?: string;
  is_verified?: boolean;
  totp_enabled?: boolean;
  mfa_required?: boolean;
  mfa_challenge_token?: string;
  out_device_token?: string;
}

// =============================================================================
// OAuth Routes
// =============================================================================

function getBaseUrl(req: Request): string {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  return new URL(`${protocol}://${host}`).origin;
}

interface OAuthRedirectTarget {
  uri: string;
  origin: string;
  databaseId: string;
  apiId: string | null;
}

async function resolveRedirectTarget(
  redirectUri: string | undefined,
  baseUrl: string,
  ctx: ConstructiveContext,
  opts: ConstructiveOptions,
  isProduction: boolean
): Promise<OAuthRedirectTarget | null> {
  const requestedRedirectUri = redirectUri?.trim() || '/';

  // WHATWG URL parsing treats //host/path as an authority-relative URL. Reject
  // it explicitly so a path-looking input cannot select another host.
  if (requestedRedirectUri.startsWith('//')) return null;

  try {
    const url = new URL(requestedRedirectUri, baseUrl);
    const authOrigin = new URL(baseUrl).origin;

    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.username ||
      url.password
    ) {
      return null;
    }

    if (!ctx.databaseId) return null;

    if (url.origin === authOrigin) {
      return {
        uri: `${url.pathname}${url.search}${url.hash}`,
        origin: authOrigin,
        databaseId: ctx.databaseId,
        apiId: ctx.api.apiId ?? null
      };
    }

    if (isProduction && url.protocol !== 'https:') return null;

    const targetApi = await resolveApiHost(opts, url.host);
    if (
      !targetApi?.databaseId ||
      !targetApi.apiId ||
      targetApi.databaseId !== ctx.databaseId
    ) {
      return null;
    }

    return {
      uri: url.toString(),
      origin: url.origin,
      databaseId: targetApi.databaseId,
      apiId: targetApi.apiId ?? null
    };
  } catch {
    return null;
  }
}

function redirectTargetMatchesState(
  target: OAuthRedirectTarget,
  state: OAuthStatePayload
): boolean {
  return (
    target.uri === state.redirect_uri &&
    target.databaseId === state.redirect_target_database_id &&
    target.apiId === state.redirect_target_api_id &&
    target.origin === state.redirect_target_origin
  );
}

/**
 * Check if the user's email is verified by the OAuth provider.
 */
function isEmailVerified(profile: OAuthProfile): boolean {
  return profile.emailVerified === true;
}

function redirectWithErrorCode(
  res: Response,
  baseUrl: string,
  errorPath: string,
  errorCode: string,
  provider: string,
  errorDescription?: string
): void {
  const errorUrl = new URL(errorPath, baseUrl);
  errorUrl.searchParams.set('error', errorCode);
  errorUrl.searchParams.set('provider', provider);
  if (errorDescription) {
    errorUrl.searchParams.set('error_description', errorDescription);
  }
  res.redirect(errorUrl.toString());
}

function redirectToError(
  res: Response,
  baseUrl: string,
  errorPath: string,
  error: ConstructiveError,
  provider: string
): void {
  redirectWithErrorCode(res, baseUrl, errorPath, error.code, provider);
}

function redirectToProviderError(
  res: Response,
  baseUrl: string,
  errorPath: string,
  providerErrorCode: string,
  provider: string,
  providerErrorDescription?: string
): void {
  redirectWithErrorCode(
    res,
    baseUrl,
    errorPath,
    providerErrorCode,
    provider,
    providerErrorDescription
  );
}

export function createOAuthRoutes(opts: ConstructiveOptions): Router {
  const router = Router();
  const isProduction = getNodeEnv() === 'production';

  // GET /auth/providers - List available providers from database
  router.get('/providers', async (req: Request, res: Response, next) => {
    const ctx = req.constructive;
    if (!ctx) {
      return res.json({ providers: [] });
    }

    try {
      const modules = await resolveOAuthModules(ctx);
      if (!modules) {
        return res.json({ providers: [] });
      }
      // Get all enabled provider slugs from the cached config map
      const providers = Array.from(modules.identityProviders.providers.keys());
      res.json({ providers });
    } catch (error) {
      log.error('[oauth] Failed to fetch providers:', error);
      next(errors.OAUTH_CONFIGURATION_ERROR());
    }
  });

  // GET /auth/error - Pass to next middleware stack for frontend to handle
  router.get('/error', (_req: Request, _res: Response, next) => {
    next('router');
  });

  // GET /auth/:provider - Initiate OAuth flow
  router.get('/:provider', async (req: Request, res: Response) => {
    const { provider } = req.params;
    const requestedRedirectUri =
      typeof req.query.redirect_uri === 'string'
        ? req.query.redirect_uri
        : undefined;
    const ctx = req.constructive;
    const baseUrl = getBaseUrl(req);

    if (!ctx) {
      log.error(`[oauth] No constructive context for ${provider} initiation`);
      return redirectToError(
        res,
        baseUrl,
        DEFAULT_ERROR_REDIRECT_PATH,
        errors.OAUTH_API_NOT_CONFIGURED(),
        provider
      );
    }

    try {
      const modules = await resolveOAuthModules(ctx);
      if (!modules) {
        log.error(`[oauth] Required modules not provisioned for ${provider}`);
        return redirectToError(
          res,
          baseUrl,
          DEFAULT_ERROR_REDIRECT_PATH,
          errors.OAUTH_MODULES_NOT_CONFIGURED(),
          provider
        );
      }

      const { authSettings, identityProviders } = modules;
      const errorRedirectPath =
        authSettings?.oauthErrorRedirectPath || DEFAULT_ERROR_REDIRECT_PATH;

      const redirectTarget = await resolveRedirectTarget(
        requestedRedirectUri,
        baseUrl,
        ctx,
        opts,
        isProduction
      );
      if (!redirectTarget) {
        log.warn(`[oauth] Rejected untrusted redirect_uri for ${provider}`);
        return redirectToError(
          res,
          baseUrl,
          errorRedirectPath,
          errors.OAUTH_INVALID_REDIRECT_URI(),
          provider
        );
      }

      // Get provider config from cached map
      const providerConfig = identityProviders.providers.get(provider);
      if (!providerConfig) {
        log.warn(`[oauth] Provider ${provider} not found or not configured`);
        return redirectToError(
          res,
          baseUrl,
          errorRedirectPath,
          errors.IDENTITY_PROVIDER_NOT_CONFIGURED(),
          provider
        );
      }

      const stateMaxAge =
        pgIntervalToMilliseconds(authSettings?.oauthStateMaxAge) ??
        DEFAULT_OAUTH_STATE_MAX_AGE;
      if (!ctx.databaseId) {
        log.error(`[oauth] Missing database scope for ${provider}`);
        return redirectToError(
          res,
          baseUrl,
          errorRedirectPath,
          errors.OAUTH_API_NOT_CONFIGURED(),
          provider
        );
      }
      const state = createSignedState(
        {
          redirect_uri: redirectTarget.uri,
          provider,
          database_id: ctx.databaseId,
          api_id: ctx.api.apiId ?? null,
          origin: baseUrl,
          redirect_target_database_id: redirectTarget.databaseId,
          redirect_target_api_id: redirectTarget.apiId,
          redirect_target_origin: redirectTarget.origin
        },
        {
          secret: requireStateSecret(opts),
          maxAgeMs: stateMaxAge
        }
      );

      const oauthCookieOptions = {
        httpOnly: true,
        secure: authSettings?.cookieSecure ?? isProduction,
        maxAge: stateMaxAge,
        sameSite:
          (authSettings?.cookieSamesite as 'lax' | 'strict' | 'none') ?? 'lax',
        path: OAUTH_COOKIE_PATH
      };

      res.cookie(OAUTH_STATE_COOKIE, state, oauthCookieOptions);

      const client = createOAuthClientForProvider(providerConfig, baseUrl);
      const { url, codeVerifier } = client.getAuthorizationUrl({
        provider,
        state
      });
      if (codeVerifier) {
        const pkceState = createSignedState<OAuthPkcePayload>(
          { state, provider, code_verifier: codeVerifier },
          {
            secret: requireStateSecret(opts),
            maxAgeMs: stateMaxAge
          }
        );
        res.cookie(OAUTH_PKCE_COOKIE, pkceState, oauthCookieOptions);
      }
      log.info(`[oauth] Initiating OAuth flow for provider: ${provider}`);
      res.redirect(url);
    } catch (error) {
      log.error(`[oauth] Failed to initiate OAuth for ${provider}:`, error);
      redirectToError(
        res,
        baseUrl,
        DEFAULT_ERROR_REDIRECT_PATH,
        errors.OAUTH_INIT_FAILED(),
        provider
      );
    }
  });

  // GET /auth/:provider/callback - Handle OAuth callback
  router.get('/:provider/callback', async (req: Request, res: Response) => {
    const { provider } = req.params;
    const {
      code,
      state,
      error: oauthError,
      error_description: errorDescription
    } = req.query;
    const baseUrl = getBaseUrl(req);

    const storedState = parseCookieValue(req, OAUTH_STATE_COOKIE);
    const storedPkce = parseCookieValue(req, OAUTH_PKCE_COOKIE);
    res.clearCookie(OAUTH_STATE_COOKIE, { path: OAUTH_COOKIE_PATH });
    res.clearCookie(OAUTH_PKCE_COOKIE, { path: OAUTH_COOKIE_PATH });

    // Handle OAuth provider errors
    if (oauthError) {
      log.warn(`[oauth] Provider ${provider} returned error: ${oauthError}`);
      return redirectToProviderError(
        res,
        baseUrl,
        DEFAULT_ERROR_REDIRECT_PATH,
        oauthError as string,
        provider,
        errorDescription as string | undefined
      );
    }

    // Verify state
    if (state !== storedState) {
      log.warn(`[oauth] State mismatch for ${provider}`);
      return redirectToError(
        res,
        baseUrl,
        DEFAULT_ERROR_REDIRECT_PATH,
        errors.OAUTH_INVALID_STATE(),
        provider
      );
    }

    const statePayload = verifySignedState<OAuthStatePayload>(
      storedState as string,
      { secret: getStateSecret(opts) }
    );
    if (!statePayload) {
      log.warn(`[oauth] Invalid or expired state for ${provider}`);
      return redirectToError(
        res,
        baseUrl,
        DEFAULT_ERROR_REDIRECT_PATH,
        errors.OAUTH_INVALID_STATE(),
        provider
      );
    }

    if (statePayload.provider !== provider || statePayload.origin !== baseUrl) {
      log.warn(`[oauth] State request scope mismatch for ${provider}`);
      return redirectToError(
        res,
        baseUrl,
        DEFAULT_ERROR_REDIRECT_PATH,
        errors.OAUTH_INVALID_STATE(),
        provider
      );
    }

    const { redirect_uri: redirectUriFromState } = statePayload;
    const ctx = req.constructive;

    if (!ctx) {
      log.error(`[oauth] No constructive context for ${provider} callback`);
      return redirectToError(
        res,
        baseUrl,
        DEFAULT_ERROR_REDIRECT_PATH,
        errors.OAUTH_API_NOT_CONFIGURED(),
        provider
      );
    }

    if (
      statePayload.database_id !== ctx.databaseId ||
      statePayload.api_id !== (ctx.api.apiId ?? null)
    ) {
      log.warn(`[oauth] State database/API scope mismatch for ${provider}`);
      return redirectToError(
        res,
        baseUrl,
        DEFAULT_ERROR_REDIRECT_PATH,
        errors.OAUTH_INVALID_STATE(),
        provider
      );
    }

    let modules: OAuthModules | null = null;
    try {
      modules = await resolveOAuthModules(ctx);
      if (!modules) {
        log.error(`[oauth] Required modules not provisioned for ${provider}`);
        return redirectToError(
          res,
          baseUrl,
          DEFAULT_ERROR_REDIRECT_PATH,
          errors.OAUTH_MODULES_NOT_CONFIGURED(),
          provider
        );
      }

      const { authSettings, identityProviders } = modules;
      const errorRedirectPath =
        authSettings?.oauthErrorRedirectPath || DEFAULT_ERROR_REDIRECT_PATH;
      const requireVerifiedEmail =
        authSettings?.oauthRequireVerifiedEmail ?? true;

      const redirectTarget = await resolveRedirectTarget(
        redirectUriFromState,
        baseUrl,
        ctx,
        opts,
        isProduction
      );
      if (
        !redirectTarget ||
        !redirectTargetMatchesState(redirectTarget, statePayload)
      ) {
        log.warn(`[oauth] Redirect target scope changed for ${provider}`);
        return redirectToError(
          res,
          baseUrl,
          errorRedirectPath,
          errors.OAUTH_INVALID_STATE(),
          provider
        );
      }
      const redirectUri = redirectTarget.uri;

      // Get provider config from cached map
      const providerConfig = identityProviders.providers.get(provider);
      if (!providerConfig) {
        log.error(`[oauth] Provider ${provider} not found in database`);
        return redirectToError(
          res,
          baseUrl,
          errorRedirectPath,
          errors.IDENTITY_PROVIDER_NOT_CONFIGURED(),
          provider
        );
      }

      let codeVerifier: string | undefined;
      if (providerConfig.pkceEnabled) {
        const pkcePayload = verifySignedState<OAuthPkcePayload>(storedPkce, {
          secret: getStateSecret(opts)
        });
        if (
          !pkcePayload ||
          pkcePayload.state !== storedState ||
          pkcePayload.provider !== provider ||
          !pkcePayload.code_verifier
        ) {
          log.warn(`[oauth] Invalid PKCE verifier state for ${provider}`);
          return redirectToError(
            res,
            baseUrl,
            errorRedirectPath,
            errors.OAUTH_INVALID_PKCE(),
            provider
          );
        }
        codeVerifier = pkcePayload.code_verifier;
      }

      const client = createOAuthClientForProvider(providerConfig, baseUrl);
      const profile = await client.handleCallback({
        provider,
        code: code as string,
        codeVerifier
      });
      log.info(`[oauth] Got profile for ${provider}: ${profile.email}`);

      const deviceToken =
        parseCookieValue(req, DEVICE_TOKEN_COOKIE_NAME) ?? null;

      const userAgent = req.get('user-agent') || '';
      const { connectedAccountsModule, userAuthModule } = modules;
      const authPrivateSchema = userAuthModule.identityFunctionSchemaName;
      const signInFn = userAuthModule.signInIdentityFunction;
      const signUpFn = userAuthModule.signUpIdentityFunction;
      const emailVerified = isEmailVerified(profile);

      // Check if identity already exists via connectedAccounts loader
      // This determines whether to sign_in or sign_up, avoiding SAVEPOINT/rollback
      let identityExists = false;
      if (connectedAccountsModule) {
        const checkSql = `
            SELECT 1 FROM ${QuoteUtils.quoteQualifiedIdentifier(connectedAccountsModule.privateSchemaName, connectedAccountsModule.tableName)}
            WHERE service = $1 AND identifier = $2
            LIMIT 1
          `;
        // Intentional RLS bypass: pre-auth lookup for anonymous user who cannot query
        // connected_accounts via RLS. Only checks existence by service+identifier.
        const checkResult = await ctx.pool.query(checkSql, [
          profile.provider,
          profile.providerId
        ]);
        identityExists = checkResult.rowCount > 0;
        log.info(
          `[oauth] Identity check for ${profile.email}: ${identityExists ? 'exists' : 'new'}`
        );
      }

      // If new identity, check email verification requirement before proceeding
      if (!identityExists && requireVerifiedEmail && !emailVerified) {
        throw errors.EMAIL_NOT_VERIFIED();
      }

      const result = await ctx.withPgClient<SignInIdentityResult>(
        async (client) => {
          const details = {
            provider: profile.provider,
            sub: profile.providerId,
            email: profile.email,
            email_verified: emailVerified,
            name: profile.name,
            picture: profile.picture,
            raw_userinfo: profile.raw
          };

          if (identityExists) {
            // Sign in existing identity
            const signInSql = `
                SELECT * FROM ${QuoteUtils.quoteQualifiedIdentifier(authPrivateSchema, signInFn)}(
                  $1::text, $2::text, $3::jsonb, $4::text, 'access_token'::text, $5::boolean, $6::text
                )
              `;
            const signInResult = await client.query(signInSql, [
              profile.provider,
              profile.providerId,
              JSON.stringify(details),
              profile.email,
              true,
              deviceToken
            ]);
            return signInResult.rows[0] || {};
          } else {
            // Sign up new identity
            log.info(`[oauth] Creating new account for ${profile.email}`);
            const signUpSql = `
                SELECT * FROM ${QuoteUtils.quoteQualifiedIdentifier(authPrivateSchema, signUpFn)}(
                  $1::text, $2::text, $3::text, $4::jsonb, 'access_token'::text, $5::boolean, $6::text
                )
              `;
            const signUpResult = await client.query(signUpSql, [
              profile.provider,
              profile.providerId,
              profile.email,
              JSON.stringify(details),
              true,
              deviceToken
            ]);
            return signUpResult.rows[0] || {};
          }
        },
        {
          'jwt.claims.user_agent': userAgent,
          'jwt.claims.origin': baseUrl
        }
      );

      // Handle MFA required
      if (result.mfa_required && result.mfa_challenge_token) {
        log.info(`[oauth] MFA required for ${profile.email}`);
        const mfaUrl = new URL('/auth/mfa', baseUrl);
        mfaUrl.searchParams.set('token', result.mfa_challenge_token);
        mfaUrl.searchParams.set('redirect_uri', redirectUri);
        return res.redirect(mfaUrl.toString());
      }

      if (!result.access_token) {
        throw new Error('No access token returned from sign_in_identity');
      }

      const sessionConfig = getSessionCookieConfig(modules.authSettings, true);
      setSessionCookie(res, result.access_token, sessionConfig);

      if (result.out_device_token) {
        const deviceConfig = getDeviceTokenCookieConfig(modules.authSettings);
        setDeviceTokenCookie(res, result.out_device_token, deviceConfig);
      }

      log.info(`[oauth] OAuth success for ${profile.email}`);
      return res.redirect(redirectUri);
    } catch (error: unknown) {
      const fallbackPath =
        modules?.authSettings?.oauthErrorRedirectPath ||
        DEFAULT_ERROR_REDIRECT_PATH;

      // Handle specific error cases
      if (
        error instanceof ConstructiveError &&
        error.code === 'EMAIL_NOT_VERIFIED'
      ) {
        log.warn(`[oauth] Rejecting unverified email for signup: ${provider}`);
        return redirectToError(
          res,
          baseUrl,
          fallbackPath,
          error,
          provider
        );
      }

      log.error(`[oauth] Callback failed for ${provider}:`, error);
      redirectToError(
        res,
        baseUrl,
        fallbackPath,
        errors.OAUTH_CALLBACK_FAILED(),
        provider
      );
    }
  });

  return router;
}
