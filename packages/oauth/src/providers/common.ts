import {
  type IdentityProviderConfiguration,
  ProviderAdapterError,
  type SafeExternalProfile,
  type ValidatedEndpoint,
  type ValidatedProviderConfiguration
} from '../types';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const optionalString = (
  input: Record<string, unknown>,
  key: string
): string | undefined => {
  const value = input[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

export const requiredString = (
  input: Record<string, unknown>,
  key: string
): string => {
  const value = optionalString(input, key);
  if (!value) {
    throw new ProviderAdapterError(
      'INVALID_RESPONSE',
      'The Provider response is missing a required value.'
    );
  }
  return value;
};

export const configurationValue = (
  config: IdentityProviderConfiguration,
  direct: string | null,
  discoveryKey: string
): string | null => {
  if (direct) return direct;
  const discovered = config.discoveryDoc?.[discoveryKey];
  return typeof discovered === 'string' ? discovered : null;
};

export const validateCommonConfiguration = (
  input: IdentityProviderConfiguration,
  adapterKind: string,
  authorizationEndpoint: ValidatedEndpoint,
  tokenEndpoint: ValidatedEndpoint
): ValidatedProviderConfiguration => {
  if (!input.enabled || !input.clientId || !input.clientSecret) {
    throw new ProviderAdapterError(
      'INVALID_CONFIGURATION',
      'The selected Provider is not enabled or is missing credentials.'
    );
  }
  if (!input.pkceEnabled) {
    throw new ProviderAdapterError(
      'INVALID_CONFIGURATION',
      'S256 PKCE is required for every Provider.'
    );
  }
  if (!input.scopes.length) {
    throw new ProviderAdapterError(
      'INVALID_CONFIGURATION',
      'The selected Provider has no configured scopes.'
    );
  }
  return {
    adapterKind,
    providerKey: input.slug,
    displayName: input.displayName,
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    authorizationEndpoint,
    tokenEndpoint,
    scopes: [...input.scopes],
    extraAuthorizationParams: { ...input.extraAuthorizationParams }
  };
};

export const safeProfileValue = (
  value: unknown,
  maxLength = 512
): string | undefined =>
  typeof value === 'string' && value.length > 0 && value.length <= maxLength
    ? value
    : undefined;

export const safeAvatarUrl = (value: unknown): string | undefined => {
  const candidate = safeProfileValue(value, 2048);
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
};

export const compactProfile = (profile: SafeExternalProfile): SafeExternalProfile =>
  Object.fromEntries(
    Object.entries(profile).filter(([, value]) => value !== undefined)
  ) as SafeExternalProfile;
