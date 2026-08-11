import { isOpaqueOAuthValue } from './primitives';
import type { ValidatedEndpoint } from './types';
import { ProviderAdapterError } from './types';

const PROTECTED_PARAMETERS = new Set([
  'client_id',
  'code_challenge',
  'code_challenge_method',
  'nonce',
  'redirect_uri',
  'response_type',
  'scope',
  'state'
]);

export interface AuthorizationUrlInput {
  endpoint: ValidatedEndpoint;
  clientId: string;
  redirectUri: string;
  scopes: readonly string[];
  state: string;
  codeChallenge: string;
  nonce?: string;
  extraParameters?: Readonly<Record<string, string>>;
}

export const validateProviderCallbackUri = (value: string): string => {
  let redirectUri: URL;
  try {
    redirectUri = new URL(value);
  } catch (cause) {
    throw new ProviderAdapterError(
      'INVALID_AUTHORIZATION_INPUT',
      'The Provider callback URI is invalid.',
      { cause }
    );
  }
  if (
    redirectUri.protocol !== 'https:' ||
    redirectUri.username ||
    redirectUri.password ||
    redirectUri.hash
  ) {
    throw new ProviderAdapterError(
      'INVALID_AUTHORIZATION_INPUT',
      'The Provider callback URI is invalid.'
    );
  }
  return redirectUri.toString();
};

export const createAuthorizationUrl = (input: AuthorizationUrlInput): string => {
  const redirectUri = validateProviderCallbackUri(input.redirectUri);
  if (
    !isOpaqueOAuthValue(input.state) ||
    !isOpaqueOAuthValue(input.codeChallenge) ||
    (input.nonce !== undefined && !isOpaqueOAuthValue(input.nonce))
  ) {
    throw new ProviderAdapterError(
      'INVALID_AUTHORIZATION_INPUT',
      'The Provider authorization input is invalid.'
    );
  }

  const url = new URL(input.endpoint);
  for (const [key, value] of Object.entries(input.extraParameters ?? {})) {
    if (PROTECTED_PARAMETERS.has(key.toLowerCase())) {
      throw new ProviderAdapterError(
        'INVALID_CONFIGURATION',
        `The Provider parameter "${key}" is owned by the OAuth flow.`
      );
    }
    url.searchParams.set(key, value);
  }

  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', input.scopes.join(' '));
  url.searchParams.set('state', input.state);
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  if (input.nonce) url.searchParams.set('nonce', input.nonce);

  return url.toString();
};
