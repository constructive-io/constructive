import { errors } from '@constructive-io/errors';
import type {
  ConstructiveContext,
  SsoSurface
} from '@constructive-io/express-context';
import type { NormalizedExternalIdentity } from '@constructive-io/oauth';
import sql from 'pg-sql2';

import {
  callFunction,
  optionalString,
  requiredBoolean,
  requiredString
} from './db-contract';
import { hashOpaqueValue } from './opaque';

export const PROVIDER_DB_FUNCTIONS = {
  start: 'start_provider_oauth_request',
  read: 'read_provider_oauth_request',
  consume: 'consume_provider_oauth_request',
  complete: 'complete_provider_unified_login'
} as const;

/**
 * Fixed Constructive/DB signatures for the Provider subflow:
 *
 * - `start_provider_oauth_request(bytea, text, text, text, text, text, bytea)`
 *   accepts unified transaction token, Provider key, state, verifier, nonce,
 *   redirect URI, and browser binding; returns `oauth_request_id`.
 * - `read_provider_oauth_request(text, bytea)` and
 *   `consume_provider_oauth_request(text, bytea)` accept state plus browser
 *   binding and return the request fields parsed below. Consume atomically
 *   marks the state used before Provider callback handling.
 * - `complete_provider_unified_login(uuid, text, text, text, jsonb, text,
 *   boolean, text, bytea)` accepts request ID plus normalized identity,
 *   existing credential options, device token, and browser binding; it returns
 *   the unchanged identity-auth credential result and optional shared continuation.
 */

export interface ProviderOAuthRequest {
  requestId: string;
  providerKey: string;
  codeVerifier: string;
  nonce: string | null;
  redirectUri: string;
}

export interface ProviderCredentialResult {
  credentialId: string;
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  isVerified: boolean;
  totpEnabled: boolean;
  continuationUrl: string | null;
}

/**
 * Persist server-owned OAuth state before any browser redirect.
 *
 * The matching Tenant-private DB function validates the opaque unified login
 * transaction and browser binding, links the existing OAuth request relation
 * to that transaction, and enforces its ten-minute expiry. Only the opaque
 * OAuth state crosses browser navigation; the verifier, nonce, transaction
 * link, and Provider configuration identity remain server-side.
 */
export const startProviderOAuthRequest = async (
  context: ConstructiveContext,
  surface: SsoSurface,
  input: {
    transactionId: string;
    providerKey: string;
    state: string;
    codeVerifier: string;
    nonce: string;
    redirectUri: string;
    browserBinding: string;
  }
): Promise<void> => {
  const operation = PROVIDER_DB_FUNCTIONS.start;
  const row = await callFunction(
    context,
    surface,
    operation,
    [
      sql.value(hashOpaqueValue(input.transactionId)),
      sql.value(input.providerKey),
      sql.value(input.state),
      sql.value(input.codeVerifier),
      sql.value(input.nonce),
      sql.value(input.redirectUri),
      sql.value(hashOpaqueValue(input.browserBinding))
    ],
    ['bytea', 'text', 'text', 'text', 'text', 'text', 'bytea']
  );
  requiredString(row, 'oauth_request_id', operation);
};

const restoreProviderOAuthRequest = async (
  functionName:
    | typeof PROVIDER_DB_FUNCTIONS.read
    | typeof PROVIDER_DB_FUNCTIONS.consume,
  context: ConstructiveContext,
  surface: SsoSurface,
  state: string,
  browserBinding: string
): Promise<ProviderOAuthRequest> => {
  const row = await callFunction(
    context,
    surface,
    functionName,
    [sql.value(state), sql.value(hashOpaqueValue(browserBinding))],
    ['text', 'bytea']
  );
  return {
    requestId: requiredString(row, 'oauth_request_id', functionName),
    providerKey: requiredString(row, 'provider_key', functionName),
    codeVerifier: requiredString(row, 'code_verifier', functionName),
    nonce: optionalString(row, 'nonce', functionName),
    redirectUri: requiredString(row, 'redirect_uri', functionName)
  };
};

export const readProviderOAuthRequest = (
  context: ConstructiveContext,
  surface: SsoSurface,
  state: string,
  browserBinding: string
): Promise<ProviderOAuthRequest> =>
  restoreProviderOAuthRequest(
    PROVIDER_DB_FUNCTIONS.read,
    context,
    surface,
    state,
    browserBinding
  );

export const consumeProviderOAuthRequest = (
  context: ConstructiveContext,
  surface: SsoSurface,
  state: string,
  browserBinding: string
): Promise<ProviderOAuthRequest> =>
  restoreProviderOAuthRequest(
    PROVIDER_DB_FUNCTIONS.consume,
    context,
    surface,
    state,
    browserBinding
  );

/**
 * Apply only the normalized Provider identity to the current Tenant.
 * Account matching/provisioning, connected_accounts ownership, conflict rules,
 * and association with the linked unified transaction stay inside the DB
 * function and its unchanged sign_in_identity/sign_up_identity primitives.
 */
export const completeProviderUnifiedLogin = async (
  context: ConstructiveContext,
  surface: SsoSurface,
  input: {
    requestId: string;
    identity: NormalizedExternalIdentity;
    browserBinding: string;
    deviceToken: string | null;
  }
): Promise<ProviderCredentialResult> => {
  const operation = PROVIDER_DB_FUNCTIONS.complete;
  const row = await callFunction(
    context,
    surface,
    operation,
    [
      sql.value(input.requestId),
      sql.value(input.identity.providerKey),
      sql.value(input.identity.subject),
      sql.value(input.identity.email ?? null),
      sql.value(JSON.stringify(input.identity.profile)),
      sql.value('bearer'),
      sql.value(false),
      sql.value(input.deviceToken),
      sql.value(hashOpaqueValue(input.browserBinding))
    ],
    ['uuid', 'text', 'text', 'text', 'jsonb', 'text', 'boolean', 'text', 'bytea']
  );

  const mfaRequired = requiredBoolean(
    row,
    'mfa_required',
    operation
  );
  if (mfaRequired) {
    // strict-auth/MFA/step-up integration is outside v1 and must fail closed.
    throw errors.AUTH_METHOD_NOT_ALLOWED({});
  }

  return {
    credentialId: requiredString(row, 'id', operation),
    userId: requiredString(row, 'user_id', operation),
    accessToken: requiredString(row, 'access_token', operation),
    accessTokenExpiresAt: requiredString(
      row,
      'access_token_expires_at',
      operation
    ),
    isVerified: requiredBoolean(row, 'is_verified', operation),
    totpEnabled: requiredBoolean(row, 'totp_enabled', operation),
    continuationUrl: optionalString(row, 'continuation_url', operation)
  };
};
