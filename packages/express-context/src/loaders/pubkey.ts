/**
 * Pubkey Challenge Settings Loader
 *
 * Resolves public-key challenge auth config (crypto network, sign-in/sign-up
 * function names) from the scoped routing plane via the typed pubkey_settings
 * table.
 */

import type { PubkeyChallengeSettings } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';
import { routingSchemaOf } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const pubkeySettingsSql = (schema: string): string => `
  SELECT
    s.schema_name AS schema,
    ps.crypto_network,
    sign_up_fn.name AS sign_up_with_key,
    sign_in_req_fn.name AS sign_in_request_challenge,
    sign_in_fail_fn.name AS sign_in_record_failure,
    sign_in_fn.name AS sign_in_with_challenge
  FROM "${schema}".pubkey_settings ps
  LEFT JOIN metaschema_public.schema s
    ON ps.schema_id = s.id
   AND s.database_id = ps.database_id
  LEFT JOIN metaschema_public.function sign_up_fn
    ON ps.sign_up_with_key_function_id = sign_up_fn.id
   AND sign_up_fn.database_id = ps.database_id
   AND sign_up_fn.schema_id = ps.schema_id
  LEFT JOIN metaschema_public.function sign_in_req_fn
    ON ps.sign_in_request_challenge_function_id = sign_in_req_fn.id
   AND sign_in_req_fn.database_id = ps.database_id
   AND sign_in_req_fn.schema_id = ps.schema_id
  LEFT JOIN metaschema_public.function sign_in_fail_fn
    ON ps.sign_in_record_failure_function_id = sign_in_fail_fn.id
   AND sign_in_fail_fn.database_id = ps.database_id
   AND sign_in_fail_fn.schema_id = ps.schema_id
  LEFT JOIN metaschema_public.function sign_in_fn
    ON ps.sign_in_with_challenge_function_id = sign_in_fn.id
   AND sign_in_fn.database_id = ps.database_id
   AND sign_in_fn.schema_id = ps.schema_id
  WHERE ps.database_id = $1
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface PubkeySettingsRow {
  schema: string;
  crypto_network: string;
  sign_up_with_key: string;
  sign_in_request_challenge: string;
  sign_in_record_failure: string;
  sign_in_with_challenge: string;
}

// ─── Transforms ─────────────────────────────────────────────────────────────

function fromRow(row: PubkeySettingsRow | null): PubkeyChallengeSettings | undefined {
  if (!row) return undefined;
  const required = [
    row.schema,
    row.crypto_network,
    row.sign_up_with_key,
    row.sign_in_request_challenge,
    row.sign_in_record_failure,
    row.sign_in_with_challenge
  ];
  if (required.some((value) => typeof value !== 'string' || value.length === 0)) {
    throw new Error('Incomplete or cross-database public-key authentication configuration');
  }
  return {
    schema: row.schema,
    cryptoNetwork: row.crypto_network,
    signUpWithKey: row.sign_up_with_key,
    signInRequestChallenge: row.sign_in_request_challenge,
    signInRecordFailure: row.sign_in_record_failure,
    signInWithChallenge: row.sign_in_with_challenge
  };
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const pubkeyLoader: ModuleLoader<PubkeyChallengeSettings> = createModuleLoader<PubkeyChallengeSettings>({
  name: 'pubkeyChallengeSettings',
  // Public-key authentication policy must be authoritative per request.
  cache: false,
  async resolve(ctx: LoaderContext) {
    const { routingPool, databaseId } = ctx;
    const result = await routingPool.query<PubkeySettingsRow>(pubkeySettingsSql(routingSchemaOf(ctx)), [databaseId]);
    if (result.rows.length > 1) {
      throw new Error('Ambiguous public-key authentication configuration');
    }
    return fromRow(result.rows[0] ?? null);
  }
});
