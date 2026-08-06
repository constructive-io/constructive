import { errors } from '@constructive-io/errors';

import { getProvider } from './providers';
import type {
  OAuthProviderId,
  OAuthProviderResolvedConfig,
  OAuthProviderRuntimeConfig,
  ResolvedOAuthProvider,
} from './types';
import { assertSafeOAuthEndpoint } from './utils/endpoint';

const requireConfigString = (value: string | null | undefined): string => {
  if (!value || value.trim() !== value)
    throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED({});
  return value;
};

export function resolveOAuthProvider(ctx: {
  providerId: string;
  runtimeConfig: OAuthProviderRuntimeConfig;
}): ResolvedOAuthProvider {
  const provider = getProvider(ctx.providerId);
  if (!provider) throw errors.IDENTITY_PROVIDER_NOT_SUPPORTED();
  if (ctx.runtimeConfig.enabled === false)
    throw errors.IDENTITY_PROVIDER_DISABLED();
  if (ctx.runtimeConfig.pkceEnabled === false)
    throw errors.INVALID_OAUTH_PKCE();

  const config: OAuthProviderResolvedConfig = {
    slug: ctx.runtimeConfig.slug ?? ctx.providerId,
    displayName: ctx.runtimeConfig.displayName ?? provider.name,
    clientId: requireConfigString(ctx.runtimeConfig.clientId),
    clientSecret: requireConfigString(ctx.runtimeConfig.clientSecret),
    redirectUri: ctx.runtimeConfig.redirectUri,
    authorizationUrl: requireConfigString(
      ctx.runtimeConfig.authorizationUrl ?? provider.authorizationUrl
    ),
    tokenUrl: requireConfigString(
      ctx.runtimeConfig.tokenUrl ?? provider.tokenUrl
    ),
    userinfoUrl: requireConfigString(
      ctx.runtimeConfig.userinfoUrl ?? provider.userInfoUrl
    ),
    scopes: ctx.runtimeConfig.scopes?.length
      ? ctx.runtimeConfig.scopes
      : provider.scopes,
    extraAuthorizationParams: ctx.runtimeConfig.extraAuthorizationParams ?? {},
    tokenEndpointAuthMethod:
      ctx.runtimeConfig.tokenEndpointAuthMethod ??
      provider.tokenEndpointAuthMethod,
    tokenRequestContentType:
      ctx.runtimeConfig.tokenRequestContentType ??
      provider.tokenRequestContentType ??
      'form',
    userInfoMethod:
      ctx.runtimeConfig.userInfoMethod ?? provider.userInfoMethod ?? 'GET',
  };

  assertSafeOAuthEndpoint(config.authorizationUrl);
  assertSafeOAuthEndpoint(config.tokenUrl);
  assertSafeOAuthEndpoint(config.userinfoUrl);

  return { providerId: provider.id as OAuthProviderId, config, provider };
}
