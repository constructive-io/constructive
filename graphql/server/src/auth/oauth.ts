import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { PgpmOptions } from '@pgpmjs/types';
import { Logger } from '@pgpmjs/logger';
import { googleProvider, mountGoogle } from './providers/google';
import { githubProvider, mountGithub } from './providers/github';
import { facebookProvider, mountFacebook } from './providers/facebook';
import { linkedinProvider, mountLinkedIn } from './providers/linkedin';
import { OAuthProviderConfig } from './providers/types';
import { getFrontendRedirect, getPool, UpsertResult, OAuthProvider } from './common';

const log = new Logger('oauth');

export const createOAuthRouter = (opts: PgpmOptions): express.Router => {
  const router = express.Router();
  const pool = getPool(opts);

  // Get base URL from opts or default to localhost:3000
  const serverPort = opts.server?.port || 3000;
  const serverHost = opts.server?.host || 'localhost';
  const baseUrl = `http://${serverHost}:${serverPort}`;

  // Get frontend callback URL from environment variable
  const frontendCallbackUrl = process.env.OAUTH_FRONTEND_CALLBACK_URL;
  
  if (frontendCallbackUrl) {
    log.info('OAuth frontend callback URL configured', { frontendCallbackUrl });
  } else {
    log.warn('OAUTH_FRONTEND_CALLBACK_URL not set, will use default or query parameter');
  }

  // Google OAuth config from environment variables
  const googleConfig: OAuthProviderConfig | undefined =
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }
      : undefined;

  // GitHub OAuth config from environment variables
  const githubConfig: OAuthProviderConfig | undefined =
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        }
      : undefined;

  // Facebook OAuth config from environment variables
  const facebookConfig: OAuthProviderConfig | undefined =
    process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? {
          clientId: process.env.FACEBOOK_CLIENT_ID,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        }
      : undefined;

  // LinkedIn OAuth config from environment variables
  const linkedinConfig: OAuthProviderConfig | undefined =
    process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET
      ? {
          clientId: process.env.LINKEDIN_CLIENT_ID,
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        }
      : undefined;

  // Mount Google
  if (googleConfig?.clientId && googleConfig?.clientSecret) {
    router.use(
      '/google',
      mountGoogle(opts, googleConfig, {
        pool,
        frontendCallbackUrl,
        redirectWithToken: (res: Response, tokenData: UpsertResult, provider: OAuthProvider, req: Request) => {
          const redirectUrl = getFrontendRedirect(req, frontendCallbackUrl);
          if (redirectUrl) {
            try {
              const url = new URL(redirectUrl);
              url.searchParams.set('data', JSON.stringify({ ...tokenData, provider }));
              res.redirect(url.toString());
            } catch (e) {
              log.error('Invalid redirect URL', e);
              res.status(500).json({ error: 'Invalid redirect URL' });
            }
          } else {
            res.status(200).json({
              ...tokenData,
              provider,
            });
          }
        },
        logError: log.error.bind(log),
      })
    );
  } else {
    log.warn('Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET); skipping /auth/google routes');
  }

  // Mount GitHub
  if (githubConfig?.clientId && githubConfig?.clientSecret) {
    router.use(
      '/github',
      mountGithub(opts, githubConfig, {
        pool,
        frontendCallbackUrl,
        redirectWithToken: (res: Response, tokenData: UpsertResult, provider: OAuthProvider, req: Request) => {
          const redirectUrl = getFrontendRedirect(req, frontendCallbackUrl);
          if (redirectUrl) {
            try {
              const url = new URL(redirectUrl);
              url.searchParams.set('data', JSON.stringify({ ...tokenData, provider }));
              res.redirect(url.toString());
            } catch (e) {
              log.error('Invalid redirect URL', e);
              res.status(500).json({ error: 'Invalid redirect URL' });
            }
          } else {
            res.status(200).json({
              ...tokenData,
              provider,
            });
          }
        },
        logError: log.error.bind(log),
      })
    );
  } else {
    log.warn('GitHub OAuth not configured (missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET); skipping /auth/github routes');
  }

  // Mount Facebook
  if (facebookConfig?.clientId && facebookConfig?.clientSecret) {
    router.use(
      '/facebook',
      mountFacebook(opts, facebookConfig, {
        pool,
        frontendCallbackUrl,
        redirectWithToken: (res: Response, tokenData: UpsertResult, provider: OAuthProvider, req: Request) => {
          const redirectUrl = getFrontendRedirect(req, frontendCallbackUrl);
          if (redirectUrl) {
            try {
              const url = new URL(redirectUrl);
              url.searchParams.set('data', JSON.stringify({ ...tokenData, provider }));
              res.redirect(url.toString());
            } catch (e) {
              log.error('Invalid redirect URL', e);
              res.status(500).json({ error: 'Invalid redirect URL' });
            }
          } else {
            res.status(200).json({
              ...tokenData,
              provider,
            });
          }
        },
        logError: log.error.bind(log),
      })
    );
  } else {
    log.warn('Facebook OAuth not configured (missing FACEBOOK_CLIENT_ID or FACEBOOK_CLIENT_SECRET); skipping /auth/facebook routes');
  }

  // Mount LinkedIn
  if (linkedinConfig?.clientId && linkedinConfig?.clientSecret) {
    router.use(
      '/linkedin',
      mountLinkedIn(opts, linkedinConfig, {
        pool,
        frontendCallbackUrl,
        redirectWithToken: (res: Response, tokenData: UpsertResult, provider: OAuthProvider, req: Request) => {
          const redirectUrl = getFrontendRedirect(req, frontendCallbackUrl);
          if (redirectUrl) {
            try {
              const url = new URL(redirectUrl);
              url.searchParams.set('data', JSON.stringify({ ...tokenData, provider }));
              res.redirect(url.toString());
            } catch (e) {
              log.error('Invalid redirect URL', e);
              res.status(500).json({ error: 'Invalid redirect URL' });
            }
          } else {
            res.status(200).json({
              ...tokenData,
              provider,
            });
          }
        },
        logError: log.error.bind(log),
      })
    );
  } else {
    log.warn('LinkedIn OAuth not configured (missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET); skipping /auth/linkedin routes');
  }

  return router;
};
