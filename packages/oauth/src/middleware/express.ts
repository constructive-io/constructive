import { OAuthClient } from '../oauth-client';
import { OAuthClientConfig, OAuthProfile, createOAuthError } from '../types';
import { generateState, verifyState } from '../utils/state';
import { getProviderIds } from '../providers';

export interface OAuthMiddlewareConfig extends OAuthClientConfig {
  onSuccess: (profile: OAuthProfile, context: OAuthCallbackContext) => Promise<unknown>;
  onError?: (error: Error, context: OAuthErrorContext) => void;
  successRedirect?: string;
  errorRedirect?: string;
}

export interface OAuthCallbackContext {
  provider: string;
  profile: OAuthProfile;
  query: Record<string, string>;
}

export interface OAuthErrorContext {
  provider?: string;
  error: Error;
  query: Record<string, string>;
}

export interface OAuthRouteHandlers {
  initiateAuth: (
    req: { params: { provider: string }; query: Record<string, unknown> },
    res: {
      redirect: (url: string) => void;
      cookie: (name: string, value: string, options: Record<string, unknown>) => void;
      status: (code: number) => { json: (data: unknown) => void };
    }
  ) => void;

  handleCallback: (
    req: {
      params: { provider: string };
      query: Record<string, unknown>;
      cookies: Record<string, string>;
    },
    res: {
      redirect: (url: string) => void;
      clearCookie: (name: string) => void;
      status: (code: number) => { json: (data: unknown) => void };
      json: (data: unknown) => void;
    }
  ) => Promise<void>;

  getProviders: (
    req: unknown,
    res: { json: (data: unknown) => void }
  ) => void;
}

export function createOAuthMiddleware(config: OAuthMiddlewareConfig): OAuthRouteHandlers {
  const client = new OAuthClient(config);
  const clientConfig = client.getConfig();

  const initiateAuth: OAuthRouteHandlers['initiateAuth'] = (req, res) => {
    const { provider } = req.params;

    try {
      const { url, state } = client.getAuthorizationUrl({ provider });

      res.cookie(clientConfig.stateCookieName!, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: (clientConfig.stateCookieMaxAge || 600) * 1000,
        sameSite: 'lax',
      });

      res.redirect(url);
    } catch (error) {
      if (config.onError) {
        config.onError(error as Error, {
          provider,
          error: error as Error,
          query: req.query as Record<string, string>,
        });
      }

      if (config.errorRedirect) {
        const errorUrl = new URL(config.errorRedirect);
        errorUrl.searchParams.set('error', (error as Error).message);
        errorUrl.searchParams.set('provider', provider);
        res.redirect(errorUrl.toString());
      } else {
        res.status(400).json({
          error: 'oauth_error',
          message: (error as Error).message,
          provider,
        });
      }
    }
  };

  const handleCallback: OAuthRouteHandlers['handleCallback'] = async (req, res) => {
    const { provider } = req.params;
    const { code, state, error: oauthError, error_description } = req.query as Record<
      string,
      string
    >;

    const storedState = req.cookies[clientConfig.stateCookieName!];
    res.clearCookie(clientConfig.stateCookieName!);

    if (oauthError) {
      const error = createOAuthError(
        error_description || oauthError,
        'OAUTH_PROVIDER_ERROR',
        provider
      );

      if (config.onError) {
        config.onError(error, {
          provider,
          error,
          query: req.query as Record<string, string>,
        });
      }

      if (config.errorRedirect) {
        const errorUrl = new URL(config.errorRedirect);
        errorUrl.searchParams.set('error', oauthError);
        if (error_description) {
          errorUrl.searchParams.set('error_description', error_description);
        }
        errorUrl.searchParams.set('provider', provider);
        res.redirect(errorUrl.toString());
      } else {
        res.status(400).json({
          error: 'oauth_error',
          message: error_description || oauthError,
          provider,
        });
      }
      return;
    }

    if (!verifyState(storedState, state)) {
      const error = createOAuthError('Invalid state parameter', 'INVALID_STATE', provider);

      if (config.onError) {
        config.onError(error, {
          provider,
          error,
          query: req.query as Record<string, string>,
        });
      }

      if (config.errorRedirect) {
        const errorUrl = new URL(config.errorRedirect);
        errorUrl.searchParams.set('error', 'invalid_state');
        errorUrl.searchParams.set('provider', provider);
        res.redirect(errorUrl.toString());
      } else {
        res.status(400).json({
          error: 'invalid_state',
          message: 'Invalid state parameter',
          provider,
        });
      }
      return;
    }

    if (!code) {
      const error = createOAuthError('Missing authorization code', 'MISSING_CODE', provider);

      if (config.onError) {
        config.onError(error, {
          provider,
          error,
          query: req.query as Record<string, string>,
        });
      }

      if (config.errorRedirect) {
        const errorUrl = new URL(config.errorRedirect);
        errorUrl.searchParams.set('error', 'missing_code');
        errorUrl.searchParams.set('provider', provider);
        res.redirect(errorUrl.toString());
      } else {
        res.status(400).json({
          error: 'missing_code',
          message: 'Missing authorization code',
          provider,
        });
      }
      return;
    }

    try {
      const profile = await client.handleCallback({ provider, code });

      const result = await config.onSuccess(profile, {
        provider,
        profile,
        query: req.query as Record<string, string>,
      });

      if (config.successRedirect) {
        res.redirect(config.successRedirect);
      } else {
        res.json({ success: true, data: result });
      }
    } catch (error) {
      if (config.onError) {
        config.onError(error as Error, {
          provider,
          error: error as Error,
          query: req.query as Record<string, string>,
        });
      }

      if (config.errorRedirect) {
        const errorUrl = new URL(config.errorRedirect);
        errorUrl.searchParams.set('error', 'callback_failed');
        errorUrl.searchParams.set('message', (error as Error).message);
        errorUrl.searchParams.set('provider', provider);
        res.redirect(errorUrl.toString());
      } else {
        res.status(500).json({
          error: 'callback_failed',
          message: (error as Error).message,
          provider,
        });
      }
    }
  };

  const getProviders: OAuthRouteHandlers['getProviders'] = (_req, res) => {
    const configuredProviders = Object.keys(config.providers);
    const availableProviders = getProviderIds().filter((id) => configuredProviders.includes(id));
    res.json({ providers: availableProviders });
  };

  return {
    initiateAuth,
    handleCallback,
    getProviders,
  };
}

export { generateState, verifyState };
