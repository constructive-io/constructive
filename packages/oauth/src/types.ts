export type OAuthProviderKind = 'oauth2' | 'oidc';

export type OAuthTokenRequestContentType = 'json' | 'form';

export type OAuthTokenEndpointAuthMethod =
  | 'client_secret_post'
  | 'client_secret_basic'
  | 'private_key_jwt'
  | 'none';

export interface OAuthProviderConfig {
  id: string;
  name: string;
  kind: OAuthProviderKind;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  tokenRequestContentType?: OAuthTokenRequestContentType;
  userInfoMethod?: 'GET' | 'POST';
  mapProfile: (data: unknown) => OAuthProfile;
}

export interface OAuthProviderRuntimeConfig {
  slug?: string;
  kind?: OAuthProviderKind;
  displayName?: string;
  enabled?: boolean;

  clientId: string;
  clientSecret?: string;
  clientSecretRef?: string;
  redirectUri?: string;

  authorizationUrl?: string | null;
  tokenUrl?: string | null;
  userinfoUrl?: string | null;
  userInfoUrl?: string | null;

  scopes?: string[] | null;
  pkceEnabled?: boolean;
  tokenEndpointAuthMethod?: OAuthTokenEndpointAuthMethod;
  tokenRequestContentType?: OAuthTokenRequestContentType;
  userInfoMethod?: 'GET' | 'POST';

  authorizationParams?: Record<string, string>;
  tokenParams?: Record<string, string>;
  options?: Record<string, unknown>;
}

export interface OAuthProviderResolvedConfig {
  slug: string;
  kind: OAuthProviderKind;
  displayName: string;
  enabled: boolean;

  clientId: string;
  clientSecret?: string;
  redirectUri?: string;

  authorizationUrl: string;
  tokenUrl: string;
  userinfoUrl: string;

  scopes: string[];
  pkceEnabled: boolean;
  tokenEndpointAuthMethod: OAuthTokenEndpointAuthMethod;
  tokenRequestContentType: OAuthTokenRequestContentType;
  userInfoMethod: 'GET' | 'POST';

  authorizationParams: Record<string, string>;
  tokenParams: Record<string, string>;
  options: Record<string, unknown>;
}

export interface ResolvedOAuthProvider {
  providerId: string;
  config: OAuthProviderResolvedConfig;
  provider: OAuthProviderConfig;
}

export interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  /** Whether the email is verified by the provider. null if unknown/unsupported. */
  emailVerified: boolean | null;
  raw: unknown;
}

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

type OAuthClientProviderConfigBase = Omit<
  OAuthProviderRuntimeConfig,
  'clientSecret' | 'tokenEndpointAuthMethod'
>;

export type OAuthClientProviderConfig =
  | (OAuthClientProviderConfigBase & {
      tokenEndpointAuthMethod?: 'client_secret_post' | 'client_secret_basic';
      clientSecret: string;
    })
  | (OAuthClientProviderConfigBase & {
      tokenEndpointAuthMethod: 'none';
      clientSecret?: string;
    })
  | (OAuthClientProviderConfigBase & {
      tokenEndpointAuthMethod: 'private_key_jwt';
      clientSecret?: string;
    });

export interface OAuthClientConfig {
  providers: Record<string, OAuthClientProviderConfig>;
  baseUrl: string;
  callbackPath?: string;
  stateCookieName?: string;
  stateCookieMaxAge?: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface AuthorizationUrlParams {
  provider: string;
  state?: string;
  redirectUri?: string;
  scopes?: string[];
}

export interface AuthorizationUrlResult {
  url: string;
  state: string;
  codeVerifier?: string;
}

export interface CallbackParams {
  provider: string;
  code: string;
  redirectUri?: string;
  codeVerifier?: string;
}

export interface OAuthError extends Error {
  code: string;
  provider?: string;
  statusCode?: number;
}

export function createOAuthError(
  message: string,
  code: string,
  provider?: string,
  statusCode?: number
): OAuthError {
  const error = new Error(message) as OAuthError;
  error.code = code;
  error.provider = provider;
  error.statusCode = statusCode;
  return error;
}
