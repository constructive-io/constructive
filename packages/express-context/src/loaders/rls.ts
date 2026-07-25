/**
 * RLS Module Loader
 *
 * Resolves RLS authentication function names and schema references for
 * a given database from the scoped routing plane. Tries the rls_settings
 * table first, falls back to the api_modules approach.
 */

import type { RlsModule } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const RLS_SETTINGS_SQL = `
  SELECT
    auth_schema.schema_name AS authenticate_schema,
    role_schema.schema_name AS role_schema,
    auth_fn.name AS authenticate,
    auth_strict_fn.name AS authenticate_strict,
    role_fn.name AS current_role,
    role_id_fn.name AS current_role_id,
    ua_fn.name AS current_user_agent,
    ip_fn.name AS current_ip_address
  FROM constructive_routing_public.rls_settings rs
  LEFT JOIN metaschema_public.schema auth_schema ON rs.authenticate_schema_id = auth_schema.id
  LEFT JOIN metaschema_public.schema role_schema ON rs.role_schema_id = role_schema.id
  LEFT JOIN metaschema_public.function auth_fn ON rs.authenticate_function_id = auth_fn.id
  LEFT JOIN metaschema_public.function auth_strict_fn ON rs.authenticate_strict_function_id = auth_strict_fn.id
  LEFT JOIN metaschema_public.function role_fn ON rs.current_role_function_id = role_fn.id
  LEFT JOIN metaschema_public.function role_id_fn ON rs.current_role_id_function_id = role_id_fn.id
  LEFT JOIN metaschema_public.function ua_fn ON rs.current_user_agent_function_id = ua_fn.id
  LEFT JOIN metaschema_public.function ip_fn ON rs.current_ip_address_function_id = ip_fn.id
  WHERE rs.database_id = $1
  LIMIT 1
`;

const RLS_MODULE_SQL = `
  SELECT data
  FROM constructive_routing_public.api_modules
  WHERE api_id = $1 AND name = 'rls_module'
  LIMIT 1
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface RlsSettingsRow {
  authenticate: string;
  authenticate_strict: string;
  authenticate_schema: string;
  role_schema: string;
  current_role: string;
  current_role_id: string;
  current_ip_address: string;
  current_user_agent: string;
}

interface RlsModuleRow {
  data: RlsSettingsRow | null;
}

// ─── Transforms ─────────────────────────────────────────────────────────────

function fromSettings(row: RlsSettingsRow | null): RlsModule | undefined {
  if (!row) return undefined;
  if (!row.authenticate || !row.authenticate_schema) return undefined;
  return {
    authenticate: row.authenticate,
    authenticateStrict: row.authenticate_strict,
    privateSchema: { schemaName: row.authenticate_schema },
    publicSchema: { schemaName: row.role_schema },
    currentRole: row.current_role,
    currentRoleId: row.current_role_id,
    currentIpAddress: row.current_ip_address,
    currentUserAgent: row.current_user_agent
  };
}

function fromModule(row: RlsModuleRow | null): RlsModule | undefined {
  if (!row?.data) return undefined;
  const d = row.data;
  return {
    authenticate: d.authenticate,
    authenticateStrict: d.authenticate_strict,
    privateSchema: { schemaName: d.authenticate_schema },
    publicSchema: { schemaName: d.role_schema },
    currentRole: d.current_role,
    currentRoleId: d.current_role_id,
    currentIpAddress: d.current_ip_address,
    currentUserAgent: d.current_user_agent
  };
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const rlsLoader: ModuleLoader<RlsModule> = createModuleLoader<RlsModule>({
  name: 'rlsModule',
  ttlMs: 5 * 60_000,
  async resolve(ctx: LoaderContext) {
    const { routingPool, databaseId, apiId } = ctx;

    // Try new rls_settings table first
    try {
      const result = await routingPool.query<RlsSettingsRow>(RLS_SETTINGS_SQL, [databaseId]);
      const resolved = fromSettings(result.rows[0] ?? null);
      if (resolved) return resolved;
    } catch {
      // Table may not exist yet
    }

    // Fall back to api_modules
    if (apiId) {
      const result = await routingPool.query<RlsModuleRow>(RLS_MODULE_SQL, [apiId]);
      return fromModule(result.rows[0] ?? null);
    }

    return undefined;
  }
});
