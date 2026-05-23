/**
 * OAuth / SSO Middleware
 *
 * Express router for OAuth2/OIDC identity-based sign-in. Uses module loaders
 * from @constructive-io/express-context to discover schemas and config at
 * runtime rather than hardcoding assumptions about where tables live.
 *
 * Resolves per-database:
 *   - identityProviders  → schema where identity_providers table lives
 *   - encryptedSecrets   → schema for decrypting client secrets
 *   - userAuth           → schema + function names for sign_in_identity / sign_up_identity
 *   - authSettings       → cookie, captcha, and session config
 *   - rlsModule          → private/public schema references
 *
 * All DB queries run through `req.constructive.withPgClient()` which
 * applies pgSettings (role, claims, request_id) via SET LOCAL, replacing
 * the manual `set_config()` calls in the original implementation.
 */

import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { OAuthClient, OAuthProfile } from '@constructive-io/oauth';
import { Logger } from '@pgpmjs/logger';
import { getNodeEnv } from '@pgpmjs/env';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import type {
  AuthSettings,
  ConstructiveContext,
  EncryptedSecretsConfig,
  IdentityProvidersConfig,
  UserAuthConfig,
} from '@constructive-io/express-context';

import {
  DEVICE_TOKEN_COOKIE_NAME,
  getSessionCookieConfig,
  getDeviceTokenCookieConfig,
  setSessionCookie,
  setDeviceTokenCookie,
  parseCookieValue,
} from './cookie';

const log = new Logger('oauth');

const OAUTH_STATE_COOKIE = 'oauth_state';
const DEFAULT_OAUTH_STATE_MAX_AGE = 10 * 60 * 1000; // 10 minutes
const DEFAULT_ERROR_REDIRECT_PATH = '/auth/error';

// =============================================================================
// Signed State Utilities
// =============================================================================

interface StatePayload {
  redirect_uri: string;
  provider: string;
  nonce: string;
  exp: number;
}

function getStateSecret(): string {
  const secret = process.env.OAUTH_SECRET;
  if (!secret) {
    throw new Error('OAUTH_SECRET environment variable is required');
  }
  return secret;
}

function createSignedState(
  payload: { redirect_uri: string; provider: string },
  maxAge: number,
): string {
  const data: StatePayload = {
    ...payload,
    nonce: crypto.randomBytes(16).toString('hex'),
    exp: Date.now() + maxAge,
  };
  const json = JSON.stringify(data);
  const sig = crypto
    .createHmac('sha256', getStateSecret())
    .update(json)
    .digest('base64url');
  return Buffer.from(json).toString('base64url') + '.' + sig;
}

function verifySignedState(state: string): StatePayload | null {
  try {
    const [payloadB64, sig] = state.split('.');
    if (!payloadB64 || !sig) return null;

    const json = Buffer.from(payloadB64, 'base64url').toString();
    const expectedSig = crypto
      .createHmac('sha256', getStateSecret())
      .update(json)
      .digest('base64url');

    if (
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
    ) {
      return null;
    }

    const data = JSON.parse(json) as StatePayload;
    if (data.exp < Date.now()) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

// =============================================================================
// Module Resolution Helpers
// =============================================================================

interface OAuthModules {
  identityProviders: IdentityProvidersConfig;
  encryptedSecrets: EncryptedSecretsConfig;
  userAuth: UserAuthConfig;
  authSettings: AuthSettings | undefined;
}

async function resolveOAuthModules(
  ctx: ConstructiveContext,
): Promise<OAuthModules | null> {
  const [identityProviders, encryptedSecrets, userAuth, authSettings] =
    await Promise.all([
      ctx.useModule('identityProviders'),
      ctx.useModule('encryptedSecrets'),
      ctx.useModule('userAuth'),
      ctx.useModule('authSettings'),
    ]);

  if (!identityProviders || !encryptedSecrets || !userAuth) {
    return null;
  }

  return { identityProviders, encryptedSecrets, userAuth, authSettings };
}

// =============================================================================
// Identity Provider Database Functions
// =============================================================================

interface IdentityProviderConfig {
  slug: string;
  kind: 'oauth2' | 'oidc';
  display_name: string;
  enabled: boolean;
  client_id: string;
  client_secret: string;
  authorization_url: string | null;
  token_url: string | null;
  userinfo_url: string | null;
  scopes: string[];
  pkce_enabled: boolean;
}

async function getEnabledProviders(
  ctx: ConstructiveContext,
  modules: OAuthModules,
): Promise<string[]> {
  const { privateSchemaName, tableName } = modules.identityProviders;
  const sql = `
    SELECT slug FROM "${privateSchemaName}"."${tableName}"
    WHERE enabled = true AND client_id IS NOT NULL AND client_secret_id IS NOT NULL
  `;
  const result = await ctx.pool.query(sql);
  return result.rows.map((row: { slug: string }) => row.slug);
}

async function getIdentityProvider(
  ctx: ConstructiveContext,
  modules: OAuthModules,
  providerSlug: string,
): Promise<IdentityProviderConfig | null> {
  const { privateSchemaName, tableName } = modules.identityProviders;
  const { schemaName: encryptedSchema } = modules.encryptedSecrets;

  const sql = `
    SELECT
      ip.slug,
      ip.kind,
      ip.display_name,
      ip.enabled,
      ip.client_id,
      "${encryptedSchema}".get(ip.client_secret_id, 'oauth_client_secret') as client_secret,
      ip.authorization_url,
      ip.token_url,
      ip.userinfo_url,
      ip.scopes,
      ip.pkce_enabled
    FROM "${privateSchemaName}"."${tableName}" ip
    WHERE ip.slug = $1 AND ip.enabled = true
  `;

  const result = await ctx.pool.query(sql, [providerSlug]);
  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  if (!row.client_id || !row.client_secret) {
    return null;
  }

  return {
    slug: row.slug,
    kind: row.kind,
    display_name: row.display_name,
    enabled: row.enabled,
    client_id: row.client_id,
    client_secret: row.client_secret,
    authorization_url: row.authorization_url,
    token_url: row.token_url,
    userinfo_url: row.userinfo_url,
    scopes: row.scopes || [],
    pkce_enabled: row.pkce_enabled ?? true,
  };
}

function createOAuthClientForProvider(
  providerConfig: IdentityProviderConfig,
  baseUrl: string,
): OAuthClient {
  return new OAuthClient({
    providers: {
      [providerConfig.slug]: {
        clientId: providerConfig.client_id,
        clientSecret: providerConfig.client_secret,
      },
    },
    baseUrl,
    callbackPath: '/auth/{provider}/callback',
  });
}

// =============================================================================
// Database Functions
// =============================================================================

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

async function generateCrossOriginToken(
  ctx: ConstructiveContext,
  modules: OAuthModules,
  accessToken: string,
): Promise<string> {
  const otToken = crypto.randomBytes(32).toString('base64url');
  const { schemaName } = modules.userAuth;

  const sql = `
    UPDATE "${schemaName}".session_credentials
    SET ot_token = $1
    WHERE secret_hash = digest($2::text, 'sha256')
    RETURNING id
  `;

  const result = await ctx.pool.query(sql, [otToken, accessToken]);
  if (result.rows.length === 0) {
    throw new Error('Failed to set cross-origin token');
  }

  return otToken;
}

// =============================================================================
// OAuth Routes
// =============================================================================

function getBaseUrl(req: Request): string {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  return `${protocol}://${host}`;
}

/**
 * Extract email_verified from the raw provider response.
 * OAuthProfile.raw contains the original provider data which includes
 * email_verified for OIDC providers (Google, etc.).
 */
function isEmailVerified(profile: OAuthProfile): boolean {
  const raw = profile.raw as Record<string, unknown> | null;
  if (!raw) return false;
  if (typeof raw.email_verified === 'boolean') return raw.email_verified;
  if (typeof raw.verified_email === 'boolean') return raw.verified_email;
  return false;
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
      const providers = await getEnabledProviders(ctx, modules);
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
    const redirectUri = (req.query.redirect_uri as string) || '/';
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

      const providerConfig = await getIdentityProvider(ctx, modules, provider);
      if (!providerConfig) {
        log.warn(`[oauth] Provider ${provider} not found or not configured`);
        return redirectToError(
          res,
          baseUrl,
          DEFAULT_ERROR_REDIRECT_PATH,
          'PROVIDER_NOT_CONFIGURED',
          provider,
        );
      }

      const stateMaxAge = DEFAULT_OAUTH_STATE_MAX_AGE;
      const state = createSignedState(
        { redirect_uri: redirectUri, provider },
        stateMaxAge,
      );

      res.cookie(OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        secure: isProduction,
        maxAge: stateMaxAge,
        sameSite: 'lax',
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

      const statePayload = verifySignedState(storedState as string);
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

      const { redirect_uri: redirectUri } = statePayload;
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

      try {
        const modules = await resolveOAuthModules(ctx);
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

        const providerConfig = await getIdentityProvider(
          ctx,
          modules,
          provider,
        );
        if (!providerConfig) {
          log.error(`[oauth] Provider ${provider} not found in database`);
          return redirectToError(
            res,
            baseUrl,
            DEFAULT_ERROR_REDIRECT_PATH,
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

        // Calculate target origin for cross-origin flow
        const currentOrigin = baseUrl;
        let targetOrigin: string;
        try {
          const redirectUrl = new URL(redirectUri, currentOrigin);
          targetOrigin = redirectUrl.origin;
        } catch {
          targetOrigin = currentOrigin;
        }

        const userAgent = req.get('user-agent') || '';
        const { userAuth } = modules;

        // Use withPgClient to run sign_in/sign_up within a properly scoped
        // RLS transaction. pgSettings (role, claims, request_id) are applied
        // automatically via SET LOCAL, replacing the manual set_config calls.
        const result = await ctx.withPgClient<SignInIdentityResult>(
          async (client) => {
            // Set OAuth-specific JWT claims on this transaction
            await client.query(
              `SELECT set_config('jwt.claims.user_agent', $1, true),
                      set_config('jwt.claims.origin', $2, true)`,
              [userAgent, targetOrigin],
            );

            const emailVerified = isEmailVerified(profile);
            const details = {
              provider: profile.provider,
              sub: profile.providerId,
              email: profile.email,
              email_verified: emailVerified,
              name: profile.name,
              picture: profile.picture,
              raw_userinfo: profile.raw,
            };

            // sign_in_identity lives in the userAuth schema, NOT assumed to
            // be in the RLS privateSchema.
            const signInSql = `
              SELECT * FROM "${userAuth.schemaName}".sign_in_identity(
                $1::text, $2::text, $3::jsonb, $4::text, 'access_token'::text, $5::boolean, $6::text
              )
            `;

            try {
              const signInResult = await client.query(signInSql, [
                profile.provider,
                profile.providerId,
                JSON.stringify(details),
                profile.email,
                true,
                deviceToken,
              ]);
              return signInResult.rows[0] || {};
            } catch (err: any) {
              const errorMessage = err.message || '';

              if (!errorMessage.includes('IDENTITY_ACCOUNT_NOT_FOUND')) {
                throw err;
              }

              log.info(
                `[oauth] Account not found for ${profile.email}, attempting signup`,
              );

              if (!emailVerified) {
                log.warn(
                  `[oauth] Rejecting unverified email for signup: ${profile.email}`,
                );
                return { _error: 'EMAIL_NOT_VERIFIED' } as any;
              }

              // sign_up_identity also lives in the userAuth schema
              const signUpSql = `
                SELECT * FROM "${userAuth.schemaName}".sign_up_identity(
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
        );

        // Handle error sentinels from within the transaction
        if ((result as any)._error === 'EMAIL_NOT_VERIFIED') {
          return redirectToError(
            res,
            baseUrl,
            DEFAULT_ERROR_REDIRECT_PATH,
            'EMAIL_NOT_VERIFIED',
            provider,
          );
        }

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

        const isCrossOrigin = targetOrigin !== currentOrigin;

        if (isCrossOrigin) {
          const otToken = await generateCrossOriginToken(
            ctx,
            modules,
            result.access_token,
          );
          const redirectUrl = new URL(redirectUri, currentOrigin);
          redirectUrl.searchParams.set('token', otToken);
          log.info(
            `[oauth] OAuth success for ${profile.email}, cross-origin redirect`,
          );
          return res.redirect(redirectUrl.toString());
        } else {
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

          log.info(
            `[oauth] OAuth success for ${profile.email}, same-origin redirect`,
          );
          return res.redirect(redirectUri);
        }
      } catch (error: any) {
        log.error(`[oauth] Callback failed for ${provider}:`, error);
        redirectToError(
          res,
          baseUrl,
          DEFAULT_ERROR_REDIRECT_PATH,
          'CALLBACK_FAILED',
          provider,
        );
      }
    },
  );

  return router;
}
