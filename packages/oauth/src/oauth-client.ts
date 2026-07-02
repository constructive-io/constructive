import {
  OAuthClientConfig,
  OAuthProfile,
  ResolvedOAuthProvider,
  TokenResponse,
  AuthorizationUrlParams,
  AuthorizationUrlResult,
  CallbackParams,
  createOAuthError,
} from './types';
import { getProvider, selectGitHubEmail } from './providers';
import { resolveOAuthProvider } from './provider-resolver';
import { generateState } from './utils/state';
import { deriveCodeChallenge, generateCodeVerifier } from './utils/pkce';

const AUTHORIZATION_PARAM_RESERVED_KEYS = new Set([
  'client_id',
  'redirect_uri',
  'response_type',
  'scope',
  'state',
  'nonce',
  'code_challenge',
  'code_challenge_method',
]);

const TOKEN_PARAM_RESERVED_KEYS = new Set([
  'client_id',
  'client_secret',
  'code',
  'redirect_uri',
  'grant_type',
  'code_verifier',
]);

function applyAdditionalParams(
  target: URLSearchParams | Record<string, string>,
  params: Record<string, string>,
  reservedKeys: Set<string>,
): void {
  for (const [key, value] of Object.entries(params)) {
    if (!key || reservedKeys.has(key.toLowerCase())) continue;
    if (target instanceof URLSearchParams) {
      target.set(key, value);
    } else {
      target[key] = value;
    }
  }
}

function requireClientSecret(
  clientSecret: string | undefined,
  providerId: string,
): string {
  if (!clientSecret) {
    throw createOAuthError(
      `Provider ${providerId} missing required config: clientSecret`,
      'PROVIDER_CONFIG_INVALID',
      providerId,
    );
  }
  return clientSecret;
}

function formEncodeCredential(value: string): string {
  const encoded = new URLSearchParams([['value', value]]).toString();
  return encoded.slice('value='.length);
}

function createBasicAuthorizationHeader(
  clientId: string,
  clientSecret: string,
): string {
  const encodedClientId = formEncodeCredential(clientId);
  const encodedClientSecret = formEncodeCredential(clientSecret);
  return `Basic ${Buffer.from(`${encodedClientId}:${encodedClientSecret}`).toString('base64')}`;
}

function deriveGitHubEmailsUrl(userinfoUrl: string): string {
  const url = new URL(userinfoUrl);
  const pathname = url.pathname.replace(/\/$/, '');
  url.pathname = `${pathname}/emails`;
  return url.toString();
}

export class OAuthClient {
  private config: OAuthClientConfig;

  constructor(config: OAuthClientConfig) {
    this.config = {
      callbackPath: '/auth/{provider}/callback',
      stateCookieName: 'oauth_state',
      stateCookieMaxAge: 600,
      ...config,
    };
  }

  getAuthorizationUrl(params: AuthorizationUrlParams): AuthorizationUrlResult {
    const { provider: providerId, state: customState, redirectUri, scopes } = params;
    const { config } = this.resolveProvider(providerId);

    const state = customState || generateState();
    const callbackUrl = this.getCallbackUrl(providerId, redirectUri || config.redirectUri);
    const effectiveScopes = scopes || config.scopes;
    const codeVerifier = config.pkceEnabled ? generateCodeVerifier() : undefined;

    const url = new URL(config.authorizationUrl);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', effectiveScopes.join(' '));
    url.searchParams.set('state', state);
    if (codeVerifier) {
      url.searchParams.set('code_challenge', deriveCodeChallenge(codeVerifier));
      url.searchParams.set('code_challenge_method', 'S256');
    }
    applyAdditionalParams(
      url.searchParams,
      config.authorizationParams,
      AUTHORIZATION_PARAM_RESERVED_KEYS,
    );

    return { url: url.toString(), state, codeVerifier };
  }

  async exchangeCode(params: CallbackParams): Promise<TokenResponse> {
    const { provider: providerId, code, redirectUri, codeVerifier } = params;

    const { config } = this.resolveProvider(providerId);
    if (config.tokenEndpointAuthMethod === 'private_key_jwt') {
      throw createOAuthError(
        'Token endpoint auth method private_key_jwt is not supported',
        'TOKEN_AUTH_UNSUPPORTED',
        providerId,
      );
    }

    if (config.pkceEnabled && !codeVerifier) {
      throw createOAuthError(
        `PKCE code verifier is required for provider: ${providerId}`,
        'PKCE_VERIFIER_REQUIRED',
        providerId,
      );
    }

    const callbackUrl = this.getCallbackUrl(providerId, redirectUri || config.redirectUri);

    const body: Record<string, string> = {
      code,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code',
    };

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (config.tokenEndpointAuthMethod === 'client_secret_basic') {
      headers.Authorization = createBasicAuthorizationHeader(
        config.clientId,
        requireClientSecret(config.clientSecret, providerId),
      );
    } else {
      body.client_id = config.clientId;
      if (config.tokenEndpointAuthMethod === 'client_secret_post') {
        body.client_secret = requireClientSecret(config.clientSecret, providerId);
      }
    }

    if (config.pkceEnabled && codeVerifier) {
      body.code_verifier = codeVerifier;
    }
    applyAdditionalParams(body, config.tokenParams, TOKEN_PARAM_RESERVED_KEYS);

    let requestBody: string;
    if (config.tokenRequestContentType === 'json') {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    } else {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      requestBody = new URLSearchParams(body).toString();
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers,
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw createOAuthError(
        `Token exchange failed: ${errorText}`,
        'TOKEN_EXCHANGE_FAILED',
        providerId,
        response.status
      );
    }

    const data = await response.json();

    if (data.error) {
      throw createOAuthError(
        `Token exchange error: ${data.error_description || data.error}`,
        'TOKEN_EXCHANGE_ERROR',
        providerId
      );
    }

    return data as TokenResponse;
  }

  async getUserProfile(providerId: string, accessToken: string): Promise<OAuthProfile> {
    const { config, provider } = this.resolveProvider(providerId);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    };

    if (providerId === 'github') {
      headers['User-Agent'] = 'Constructive-OAuth';
    }

    const response = await fetch(config.userinfoUrl, {
      method: config.userInfoMethod,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw createOAuthError(
        `Failed to fetch user profile: ${errorText}`,
        'USER_PROFILE_FAILED',
        providerId,
        response.status
      );
    }

    const data = await response.json();
    const profile = provider.mapProfile(data);

    if (providerId === 'github') {
      return this.fetchGitHubEmail(accessToken, profile, config.userinfoUrl);
    }

    return profile;
  }

  async handleCallback(params: CallbackParams): Promise<OAuthProfile> {
    const tokens = await this.exchangeCode(params);
    return this.getUserProfile(params.provider, tokens.access_token);
  }

  private resolveProvider(providerId: string): ResolvedOAuthProvider {
    const runtimeConfig = this.config.providers[providerId];
    if (!runtimeConfig) {
      if (!getProvider(providerId)) {
        throw createOAuthError(
          `Unknown provider: ${providerId}`,
          'UNKNOWN_PROVIDER',
          providerId,
        );
      }
      throw createOAuthError(
        `No credentials configured for provider: ${providerId}`,
        'MISSING_CREDENTIALS',
        providerId,
      );
    }

    return resolveOAuthProvider({
      providerId,
      runtimeConfig: {
        slug: providerId,
        ...runtimeConfig,
      },
    });
  }

  private async fetchGitHubEmail(
    accessToken: string,
    profile: OAuthProfile,
    userinfoUrl: string,
  ): Promise<OAuthProfile> {
    try {
      const response = await fetch(deriveGitHubEmailsUrl(userinfoUrl), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'User-Agent': 'Constructive-OAuth',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (!Array.isArray(data)) {
          return profile;
        }

        const email = selectGitHubEmail(data, profile.email);
        if (email) {
          if (profile.email && email.email !== profile.email) {
            return profile;
          }

          return {
            ...profile,
            email: email.email,
            emailVerified: email.verified,
          };
        }
      }
    } catch {
      // Ignore email fetch errors, return profile without email verification details.
    }
    return profile;
  }

  private getCallbackUrl(providerId: string, customRedirectUri?: string): string {
    if (customRedirectUri) {
      return customRedirectUri;
    }
    const path = this.config.callbackPath!.replace('{provider}', providerId);
    return `${this.config.baseUrl}${path}`;
  }

  getConfig(): OAuthClientConfig {
    return this.config;
  }
}

export function createOAuthClient(config: OAuthClientConfig): OAuthClient {
  return new OAuthClient(config);
}
