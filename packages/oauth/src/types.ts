export interface OAuthProviderConfig {
  id: string;
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  tokenRequestContentType?: 'json' | 'form';
  userInfoMethod?: 'GET' | 'POST';
  mapProfile: (data: unknown) => OAuthProfile;
}

export interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  raw: unknown;
}

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

export interface OAuthClientConfig {
  providers: Record<string, OAuthCredentials>;
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

export interface CallbackParams {
  provider: string;
  code: string;
  redirectUri?: string;
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
