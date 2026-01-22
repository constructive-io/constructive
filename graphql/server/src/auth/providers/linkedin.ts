import express from 'express';
import passport from 'passport';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { Logger } from '@pgpmjs/logger';
import { upsertAccountAndIssueToken, getFrontendRedirect, getPool, getDatabaseNameFromRequest, UpsertResult, OAuthProvider } from '../common';
import { ProviderBuilder, EmailPicker, OAuthProviderConfig } from './types';

const log = new Logger('oauth:linkedin');

const pickEmail: EmailPicker = (profile: any): { email: string; verified: boolean } | null => {
  // LinkedIn profile emails are in profile.emails array
  const emails = (profile.emails || []) as Array<{ value: string; verified?: boolean }>;
  const emailObj = emails.find((e) => e.verified) || emails[0];
  if (!emailObj?.value) return null;
  return { email: emailObj.value, verified: !!emailObj.verified };
};

export const mountLinkedIn: ProviderBuilder['mount'] = (opts, cfg, deps) => {
  const router = express.Router();
  if (!cfg?.clientId || !cfg.clientSecret) {
    log.warn('LinkedIn OAuth not configured; skipping /auth/linkedin routes');
    return router;
  }

  const pool = deps.pool ?? getPool(opts);

  // Base callback URL - will be dynamically adjusted per request
  const serverPort = opts.server?.port || 3000;
  const defaultHost = opts.server?.host || 'localhost';
  const defaultCallbackUrl = `http://${defaultHost}:${serverPort}/auth/linkedin/callback`;

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
      
      log.info('LinkedIn OAuth callback received', {
        profileId: profile.id,
        displayName: profile.displayName || profile.name?.givenName || profile.name?.familyName,
        hostname: req.hostname,
        url: req.url,
        state: stateParam ? 'present' : 'missing',
        urlDomains: req.urlDomains,
        headers: {
          host: req.headers.host,
        },
      });

      const emailInfo = pickEmail(profile);
      if (!emailInfo) {
        log.error('LinkedIn profile missing email', { profile });
        return done(new Error('linkedin profile missing email'));
      }

      log.debug('Email extracted from LinkedIn profile', { email: emailInfo.email, verified: emailInfo.verified });

      // Get database name from request domain (now with state info if available)
      log.debug('Attempting to get database name from request');
      const databaseName = await getDatabaseNameFromRequest(opts, req);
      if (!databaseName) {
        log.error('Unable to determine database from request domain', {
          hostname: req.hostname,
          url: req.url,
          state: stateParam,
          urlDomains: req.urlDomains,
          headers: req.headers,
        });
        return done(new Error('Unable to determine database from request domain'));
      }

      log.info('Database name determined', { databaseName });

      log.debug('Upserting account and issuing token', {
        databaseName,
        provider: 'linkedin',
        profileId: profile.id,
        email: emailInfo.email,
      });

      const result = await upsertAccountAndIssueToken({
        pool,
        databaseName,
        provider: 'linkedin',
        profileId: profile.id,
        emailInfo,
        displayName: profile.displayName || profile.name?.givenName || profile.name?.familyName || undefined,
        avatarUrl: profile.photos?.[0]?.value,
      });

      log.info('LinkedIn OAuth successful', {
        userId: result.userId,
        email: result.email,
      });

      return done(null, result);
    } catch (e) {
      log.error('LinkedIn OAuth callback error', {
        error: e,
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      });
      return done(e as Error);
    }
  };

  passport.use(
    'linkedin',
    new LinkedInStrategy(
      {
        clientID: cfg.clientId,
        clientSecret: cfg.clientSecret,
        callbackURL: defaultCallbackUrl, // Default, will be overridden per request
        scope: ['r_emailaddress', 'r_liteprofile'],
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
      const protocol = req.protocol || 'http';
      // req.get('host') already includes port if present (e.g., "public-peptide.localhost:3000")
      const host = req.get('host') || req.hostname || defaultHost;
      // If host doesn't include port and we need one, add it
      let hostWithPort = host;
      if (!host.includes(':') && serverPort && serverPort !== 80 && serverPort !== 443) {
        hostWithPort = `${host}:${serverPort}`;
      }
      const dynamicCallbackUrl = `${protocol}://${hostWithPort}/auth/linkedin/callback`;
      
      // Encode domain info in state parameter
      const state = Buffer.from(
        JSON.stringify({ domain, subdomain, hostname: req.hostname, callbackUrl: dynamicCallbackUrl })
      ).toString('base64');
      
      log.debug('Initiating LinkedIn OAuth', {
        domain,
        subdomain,
        hostname: req.hostname,
        host: req.get('host'),
        protocol,
        serverPort,
        callbackUrl: dynamicCallbackUrl,
        stateLength: state.length,
      });
      
      // Manually build the LinkedIn authorization URL with correct callback URL
      const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
      authUrl.searchParams.set('client_id', cfg.clientId);
      authUrl.searchParams.set('redirect_uri', dynamicCallbackUrl);
      authUrl.searchParams.set('scope', 'r_emailaddress r_liteprofile');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('response_type', 'code');
      
      log.debug('Redirecting to LinkedIn OAuth', {
        authUrl: authUrl.toString(),
        callbackUrl: dynamicCallbackUrl,
      });
      
      // Redirect to LinkedIn with correct callback URL
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
      callbackUrl = `${protocol}://${host}/auth/linkedin/callback`;
    }
    
    log.info('LinkedIn OAuth callback received', {
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
    const strategy = new LinkedInStrategy(
      {
        clientID: cfg.clientId,
        clientSecret: cfg.clientSecret,
        callbackURL: callbackUrl, // Use the correct callback URL for this request
        scope: ['r_emailaddress', 'r_liteprofile'],
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
        log.error(`LinkedIn OAuth callback error: ${errorName}: ${errorMessage}`, {
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
        log.error('LinkedIn OAuth callback error: No access token', {
          data,
          query: req.query,
        });
        res.status(500).json({ error: 'OAuth callback failed: No access token received' });
        return;
      }

      log.info('LinkedIn OAuth callback successful', {
        userId: data.userId,
        email: data.email,
      });

      const redirectUrl = getFrontendRedirect(req, deps.frontendCallbackUrl);
      if (redirectUrl) {
        try {
          const url = new URL(redirectUrl);
          url.searchParams.set('data', JSON.stringify({ ...data, provider: 'linkedin' }));
          res.redirect(url.toString());
        } catch (e) {
          (deps.logError || log.error.bind(log))('Invalid redirect URL', e);
          res.status(500).json({ error: 'Invalid redirect URL' });
        }
      } else {
        res.status(200).json({
          ...data,
          provider: 'linkedin',
        });
      }
    })(req, res, next);
  });

  return router;
};

export const linkedinProvider: ProviderBuilder = {
  name: 'linkedin',
  scope: ['r_emailaddress', 'r_liteprofile'],
  mount: mountLinkedIn,
};
