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
  ConstructiveContext,
  UpdateAuthSettingsInput,
  UpdateAuthSettingsResult,
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

const UPDATE_FIELD_MAP: Record<
  keyof UpdateAuthSettingsInput,
  { column: string; castInterval?: boolean }
> = {
  allowIdentitySignIn: { column: 'allow_identity_sign_in' },
  allowIdentitySignUp: { column: 'allow_identity_sign_up' },
  cookieSecure: { column: 'cookie_secure' },
  cookieSamesite: { column: 'cookie_samesite' },
  cookieDomain: { column: 'cookie_domain' },
  cookieHttponly: { column: 'cookie_httponly' },
  cookieMaxAge: { column: 'cookie_max_age', castInterval: true },
  cookiePath: { column: 'cookie_path' },
  rememberMeDuration: { column: 'remember_me_duration', castInterval: true },
  enableCaptcha: { column: 'enable_captcha' },
  captchaSiteKey: { column: 'captcha_site_key' },
  oauthStateMaxAge: { column: 'oauth_state_max_age', castInterval: true },
  oauthRequireVerifiedEmail: { column: 'oauth_require_verified_email' },
  oauthErrorRedirectPath: { column: 'oauth_error_redirect_path' },
};

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

function buildUpdateAuthSettingsQuery(
  schemaName: string,
  tableName: string,
  patch: UpdateAuthSettingsInput,
): { sql: string; values: unknown[] } | null {
  const authSettingsTable = QuoteUtils.quoteQualifiedIdentifier(
    schemaName,
    tableName,
  );
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [field, config] of Object.entries(UPDATE_FIELD_MAP) as Array<
    [keyof UpdateAuthSettingsInput, { column: string; castInterval?: boolean }]
  >) {
    if (field in patch) {
      const cast = config.castInterval ? '::interval' : '';
      setClauses.push(
        `${QuoteUtils.quoteIdentifier(config.column)} = $${paramIndex++}${cast}`,
      );
      values.push(patch[field]);
    }
  }

  if (setClauses.length === 0) return null;

  return {
    sql: `
      UPDATE ${authSettingsTable}
      SET ${setClauses.join(', ')}
    `,
    values,
  };
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

export async function updateAuthSettings(
  ctx: ConstructiveContext,
  patch: UpdateAuthSettingsInput,
): Promise<UpdateAuthSettingsResult> {
  const table = await discoverAuthSettingsTable(ctx.pool, ctx.databaseId);
  if (!table) return 'not_configured';

  const update = buildUpdateAuthSettingsQuery(
    table.schemaName,
    table.tableName,
    patch,
  );
  if (!update) return 'no_fields';

  await ctx.pool.query(update.sql, update.values);
  if (ctx.databaseId) {
    authSettingsLoader.invalidate(ctx.databaseId);
  }

  return 'updated';
}
