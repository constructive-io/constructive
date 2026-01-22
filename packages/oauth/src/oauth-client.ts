import {
  OAuthClientConfig,
  OAuthCredentials,
  OAuthProfile,
  TokenResponse,
  AuthorizationUrlParams,
  CallbackParams,
  createOAuthError,
} from './types';
import { getProvider, GITHUB_EMAILS_URL, extractPrimaryEmail } from './providers';
import { generateState } from './utils/state';

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

  getAuthorizationUrl(params: AuthorizationUrlParams): { url: string; state: string } {
    const { provider: providerId, state: customState, redirectUri, scopes } = params;

    const provider = getProvider(providerId);
    if (!provider) {
      throw createOAuthError(`Unknown provider: ${providerId}`, 'UNKNOWN_PROVIDER', providerId);
    }

    const credentials = this.config.providers[providerId];
    if (!credentials) {
      throw createOAuthError(
        `No credentials configured for provider: ${providerId}`,
        'MISSING_CREDENTIALS',
        providerId
      );
    }

    const state = customState || generateState();
    const callbackUrl = this.getCallbackUrl(providerId, redirectUri || credentials.redirectUri);
    const effectiveScopes = scopes || provider.scopes;

    const url = new URL(provider.authorizationUrl);
    url.searchParams.set('client_id', credentials.clientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', effectiveScopes.join(' '));
    url.searchParams.set('state', state);

    return { url: url.toString(), state };
  }

  async exchangeCode(params: CallbackParams): Promise<TokenResponse> {
    const { provider: providerId, code, redirectUri } = params;

    const provider = getProvider(providerId);
    if (!provider) {
      throw createOAuthError(`Unknown provider: ${providerId}`, 'UNKNOWN_PROVIDER', providerId);
    }

    const credentials = this.config.providers[providerId];
    if (!credentials) {
      throw createOAuthError(
        `No credentials configured for provider: ${providerId}`,
        'MISSING_CREDENTIALS',
        providerId
      );
    }

    const callbackUrl = this.getCallbackUrl(providerId, redirectUri || credentials.redirectUri);

    const body: Record<string, string> = {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code',
    };

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    let requestBody: string;
    if (provider.tokenRequestContentType === 'json') {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    } else {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      requestBody = new URLSearchParams(body).toString();
    }

    const response = await fetch(provider.tokenUrl, {
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
    const provider = getProvider(providerId);
    if (!provider) {
      throw createOAuthError(`Unknown provider: ${providerId}`, 'UNKNOWN_PROVIDER', providerId);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    };

    if (providerId === 'github') {
      headers['User-Agent'] = 'Constructive-OAuth';
    }

    const response = await fetch(provider.userInfoUrl, {
      method: provider.userInfoMethod || 'GET',
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
    let profile = provider.mapProfile(data);

    if (providerId === 'github' && !profile.email) {
      profile = await this.fetchGitHubEmail(accessToken, profile);
    }

    return profile;
  }

  async handleCallback(params: CallbackParams): Promise<OAuthProfile> {
    const tokens = await this.exchangeCode(params);
    return this.getUserProfile(params.provider, tokens.access_token);
  }

  private async fetchGitHubEmail(
    accessToken: string,
    profile: OAuthProfile
  ): Promise<OAuthProfile> {
    try {
      const response = await fetch(GITHUB_EMAILS_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'User-Agent': 'Constructive-OAuth',
        },
      });

      if (response.ok) {
        const emails = await response.json();
        const email = extractPrimaryEmail(emails);
        if (email) {
          return { ...profile, email };
        }
      }
    } catch {
      // Ignore email fetch errors, return profile without email
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
