import { errors } from '@constructive-io/errors';
import type {
  ConstructiveContext,
  SsoSurface
} from '@constructive-io/express-context';
import {
  generateCodeVerifier,
  generateOidcNonce,
  generateOpaqueState,
  validateProviderCallbackUri
} from '@constructive-io/oauth';

import {
  confirmUnifiedLogin,
  signInUnifiedLogin,
  signUpUnifiedLogin,
  startUnifiedLogin
} from './db-contract';
import {
  loadProviderDisplayOptions,
  resolveConfiguredProvider
} from './provider-config';
import { startProviderOAuthRequest } from './provider-db-contract';
import type {
  ContinueUnifiedLoginInput,
  ProviderDisplayOption,
  StartProviderAuthenticationInput,
  StartProviderAuthenticationPayload,
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
  if (!OPAQUE_VALUE.test(input.transactionId)) {
    throw errors.SSO_LOGIN_TRANSACTION_EXPIRED();
  }
};

const requireBrowserBinding = (
  graphQLContext: UnifiedAuthGraphQLContext
): string => {
  if (!graphQLContext.browserBinding || !OPAQUE_VALUE.test(graphQLContext.browserBinding)) {
    throw errors.INVALID_SSO_SITE_STATE();
  }
  return graphQLContext.browserBinding;
};

const requireRequestOrigin = (context: ConstructiveContext): string => {
  if (!context.requestOrigin) {
    throw errors.INTERNAL_FAILURE({
      details: 'The routed authentication-center origin is unavailable.'
    });
  }
  return context.requestOrigin;
};

const validateStartInput = (input: StartUnifiedLoginInput): void => {
  if (!SITE_STATE.test(input.siteState)) {
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
  startProvider(
    context: UnifiedAuthGraphQLContext,
    input: StartProviderAuthenticationInput
  ): Promise<StartProviderAuthenticationPayload>;
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
    const browserBinding = requireBrowserBinding(graphQLContext);
    const surface = await resolveSsoSurface(context);
    // Resolve and validate public Provider options before creating transient
    // state so a malformed Tenant Provider cannot leave an unusable login
    // transaction behind.
    const providers = await loadProviderDisplayOptions(context, oauthEnabled);
    const result = await startUnifiedLogin(context, surface, input, browserBinding);
    return { ...result, providers };
  },

  async confirm(graphQLContext, input) {
    validateTransactionInput(input);
    const context = requireContext(graphQLContext);
    const browserBinding = requireBrowserBinding(graphQLContext);
    const surface = await resolveSsoSurface(context);
    if (!context.userId) throw errors.UNAUTHENTICATED();
    return confirmUnifiedLogin(context, surface, input, browserBinding);
  },

  async signIn(graphQLContext, input) {
    validateTransactionInput(input);
    const context = requireContext(graphQLContext);
    const browserBinding = requireBrowserBinding(graphQLContext);
    const surface = await resolveSsoSurface(context);
    return signInUnifiedLogin(context, surface, input, browserBinding);
  },

  async signUp(graphQLContext, input) {
    validateTransactionInput(input);
    const context = requireContext(graphQLContext);
    const browserBinding = requireBrowserBinding(graphQLContext);
    const surface = await resolveSsoSurface(context);
    return signUpUnifiedLogin(context, surface, input, browserBinding);
  },

  async startProvider(graphQLContext, input) {
    if (!oauthEnabled) throw errors.OAUTH_SIGN_IN_DISABLED();
    validateTransactionInput(input);
    if (!input.providerKey || input.providerKey.length > 128) {
      throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED();
    }
    const context = requireContext(graphQLContext);
    const browserBinding = requireBrowserBinding(graphQLContext);
    const requestOrigin = requireRequestOrigin(context);
    const surface = await resolveSsoSurface(context);
    await resolveConfiguredProvider(context, input.providerKey);

    let redirectUri: string;
    try {
      redirectUri = validateProviderCallbackUri(
        new URL('/auth/oauth/callback', requestOrigin).toString()
      );
    } catch (cause) {
      throw errors.INTERNAL_FAILURE(
        { details: 'The authentication-center Provider callback is invalid.' },
        undefined,
        { cause }
      );
    }

    const state = generateOpaqueState();
    await startProviderOAuthRequest(context, surface, {
      transactionId: input.transactionId,
      providerKey: input.providerKey,
      state,
      codeVerifier: generateCodeVerifier(),
      nonce: generateOidcNonce(),
      redirectUri,
      browserBinding
    });

    return {
      authorizationUrl: `/auth/oauth/authorize?state=${encodeURIComponent(state)}`
    };
  }
});
