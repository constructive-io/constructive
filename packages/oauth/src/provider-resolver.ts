import { getProvider } from './providers';
import {
  OAuthProviderConfig,
  OAuthProviderResolvedConfig,
  OAuthProviderRuntimeConfig,
  ResolvedOAuthProvider,
  createOAuthError,
} from './types';
import { requireProviderConfigString } from './utils/config';

export function resolveOAuthProvider(ctx: {
  providerId: string;
  runtimeConfig: OAuthProviderRuntimeConfig;
  getProviderConfig?: (providerId: string) => OAuthProviderConfig | undefined;
}): ResolvedOAuthProvider {
  const provider = (ctx.getProviderConfig || getProvider)(ctx.providerId);
  if (!provider) {
    throw createOAuthError(
      `Unknown provider: ${ctx.providerId}`,
      'UNKNOWN_PROVIDER',
      ctx.providerId
    );
  }

  const runtimeConfig = {
    ...ctx.runtimeConfig,
    slug: ctx.runtimeConfig.slug || ctx.providerId,
  };

  if (runtimeConfig.enabled === false) {
    throw createOAuthError(
      `Provider ${ctx.providerId} is disabled`,
      'PROVIDER_DISABLED',
      ctx.providerId
    );
  }

  if (runtimeConfig.kind && runtimeConfig.kind !== provider.kind) {
    throw createOAuthError(
      `Provider ${ctx.providerId} kind ${runtimeConfig.kind} does not match provider kind ${provider.kind}`,
      'PROVIDER_CONFIG_INVALID',
      ctx.providerId
    );
  }

  const tokenEndpointAuthMethod =
    runtimeConfig.tokenEndpointAuthMethod ?? 'client_secret_post';
  const clientSecret =
    tokenEndpointAuthMethod === 'client_secret_post' ||
    tokenEndpointAuthMethod === 'client_secret_basic'
      ? requireProviderConfigString(
          runtimeConfig.clientSecret,
          'clientSecret',
          ctx.providerId
        )
      : runtimeConfig.clientSecret || undefined;

  const resolvedConfig: OAuthProviderResolvedConfig = {
    slug: runtimeConfig.slug,
    kind: runtimeConfig.kind || provider.kind,
    displayName: runtimeConfig.displayName || provider.name,
    enabled: runtimeConfig.enabled ?? true,
    clientId: requireProviderConfigString(
      runtimeConfig.clientId,
      'clientId',
      ctx.providerId
    ),
    clientSecret,
    redirectUri: runtimeConfig.redirectUri,
    authorizationUrl: requireProviderConfigString(
      runtimeConfig.authorizationUrl ?? provider.authorizationUrl,
      'authorizationUrl',
      ctx.providerId
    ),
    tokenUrl: requireProviderConfigString(
      runtimeConfig.tokenUrl ?? provider.tokenUrl,
      'tokenUrl',
      ctx.providerId
    ),
    userinfoUrl: requireProviderConfigString(
      runtimeConfig.userinfoUrl ??
        runtimeConfig.userInfoUrl ??
        provider.userInfoUrl,
      'userinfoUrl',
      ctx.providerId
    ),
    scopes:
      runtimeConfig.scopes === undefined || runtimeConfig.scopes === null
        ? provider.scopes
        : runtimeConfig.scopes,
    pkceEnabled: runtimeConfig.pkceEnabled ?? false,
    tokenEndpointAuthMethod,
    tokenRequestContentType:
      runtimeConfig.tokenRequestContentType ??
      provider.tokenRequestContentType ??
      'form',
    userInfoMethod:
      runtimeConfig.userInfoMethod ?? provider.userInfoMethod ?? 'GET',
    authorizationParams: runtimeConfig.authorizationParams || {},
    tokenParams: runtimeConfig.tokenParams || {},
    options: runtimeConfig.options || {},
  };

  return {
    providerId: ctx.providerId,
    config: resolvedConfig,
    provider,
  };
}
