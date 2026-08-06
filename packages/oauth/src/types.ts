import type { ConstructiveError } from '@constructive-io/errors';

export type OAuthProviderId = 'google' | 'github' | 'facebook' | 'linkedin';
export type OAuthTokenRequestContentType = 'json' | 'form';
export type OAuthTokenEndpointAuthMethod =
  'client_secret_post' | 'client_secret_basic';

/** Static, provider-owned protocol behavior. Tenant credentials never live here. */
export interface OAuthProviderConfig {
  id: OAuthProviderId;
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  tokenEndpointAuthMethod: OAuthTokenEndpointAuthMethod;
  tokenRequestContentType?: OAuthTokenRequestContentType;
  userInfoMethod?: 'GET' | 'POST';
  mapProfile: (data: unknown) => OAuthProfile;
}

/** Minimal normalized identity metadata. Raw provider payloads are never retained. */
export interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string | null;
  emailVerified: boolean | null;
  name: string | null;
  picture: string | null;
}

/** Tenant-owned values resolved from the request context/internal-secrets loader. */
export interface OAuthProviderRuntimeConfig {
  slug?: string;
  displayName?: string;
  enabled?: boolean;
  clientId: string;
  clientSecret: string | null;
  redirectUri?: string;
  authorizationUrl?: string | null;
  tokenUrl?: string | null;
  userinfoUrl?: string | null;
  scopes?: string[] | null;
  extraAuthorizationParams?: Record<string, string>;
  pkceEnabled?: boolean;
  tokenEndpointAuthMethod?: OAuthTokenEndpointAuthMethod;
  tokenRequestContentType?: OAuthTokenRequestContentType;
  userInfoMethod?: 'GET' | 'POST';
}

export interface OAuthProviderResolvedConfig {
  slug: string;
  displayName: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  authorizationUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  scopes: string[];
  extraAuthorizationParams: Record<string, string>;
  tokenEndpointAuthMethod: OAuthTokenEndpointAuthMethod;
  tokenRequestContentType: OAuthTokenRequestContentType;
  userInfoMethod: 'GET' | 'POST';
}

export interface ResolvedOAuthProvider {
  providerId: OAuthProviderId;
  config: OAuthProviderResolvedConfig;
  provider: OAuthProviderConfig;
}

/** Backwards-compatible name for callers that build a client from credentials. */
export type OAuthCredentials = OAuthProviderRuntimeConfig;

export interface OAuthClientConfig {
  providers: Record<string, OAuthProviderRuntimeConfig>;
  baseUrl: string;
  callbackPath?: string;
  /** Server-side provider request timeout; defaults to 10 seconds. */
  requestTimeoutMs?: number;
}

export interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface AuthorizationUrlParams {
  provider: string;
  state?: string;
  redirectUri?: string;
  scopes?: string[];
  /** Caller-supplied verifier when state must bind the challenge before URL creation. */
  codeVerifier?: string;
}

export interface AuthorizationUrlResult {
  url: string;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
}

export interface CallbackParams {
  provider: string;
  code: string;
  redirectUri?: string;
  codeVerifier: string;
}

export type OAuthError = ConstructiveError;
