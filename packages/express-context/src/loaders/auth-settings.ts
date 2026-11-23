/**
 * Auth Settings Loader (Tier 2 — tenant DB)
 *
 * Two steps, both through login-only readers:
 *   1. `function_resolution.sessions_module_registrations` names the schema
 *      and table holding the database's auth settings
 *   2. `<schema>.<table>_request_policy()`, generated beside that table,
 *      returns the cookie and captcha columns of its one row
 *
 * The server resolves this on its own connection, as a login row-level
 * security holds to nothing. A plain read of the registration or of the
 * settings row answers no rows, which would silently serve the built-in
 * cookie defaults and skip captcha for a tenant that configured both.
 *
 * Step 1 is keyed by `ctx.databaseId`. One serving database holds several
 * tenants' schemas in the normal schema-per-tenant topology, so an unkeyed
 * discovery would read a *neighbouring tenant's* cookie/captcha policy — and
 * the loader cache makes that resolution sticky for its TTL.
 */

import { escapeIdentifier } from 'pg';

import type { AuthSettings } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';
import { requireDatabaseId } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const AUTH_SETTINGS_DISCOVERY_SQL = `
  SELECT private_schema AS schema_name, auth_settings_table_name AS table_name
  FROM function_resolution.sessions_module_registrations($1)
  LIMIT 1
`;

const buildAuthSettingsQuery = (schemaName: string, tableName: string) => `
  SELECT ${escapeIdentifier(schemaName)}.${escapeIdentifier(`${tableName}_request_policy`)}() AS policy
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

/** Durations arrive as whole seconds; the consumer parses them as such. */
interface AuthSettingsPolicy {
  cookie_secure: boolean;
  cookie_samesite: string;
  cookie_domain: string | null;
  cookie_httponly: boolean;
  cookie_max_age_seconds: number | null;
  cookie_path: string;
  remember_me_duration_seconds: number | null;
  enable_captcha: boolean;
  captcha_site_key: string | null;
}

const seconds = (value: number | null): string | null => (value == null ? null : String(value));

// ─── Loader ─────────────────────────────────────────────────────────────────

export const authSettingsLoader: ModuleLoader<AuthSettings> = createModuleLoader<AuthSettings>({
  name: 'authSettings',
  ttlMs: 5 * 60_000,
  async resolve(ctx: LoaderContext) {
    const { tenantPool, databaseId } = ctx;
    requireDatabaseId(databaseId, 'authSettings');

    // Step 1: which schema and table hold this database's auth settings
    const discovery = await tenantPool.query<{ schema_name: string | null; table_name: string | null }>(
      AUTH_SETTINGS_DISCOVERY_SQL,
      [databaseId]
    );
    const resolved = discovery.rows[0];
    if (!resolved?.schema_name || !resolved.table_name) return undefined;

    // Step 2: the row's cookie and captcha columns, through its reader
    const result = await tenantPool.query<{ policy: AuthSettingsPolicy | null }>(
      buildAuthSettingsQuery(resolved.schema_name, resolved.table_name)
    );
    const row = result.rows[0]?.policy;
    if (!row) return undefined;

    return {
      cookieSecure: row.cookie_secure,
      cookieSamesite: row.cookie_samesite,
      cookieDomain: row.cookie_domain,
      cookieHttponly: row.cookie_httponly,
      cookieMaxAge: seconds(row.cookie_max_age_seconds),
      cookiePath: row.cookie_path,
      rememberMeDuration: seconds(row.remember_me_duration_seconds),
      enableCaptcha: row.enable_captcha,
      captchaSiteKey: row.captcha_site_key
    };
  }
});
