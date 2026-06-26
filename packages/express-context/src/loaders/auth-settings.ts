/**
 * Auth Settings Loader (Tier 2 — tenant DB)
 *
 * Two-step discovery:
 *   1. Query metaschema_modules_public.sessions_module to find the
 *      schema name and table name for auth settings
 *   2. Query the discovered <schema>.<table> in the tenant DB
 *
 * This is the pattern for any module whose config lives in the tenant
 * database rather than the services database.
 */

import { QuoteUtils } from '@pgsql/quotes';
import type { Pool } from 'pg';

import type {
  AuthSettings,
  AuthSettingsRow,
} from '../types';
import type { LoaderContext, ModuleLoader } from './types';
import { createModuleLoader } from './create-loader';

// ─── SQL ────────────────────────────────────────────────────────────────────

const AUTH_SETTINGS_DISCOVERY_SQL = `
  SELECT s.schema_name, sm.auth_settings_table AS table_name
  FROM metaschema_modules_public.sessions_module sm
  JOIN metaschema_public.schema s ON s.id = sm.schema_id
  WHERE sm.database_id = $1
  LIMIT 1
`;

interface AuthSettingsTableRef {
  schemaName: string;
  tableName: string;
}

async function discoverAuthSettingsTable(
  pool: Pool,
  databaseId: string | null | undefined,
): Promise<AuthSettingsTableRef | null> {
  if (!databaseId) return null;

  const discovery = await pool.query<{ schema_name: string; table_name: string }>(
    AUTH_SETTINGS_DISCOVERY_SQL,
    [databaseId],
  );
  const resolved = discovery.rows[0];
  if (!resolved) return null;

  return {
    schemaName: resolved.schema_name,
    tableName: resolved.table_name,
  };
}

function buildAuthSettingsQuery(schemaName: string, tableName: string): string {
  const authSettingsTable = QuoteUtils.quoteQualifiedIdentifier(
    schemaName,
    tableName,
  );

  return `
    SELECT
      allow_identity_sign_in,
      allow_identity_sign_up,
      cookie_secure,
      cookie_samesite,
      cookie_domain,
      cookie_httponly,
      cookie_max_age,
      cookie_path,
      remember_me_duration,
      enable_captcha,
      captcha_site_key,
      oauth_state_max_age,
      oauth_require_verified_email,
      oauth_error_redirect_path
    FROM ${authSettingsTable}
    LIMIT 1
  `;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const authSettingsLoader: ModuleLoader<AuthSettings> = createModuleLoader<AuthSettings>({
  name: 'authSettings',
  ttlMs: 5 * 60_000,
  async resolve(ctx: LoaderContext) {
    const { tenantPool, databaseId } = ctx;

    const resolved = await discoverAuthSettingsTable(tenantPool, databaseId);
    if (!resolved) return undefined;

    const result = await tenantPool.query<AuthSettingsRow>(
      buildAuthSettingsQuery(resolved.schemaName, resolved.tableName),
    );
    const row = result.rows[0];
    if (!row) return undefined;

    return {
      allowIdentitySignIn: row.allow_identity_sign_in,
      allowIdentitySignUp: row.allow_identity_sign_up,
      cookieSecure: row.cookie_secure,
      cookieSamesite: row.cookie_samesite,
      cookieDomain: row.cookie_domain,
      cookieHttponly: row.cookie_httponly,
      cookieMaxAge: row.cookie_max_age,
      cookiePath: row.cookie_path,
      rememberMeDuration: row.remember_me_duration,
      enableCaptcha: row.enable_captcha,
      captchaSiteKey: row.captcha_site_key,
      oauthStateMaxAge: row.oauth_state_max_age,
      oauthRequireVerifiedEmail: row.oauth_require_verified_email,
      oauthErrorRedirectPath: row.oauth_error_redirect_path,
    };
  },
});
