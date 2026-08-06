import { errors } from '@constructive-io/errors';

import { resolveOAuthProvider } from './provider-resolver';
import { selectGitHubEmail } from './providers';
import type {
  AuthorizationUrlParams,
  AuthorizationUrlResult,
  CallbackParams,
  OAuthClientConfig,
  OAuthProfile,
  ResolvedOAuthProvider,
  TokenResponse,
} from './types';
import { assertSafeOAuthFetchEndpoint } from './utils/endpoint';
import { deriveCodeChallenge, generateCodeVerifier } from './utils/pkce';
import { generateState } from './utils/state';

const RESERVED_AUTHORIZATION_PARAMS = new Set([
  'client_id',
  'redirect_uri',
  'response_type',
  'scope',
  'state',
  'code_challenge',
  'code_challenge_method',
]);
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

function createBasicAuthorizationHeader(
  clientId: string,
  clientSecret: string
): string {
  const encode = (value: string) =>
    new URLSearchParams([['value', value]]).toString().slice('value='.length);
  return `Basic ${Buffer.from(`${encode(clientId)}:${encode(clientSecret)}`).toString('base64')}`;
}

function deriveGitHubEmailsUrl(userinfoUrl: string): string {
  const url = new URL(userinfoUrl);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/emails`;
  return url.toString();
}

export class OAuthClient {
  private readonly config: OAuthClientConfig;

  constructor(config: OAuthClientConfig) {
    const requestTimeoutMs =
      config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    if (
      !Number.isFinite(requestTimeoutMs) ||
      requestTimeoutMs < 1 ||
      requestTimeoutMs > 60_000
    ) {
      throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED({});
    }
    this.config = {
      callbackPath: '/auth/{provider}/callback',
      ...config,
      requestTimeoutMs,
    };
  }

  getAuthorizationUrl(params: AuthorizationUrlParams): AuthorizationUrlResult {
    const { config } = this.resolveProvider(params.provider);
    const state = params.state ?? generateState();
    const callbackUrl = this.getCallbackUrl(
      params.provider,
      params.redirectUri ?? config.redirectUri
    );
    const codeVerifier = params.codeVerifier ?? generateCodeVerifier();
    const codeChallenge = deriveCodeChallenge(codeVerifier);
    const url = new URL(config.authorizationUrl);

    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', (params.scopes ?? config.scopes).join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    for (const [key, value] of Object.entries(
      config.extraAuthorizationParams
    )) {
      if (key && !RESERVED_AUTHORIZATION_PARAMS.has(key.toLowerCase())) {
        url.searchParams.set(key, value);
      }
    }

    return { url: url.toString(), state, codeVerifier, codeChallenge };
  }

  async exchangeCode(params: CallbackParams): Promise<TokenResponse> {
    const { config } = this.resolveProvider(params.provider);
    deriveCodeChallenge(params.codeVerifier);

    const body: Record<string, string> = {
      code: params.code,
      redirect_uri: this.getCallbackUrl(
        params.provider,
        params.redirectUri ?? config.redirectUri
      ),
      grant_type: 'authorization_code',
      code_verifier: params.codeVerifier,
    };
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (config.tokenEndpointAuthMethod === 'client_secret_basic') {
      headers.Authorization = createBasicAuthorizationHeader(
        config.clientId,
        config.clientSecret
      );
    } else {
      body.client_id = config.clientId;
      body.client_secret = config.clientSecret;
    }

    let requestBody: string;
    if (config.tokenRequestContentType === 'json') {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    } else {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      requestBody = new URLSearchParams(body).toString();
    }

    let response: Response;
    try {
      await assertSafeOAuthFetchEndpoint(config.tokenUrl);
      response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers,
        body: requestBody,
        redirect: 'error',
        signal: AbortSignal.timeout(this.config.requestTimeoutMs!),
      });
    } catch (cause) {
      throw errors.OAUTH_TOKEN_EXCHANGE_FAILED(undefined, undefined, cause);
    }
    if (!response.ok) {
      throw errors.OAUTH_TOKEN_EXCHANGE_FAILED(
        undefined,
        undefined,
        new Error(`Identity provider returned HTTP ${response.status}`)
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (cause) {
      throw errors.OAUTH_TOKEN_EXCHANGE_FAILED(undefined, undefined, cause);
    }
    if (!isTokenResponse(data)) throw errors.OAUTH_TOKEN_EXCHANGE_FAILED();
    return data;
  }

  async getUserProfile(
    providerId: string,
    accessToken: string
  ): Promise<OAuthProfile> {
    const { config, provider } = this.resolveProvider(providerId);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    };
    if (providerId === 'github') headers['User-Agent'] = 'Constructive-OAuth';

    const data = await this.fetchJson(
      config.userinfoUrl,
      config.userInfoMethod,
      headers
    );
    let profile: OAuthProfile;
    try {
      profile = provider.mapProfile(data);
    } catch (cause) {
      throw errors.OAUTH_PROFILE_FAILED(undefined, undefined, cause);
    }
    if (!profile.providerId) throw errors.OAUTH_PROFILE_FAILED();

    if (providerId === 'github' && !profile.email) {
      profile = await this.fetchGitHubEmail(
        accessToken,
        profile,
        config.userinfoUrl
      );
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
      throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED({});
    }
    return resolveOAuthProvider({
      providerId,
      runtimeConfig: { slug: providerId, ...runtimeConfig },
    });
  }

  private async fetchJson(
    url: string,
    method: 'GET' | 'POST',
    headers: Record<string, string>
  ): Promise<unknown> {
    let response: Response;
    try {
      await assertSafeOAuthFetchEndpoint(url);
      response = await fetch(url, {
        method,
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(this.config.requestTimeoutMs!),
      });
    } catch (cause) {
      throw errors.OAUTH_PROFILE_FAILED(undefined, undefined, cause);
    }
    if (!response.ok) {
      throw errors.OAUTH_PROFILE_FAILED(
        undefined,
        undefined,
        new Error(`Identity provider returned HTTP ${response.status}`)
      );
    }
    try {
      return await response.json();
    } catch (cause) {
      throw errors.OAUTH_PROFILE_FAILED(undefined, undefined, cause);
    }
  }

  private async fetchGitHubEmail(
    accessToken: string,
    profile: OAuthProfile,
    userinfoUrl: string
  ): Promise<OAuthProfile> {
    const data = await this.fetchJson(
      deriveGitHubEmailsUrl(userinfoUrl),
      'GET',
      {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'User-Agent': 'Constructive-OAuth',
      }
    );
    if (!Array.isArray(data)) throw errors.OAUTH_PROFILE_FAILED();
    const selected = selectGitHubEmail(data);
    return selected
      ? { ...profile, email: selected.email, emailVerified: selected.verified }
      : profile;
  }

  private getCallbackUrl(
    providerId: string,
    customRedirectUri?: string
  ): string {
    if (customRedirectUri) return customRedirectUri;
    const path = this.config.callbackPath!.replace('{provider}', providerId);
    return new URL(path, this.config.baseUrl).toString();
  }

  getConfig(): OAuthClientConfig {
    return this.config;
  }
}

function isTokenResponse(value: unknown): value is TokenResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).access_token === 'string' &&
    Boolean((value as Record<string, unknown>).access_token)
  );
}

export function createOAuthClient(config: OAuthClientConfig): OAuthClient {
  return new OAuthClient(config);
}
