import { errors } from '@constructive-io/errors';
import type {
  ConstructiveContext,
  SsoSurface
} from '@constructive-io/express-context';
import {
  deriveS256CodeChallenge,
  isOpaqueOAuthValue,
  ProviderAdapterError
} from '@constructive-io/oauth';

import { createHandoffMaterial } from '../sso/handoff';
import { resolveConfiguredProvider } from '../sso/provider-config';
import {
  completeProviderUnifiedLogin,
  consumeProviderOAuthRequest,
  type ProviderCredentialResult,
  readProviderOAuthRequest
} from '../sso/provider-db-contract';

const mapAdapterError = (cause: unknown): never => {
  if (!(cause instanceof ProviderAdapterError)) {
    throw errors.IDENTITY_PROVIDER_AUTHENTICATION_FAILED(
      {},
      undefined,
      { cause }
    );
  }
  if (cause.reason === 'INVALID_CONFIGURATION') {
    throw errors.IDENTITY_PROVIDER_NOT_CONFIGURED({}, undefined, { cause });
  }
  if (cause.reason === 'INVALID_AUTHORIZATION_INPUT') {
    throw errors.INVALID_OAUTH_PKCE({}, undefined, { cause });
  }
  throw errors.IDENTITY_PROVIDER_AUTHENTICATION_FAILED(
    {},
    undefined,
    { cause }
  );
};

const validateState = (state: string): void => {
  if (!isOpaqueOAuthValue(state)) throw errors.INVALID_OAUTH_STATE();
};

export const createProviderAuthorizationUrl = async (
  context: ConstructiveContext,
  surface: SsoSurface,
  state: string,
  browserBinding: string
): Promise<string> => {
  validateState(state);
  const request = await readProviderOAuthRequest(
    context,
    surface,
    state,
    browserBinding
  );
  const { adapter, configuration } = await resolveConfiguredProvider(
    context,
    request.providerKey
  );
  try {
    return adapter.createAuthorizationRequest({
      config: configuration,
      redirectUri: request.redirectUri,
      state,
      codeChallenge: deriveS256CodeChallenge(request.codeVerifier),
      ...(request.nonce ? { nonce: request.nonce } : {})
    }).url;
  } catch (cause) {
    return mapAdapterError(cause);
  }
};

export const completeProviderAuthentication = async (
  context: ConstructiveContext,
  surface: SsoSurface,
  input: {
    state: string;
    code?: string;
    providerReturnedError: boolean;
    browserBinding: string;
    deviceToken: string | null;
    requestTimeoutMs: number;
    fetch?: typeof fetch;
  }
): Promise<ProviderCredentialResult> => {
  validateState(input.state);

  // Consume and restore server-held state before inspecting code/error. A
  // cancellation, malformed callback, expiry, or replay never remains usable.
  const request = await consumeProviderOAuthRequest(
    context,
    surface,
    input.state,
    input.browserBinding
  );
  if (input.providerReturnedError) {
    throw errors.OAUTH_AUTHORIZATION_CANCELLED();
  }
  if (!input.code || input.code.length > 4096) {
    throw errors.IDENTITY_PROVIDER_AUTHENTICATION_FAILED();
  }

  const { adapter, configuration } = await resolveConfiguredProvider(
    context,
    request.providerKey
  );
  let identity;
  try {
    identity = await adapter.completeAuthorization({
      config: configuration,
      redirectUri: request.redirectUri,
      code: input.code,
      codeVerifier: request.codeVerifier,
      ...(request.nonce ? { nonce: request.nonce } : {}),
      requestTimeoutMs: input.requestTimeoutMs,
      ...(input.fetch ? { fetch: input.fetch } : {})
    });
  } catch (cause) {
    return mapAdapterError(cause);
  }

  return completeProviderUnifiedLogin(context, surface, {
    requestId: request.requestId,
    identity,
    browserBinding: input.browserBinding,
    deviceToken: input.deviceToken,
    handoff: createHandoffMaterial()
  });
};
