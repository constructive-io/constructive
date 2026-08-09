import { errors } from '@constructive-io/errors';
import type {
  ConstructiveContext,
  IdentityProviderConfig,
  IdentityProvidersModule
} from '@constructive-io/express-context';
import {
  getProviderAdapter,
  getProviderAdapterKinds,
  type IdentityProviderConfiguration,
  type ProviderAdapter,
  type ValidatedProviderConfiguration
} from '@constructive-io/oauth';

import type { ProviderDisplayOption } from './types';

export const toOAuthConfiguration = (
  provider: IdentityProviderConfig
): IdentityProviderConfiguration => ({
  slug: provider.slug,
  kind: provider.kind,
  displayName: provider.displayName,
  enabled: provider.enabled,
  clientId: provider.clientId,
  clientSecret: provider.clientSecret,
  authorizationUrl: provider.authorizationUrl,
  tokenUrl: provider.tokenUrl,
  userinfoUrl: provider.userinfoUrl,
  issuerUrl: provider.issuerUrl,
  discoveryDoc: provider.discoveryDoc,
  jwks: provider.jwks,
  acceptableClientIds: provider.acceptableClientIds,
  scopes: provider.scopes,
  extraAuthorizationParams: provider.extraAuthorizationParams,
  emailOptional: provider.emailOptional,
  skipNonceCheck: provider.skipNonceCheck,
  pkceEnabled: provider.pkceEnabled
});

const validateProvider = (
  provider: IdentityProviderConfig
): {
  adapter: ProviderAdapter;
  configuration: ValidatedProviderConfiguration;
} => {
  let adapter: ProviderAdapter;
  try {
    adapter = getProviderAdapter(provider.kind);
  } catch (cause) {
    throw errors.IDENTITY_PROVIDER_UNSUPPORTED({}, undefined, { cause });
  }

  try {
    return {
      adapter,
      configuration: adapter.validateConfiguration(
        toOAuthConfiguration(provider)
      )
    };
  } catch (cause) {
    throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED({}, undefined, { cause });
  }
};

export const resolveConfiguredProvider = async (
  context: ConstructiveContext,
  providerKey: string
): Promise<{
  adapter: ProviderAdapter;
  configuration: ValidatedProviderConfiguration;
}> => {
  const module = await context.useModule('identityProviders');
  const provider = module?.providers[providerKey];
  if (!provider || !provider.enabled) {
    throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED();
  }
  return validateProvider(provider);
};

const providerDisplayOptions = (
  module: IdentityProvidersModule | undefined
): ProviderDisplayOption[] => {
  if (!module) return [];
  const supportedKinds = new Set(getProviderAdapterKinds());
  const options: ProviderDisplayOption[] = [];

  for (const provider of Object.values(module.providers)) {
    if (!provider.enabled || !supportedKinds.has(provider.kind)) continue;
    validateProvider(provider);
    options.push({ key: provider.slug, displayName: provider.displayName });
  }

  return options.sort((left, right) =>
    left.displayName.localeCompare(right.displayName) ||
    left.key.localeCompare(right.key)
  );
};

export const loadProviderDisplayOptions = async (
  context: ConstructiveContext,
  oauthEnabled: boolean
): Promise<ProviderDisplayOption[]> => {
  if (!oauthEnabled) return [];
  const providers = await context.useModule('identityProviders');
  return providerDisplayOptions(providers);
};
