import { errors } from '@constructive-io/errors';
import type {
  ConstructiveContext,
  IdentityProviderConfig,
  IdentityProvidersModule,
  SsoSurface
} from '@constructive-io/express-context';
import {
  getProviderAdapter,
  getProviderAdapterKinds,
  type IdentityProviderConfiguration
} from '@constructive-io/oauth';

import {
  confirmUnifiedLogin,
  signInUnifiedLogin,
  signUpUnifiedLogin,
  startUnifiedLogin
} from './db-contract';
import type {
  ContinueUnifiedLoginInput,
  ProviderDisplayOption,
  StartUnifiedLoginInput,
  StartUnifiedLoginPayload,
  UnifiedAuthGraphQLContext,
  UnifiedLoginContinuationPayload,
  UnifiedLoginCredentialPayload,
  UnifiedPasswordInput
} from './types';

const OPAQUE_VALUE = /^[A-Za-z0-9_-]{32,256}$/;
const SITE_STATE = /^[A-Za-z0-9_-]{32,128}$/;

const requireContext = (
  graphQLContext: UnifiedAuthGraphQLContext
): ConstructiveContext => {
  if (!graphQLContext.constructive) {
    throw errors.INTERNAL_FAILURE({
      details: 'The Constructive request context is unavailable.'
    });
  }
  return graphQLContext.constructive;
};

const resolveSsoSurface = async (
  context: ConstructiveContext
): Promise<SsoSurface> => {
  const surface = await context.useModule('ssoSurface');
  if (!surface) throw errors.SSO_SIGN_IN_DISABLED();
  return surface;
};

const validateTransactionInput = (input: ContinueUnifiedLoginInput): void => {
  if (!OPAQUE_VALUE.test(input.transactionId) || !OPAQUE_VALUE.test(input.csrfToken)) {
    throw errors.SSO_LOGIN_TRANSACTION_EXPIRED();
  }
};

const validateStartInput = (input: StartUnifiedLoginInput): void => {
  if (!SITE_STATE.test(input.siteState)) {
    throw errors.INVALID_SSO_SITE_STATE();
  }
  if (!OPAQUE_VALUE.test(input.csrfToken)) {
    throw errors.INVALID_SSO_SITE_STATE();
  }
  const returnTo = input.returnTo ?? '/';
  if (
    returnTo.length > 2048 ||
    !returnTo.startsWith('/') ||
    returnTo.startsWith('//') ||
    /[\r\n]/.test(returnTo)
  ) {
    throw errors.INVALID_SSO_RETURN_TARGET();
  }
  if (input.callbackUrl && input.callbackUrl.length > 2048) {
    throw errors.INVALID_SSO_CALLBACK();
  }
};

const toOAuthConfiguration = (
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

const providerDisplayOptions = (
  module: IdentityProvidersModule | undefined
): ProviderDisplayOption[] => {
  if (!module) return [];
  const supportedKinds = new Set(getProviderAdapterKinds());
  const options: ProviderDisplayOption[] = [];

  for (const provider of Object.values(module.providers)) {
    if (!provider.enabled || !supportedKinds.has(provider.kind)) continue;
    try {
      getProviderAdapter(provider.kind).validateConfiguration(
        toOAuthConfiguration(provider)
      );
    } catch (cause) {
      throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED(
        {},
        undefined,
        { cause }
      );
    }
    options.push({ key: provider.slug, displayName: provider.displayName });
  }

  return options.sort((left, right) =>
    left.displayName.localeCompare(right.displayName) ||
    left.key.localeCompare(right.key)
  );
};

const loadProviderDisplayOptions = async (
  context: ConstructiveContext,
  oauthEnabled: boolean
): Promise<ProviderDisplayOption[]> => {
  if (!oauthEnabled) return [];
  const providers = await context.useModule('identityProviders');
  return providerDisplayOptions(providers);
};

export interface UnifiedAuthService {
  providers(context: UnifiedAuthGraphQLContext): Promise<ProviderDisplayOption[]>;
  start(
    context: UnifiedAuthGraphQLContext,
    input: StartUnifiedLoginInput
  ): Promise<StartUnifiedLoginPayload>;
  confirm(
    context: UnifiedAuthGraphQLContext,
    input: ContinueUnifiedLoginInput
  ): Promise<UnifiedLoginContinuationPayload>;
  signIn(
    context: UnifiedAuthGraphQLContext,
    input: UnifiedPasswordInput
  ): Promise<UnifiedLoginCredentialPayload>;
  signUp(
    context: UnifiedAuthGraphQLContext,
    input: UnifiedPasswordInput
  ): Promise<UnifiedLoginCredentialPayload>;
}

export const createUnifiedAuthService = (oauthEnabled: boolean): UnifiedAuthService => ({
  async providers(graphQLContext) {
    const context = requireContext(graphQLContext);
    const surface = await context.useModule('ssoSurface');
    if (!surface) return [];
    return loadProviderDisplayOptions(context, oauthEnabled);
  },

  async start(graphQLContext, input) {
    validateStartInput(input);
    const context = requireContext(graphQLContext);
    const surface = await resolveSsoSurface(context);
    // Resolve and validate public Provider options before creating transient
    // state so a malformed Tenant Provider cannot leave an unusable login
    // transaction behind.
    const providers = await loadProviderDisplayOptions(context, oauthEnabled);
    const result = await startUnifiedLogin(context, surface, input);
    return { ...result, providers };
  },

  async confirm(graphQLContext, input) {
    validateTransactionInput(input);
    const context = requireContext(graphQLContext);
    const surface = await resolveSsoSurface(context);
    if (!context.userId) throw errors.UNAUTHENTICATED();
    return confirmUnifiedLogin(context, surface, input);
  },

  async signIn(graphQLContext, input) {
    validateTransactionInput(input);
    const context = requireContext(graphQLContext);
    const surface = await resolveSsoSurface(context);
    return signInUnifiedLogin(context, surface, input);
  },

  async signUp(graphQLContext, input) {
    validateTransactionInput(input);
    const context = requireContext(graphQLContext);
    const surface = await resolveSsoSurface(context);
    return signUpUnifiedLogin(context, surface, input);
  }
});
