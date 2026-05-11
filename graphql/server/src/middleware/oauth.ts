import crypto from 'crypto';
import { Router, Request, Response } from 'express';
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
  return process.env.OAUTH_STATE_SECRET || process.env.SESSION_SECRET || 'dev-oauth-state-secret';
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

interface SignUpIdentityResult extends SignInIdentityResult {}

async function callSignInIdentity(
  pool: Pool,
  dbname: string,
  privateSchema: string,
  profile: OAuthProfile,
  deviceToken: string | null
): Promise<SignInIdentityResult> {
  const details = {
    provider: profile.provider,
    sub: profile.providerId,
    email: profile.email,
    email_verified: profile.emailVerified,
    name: profile.name,
    picture: profile.picture,
    raw_userinfo: profile.raw,
  };

  const sql = `
    SELECT * FROM "${privateSchema}".sign_in_identity(
      $1::text,
      $2::text,
      $3::jsonb,
      $4::text,
      'access_token'::text,
      $5::text
    )
  `;

  const result = await pool.query(sql, [
    profile.provider,
    profile.providerId,
    JSON.stringify(details),
    profile.email,
    deviceToken,
  ]);

  return result.rows[0] || {};
}

async function callSignUpIdentity(
  pool: Pool,
  dbname: string,
  privateSchema: string,
  profile: OAuthProfile,
  deviceToken: string | null
): Promise<SignUpIdentityResult> {
  const details = {
    provider: profile.provider,
    sub: profile.providerId,
    email: profile.email,
    email_verified: profile.emailVerified,
    name: profile.name,
    picture: profile.picture,
    raw_userinfo: profile.raw,
  };

  const sql = `
    SELECT * FROM "${privateSchema}".sign_up_identity(
      $1::text,
      $2::text,
      $3::jsonb,
      $4::text,
      'access_token'::text
    )
  `;

  const result = await pool.query(sql, [
    profile.provider,
    profile.providerId,
    JSON.stringify(details),
    profile.email,
  ]);

  return result.rows[0] || {};
}

// =============================================================================
// OAuth Routes
// =============================================================================

export interface OAuthRoutesConfig {
  /** @deprecated baseUrl is now derived from request headers for multi-tenant support */
  baseUrl?: string;
  errorRedirectPath?: string;
  allowSignup?: boolean;
  requireVerifiedEmail?: boolean;
}

function getBaseUrl(req: Request): string {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  return `${protocol}://${host}`;
}

export function createOAuthRoutes(opts: ConstructiveOptions): Router {
  const router = Router();
  const oauthConfig = (opts as any).oauth as OAuthRoutesConfig | undefined;

  const errorRedirectPath = oauthConfig?.errorRedirectPath ?? '/auth/error';
  const allowSignup = oauthConfig?.allowSignup ?? true;
  const requireVerifiedEmail = oauthConfig?.requireVerifiedEmail ?? true;

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

  // GET /auth/:provider - Initiate OAuth flow
  router.get('/:provider', async (req: Request, res: Response) => {
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
  router.get('/:provider/callback', async (req: Request, res: Response) => {
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

      let result: SignInIdentityResult;

      try {
        // Try sign_in_identity first
        result = await callSignInIdentity(pool, dbname, privateSchema, profile, deviceToken);
      } catch (err: any) {
        const errorMessage = err.message || '';

        // Handle IDENTITY_ACCOUNT_NOT_FOUND - try signup
        if (errorMessage.includes('IDENTITY_ACCOUNT_NOT_FOUND')) {
          log.info(`[oauth] Account not found for ${profile.email}, attempting signup`);

          if (!allowSignup) {
            log.warn(`[oauth] Signup disabled, rejecting ${profile.email}`);
            const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
            errorUrl.searchParams.set('error', 'SIGNUP_DISABLED');
            errorUrl.searchParams.set('provider', provider);
            return res.redirect(errorUrl.toString());
          }

          // Shadow attack defense: require verified email for auto-signup
          if (requireVerifiedEmail && !profile.emailVerified) {
            log.warn(`[oauth] Rejecting unverified email for signup: ${profile.email}`);
            const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
            errorUrl.searchParams.set('error', 'EMAIL_NOT_VERIFIED');
            errorUrl.searchParams.set('provider', provider);
            return res.redirect(errorUrl.toString());
          }

          // Call sign_up_identity
          result = await callSignUpIdentity(pool, dbname, privateSchema, profile, deviceToken);
        } else {
          // Re-throw other errors
          throw err;
        }
      }

      // Handle MFA required
      if (result.mfa_required && result.mfa_challenge_token) {
        log.info(`[oauth] MFA required for ${profile.email}`);
        const mfaUrl = new URL('/auth/mfa', getBaseUrl(req));
        mfaUrl.searchParams.set('token', result.mfa_challenge_token);
        mfaUrl.searchParams.set('redirect_uri', redirectUri);
        return res.redirect(mfaUrl.toString());
      }

      // Success - set cookies and redirect
      if (!result.access_token) {
        throw new Error('No access token returned from sign_in_identity');
      }

      // Set session cookie
      const sessionConfig = getSessionCookieConfig(authSettings);
      setSessionCookie(res, result.access_token, sessionConfig);
      log.info(`[oauth] Session cookie set for ${profile.email}`);

      // Set device token cookie if returned
      if (result.out_device_token) {
        const deviceConfig = getDeviceTokenCookieConfig(authSettings);
        setDeviceTokenCookie(res, result.out_device_token, deviceConfig);
        log.info(`[oauth] Device token cookie set for ${profile.email}`);
      }

      // Redirect to success URL
      log.info(`[oauth] OAuth success for ${profile.email}, redirecting to ${redirectUri}`);
      return res.redirect(redirectUri);

    } catch (error: any) {
      log.error(`[oauth] Callback failed for ${provider}:`, error);

      const errorUrl = new URL(errorRedirectPath, getBaseUrl(req));
      errorUrl.searchParams.set('error', 'CALLBACK_FAILED');
      errorUrl.searchParams.set('message', error.message || 'Unknown error');
      errorUrl.searchParams.set('provider', provider);
      return res.redirect(errorUrl.toString());
    }
  });

  return router;
}
