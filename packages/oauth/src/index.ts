export {
  OAuthProviderConfig,
  OAuthProfile,
  OAuthCredentials,
  OAuthClientConfig,
  TokenResponse,
  AuthorizationUrlParams,
  CallbackParams,
  OAuthError,
  createOAuthError,
} from './types';

export { OAuthClient, createOAuthClient } from './oauth-client';

export {
  providers,
  getProvider,
  getProviderIds,
  googleProvider,
  githubProvider,
  facebookProvider,
  linkedinProvider,
} from './providers';

export {
  createOAuthMiddleware,
  OAuthMiddlewareConfig,
  OAuthCallbackContext,
  OAuthErrorContext,
  OAuthRouteHandlers,
  generateState,
  verifyState,
} from './middleware/express';
