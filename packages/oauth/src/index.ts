export {
  OAuthProviderConfig,
  OAuthProviderKind,
  OAuthTokenRequestContentType,
  OAuthTokenEndpointAuthMethod,
  OAuthProviderRuntimeConfig,
  OAuthProviderResolvedConfig,
  ResolvedOAuthProvider,
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
export { resolveOAuthProvider } from './provider-resolver';

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
  CreateSignedStateOptions,
  VerifySignedStateOptions,
  SignedStatePayload,
  createSignedState,
  verifySignedState,
} from './utils/signed-state';
