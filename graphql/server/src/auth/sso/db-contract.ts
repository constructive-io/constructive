import { errors } from '@constructive-io/errors';
import type { ConstructiveContext, SsoSurface } from '@constructive-io/express-context';
import sql from 'pg-sql2';

import {
  buildHandoffContinuationUrl,
  type HandoffMaterial
} from './handoff';
import { createOpaqueMaterial, hashOpaqueValue } from './opaque';
import type {
  ContinueUnifiedLoginInput,
  StartUnifiedLoginInput,
  UnifiedAuthAccount,
  UnifiedAuthSite,
  UnifiedLoginContinuationPayload,
  UnifiedLoginCredentialPayload,
  UnifiedPasswordInput
} from './types';

/**
 * Stable Constructive/Constructive DB boundary for the GraphQL integration.
 *
 * These functions live in the current Tenant's provisioned SSO private schema.
 * They own transaction locking, expiry, browser/Site/Tenant checks, calls to the
 * unchanged local `sign_in`/`sign_up` primitives, and identity/session
 * association. Constructive intentionally does not read the private tables.
 *
 * Exact v1 signatures fixed by this integration:
 *
 * - `start_unified_login(bytea, uuid, text, text, text, bytea)` accepts a
 *   server-generated transaction digest and returns safe Site display fields,
 *   `sign_in_mode`,
 *   `reusable_authentication`, and optional safe current-user display fields.
 * - `confirm_unified_login(bytea, bytea, bytea)` returns the associated `user_id`
 *   and the transaction-bound Site callback continuation fields.
 * - `sign_in_unified_login(bytea, text, text, boolean, text, bytea, text,
 *   text, bytea)` and `sign_up_unified_login(...)` return the unchanged local
 *   credential columns and the same continuation fields.
 *
 * Browser-held transaction and binding values are always digested before they
 * cross the DB boundary. The SSO browser binding is not an anonymous-session
 * CSRF secret, so the unchanged local credential primitive receives no CSRF
 * value unless a future flow establishes such a session explicitly. The
 * transaction identifier is deliberately not modelled as a row UUID.
 */
export const SSO_DB_FUNCTIONS = {
  start: 'start_unified_login',
  confirm: 'confirm_unified_login',
  signIn: 'sign_in_unified_login',
  signUp: 'sign_up_unified_login'
} as const;

export type DatabaseRecord = Record<string, unknown>;

interface StartDatabaseResult {
  transactionId: string;
  site: UnifiedAuthSite;
  signInMode: 'CONFIRM_BEFORE_SIGN_IN' | 'SILENT';
  reusableAuthentication: boolean;
  currentAccount: UnifiedAuthAccount | null;
}

const invalidDatabaseResult = (operation: string, cause?: unknown): Error =>
  errors.INTERNAL_FAILURE(
    { details: `Invalid ${operation} result from the unified authentication database function.` },
    undefined,
    cause === undefined ? undefined : { cause }
  );

export const asRecord = (value: unknown, operation: string): DatabaseRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw invalidDatabaseResult(operation);
  }
  return value as DatabaseRecord;
};

export const requiredString = (
  row: DatabaseRecord,
  field: string,
  operation: string
): string => {
  const value = row[field];
  if (typeof value !== 'string' || value.length === 0) {
    throw invalidDatabaseResult(operation);
  }
  return value;
};

export const optionalString = (
  row: DatabaseRecord,
  field: string,
  operation: string
): string | null => {
  const value = row[field];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw invalidDatabaseResult(operation);
  return value;
};

export const requiredBoolean = (
  row: DatabaseRecord,
  field: string,
  operation: string
): boolean => {
  const value = row[field];
  if (typeof value !== 'boolean') throw invalidDatabaseResult(operation);
  return value;
};

export type SqlCast = 'boolean' | 'bytea' | 'jsonb' | 'text' | 'uuid';

const castValue = (
  value: ReturnType<typeof sql.value>,
  cast: SqlCast
): ReturnType<typeof sql.fragment> => {
  switch (cast) {
  case 'boolean':
    return sql.fragment`${value}::boolean`;
  case 'bytea':
    return sql.fragment`${value}::bytea`;
  case 'jsonb':
    return sql.fragment`${value}::jsonb`;
  case 'text':
    return sql.fragment`${value}::text`;
  case 'uuid':
    return sql.fragment`${value}::uuid`;
  }
};

export const continuationFromDatabaseResult = (
  row: DatabaseRecord,
  operation: string,
  handoff: HandoffMaterial
): string => {
  const expiresAt = requiredString(row, 'handoff_expires_at', operation);
  if (!Number.isFinite(Date.parse(expiresAt))) {
    throw invalidDatabaseResult(operation);
  }
  return buildHandoffContinuationUrl(
    requiredString(row, 'callback_url', operation),
    requiredString(row, 'site_state', operation),
    handoff.code
  );
};

export const callFunction = async (
  context: ConstructiveContext,
  surface: SsoSurface,
  functionName: string,
  args: ReturnType<typeof sql.value>[],
  casts: SqlCast[]
): Promise<DatabaseRecord> => {
  const argumentSql = args.map((arg, index) => castValue(arg, casts[index]));
  const query = sql.query`
    SELECT to_jsonb(operation_result) AS result
    FROM ${sql.identifier(surface.privateSchema, functionName)}(
      ${sql.join(argumentSql, ', ')}
    ) AS operation_result
  `;
  const compiled = sql.compile(query);

  return context.withPgClient(async client => {
    const result = await client.query<{ result: unknown }>(
      compiled.text,
      compiled.values
    );
    if (result.rows.length !== 1) {
      throw invalidDatabaseResult(functionName);
    }
    return asRecord(result.rows[0].result, functionName);
  });
};

export const startUnifiedLogin = async (
  context: ConstructiveContext,
  surface: SsoSurface,
  input: StartUnifiedLoginInput,
  browserBinding: string
): Promise<StartDatabaseResult> => {
  const operation = SSO_DB_FUNCTIONS.start;
  const transaction = createOpaqueMaterial();
  const row = await callFunction(
    context,
    surface,
    operation,
    [
      sql.value(transaction.hash),
      sql.value(input.siteId),
      sql.value(input.callbackUrl ?? null),
      sql.value(input.returnTo ?? '/'),
      sql.value(input.siteState),
      sql.value(hashOpaqueValue(browserBinding))
    ],
    ['bytea', 'uuid', 'text', 'text', 'text', 'bytea']
  );
  const signInMode = requiredString(row, 'sign_in_mode', operation);
  if (signInMode !== 'confirm' && signInMode !== 'silent') {
    throw invalidDatabaseResult(operation);
  }

  const currentUserId = optionalString(row, 'current_user_id', operation);
  const currentAccount = currentUserId
    ? {
      id: currentUserId,
      displayName: requiredString(row, 'current_user_display_name', operation),
      avatarUrl: optionalString(row, 'current_user_avatar_url', operation)
    }
    : null;

  return {
    transactionId: transaction.value,
    site: {
      id: requiredString(row, 'site_id', operation),
      displayName: requiredString(row, 'site_display_name', operation),
      iconUrl: optionalString(row, 'site_icon_url', operation),
      themeColor: optionalString(row, 'site_theme_color', operation)
    },
    signInMode: signInMode === 'silent' ? 'SILENT' : 'CONFIRM_BEFORE_SIGN_IN',
    reusableAuthentication: requiredBoolean(
      row,
      'reusable_authentication',
      operation
    ),
    currentAccount
  };
};

export const confirmUnifiedLogin = async (
  context: ConstructiveContext,
  surface: SsoSurface,
  input: ContinueUnifiedLoginInput,
  browserBinding: string,
  handoff: HandoffMaterial
): Promise<UnifiedLoginContinuationPayload> => {
  const operation = SSO_DB_FUNCTIONS.confirm;
  const row = await callFunction(
    context,
    surface,
    operation,
    [
      sql.value(hashOpaqueValue(input.transactionId)),
      sql.value(hashOpaqueValue(browserBinding)),
      sql.value(handoff.hash)
    ],
    ['bytea', 'bytea', 'bytea']
  );
  requiredString(row, 'user_id', operation);
  return {
    transactionId: input.transactionId,
    authenticated: true,
    continuationUrl: continuationFromDatabaseResult(row, operation, handoff)
  };
};

const authenticateWithPassword = async (
  functionName: typeof SSO_DB_FUNCTIONS.signIn | typeof SSO_DB_FUNCTIONS.signUp,
  context: ConstructiveContext,
  surface: SsoSurface,
  input: UnifiedPasswordInput,
  browserBinding: string,
  handoff: HandoffMaterial
): Promise<UnifiedLoginCredentialPayload> => {
  const row = await callFunction(
    context,
    surface,
    functionName,
    [
      sql.value(hashOpaqueValue(input.transactionId)),
      sql.value(input.email),
      sql.value(input.password),
      sql.value(input.rememberMe ?? false),
      sql.value('bearer'),
      sql.value(hashOpaqueValue(browserBinding)),
      sql.value(null),
      sql.value(input.deviceToken ?? null),
      sql.value(handoff.hash)
    ],
    [
      'bytea',
      'text',
      'text',
      'boolean',
      'text',
      'bytea',
      'text',
      'text',
      'bytea'
    ]
  );

  // Strict-auth/MFA/step-up integration is explicitly outside v1. The DB
  // wrapper must fail closed; this guard prevents an accidental partial result
  // from being treated as a completed unified login.
  const mfaRequired = requiredBoolean(row, 'mfa_required', functionName);
  if (mfaRequired) {
    throw errors.AUTH_METHOD_NOT_ALLOWED({});
  }

  return {
    transactionId: input.transactionId,
    authenticated: true,
    credentialId: requiredString(row, 'id', functionName),
    userId: requiredString(row, 'user_id', functionName),
    accessToken: requiredString(row, 'access_token', functionName),
    accessTokenExpiresAt: requiredString(
      row,
      'access_token_expires_at',
      functionName
    ),
    isVerified: requiredBoolean(row, 'is_verified', functionName),
    totpEnabled: requiredBoolean(row, 'totp_enabled', functionName),
    continuationUrl: continuationFromDatabaseResult(row, functionName, handoff)
  };
};

export const signInUnifiedLogin = (
  context: ConstructiveContext,
  surface: SsoSurface,
  input: UnifiedPasswordInput,
  browserBinding: string,
  handoff: HandoffMaterial
): Promise<UnifiedLoginCredentialPayload> =>
  authenticateWithPassword(
    SSO_DB_FUNCTIONS.signIn,
    context,
    surface,
    input,
    browserBinding,
    handoff
  );

export const signUpUnifiedLogin = (
  context: ConstructiveContext,
  surface: SsoSurface,
  input: UnifiedPasswordInput,
  browserBinding: string,
  handoff: HandoffMaterial
): Promise<UnifiedLoginCredentialPayload> =>
  authenticateWithPassword(
    SSO_DB_FUNCTIONS.signUp,
    context,
    surface,
    input,
    browserBinding,
    handoff
  );
