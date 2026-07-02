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

import { Router, Request, Response } from 'express';
import {
  OAuthClient,
  OAuthProfile,
  createSignedState,
  verifySignedState,
} from '@constructive-io/oauth';
import { Logger } from '@pgpmjs/logger';
import { getNodeEnv, getEnvVars } from '@pgpmjs/env';
import { QuoteUtils } from '@pgsql/quotes';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import type {
  AuthSettings,
  ConnectedAccountsModuleConfig,
  ConstructiveContext,
  IdentityProvidersConfig,
  IdentityProviderFullConfig,
  UserAuthModuleConfig,
} from '@constructive-io/express-context';

import {
  DEVICE_TOKEN_COOKIE_NAME,
  getSessionCookieConfig,
  getDeviceTokenCookieConfig,
  setSessionCookie,
  setDeviceTokenCookie,
  parseCookieValue,
} from './cookie';
import { pgIntervalToMilliseconds } from '../utils/pg-interval';

const log = new Logger('oauth');

const OAUTH_STATE_COOKIE = 'oauth_state';
const DEFAULT_OAUTH_STATE_MAX_AGE = 10 * 60 * 1000; // 10 minutes
const DEFAULT_ERROR_REDIRECT_PATH = '/auth/error';

interface OAuthStatePayload {
  redirect_uri: string;
  provider: string;
}

interface OAuthEnvConfig {
  oauth?: {
    secret?: string;
  };
}

function getStateSecret(): string | undefined {
  return (getEnvVars() as OAuthEnvConfig).oauth?.secret;
}

function requireStateSecret(): string {
  const secret = getStateSecret();
  if (!secret) {
    throw new Error('OAUTH_SECRET environment variable is required');
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
  ctx: ConstructiveContext,
): Promise<OAuthModules | null> {
  const [
    identityProviders,
    userAuthModule,
    authSettings,
    connectedAccountsModule,
  ] = await Promise.all([
    ctx.useModule('identityProviders'),
    ctx.useModule('userAuthModule'),
    ctx.useModule('authSettings'),
    ctx.useModule('connectedAccountsModule'),
  ]);

  if (!identityProviders || !userAuthModule) {
    return null;
  }

  return {
    identityProviders,
    userAuthModule,
    authSettings,
    connectedAccountsModule,
  };
}

// =============================================================================
// OAuth Client Factory
// =============================================================================

function createOAuthClientForProvider(
  providerConfig: IdentityProviderFullConfig,
  baseUrl: string,
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
        pkceEnabled: providerConfig.pkceEnabled,
      },
    },
    baseUrl,
    callbackPath: '/auth/{provider}/callback',
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
  return `${protocol}://${host}`;
}

function normalizeRedirectUri(
  redirectUri: string | undefined,
  baseUrl: string,
): string | null {
  const requestedRedirectUri = redirectUri || '/';

  try {
    const url = new URL(requestedRedirectUri, baseUrl);
    if (url.origin !== new URL(baseUrl).origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/**
 * Check if the user's email is verified by the OAuth provider.
 */
function isEmailVerified(profile: OAuthProfile): boolean {
  return profile.emailVerified === true;
}

function redirectToError(
  res: Response,
  baseUrl: string,
  errorPath: string,
  error: string,
  provider: string,
  errorDescription?: string,
): void {
  const errorUrl = new URL(errorPath, baseUrl);
  errorUrl.searchParams.set('error', error);
  errorUrl.searchParams.set('provider', provider);
  if (errorDescription) {
    errorUrl.searchParams.set('error_description', errorDescription);
  }
  res.redirect(errorUrl.toString());
}

export function createOAuthRoutes(_opts: ConstructiveOptions): Router {
  const router = Router();
  const isProduction = getNodeEnv() === 'production';

  // GET /auth/providers - List available providers from database
  router.get('/providers', async (req: Request, res: Response) => {
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
      res.json({ providers: [] });
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
        'API_NOT_CONFIGURED',
        provider,
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
          'MODULES_NOT_CONFIGURED',
          provider,
        );
      }

      const { authSettings, identityProviders } = modules;
      const errorRedirectPath =
        authSettings?.oauthErrorRedirectPath || DEFAULT_ERROR_REDIRECT_PATH;

      const redirectUri = normalizeRedirectUri(requestedRedirectUri, baseUrl);
      if (!redirectUri) {
        log.warn(`[oauth] Rejected cross-origin redirect_uri for ${provider}`);
        return redirectToError(
          res,
          baseUrl,
          errorRedirectPath,
          'INVALID_REDIRECT_URI',
          provider,
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
          'PROVIDER_NOT_CONFIGURED',
          provider,
        );
      }

      const stateMaxAge =
        pgIntervalToMilliseconds(authSettings?.oauthStateMaxAge) ??
        DEFAULT_OAUTH_STATE_MAX_AGE;
      const state = createSignedState(
        { redirect_uri: redirectUri, provider },
        {
          secret: requireStateSecret(),
          maxAgeMs: stateMaxAge,
        },
      );

      res.cookie(OAUTH_STATE_COOKIE, state, {
        httpOnly: authSettings?.cookieHttponly ?? true,
        secure: authSettings?.cookieSecure ?? isProduction,
        maxAge: stateMaxAge,
        sameSite: (authSettings?.cookieSamesite as 'lax' | 'strict' | 'none') ?? 'lax',
      });

      const client = createOAuthClientForProvider(providerConfig, baseUrl);
      const { url } = client.getAuthorizationUrl({ provider, state });
      log.info(`[oauth] Initiating OAuth flow for provider: ${provider}`);
      res.redirect(url);
    } catch (error) {
      log.error(`[oauth] Failed to initiate OAuth for ${provider}:`, error);
      redirectToError(
        res,
        baseUrl,
        DEFAULT_ERROR_REDIRECT_PATH,
        'OAUTH_INIT_FAILED',
        provider,
      );
    }
  });

  // GET /auth/:provider/callback - Handle OAuth callback
  router.get(
    '/:provider/callback',
    async (req: Request, res: Response) => {
      const { provider } = req.params;
      const {
        code,
        state,
        error: oauthError,
        error_description: errorDescription,
      } = req.query;
      const baseUrl = getBaseUrl(req);

      const storedState = parseCookieValue(req, OAUTH_STATE_COOKIE);
      res.clearCookie(OAUTH_STATE_COOKIE);

      // Handle OAuth provider errors
      if (oauthError) {
        log.warn(`[oauth] Provider ${provider} returned error: ${oauthError}`);
        return redirectToError(
          res,
          baseUrl,
          DEFAULT_ERROR_REDIRECT_PATH,
          oauthError as string,
          provider,
          errorDescription as string | undefined,
        );
      }

      // Verify state
      if (state !== storedState) {
        log.warn(`[oauth] State mismatch for ${provider}`);
        return redirectToError(
          res,
          baseUrl,
          DEFAULT_ERROR_REDIRECT_PATH,
          'INVALID_STATE',
          provider,
        );
      }

      const statePayload = verifySignedState<OAuthStatePayload>(
        storedState as string,
        { secret: getStateSecret() },
      );
      if (!statePayload) {
        log.warn(`[oauth] Invalid or expired state for ${provider}`);
        return redirectToError(
          res,
          baseUrl,
          DEFAULT_ERROR_REDIRECT_PATH,
          'INVALID_STATE',
          provider,
        );
      }

      const { redirect_uri: redirectUriFromState } = statePayload;
      const ctx = req.constructive;

      if (!ctx) {
        log.error(
          `[oauth] No constructive context for ${provider} callback`,
        );
        return redirectToError(
          res,
          baseUrl,
          DEFAULT_ERROR_REDIRECT_PATH,
          'API_NOT_CONFIGURED',
          provider,
        );
      }

      let modules: OAuthModules | null = null;
      try {
        modules = await resolveOAuthModules(ctx);
        if (!modules) {
          log.error(
            `[oauth] Required modules not provisioned for ${provider}`,
          );
          return redirectToError(
            res,
            baseUrl,
            DEFAULT_ERROR_REDIRECT_PATH,
            'MODULES_NOT_CONFIGURED',
            provider,
          );
        }

        const { authSettings, identityProviders } = modules;
        const errorRedirectPath =
          authSettings?.oauthErrorRedirectPath || DEFAULT_ERROR_REDIRECT_PATH;
        const requireVerifiedEmail =
          authSettings?.oauthRequireVerifiedEmail ?? true;

        const redirectUri = normalizeRedirectUri(redirectUriFromState, baseUrl);
        if (!redirectUri) {
          log.warn(`[oauth] Rejected cross-origin redirect_uri for ${provider}`);
          return redirectToError(
            res,
            baseUrl,
            errorRedirectPath,
            'INVALID_REDIRECT_URI',
            provider,
          );
        }

        // Get provider config from cached map
        const providerConfig = identityProviders.providers.get(provider);
        if (!providerConfig) {
          log.error(`[oauth] Provider ${provider} not found in database`);
          return redirectToError(
            res,
            baseUrl,
            errorRedirectPath,
            'PROVIDER_NOT_CONFIGURED',
            provider,
          );
        }

        const client = createOAuthClientForProvider(providerConfig, baseUrl);
        const profile = await client.handleCallback({
          provider,
          code: code as string,
        });
        log.info(`[oauth] Got profile for ${provider}: ${profile.email}`);

        const deviceToken =
          parseCookieValue(req, DEVICE_TOKEN_COOKIE_NAME) ?? null;

        const userAgent = req.get('user-agent') || '';
        const { connectedAccountsModule, userAuthModule } = modules;
        const authPrivateSchema = userAuthModule.schemaName;
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
            profile.providerId,
          ]);
          identityExists = checkResult.rowCount > 0;
          log.info(
            `[oauth] Identity check for ${profile.email}: ${identityExists ? 'exists' : 'new'}`,
          );
        }

        // If new identity, check email verification requirement before proceeding
        if (!identityExists && requireVerifiedEmail && !emailVerified) {
          throw new Error('EMAIL_NOT_VERIFIED');
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
              raw_userinfo: profile.raw,
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
                deviceToken,
              ]);
              return signInResult.rows[0] || {};
            } else {
              // Sign up new identity
              log.info(
                `[oauth] Creating new account for ${profile.email}`,
              );
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
                deviceToken,
              ]);
              return signUpResult.rows[0] || {};
            }
          },
          {
            'jwt.claims.user_agent': userAgent,
            'jwt.claims.origin': baseUrl,
          },
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

        const sessionConfig = getSessionCookieConfig(
          modules.authSettings,
          true,
        );
        setSessionCookie(res, result.access_token, sessionConfig);

        if (result.out_device_token) {
          const deviceConfig = getDeviceTokenCookieConfig(
            modules.authSettings,
          );
          setDeviceTokenCookie(res, result.out_device_token, deviceConfig);
        }

        log.info(`[oauth] OAuth success for ${profile.email}`);
        return res.redirect(redirectUri);
      } catch (error: any) {
        const fallbackPath =
          modules?.authSettings?.oauthErrorRedirectPath ||
          DEFAULT_ERROR_REDIRECT_PATH;

        // Handle specific error cases
        if (error.message === 'EMAIL_NOT_VERIFIED') {
          log.warn(
            `[oauth] Rejecting unverified email for signup: ${provider}`,
          );
          return redirectToError(
            res,
            baseUrl,
            fallbackPath,
            'EMAIL_NOT_VERIFIED',
            provider,
          );
        }

        log.error(`[oauth] Callback failed for ${provider}:`, error);
        redirectToError(res, baseUrl, fallbackPath, 'CALLBACK_FAILED', provider);
      }
    },
  );

  return router;
}
