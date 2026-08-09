import type { ProviderAdapter } from '../adapter';
import {
  createAuthorizationUrl,
  validateProviderCallbackUri
} from '../authorization';
import { validateProviderEndpoint } from '../endpoint';
import { requestProviderJson } from '../http';
import { deriveS256CodeChallenge } from '../primitives';
import {
  type IdentityProviderConfiguration,
  type NormalizedExternalIdentity,
  ProviderAdapterError,
  type ValidatedEndpoint,
  type ValidatedProviderConfiguration
} from '../types';
import {
  compactProfile,
  configurationValue,
  isRecord,
  requiredString,
  safeAvatarUrl,
  safeProfileValue,
  validateCommonConfiguration
} from './common';

const GITHUB_AUTHORIZATION_ENDPOINTS = [
  'https://github.com/login/oauth/authorize'
] as const;
const GITHUB_TOKEN_ENDPOINTS = [
  'https://github.com/login/oauth/access_token'
] as const;
const GITHUB_USER_ENDPOINTS = ['https://api.github.com/user'] as const;
const GITHUB_EMAIL_ENDPOINTS = ['https://api.github.com/user/emails'] as const;

export interface ValidatedGitHubConfiguration
  extends ValidatedProviderConfiguration {
  userEndpoint: ValidatedEndpoint;
  emailEndpoint: ValidatedEndpoint;
}

const validateGitHubConfiguration = (
  input: IdentityProviderConfiguration
): ValidatedGitHubConfiguration => {
  const authorizationEndpoint = validateProviderEndpoint(
    configurationValue(input, input.authorizationUrl, 'authorization_endpoint'),
    GITHUB_AUTHORIZATION_ENDPOINTS
  );
  const tokenEndpoint = validateProviderEndpoint(
    configurationValue(input, input.tokenUrl, 'token_endpoint'),
    GITHUB_TOKEN_ENDPOINTS
  );
  const userEndpoint = validateProviderEndpoint(
    configurationValue(input, input.userinfoUrl, 'userinfo_endpoint'),
    GITHUB_USER_ENDPOINTS
  );
  const configuredEmailEndpoint = configurationValue(
    input,
    null,
    'emails_endpoint'
  );
  const emailEndpoint = validateProviderEndpoint(
    configuredEmailEndpoint ?? `${userEndpoint}/emails`,
    GITHUB_EMAIL_ENDPOINTS
  );

  return {
    ...validateCommonConfiguration(
      input,
      'github',
      authorizationEndpoint,
      tokenEndpoint
    ),
    userEndpoint,
    emailEndpoint
  };
};

const githubHeaders = (accessToken?: string): Record<string, string> => ({
  Accept: 'application/vnd.github+json',
  'User-Agent': 'Constructive-OAuth',
  ...(accessToken && { Authorization: `Bearer ${accessToken}` })
});

const findEmail = (
  response: unknown
): { email?: string; verified?: boolean } => {
  if (!Array.isArray(response)) {
    throw new ProviderAdapterError(
      'INVALID_RESPONSE',
      'GitHub returned an invalid email response.'
    );
  }
  const emails = response.filter(isRecord);
  const selected =
    emails.find(value => value.primary === true && value.verified === true) ??
    emails.find(value => value.verified === true) ??
    emails.find(value => typeof value.email === 'string');
  return selected
    ? {
      email: safeProfileValue(selected.email),
      verified:
        typeof selected.verified === 'boolean' ? selected.verified : undefined
    }
    : {};
};

export const githubAdapter: ProviderAdapter<ValidatedGitHubConfiguration> = {
  kind: 'github',

  validateConfiguration: validateGitHubConfiguration,

  createAuthorizationRequest: input => ({
    url: createAuthorizationUrl({
      endpoint: input.config.authorizationEndpoint,
      clientId: input.config.clientId,
      redirectUri: input.redirectUri,
      scopes: input.config.scopes,
      state: input.state,
      codeChallenge: input.codeChallenge,
      extraParameters: input.config.extraAuthorizationParams
    })
  }),

  completeAuthorization: async input => {
    deriveS256CodeChallenge(input.codeVerifier);
    validateProviderCallbackUri(input.redirectUri);
    if (!input.code) {
      throw new ProviderAdapterError(
        'INVALID_AUTHORIZATION_INPUT',
        'GitHub callback verification requires an authorization code.'
      );
    }
    const tokenResponse = await requestProviderJson(
      input.config.tokenEndpoint,
      {
        method: 'POST',
        headers: {
          ...githubHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: input.config.clientId,
          client_secret: input.config.clientSecret,
          code: input.code,
          code_verifier: input.codeVerifier,
          redirect_uri: input.redirectUri
        }).toString()
      },
      { timeoutMs: input.requestTimeoutMs, fetch: input.fetch }
    );
    if (!isRecord(tokenResponse)) {
      throw new ProviderAdapterError(
        'INVALID_RESPONSE',
        'GitHub returned an invalid token response.'
      );
    }
    const accessToken = requiredString(tokenResponse, 'access_token');

    const user = await requestProviderJson(
      input.config.userEndpoint,
      { headers: githubHeaders(accessToken) },
      { timeoutMs: input.requestTimeoutMs, fetch: input.fetch }
    );
    if (!isRecord(user)) {
      throw new ProviderAdapterError(
        'INVALID_RESPONSE',
        'GitHub returned an invalid profile response.'
      );
    }
    const id = user.id;
    if (
      (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) &&
      (typeof id !== 'string' || !id)
    ) {
      throw new ProviderAdapterError(
        'INVALID_RESPONSE',
        'GitHub returned an invalid stable identifier.'
      );
    }

    let email = safeProfileValue(user.email);
    let emailVerified: boolean | undefined;
    if (!email) {
      const emailResult = findEmail(
        await requestProviderJson(
          input.config.emailEndpoint,
          { headers: githubHeaders(accessToken) },
          { timeoutMs: input.requestTimeoutMs, fetch: input.fetch }
        )
      );
      email = emailResult.email;
      emailVerified = emailResult.verified;
    }

    return {
      providerKey: input.config.providerKey,
      subject: String(id),
      email,
      profile: compactProfile({
        name: safeProfileValue(user.name),
        username: safeProfileValue(user.login),
        avatarUrl: safeAvatarUrl(user.avatar_url),
        emailVerified
      })
    } satisfies NormalizedExternalIdentity;
  }
};
