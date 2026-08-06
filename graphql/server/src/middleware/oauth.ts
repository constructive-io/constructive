import {
  ConstructiveError,
  errors,
  parse,
  toError,
} from '@constructive-io/errors';
import type {
  AuthSettings,
  AuthSurface,
  ConstructiveContext,
  IdentityProviderConfig,
  IdentityProvidersModule,
} from '@constructive-io/express-context';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import {
  createSignedState,
  deriveCodeChallenge,
  generateCodeVerifier,
  resolveSameOriginReturnPath,
  verifyCodeChallenge,
  verifySignedState,
  verifyState,
} from '@constructive-io/oauth';
import { Logger } from '@pgpmjs/logger';
import { createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';

import {
  createOAuthClientForProvider,
  isPhaseOneOAuthProvider,
} from '../oauth-provider';
import { getSessionCookieConfig, setSessionCookie } from './cookie';

const log = new Logger('oauth');
const OAUTH_STATE_COOKIE = 'constructive_oauth_state';
const OAUTH_PKCE_COOKIE = 'constructive_oauth_pkce';
const OAUTH_COOKIE_PATH = '/auth';
const MAX_CONSUMED_STATES = 10_000;

interface OAuthStateBinding {
  provider: string;
  databaseId: string;
  apiId: string | null;
  origin: string;
  returnPath: string;
  pkceChallenge: string;
}

interface OAuthPkceBinding {
  provider: string;
  stateDigest: string;
  codeVerifier: string;
}

interface OAuthModules {
  providers: IdentityProvidersModule;
  authSurface: AuthSurface;
  authSettings: AuthSettings | undefined;
}

interface IdentityResult {
  user_id?: string;
  access_token?: string;
  mfa_required?: boolean;
  mfa_challenge_token?: string;
}

const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replace(/"/g, '""')}"`;
const quoteQualified = (schema: string, name: string): string =>
  `${quoteIdentifier(schema)}.${quoteIdentifier(name)}`;
const stateDigest = (state: string): string =>
  createHash('sha256').update(state).digest('base64url');

const setOAuthResponseHeaders = (res: Response): void => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');
};

const createStateConsumer = () => {
  const consumed = new Map<string, number>();
  return (digest: string, expiresAt: number): boolean => {
    const now = Date.now();
    for (const [key, expiry] of consumed) {
      if (expiry <= now) consumed.delete(key);
    }
    if (consumed.has(digest) || consumed.size >= MAX_CONSUMED_STATES) {
      return false;
    }
    consumed.set(digest, expiresAt);
    return true;
  };
};

const queryString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const requireContext = (req: Request): ConstructiveContext => {
  if (!req.constructive?.databaseId || !req.constructive.origin) {
    throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED({});
  }
  return req.constructive;
};

const resolveModules = async (
  ctx: ConstructiveContext
): Promise<OAuthModules> => {
  const [providers, authSurface, authSettings] = await Promise.all([
    ctx.useModule('identityProviders'),
    ctx.useModule('authSurface'),
    ctx.useModule('authSettings'),
  ]);
  if (!providers || !authSurface)
    throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED({});
  return { providers, authSurface, authSettings };
};

const requireProvider = (
  providers: IdentityProvidersModule,
  slug: string
): IdentityProviderConfig => {
  if (!isPhaseOneOAuthProvider(slug))
    throw errors.IDENTITY_PROVIDER_NOT_SUPPORTED();
  const provider = providers.providers[slug];
  if (!provider) throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED({});
  if (!provider.enabled) throw errors.IDENTITY_PROVIDER_DISABLED();
  if (!provider.pkceEnabled) throw errors.INVALID_OAUTH_PKCE();
  if (!provider.clientSecret) throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED({});
  return provider;
};

const cookieOptions = (
  opts: ConstructiveOptions,
  authSettings?: AuthSettings
) => ({
  httpOnly: true,
  secure:
    opts.oauth?.cookieSecure === true || authSettings?.cookieSecure === true,
  // The phase-one callback is a top-level cross-site GET. `Strict` would drop
  // the receipt, while `None` would broaden its cross-site exposure.
  sameSite: 'lax' as const,
  path: OAUTH_COOKIE_PATH,
  maxAge: opts.oauth!.stateMaxAgeMs!,
});

const clearOAuthCookies = (
  res: Response,
  opts: ConstructiveOptions,
  authSettings?: AuthSettings
): void => {
  const { httpOnly, path, sameSite, secure } = cookieOptions(opts, authSettings);
  const clearOptions = { httpOnly, path, sameSite, secure };
  res.clearCookie(OAUTH_STATE_COOKIE, clearOptions);
  res.clearCookie(OAUTH_PKCE_COOKIE, clearOptions);
};

const redirectWithError = (
  req: Request,
  res: Response,
  opts: ConstructiveOptions,
  error: ConstructiveError
): void => {
  const origin =
    req.constructive?.origin ||
    `${req.protocol}://${req.get('host') ?? 'localhost'}`;
  const target = new URL(opts.oauth!.failurePath!, origin);
  target.searchParams.set('oauth_error', error.code);
  if (req.requestId) target.searchParams.set('request_id', req.requestId);
  res.redirect(`${target.pathname}${target.search}${target.hash}`);
};

const publicCallbackError = (error: unknown): ConstructiveError => {
  if (error instanceof ConstructiveError && error.isPublic) return error;
  const normalized = toError(error);
  if (normalized.isPublic) return normalized;
  return errors.OAUTH_AUTHORIZATION_FAILED(undefined, undefined, error);
};

const signInIdentity = async (
  ctx: ConstructiveContext,
  authSurface: AuthSurface,
  provider: string,
  profile: {
    providerId: string;
    email: string | null;
    emailVerified: boolean | null;
    name: string | null;
    picture: string | null;
  }
): Promise<IdentityResult> => {
  const details = {
    provider,
    sub: profile.providerId,
    email: profile.email,
    email_verified: profile.emailVerified,
    name: profile.name,
    picture: profile.picture,
  };

  try {
    return await ctx.withPgClient(async (client) => {
      const result = await client.query<IdentityResult>(
        `SELECT * FROM ${quoteQualified(authSurface.privateSchema, 'sign_in_identity')}(
          $1::text, $2::text, $3::jsonb, $4::text, 'access_token'::text, false, NULL::text
        )`,
        [provider, profile.providerId, JSON.stringify(details), profile.email]
      );
      return result.rows[0] ?? {};
    });
  } catch (error) {
    if (parse(error).code !== 'IDENTITY_ACCOUNT_NOT_FOUND')
      throw toError(error);
  }

  if (!profile.email) throw errors.OAUTH_AUTHORIZATION_FAILED();
  return ctx.withPgClient(async (client) => {
    const result = await client.query<IdentityResult>(
      `SELECT * FROM ${quoteQualified(authSurface.privateSchema, 'sign_up_identity')}(
        $1::text, $2::text, $3::text, $4::jsonb, 'access_token'::text, false, NULL::text
      )`,
      [provider, profile.providerId, profile.email, JSON.stringify(details)]
    );
    return result.rows[0] ?? {};
  });
};

export const createOAuthRoutes = (opts: ConstructiveOptions): Router => {
  if (!opts.oauth?.enabled || !opts.oauth.stateSecret) {
    throw errors.OAUTH_STATE_SECRET_NOT_CONFIGURED();
  }
  const router = Router();
  // This closes same-process callback replay atomically before any provider or
  // identity work. Across server instances, the provider's authorization code
  // remains the shared, single-use protocol boundary.
  const consumeState = createStateConsumer();

  router.get(
    '/:provider',
    async (req: Request, res: Response, _next: NextFunction) => {
      setOAuthResponseHeaders(res);
      const providerSlug = req.params.provider;
      if (providerSlug === 'providers') {
        _next();
        return;
      }
      let authSettings: AuthSettings | undefined;
      try {
        const ctx = requireContext(req);
        const modules = await resolveModules(ctx);
        authSettings = modules.authSettings;
        const provider = requireProvider(modules.providers, providerSlug);
        const requestedReturn =
          queryString(req.query.return_to) ??
          queryString(req.query.redirect_uri);
        const returnPath = resolveSameOriginReturnPath(
          requestedReturn ?? opts.oauth!.successPath,
          ctx.origin
        );
        const codeVerifier = generateCodeVerifier();
        const pkceChallenge = deriveCodeChallenge(codeVerifier);
        const state = createSignedState<OAuthStateBinding>(
          {
            provider: providerSlug,
            databaseId: ctx.databaseId!,
            apiId: ctx.api.apiId ?? null,
            origin: ctx.origin,
            returnPath,
            pkceChallenge,
          },
          {
            secret: opts.oauth!.stateSecret!,
            maxAgeMs: opts.oauth!.stateMaxAgeMs!,
          }
        );
        const pkce = createSignedState<OAuthPkceBinding>(
          {
            provider: providerSlug,
            stateDigest: stateDigest(state),
            codeVerifier,
          },
          {
            secret: opts.oauth!.stateSecret!,
            maxAgeMs: opts.oauth!.stateMaxAgeMs!,
          }
        );
        const transientCookieOptions = cookieOptions(
          opts,
          modules.authSettings
        );
        res.cookie(OAUTH_STATE_COOKIE, state, transientCookieOptions);
        res.cookie(OAUTH_PKCE_COOKIE, pkce, transientCookieOptions);

        const client = createOAuthClientForProvider(provider, ctx.origin);
        const authorization = client.getAuthorizationUrl({
          provider: providerSlug,
          state,
          codeVerifier,
        });
        res.redirect(authorization.url);
      } catch (error) {
        clearOAuthCookies(res, opts, authSettings);
        const mapped = publicCallbackError(error);
        log.warn({
          event: 'oauth_authorization_rejected',
          provider: providerSlug,
          requestId: req.requestId,
          code: mapped.code,
        });
        redirectWithError(req, res, opts, mapped);
      }
    }
  );

  router.get(
    '/:provider/callback',
    async (req: Request, res: Response, _next: NextFunction) => {
      setOAuthResponseHeaders(res);
      const providerSlug = req.params.provider;
      let authSettings: AuthSettings | undefined;
      try {
        const ctx = requireContext(req);
        const modules = await resolveModules(ctx);
        authSettings = modules.authSettings;
        const storedState = req.cookies?.[OAUTH_STATE_COOKIE] as
          string | undefined;
        const storedPkce = req.cookies?.[OAUTH_PKCE_COOKIE] as
          string | undefined;
        clearOAuthCookies(res, opts, authSettings);
        const callbackState = queryString(req.query.state);
        if (!verifyState(storedState, callbackState))
          throw errors.INVALID_OAUTH_STATE();

        const state = verifySignedState<OAuthStateBinding>(storedState, {
          secret: opts.oauth!.stateSecret!,
        });
        const pkce = verifySignedState<OAuthPkceBinding>(storedPkce, {
          secret: opts.oauth!.stateSecret!,
        });
        if (!state) throw errors.INVALID_OAUTH_STATE();
        if (
          state.provider !== providerSlug ||
          state.databaseId !== ctx.databaseId ||
          state.apiId !== (ctx.api.apiId ?? null) ||
          state.origin !== ctx.origin
        ) {
          throw errors.INVALID_OAUTH_STATE();
        }
        if (
          !pkce ||
          pkce.provider !== providerSlug ||
          pkce.stateDigest !== stateDigest(storedState!) ||
          !verifyCodeChallenge(pkce.codeVerifier, state.pkceChallenge)
        ) {
          throw errors.INVALID_OAUTH_PKCE();
        }
        if (!consumeState(stateDigest(storedState!), state.exp)) {
          throw errors.INVALID_OAUTH_STATE();
        }

        if (queryString(req.query.error))
          throw errors.OAUTH_AUTHORIZATION_FAILED();
        const code = queryString(req.query.code);
        if (!code) throw errors.OAUTH_AUTHORIZATION_FAILED();
        const provider = requireProvider(modules.providers, providerSlug);
        const returnPath = resolveSameOriginReturnPath(
          state.returnPath,
          ctx.origin
        );
        const client = createOAuthClientForProvider(provider, ctx.origin);
        const profile = await client.handleCallback({
          provider: providerSlug,
          code,
          codeVerifier: pkce.codeVerifier,
        });
        const identity = await signInIdentity(
          ctx,
          modules.authSurface,
          providerSlug,
          profile
        );

        // The current DB contract exposes these fields for future policy. Fail
        // closed until it yields an established local MFA continuation.
        if (identity.mfa_required) throw errors.OAUTH_AUTHORIZATION_FAILED();
        if (!identity.access_token) throw errors.OAUTH_AUTHORIZATION_FAILED();

        setSessionCookie(
          res,
          identity.access_token,
          getSessionCookieConfig(
            modules.authSettings,
            false,
            opts.oauth!.cookieSecure ?? false
          )
        );
        res.redirect(returnPath);
      } catch (error) {
        clearOAuthCookies(res, opts, authSettings);
        const mapped = publicCallbackError(error);
        log.warn({
          event: 'oauth_callback_rejected',
          provider: providerSlug,
          requestId: req.requestId,
          code: mapped.code,
        });
        redirectWithError(req, res, opts, mapped);
      }
    }
  );

  return router;
};
