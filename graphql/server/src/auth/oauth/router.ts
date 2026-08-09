import { DEFAULT_CSRF_COOKIE_NAME } from '@constructive-io/csrf';
import {
  ConstructiveError,
  errors,
  toError
} from '@constructive-io/errors';
import { Logger } from '@pgpmjs/logger';
import { type Request, type Response,Router } from 'express';

import {
  type CookieConfig,
  getSessionCookieConfig,
  setSessionCookie
} from '../../middleware/cookie';
import { renderOAuthFailurePage } from './page';
import {
  completeProviderAuthentication,
  createProviderAuthorizationUrl
} from './service';

const log = new Logger('oauth-routes');

export interface OAuthRouterOptions {
  requestTimeoutMs: number;
}

const queryString = (req: Request, name: string): string | undefined => {
  const value = req.query[name];
  return typeof value === 'string' ? value : undefined;
};

const requireRequestBoundary = async (req: Request) => {
  const context = req.constructive;
  if (!context) {
    throw errors.INTERNAL_FAILURE({
      details: 'The Constructive request context is unavailable.'
    });
  }
  const surface = await context.useModule('ssoSurface');
  if (!surface) throw errors.SSO_SIGN_IN_DISABLED();
  const browserBinding = req.cookies?.[DEFAULT_CSRF_COOKIE_NAME];
  if (typeof browserBinding !== 'string') {
    throw errors.INVALID_OAUTH_STATE();
  }
  return { context, surface, browserBinding };
};

const asSafeOAuthError = (cause: unknown): ConstructiveError => {
  const error = toError(cause);
  return error.isPublic
    ? error
    : errors.IDENTITY_PROVIDER_AUTHENTICATION_FAILED(
      {},
      undefined,
      { cause: error }
    );
};

const sendFailure = (req: Request, res: Response, cause: unknown): void => {
  const error = asSafeOAuthError(cause);
  log.warn({
    event: 'oauth_failure',
    code: error.code,
    requestId: req.requestId,
    causeName: cause instanceof Error ? cause.name : typeof cause
  });
  res.status(error.http).type('html').send(renderOAuthFailurePage(error));
};

const setSecurityHeaders = (_req: Request, res: Response, next: () => void) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  );
  next();
};

export const createOAuthRouter = (options: OAuthRouterOptions): Router => {
  const router = Router();
  router.use(setSecurityHeaders);

  router.get('/authorize', async (req, res) => {
    try {
      const state = queryString(req, 'state') ?? '';
      const { context, surface, browserBinding } = await requireRequestBoundary(req);
      const authorizationUrl = await createProviderAuthorizationUrl(
        context,
        surface,
        state,
        browserBinding
      );
      res.redirect(303, authorizationUrl);
    } catch (cause) {
      sendFailure(req, res, cause);
    }
  });

  router.get('/callback', async (req, res) => {
    try {
      const state = queryString(req, 'state') ?? '';
      const code = queryString(req, 'code');
      const providerReturnedError = req.query.error !== undefined;
      const { context, surface, browserBinding } = await requireRequestBoundary(req);
      const result = await completeProviderAuthentication(context, surface, {
        state,
        code,
        providerReturnedError,
        browserBinding,
        requestTimeoutMs: options.requestTimeoutMs
      });

      const cookieConfig: CookieConfig = {
        ...getSessionCookieConfig(req.api?.authSettings),
        domain: undefined,
        httpOnly: true,
        secure: true
      };
      setSessionCookie(res, result.accessToken, cookieConfig);
      res.redirect(303, result.continuationUrl);
    } catch (cause) {
      sendFailure(req, res, cause);
    }
  });

  return router;
};
