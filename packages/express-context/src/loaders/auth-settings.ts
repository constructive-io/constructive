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

import type { AuthSettings, PgInterval } from '../types';
import type { LoaderContext, ModuleLoader } from './types';
import { createModuleLoader } from './create-loader';

// ─── SQL ────────────────────────────────────────────────────────────────────

const AUTH_SETTINGS_DISCOVERY_SQL = `
  SELECT s.schema_name, sm.auth_settings_table AS table_name
  FROM metaschema_modules_public.sessions_module sm
  JOIN metaschema_public.schema s ON s.id = sm.schema_id
  LIMIT 1
`;

const buildAuthSettingsQuery = (schemaName: string, tableName: string) => `
  SELECT
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
  FROM "${schemaName}"."${tableName}"
  LIMIT 1
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface AuthSettingsRow {
  cookie_secure: boolean;
  cookie_samesite: string;
  cookie_domain: string | null;
  cookie_httponly: boolean;
  cookie_max_age: string | PgInterval | null;
  cookie_path: string;
  remember_me_duration: string | PgInterval | null;
  enable_captcha: boolean;
  captcha_site_key: string | null;
  oauth_state_max_age: string | PgInterval | null;
  oauth_require_verified_email: boolean;
  oauth_error_redirect_path: string | null;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const authSettingsLoader: ModuleLoader<AuthSettings> = createModuleLoader<AuthSettings>({
  name: 'authSettings',
  ttlMs: 5 * 60_000,
  async resolve(ctx: LoaderContext) {
    const { tenantPool } = ctx;

    // Step 1: Discover schema + table from sessions_module
    const discovery = await tenantPool.query<{ schema_name: string; table_name: string }>(
      AUTH_SETTINGS_DISCOVERY_SQL,
    );
    const resolved = discovery.rows[0];
    if (!resolved) return undefined;

    // Step 2: Query the actual auth settings table
    const result = await tenantPool.query<AuthSettingsRow>(
      buildAuthSettingsQuery(resolved.schema_name, resolved.table_name),
    );
    const row = result.rows[0];
    if (!row) return undefined;

    return {
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
