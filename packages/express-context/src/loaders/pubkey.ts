/**
 * Pubkey Challenge Settings Loader
 *
 * Resolves public-key challenge auth config (crypto network, sign-in/sign-up
 * function names) from the scoped routing plane. Tries the pubkey_settings
 * table first, falls back to the api_modules approach.
 */

import type { PubkeyChallengeSettings } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const PUBKEY_SETTINGS_SQL = `
  SELECT
    s.schema_name AS schema,
    ps.crypto_network,
    sign_up_fn.name AS sign_up_with_key,
    sign_in_req_fn.name AS sign_in_request_challenge,
    sign_in_fail_fn.name AS sign_in_record_failure,
    sign_in_fn.name AS sign_in_with_challenge
  FROM constructive_routing_public.pubkey_settings ps
  LEFT JOIN metaschema_public.schema s ON ps.schema_id = s.id
  LEFT JOIN metaschema_public.function sign_up_fn ON ps.sign_up_with_key_function_id = sign_up_fn.id
  LEFT JOIN metaschema_public.function sign_in_req_fn ON ps.sign_in_request_challenge_function_id = sign_in_req_fn.id
  LEFT JOIN metaschema_public.function sign_in_fail_fn ON ps.sign_in_record_failure_function_id = sign_in_fail_fn.id
  LEFT JOIN metaschema_public.function sign_in_fn ON ps.sign_in_with_challenge_function_id = sign_in_fn.id
  WHERE ps.database_id = $1
  LIMIT 1
`;

const PUBKEY_MODULE_SQL = `
  SELECT data
  FROM constructive_routing_public.api_modules
  WHERE api_id = $1 AND name = 'pubkey_challenge'
  LIMIT 1
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

interface PubkeyModuleRow {
  data: PubkeySettingsRow | null;
}

// ─── Transforms ─────────────────────────────────────────────────────────────

function fromRow(row: PubkeySettingsRow | null): PubkeyChallengeSettings | undefined {
  if (!row?.schema || !row?.sign_up_with_key) return undefined;
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
  ttlMs: 5 * 60_000,
  async resolve(ctx: LoaderContext) {
    const { routingPool, databaseId, apiId } = ctx;

    // Try new pubkey_settings table first
    try {
      const result = await routingPool.query<PubkeySettingsRow>(PUBKEY_SETTINGS_SQL, [databaseId]);
      const resolved = fromRow(result.rows[0] ?? null);
      if (resolved) return resolved;
    } catch {
      // Table may not exist yet
    }

    // Fall back to api_modules
    if (apiId) {
      const result = await routingPool.query<PubkeyModuleRow>(PUBKEY_MODULE_SQL, [apiId]);
      return fromRow(result.rows[0]?.data ?? null);
    }

    return undefined;
  }
});
