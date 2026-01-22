import express from 'express';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Logger } from '@pgpmjs/logger';
import { upsertAccountAndIssueToken, getFrontendRedirect, getPool, getDatabaseNameFromRequest, UpsertResult, OAuthProvider } from '../common';
import { ProviderBuilder, EmailPicker, OAuthProviderConfig } from './types';

const log = new Logger('oauth:github');

const pickGithubEmail: EmailPicker = (profile: any): { email: string; verified: boolean } | null => {
  const emails = (profile.emails || []) as Array<{ value: string; verified?: boolean }>;
  const emailObj = emails.find((e) => e.verified) || emails[0];
  if (!emailObj?.value) return null;
  
  return { email: emailObj.value, verified: !!emailObj.verified };
};

export const mountGithub: ProviderBuilder['mount'] = (opts, cfg, deps) => {
  const router = express.Router();
  if (!cfg?.clientId || !cfg.clientSecret) {
    log.warn('GitHub OAuth not configured; skipping /auth/github routes');
    return router;
  }

  const pool = deps.pool ?? getPool(opts);

  // Base callback URL - will be dynamically adjusted per request
  const serverPort = opts.server?.port || 3000;
  const defaultHost = opts.server?.host || 'localhost';
  const defaultCallbackUrl = `http://${defaultHost}:${serverPort}/auth/github/callback`;

  // Define the verify callback function once
  const verifyCallback = async (
    req: express.Request,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, data?: import('../common').UpsertResult) => void
  ) => {
        try {
          // Try to get domain info from state parameter first (more reliable)
          let domainInfo: { domain?: string; subdomain?: string | null; hostname?: string } | null = null;
          const stateParam = req.query.state as string | undefined;
          
          if (stateParam) {
            try {
              domainInfo = JSON.parse(Buffer.from(stateParam, 'base64').toString());
              log.debug('Extracted domain info from state parameter', { domainInfo });
            } catch (e) {
              log.warn('Failed to parse state parameter', { state: stateParam, error: e });
            }
          }
          
          // Override req.urlDomains if we have state info
          if (domainInfo && !req.urlDomains) {
            req.urlDomains = {
              domain: domainInfo.domain || req.hostname || 'localhost',
              subdomains: domainInfo.subdomain ? [domainInfo.subdomain] : [],
            } as any;
            log.debug('Set urlDomains from state parameter', { urlDomains: req.urlDomains });
          }
          
          log.info('GitHub OAuth callback received', {
            profileId: profile.id,
            username: profile.username,
            hostname: req.hostname,
            url: req.url,
            state: stateParam ? 'present' : 'missing',
            urlDomains: req.urlDomains,
            headers: {
              host: req.headers.host,
            },
          });

          const emailInfo = pickGithubEmail(profile);
          if (!emailInfo) {
            log.error('GitHub profile missing email', { profile });
            return done(new Error('github profile missing email'));
          }

          log.debug('Email extracted from GitHub profile', { email: emailInfo.email, verified: emailInfo.verified });

          // Get database name from request domain (now with state info if available)
          log.debug('Attempting to get database name from request');
          const databaseName = await getDatabaseNameFromRequest(opts, req);
          if (!databaseName) {
            const errorMsg = 'Unable to determine database from request domain';
            log.error(errorMsg, {
              hostname: req.hostname,
              url: req.url,
              state: stateParam ? 'present' : 'missing',
              urlDomains: req.urlDomains,
              headers: {
                host: req.headers.host,
                'x-forwarded-host': req.headers['x-forwarded-host'],
              },
            });
            return done(new Error(errorMsg));
          }

          log.info('Database name determined', { databaseName });

          log.debug('Upserting account and issuing token', {
            databaseName,
            provider: 'github',
            profileId: profile.id,
            email: emailInfo.email,
          });

          const result = await upsertAccountAndIssueToken({
            pool,
            databaseName,
            provider: 'github',
            profileId: profile.id,
            emailInfo,
            displayName: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          });

          log.info('GitHub OAuth successful', {
            userId: result.userId,
            email: result.email,
          });

          return done(null, result);
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          const errorStack = e instanceof Error ? e.stack : undefined;
          const errorName = e instanceof Error ? e.name : 'UnknownError';
          log.error(`GitHub OAuth callback error: ${errorName}: ${errorMessage}`, {
            name: errorName,
            message: errorMessage,
            stack: errorStack,
            code: (e as any)?.code,
            statusCode: (e as any)?.statusCode,
          });
          return done(e as Error);
        }
      };

  passport.use(
    'github',
    new GitHubStrategy(
      {
        clientID: cfg.clientId,
        clientSecret: cfg.clientSecret,
        callbackURL: defaultCallbackUrl, // Default, will be overridden per request
        scope: ['user:email'],
        passReqToCallback: true,
      },
      verifyCallback
    )
  );

  router.get(
    '/',
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Extract domain info from request to pass via state parameter
      // This ensures we know which database to use when callback returns
      const subdomain = req.urlDomains?.subdomains?.[0] || null;
      const domain = (req.urlDomains?.domain as string) || req.hostname || 'localhost';
      
      // Build callback URL from actual request hostname (this is critical!)
      // Try multiple methods to get the correct host
      const protocol = req.protocol || (req.secure ? 'https' : 'http') || 'http';
      const hostHeader = req.get('host') || req.headers.host;
      const hostname = req.hostname;
      
      // Prefer host header (includes port), fallback to hostname + port
      let host = hostHeader || hostname || defaultHost;
      
      // If host doesn't include port and we need one, add it
      let hostWithPort = host;
      if (!host.includes(':') && serverPort && serverPort !== 80 && serverPort !== 443) {
        hostWithPort = `${host}:${serverPort}`;
      }
      
      const dynamicCallbackUrl = `${protocol}://${hostWithPort}/auth/github/callback`;
      
      // Encode domain info in state parameter
      const state = Buffer.from(
        JSON.stringify({ domain, subdomain, hostname: req.hostname, callbackUrl: dynamicCallbackUrl })
      ).toString('base64');
      
      log.info('Initiating GitHub OAuth', {
        domain,
        subdomain,
        hostname: req.hostname,
        hostHeader: req.get('host'),
        hostHeaderRaw: req.headers.host,
        protocol,
        serverPort,
        host,
        hostWithPort,
        callbackUrl: dynamicCallbackUrl,
        stateLength: state.length,
        url: req.url,
        originalUrl: req.originalUrl,
        headers: {
          host: req.headers.host,
          'x-forwarded-host': req.headers['x-forwarded-host'],
          'x-forwarded-proto': req.headers['x-forwarded-proto'],
        },
      });
      
      // Manually build the GitHub authorization URL with correct callback URL
      const authUrl = new URL('https://github.com/login/oauth/authorize');
      authUrl.searchParams.set('client_id', cfg.clientId);
      authUrl.searchParams.set('redirect_uri', dynamicCallbackUrl);
      authUrl.searchParams.set('scope', 'user:email');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('response_type', 'code');
      
      log.info('Redirecting to GitHub OAuth', {
        authUrl: authUrl.toString(),
        callbackUrl: dynamicCallbackUrl,
        redirectUri: authUrl.searchParams.get('redirect_uri'),
      });
      
      // Redirect to GitHub with correct callback URL
      res.redirect(authUrl.toString());
    }
  );

  router.get('/callback', (req, res, next) => {
    // Extract callback URL from state if available, or build from request
    let callbackUrl = defaultCallbackUrl;
    const stateParam = req.query.state as string | undefined;
    
    if (stateParam) {
      try {
        const stateData = JSON.parse(Buffer.from(stateParam, 'base64').toString());
        if (stateData.callbackUrl) {
          callbackUrl = stateData.callbackUrl;
          log.debug('Extracted callback URL from state', { callbackUrl });
        }
      } catch (e) {
        log.warn('Failed to parse state for callback URL', { error: e });
      }
    }
    
    // Build callback URL from request if state doesn't have it
    if (callbackUrl === defaultCallbackUrl) {
      const protocol = req.protocol || (req.secure ? 'https' : 'http') || 'http';
      const hostHeader = req.get('host') || req.headers.host;
      const hostname = req.hostname;
      let host = hostHeader || hostname || defaultHost;
      
      if (!host.includes(':') && serverPort && serverPort !== 80 && serverPort !== 443) {
        host = `${host}:${serverPort}`;
      }
      callbackUrl = `${protocol}://${host}/auth/github/callback`;
    }
    
    log.info('GitHub OAuth callback received', {
      url: req.url,
      query: req.query,
      hostname: req.hostname,
      host: req.get('host'),
      callbackUrl,
      state: stateParam ? 'present' : 'missing',
      code: req.query.code ? 'present' : 'missing',
      error: req.query.error,
      errorDescription: req.query.error_description,
    });
    
    // Create a strategy instance with the correct callback URL for this request
    // Pass it directly to authenticate() without registering (Passport 0.4.1+ feature)
    const strategy = new GitHubStrategy(
      {
        clientID: cfg.clientId,
        clientSecret: cfg.clientSecret,
        callbackURL: callbackUrl, // Use the correct callback URL for this request
        scope: ['user:email'],
        passReqToCallback: true,
      },
      verifyCallback // Reuse the same verify callback
    );
    
    log.debug('Using strategy instance with callback URL', { callbackUrl });
    
    // Pass strategy instance directly to authenticate (no registration needed)
    passport.authenticate(strategy, { session: false }, (err: any, data: UpsertResult | undefined) => {
      
      if (err) {
        const errorMessage = err?.message || 'Unknown error';
        const errorName = err?.name || 'Error';
        log.error(`GitHub OAuth callback error: ${errorName}: ${errorMessage}`, {
          name: errorName,
          message: errorMessage,
          stack: err?.stack,
          code: err?.code,
          statusCode: err?.statusCode,
          oauthError: err?.oauthError,
          query: req.query,
          hostname: req.hostname,
          url: req.url,
        });
        res.status(500).json({ 
          error: 'OAuth callback failed',
          message: err?.message || 'Unknown error',
          details: process.env.NODE_ENV === 'development' ? {
            code: err?.code,
            statusCode: err?.statusCode,
            oauthError: err?.oauthError,
          } : undefined,
        });
        return;
      }
      
      if (!data?.accessToken) {
        log.error('GitHub OAuth callback error: No access token', {
          data,
          query: req.query,
        });
        res.status(500).json({ error: 'OAuth callback failed: No access token received' });
        return;
      }

      log.info('GitHub OAuth callback successful', {
        userId: data.userId,
        email: data.email,
      });

      const redirectUrl = getFrontendRedirect(req, deps.frontendCallbackUrl);
      if (redirectUrl) {
        try {
          const url = new URL(redirectUrl);
          url.searchParams.set('data', JSON.stringify({ ...data, provider: 'github' }));
          log.debug('Redirecting to frontend', { redirectUrl: url.toString() });
          res.redirect(url.toString());
        } catch (e) {
          (deps.logError || log.error.bind(log))('Invalid redirect URL', e);
          res.status(500).json({ error: 'Invalid redirect URL' });
        }
      } else {
        res.status(200).json({
          ...data,
          provider: 'github',
        });
      }
    })(req, res, next);
  });

   

  return router;
};

export const githubProvider: ProviderBuilder = {
  name: 'github',
  scope: ['user:email'],
  mount: mountGithub,
};
