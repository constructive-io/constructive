import type {
  IdentityProviderConfig,
  IdentityProvidersModule,
} from '@constructive-io/express-context';
import {
  getProvider,
  OAuthClient,
  type OAuthProviderRuntimeConfig,
  resolveOAuthProvider,
} from '@constructive-io/oauth';

const PHASE_ONE_PROVIDERS = new Set(['google', 'github']);

export interface DiscoverableOAuthProvider {
  slug: string;
  displayName: string;
}

export const isPhaseOneOAuthProvider = (slug: string): boolean =>
  PHASE_ONE_PROVIDERS.has(slug) && Boolean(getProvider(slug));

export const toOAuthRuntimeConfig = (
  provider: IdentityProviderConfig
): OAuthProviderRuntimeConfig => ({
  slug: provider.slug,
  displayName: provider.displayName,
  enabled: provider.enabled,
  clientId: provider.clientId,
  clientSecret: provider.clientSecret,
  authorizationUrl: provider.authorizationUrl,
  tokenUrl: provider.tokenUrl,
  userinfoUrl: provider.userinfoUrl,
  scopes: provider.scopes,
  extraAuthorizationParams: provider.extraAuthorizationParams,
  pkceEnabled: provider.pkceEnabled,
});

export const listDiscoverableOAuthProviders = (
  module: IdentityProvidersModule | undefined
): DiscoverableOAuthProvider[] => {
  if (!module) return [];
  return Object.values(module.providers)
    .filter(
      (provider) => provider.enabled && isPhaseOneOAuthProvider(provider.slug)
    )
    .map((provider) => {
      resolveOAuthProvider({
        providerId: provider.slug,
        runtimeConfig: toOAuthRuntimeConfig(provider),
      });
      return { slug: provider.slug, displayName: provider.displayName };
    })
    .sort((left, right) => left.slug.localeCompare(right.slug));
};

export const createOAuthClientForProvider = (
  provider: IdentityProviderConfig,
  baseUrl: string
): OAuthClient =>
  new OAuthClient({
    providers: { [provider.slug]: toOAuthRuntimeConfig(provider) },
    baseUrl,
    callbackPath: '/auth/{provider}/callback',
  });
