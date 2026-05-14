import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { OAuthClient, OAuthProfile } from '@constructive-io/oauth';
import { Logger } from '@pgpmjs/logger';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';

import {
  DEVICE_TOKEN_COOKIE_NAME,
  getSessionCookieConfig,
  getDeviceTokenCookieConfig,
  setSessionCookie,
  setDeviceTokenCookie,
} from './cookie';

const log = new Logger('oauth');

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_MAX_AGE = 10 * 60 * 1000; // 10 minutes

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

function createSignedState(payload: { redirect_uri: string; provider: string }): string {
  const data: StatePayload = {
    ...payload,
    nonce: crypto.randomBytes(16).toString('hex'),
    exp: Date.now() + OAUTH_STATE_MAX_AGE,
  };
  const json = JSON.stringify(data);
  const sig = crypto.createHmac('sha256', getStateSecret()).update(json).digest('base64url');
  return Buffer.from(json).toString('base64url') + '.' + sig;
}

function verifySignedState(state: string): StatePayload | null {
  try {
    const [payloadB64, sig] = state.split('.');
    if (!payloadB64 || !sig) return null;

    const json = Buffer.from(payloadB64, 'base64url').toString();
    const expectedSig = crypto.createHmac('sha256', getStateSecret()).update(json).digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
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
// Identity Provider Database Functions
// =============================================================================

async function getEncryptedSecretsSchema(
  pool: Pool,
  privateSchema: string
): Promise<string | null> {
  const sql = `
    SELECT es.schema_name as encrypted_schema
    FROM metaschema_public.schema ps
    JOIN metaschema_modules_public.encrypted_secrets_module esm ON esm.database_id = ps.database_id
    JOIN metaschema_public.schema es ON es.id = esm.schema_id
    WHERE ps.schema_name = $1
    LIMIT 1
  `;
  const result = await pool.query(sql, [privateSchema]);
  return result.rows[0]?.encrypted_schema || null;
}

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
  pool: Pool,
  privateSchema: string
): Promise<string[]> {
  const sql = `
    SELECT slug FROM "${privateSchema}".identity_providers
    WHERE enabled = true AND client_id IS NOT NULL AND client_secret_id IS NOT NULL
  `;
  const result = await pool.query(sql);
  return result.rows.map((row: any) => row.slug);
}

async function getIdentityProvider(
  pool: Pool,
  privateSchema: string,
  encryptedSecretsSchema: string,
  providerSlug: string
): Promise<IdentityProviderConfig | null> {
  const sql = `
    SELECT
      ip.slug,
      ip.kind,
      ip.display_name,
      ip.enabled,
      ip.client_id,
      "${encryptedSecretsSchema}".get(ip.id, 'oauth_client_secret') as client_secret,
      ip.authorization_url,
      ip.token_url,
      ip.userinfo_url,
      ip.scopes,
      ip.pkce_enabled
    FROM "${privateSchema}".identity_providers ip
    WHERE ip.slug = $1 AND ip.enabled = true
  `;

  const result = await pool.query(sql, [providerSlug]);
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
  baseUrl: string
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
  pool: Pool,
  privateSchema: string,
  accessToken: string
): Promise<string> {
  const otToken = crypto.randomBytes(32).toString('base64url');

  const sql = `
    UPDATE "${privateSchema}".session_credentials
    SET ot_token = $1
    WHERE secret_hash = digest($2::text, 'sha256')
    RETURNING id
  `;

  const result = await pool.query(sql, [otToken, accessToken]);
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

export function createOAuthRoutes(opts: ConstructiveOptions): Router {
  const router = Router();
  const oauthConfig = opts.oauth;

  const errorRedirectPath = oauthConfig?.errorRedirectPath ?? '/auth/error';
  const allowSignup = oauthConfig?.allowSignup ?? true;
  const requireVerifiedEmail = oauthConfig?.requireVerifiedEmail ?? true;

  // Rate limiters for OAuth endpoints (disabled in development/test)
  const skipRateLimit = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

  const oauthInitLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute per IP
    skip: () => skipRateLimit,
    message: { error: 'TOO_MANY_REQUESTS', message: 'Too many OAuth requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const oauthCallbackLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute per IP
    skip: () => skipRateLimit,
    message: { error: 'TOO_MANY_REQUESTS', message: 'Too many OAuth callback requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // GET /auth/providers - List available providers from database
  router.get('/providers', async (req: Request, res: Response) => {
    if (!req.api?.rlsModule?.privateSchema?.schemaName) {
      return res.json({ providers: [] });
    }

    const privateSchema = req.api.rlsModule.privateSchema.schemaName;
    const dbname = req.api.dbname;

    try {
      const pool = getPgPool({ ...opts.pg, database: dbname });
      const providers = await getEnabledProviders(pool, privateSchema);
      res.json({ providers });
    } catch (error) {
      log.error('[oauth] Failed to fetch providers:', error);
      res.json({ providers: [] });
    }
  });

  // GET /auth/error - Error page (must be before /:provider to avoid conflict)
  // Pass to next middleware stack (outside this router) for frontend to handle
  router.get('/error', (req: Request, res: Response, next) => {
    next('router');
  });

  // GET /auth/:provider - Initiate OAuth flow
  router.get('/:provider', oauthInitLimiter, async (req: Request, res: Response) => {
    const { provider } = req.params;
    const redirectUri = (req.query.redirect_uri as string) || '/';

    // Check if API context is available
    if (!req.api?.rlsModule?.privateSchema?.schemaName) {
      log.error(`[oauth] No API context available for ${provider} initiation`);
      const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
      errorUrl.searchParams.set('error', 'API_NOT_CONFIGURED');
      errorUrl.searchParams.set('provider', provider);
      return res.redirect(errorUrl.toString());
    }

    const privateSchema = req.api.rlsModule.privateSchema.schemaName;
    const dbname = req.api.dbname;

    try {
      const pool = getPgPool({ ...opts.pg, database: dbname });

      // Look up encrypted secrets schema from metaschema
      const encryptedSchema = await getEncryptedSecretsSchema(pool, privateSchema);
      if (!encryptedSchema) {
        log.error(`[oauth] Could not resolve encrypted_secrets schema for ${privateSchema}`);
        const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
        errorUrl.searchParams.set('error', 'SCHEMA_NOT_CONFIGURED');
        errorUrl.searchParams.set('provider', provider);
        return res.redirect(errorUrl.toString());
      }

      const providerConfig = await getIdentityProvider(pool, privateSchema, encryptedSchema, provider);

      if (!providerConfig) {
        log.warn(`[oauth] Provider ${provider} not found or not configured`);
        const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
        errorUrl.searchParams.set('error', 'PROVIDER_NOT_CONFIGURED');
        errorUrl.searchParams.set('provider', provider);
        return res.redirect(errorUrl.toString());
      }

      const state = createSignedState({ redirect_uri: redirectUri, provider });

      res.cookie(OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: OAUTH_STATE_MAX_AGE,
        sameSite: 'lax',
      });

      const client = createOAuthClientForProvider(providerConfig, getBaseUrl(req));
      const { url } = client.getAuthorizationUrl({ provider, state });
      log.info(`[oauth] Initiating OAuth flow for provider: ${provider}`);
      res.redirect(url);
    } catch (error) {
      log.error(`[oauth] Failed to initiate OAuth for ${provider}:`, error);
      const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
      errorUrl.searchParams.set('error', 'OAUTH_INIT_FAILED');
      errorUrl.searchParams.set('provider', provider);
      res.redirect(errorUrl.toString());
    }
  });

  // GET /auth/:provider/callback - Handle OAuth callback
  router.get('/:provider/callback', oauthCallbackLimiter, async (req: Request, res: Response) => {
    const { provider } = req.params;
    const { code, state, error: oauthError, error_description } = req.query;

    const storedState = req.cookies[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE);

    // Handle OAuth provider errors
    if (oauthError) {
      log.warn(`[oauth] Provider ${provider} returned error: ${oauthError}`);
      const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
      errorUrl.searchParams.set('error', oauthError as string);
      if (error_description) {
        errorUrl.searchParams.set('error_description', error_description as string);
      }
      errorUrl.searchParams.set('provider', provider);
      return res.redirect(errorUrl.toString());
    }

    // Verify state
    if (state !== storedState) {
      log.warn(`[oauth] State mismatch for ${provider}`);
      const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
      errorUrl.searchParams.set('error', 'INVALID_STATE');
      errorUrl.searchParams.set('provider', provider);
      return res.redirect(errorUrl.toString());
    }

    const statePayload = verifySignedState(storedState);
    if (!statePayload) {
      log.warn(`[oauth] Invalid or expired state for ${provider}`);
      const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
      errorUrl.searchParams.set('error', 'INVALID_STATE');
      errorUrl.searchParams.set('provider', provider);
      return res.redirect(errorUrl.toString());
    }

    const { redirect_uri: redirectUri } = statePayload;

    // Check if API context is available
    if (!req.api?.rlsModule?.privateSchema?.schemaName) {
      log.error(`[oauth] No API context available for ${provider} callback`);
      const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
      errorUrl.searchParams.set('error', 'API_NOT_CONFIGURED');
      errorUrl.searchParams.set('provider', provider);
      return res.redirect(errorUrl.toString());
    }

    const privateSchema = req.api.rlsModule.privateSchema.schemaName;
    const dbname = req.api.dbname;
    const authSettings = req.api.authSettings;

    try {
      const pool = getPgPool({ ...opts.pg, database: dbname });

      // Look up encrypted secrets schema from metaschema
      const encryptedSchema = await getEncryptedSecretsSchema(pool, privateSchema);
      if (!encryptedSchema) {
        log.error(`[oauth] Could not resolve encrypted_secrets schema for ${privateSchema}`);
        const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
        errorUrl.searchParams.set('error', 'SCHEMA_NOT_CONFIGURED');
        errorUrl.searchParams.set('provider', provider);
        return res.redirect(errorUrl.toString());
      }

      // Get provider config from database
      const providerConfig = await getIdentityProvider(pool, privateSchema, encryptedSchema, provider);
      if (!providerConfig) {
        log.error(`[oauth] Provider ${provider} not found in database`);
        const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
        errorUrl.searchParams.set('error', 'PROVIDER_NOT_CONFIGURED');
        errorUrl.searchParams.set('provider', provider);
        return res.redirect(errorUrl.toString());
      }

      // Create OAuth client with provider config from database
      const client = createOAuthClientForProvider(providerConfig, getBaseUrl(req));

      // Exchange code for profile
      const profile = await client.handleCallback({ provider, code: code as string });
      log.info(`[oauth] Got profile for ${provider}: ${profile.email}`);

      // Get device token from cookie
      const deviceToken = req.cookies[DEVICE_TOKEN_COOKIE_NAME] ?? null;

      // Calculate target origin for cross-origin flow
      const currentOrigin = getBaseUrl(req);
      let targetOrigin: string;
      try {
        const redirectUrl = new URL(redirectUri, currentOrigin);
        targetOrigin = redirectUrl.origin;
      } catch {
        targetOrigin = currentOrigin;
      }

      // Use a dedicated database client to ensure JWT context is available for sign_in_identity
      // - user_agent: from browser request (same browser will call signInCrossOrigin)
      // - origin: target origin (where the token will be exchanged)
      const userAgent = req.get('user-agent') || '';
      const dbClient = await pool.connect();

      let result: SignInIdentityResult;

      try {
        // Set JWT context on this connection (false = session-level, persists across queries)
        await dbClient.query(`
          SELECT set_config('jwt.claims.user_agent', $1, false),
                 set_config('jwt.claims.origin', $2, false)
        `, [userAgent, targetOrigin]);

        // Try sign_in_identity first (using same client)
        const details = {
          provider: profile.provider,
          sub: profile.providerId,
          email: profile.email,
          email_verified: profile.emailVerified,
          name: profile.name,
          picture: profile.picture,
          raw_userinfo: profile.raw,
        };

        const signInSql = `
          SELECT * FROM "${privateSchema}".sign_in_identity(
            $1::text, $2::text, $3::jsonb, $4::text, 'access_token'::text, $5::text, $6::boolean
          )
        `;

        try {
          const signInResult = await dbClient.query(signInSql, [
            profile.provider,
            profile.providerId,
            JSON.stringify(details),
            profile.email,
            deviceToken,
            true,
          ]);

          result = signInResult.rows[0] || {};
        } catch (err: any) {
          const errorMessage = err.message || '';

          // Handle IDENTITY_ACCOUNT_NOT_FOUND - try signup
          if (!errorMessage.includes('IDENTITY_ACCOUNT_NOT_FOUND')) {
            throw err;
          }

          log.info(`[oauth] Account not found for ${profile.email}, attempting signup`);

          if (!allowSignup) {
            log.warn(`[oauth] Signup disabled, rejecting ${profile.email}`);
            const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
            errorUrl.searchParams.set('error', 'SIGNUP_DISABLED');
            errorUrl.searchParams.set('provider', provider);
            dbClient.release();
            return res.redirect(errorUrl.toString());
          }

          // Shadow attack defense: require verified email for auto-signup
          if (requireVerifiedEmail && !profile.emailVerified) {
            log.warn(`[oauth] Rejecting unverified email for signup: ${profile.email}`);
            const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
            errorUrl.searchParams.set('error', 'EMAIL_NOT_VERIFIED');
            errorUrl.searchParams.set('provider', provider);
            dbClient.release();
            return res.redirect(errorUrl.toString());
          }

          // Call sign_up_identity (using same client with JWT context)
          const signUpSql = `
            SELECT * FROM "${privateSchema}".sign_up_identity(
              $1::text, $2::text, $3::text, $4::jsonb, 'access_token'::text, $5::text, $6::boolean
            )
          `;

          const signUpResult = await dbClient.query(signUpSql, [
            profile.provider,
            profile.providerId,
            profile.email,
            JSON.stringify(details),
            deviceToken,
            true,
          ]);

          result = signUpResult.rows[0] || {};
        }
      } finally {
        dbClient.release();
      }

      // Handle MFA required
      if (result.mfa_required && result.mfa_challenge_token) {
        log.info(`[oauth] MFA required for ${profile.email}`);
        const mfaUrl = new URL('/auth/mfa', getBaseUrl(req));
        mfaUrl.searchParams.set('token', result.mfa_challenge_token);
        mfaUrl.searchParams.set('redirect_uri', redirectUri);
        return res.redirect(mfaUrl.toString());
      }

      // Success
      if (!result.access_token) {
        throw new Error('No access token returned from sign_in_identity');
      }

      // Determine if this is a cross-origin request
      // Cookie mode and Token mode are mutually exclusive (Better Auth design)
      const isCrossOrigin = targetOrigin !== currentOrigin;

      if (isCrossOrigin) {
        // Cross-origin: Token mode only
        // Generate one-time token for frontend to exchange via signInCrossOrigin
        // Frontend stores access_token in localStorage
        const otToken = await generateCrossOriginToken(pool, privateSchema, result.access_token);
        const redirectUrl = new URL(redirectUri, currentOrigin);
        redirectUrl.searchParams.set('token', otToken);
        log.info(`[oauth] OAuth success for ${profile.email}, cross-origin redirect with one-time token`);
        return res.redirect(redirectUrl.toString());
      } else {
        // Same-origin: Cookie mode only
        // Set httpOnly cookies, no token in URL
        const sessionConfig = getSessionCookieConfig(authSettings, true);
        setSessionCookie(res, result.access_token, sessionConfig);

        if (result.out_device_token) {
          const deviceConfig = getDeviceTokenCookieConfig(authSettings);
          setDeviceTokenCookie(res, result.out_device_token, deviceConfig);
        }

        log.info(`[oauth] OAuth success for ${profile.email}, same-origin redirect with cookie`);
        return res.redirect(redirectUri);
      }

    } catch (error: any) {
      log.error(`[oauth] Callback failed for ${provider}:`, error);

      const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
      errorUrl.searchParams.set('error', 'CALLBACK_FAILED');
      errorUrl.searchParams.set('provider', provider);
      return res.redirect(errorUrl.toString());
    }
  });

  return router;
}
