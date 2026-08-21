/**
 * WebAuthn Settings Loader
 *
 * Resolves WebAuthn/passkey configuration for a database — RP identity,
 * schema references, attestation policy, and challenge expiry.
 */

import type { WebauthnSettings } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';
import { routingSchemaOf } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const webauthnSettingsSql = (schema: string): string => `
  SELECT
    s.schema_name AS schema,
    cred_s.schema_name AS credentials_schema,
    sess_s.schema_name AS sessions_schema,
    sec_s.schema_name AS session_secrets_schema,
    ws.rp_id,
    ws.rp_name,
    ws.origin_allowlist,
    ws.attestation_type,
    ws.require_user_verification,
    ws.resident_key,
    ws.challenge_expiry_seconds
  FROM "${schema}".webauthn_settings ws
  LEFT JOIN metaschema_public.schema s
    ON ws.schema_id = s.id
   AND s.database_id = ws.database_id
  LEFT JOIN metaschema_public.schema cred_s
    ON ws.credentials_schema_id = cred_s.id
   AND cred_s.database_id = ws.database_id
  LEFT JOIN metaschema_public.schema sess_s
    ON ws.sessions_schema_id = sess_s.id
   AND sess_s.database_id = ws.database_id
  LEFT JOIN metaschema_public.schema sec_s
    ON ws.session_secrets_schema_id = sec_s.id
   AND sec_s.database_id = ws.database_id
  WHERE ws.database_id = $1
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface WebauthnSettingsRow {
  schema: string;
  credentials_schema: string;
  sessions_schema: string;
  session_secrets_schema: string;
  rp_id: string;
  rp_name: string;
  origin_allowlist: string[];
  attestation_type: string;
  require_user_verification: boolean;
  resident_key: string;
  challenge_expiry_seconds: number;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const webauthnLoader: ModuleLoader<WebauthnSettings> = createModuleLoader<WebauthnSettings>({
  name: 'webauthnSettings',
  // RP/origin/verification policy revocation must take effect immediately.
  cache: false,
  async resolve(ctx: LoaderContext) {
    const { routingPool, databaseId } = ctx;

    const result = await routingPool.query<WebauthnSettingsRow>(webauthnSettingsSql(routingSchemaOf(ctx)), [databaseId]);
    if (result.rows.length > 1) {
      throw new Error('Ambiguous WebAuthn configuration');
    }
    const row = result.rows[0];
    if (!row) return undefined;
    const required = [
      row.schema,
      row.credentials_schema,
      row.sessions_schema,
      row.session_secrets_schema,
      row.rp_id,
      row.rp_name,
      row.attestation_type,
      row.resident_key
    ];
    if (
      required.some((value) => typeof value !== 'string' || value.length === 0)
      || !Array.isArray(row.origin_allowlist)
      || typeof row.require_user_verification !== 'boolean'
      || !Number.isSafeInteger(row.challenge_expiry_seconds)
      || row.challenge_expiry_seconds <= 0
    ) {
      throw new Error('Incomplete or cross-database WebAuthn configuration');
    }

    return {
      schema: row.schema,
      credentialsSchema: row.credentials_schema,
      sessionsSchema: row.sessions_schema,
      sessionSecretsSchema: row.session_secrets_schema,
      rpId: row.rp_id,
      rpName: row.rp_name,
      originAllowlist: row.origin_allowlist,
      attestationType: row.attestation_type,
      requireUserVerification: row.require_user_verification,
      residentKey: row.resident_key,
      challengeExpirySeconds: row.challenge_expiry_seconds
    };
  }
});
