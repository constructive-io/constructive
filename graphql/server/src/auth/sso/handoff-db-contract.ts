import { errors } from '@constructive-io/errors';
import type {
  ConstructiveContext,
  SsoSurface
} from '@constructive-io/express-context';
import sql from 'pg-sql2';

import {
  callFunction,
  requiredBoolean,
  requiredString
} from './db-contract';
import { hashHandoffCode } from './handoff';
import type { RedeemUnifiedLoginHandoffPayload } from './types';

export const SSO_HANDOFF_DB_FUNCTION = 'redeem_sso_handoff';

/**
 * Redeem through the current routed API and authenticated service principal.
 * The DB function reads the authoritative api_id, token kind/id, principal,
 * Tenant, and role from the existing request pgSettings. Possession of the
 * handoff digest is deliberately insufficient by itself.
 */
export const redeemUnifiedLoginHandoff = async (
  context: ConstructiveContext,
  surface: SsoSurface,
  handoffCode: string
): Promise<RedeemUnifiedLoginHandoffPayload> => {
  const operation = SSO_HANDOFF_DB_FUNCTION;
  const row = await callFunction(
    context,
    surface,
    operation,
    [sql.value(hashHandoffCode(handoffCode))],
    ['bytea']
  );

  const mfaRequired = requiredBoolean(row, 'mfa_required', operation);
  if (mfaRequired) throw errors.AUTH_METHOD_NOT_ALLOWED({});

  const returnTo = requiredString(row, 'return_to', operation);
  if (
    returnTo.length > 2048 ||
    !returnTo.startsWith('/') ||
    returnTo.startsWith('//') ||
    /[\r\n]/.test(returnTo)
  ) {
    throw errors.INTERNAL_FAILURE({
      details: 'The database returned an invalid Site return target.'
    });
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
    returnTo
  };
};
