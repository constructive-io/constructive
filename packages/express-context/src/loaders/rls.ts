/**
 * RLS Module Loader
 *
 * Resolves RLS authentication function names and schema references for
 * a given database from the scoped routing plane via the typed rls_settings
 * table.
 */

import type { RlsModule } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';
import { routingSchemaOf } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const rlsSettingsSql = (schema: string): string => `
  SELECT
    auth_schema.schema_name AS authenticate_schema,
    role_schema.schema_name AS role_schema,
    auth_fn.name AS authenticate,
    auth_strict_fn.name AS authenticate_strict,
    role_fn.name AS current_role,
    role_id_fn.name AS current_role_id,
    ua_fn.name AS current_user_agent,
    ip_fn.name AS current_ip_address
  FROM "${schema}".rls_settings rs
  LEFT JOIN metaschema_public.schema auth_schema
    ON rs.authenticate_schema_id = auth_schema.id
   AND auth_schema.database_id = rs.database_id
  LEFT JOIN metaschema_public.schema role_schema
    ON rs.role_schema_id = role_schema.id
   AND role_schema.database_id = rs.database_id
  LEFT JOIN metaschema_public.function auth_fn
    ON rs.authenticate_function_id = auth_fn.id
   AND auth_fn.database_id = rs.database_id
   AND auth_fn.schema_id = rs.authenticate_schema_id
  LEFT JOIN metaschema_public.function auth_strict_fn
    ON rs.authenticate_strict_function_id = auth_strict_fn.id
   AND auth_strict_fn.database_id = rs.database_id
   AND auth_strict_fn.schema_id = rs.authenticate_schema_id
  LEFT JOIN metaschema_public.function role_fn
    ON rs.current_role_function_id = role_fn.id
   AND role_fn.database_id = rs.database_id
   AND role_fn.schema_id = rs.role_schema_id
  LEFT JOIN metaschema_public.function role_id_fn
    ON rs.current_role_id_function_id = role_id_fn.id
   AND role_id_fn.database_id = rs.database_id
   AND role_id_fn.schema_id = rs.role_schema_id
  LEFT JOIN metaschema_public.function ua_fn
    ON rs.current_user_agent_function_id = ua_fn.id
   AND ua_fn.database_id = rs.database_id
   AND ua_fn.schema_id = rs.role_schema_id
  LEFT JOIN metaschema_public.function ip_fn
    ON rs.current_ip_address_function_id = ip_fn.id
   AND ip_fn.database_id = rs.database_id
   AND ip_fn.schema_id = rs.role_schema_id
  WHERE rs.database_id = $1
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

// ─── Transforms ─────────────────────────────────────────────────────────────

function fromSettings(row: RlsSettingsRow | null): RlsModule | undefined {
  if (!row) return undefined;
  const required = [
    row.authenticate,
    row.authenticate_schema,
    row.role_schema,
    row.current_role,
    row.current_role_id,
    row.current_ip_address,
    row.current_user_agent
  ];
  if (required.some((value) => typeof value !== 'string' || value.length === 0)) {
    throw new Error('Incomplete or cross-database RLS module configuration');
  }
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

// ─── Loader ─────────────────────────────────────────────────────────────────

export const rlsLoader: ModuleLoader<RlsModule> = createModuleLoader<RlsModule>({
  name: 'rlsModule',
  // Authentication routing is an authorization boundary. Resolve it from the
  // routing plane on every request; LISTEN notifications and TTLs are not an
  // acceptable revocation mechanism because notifications can be missed.
  cache: false,
  async resolve(ctx: LoaderContext) {
    const { routingPool, databaseId } = ctx;
    const result = await routingPool.query<RlsSettingsRow>(rlsSettingsSql(routingSchemaOf(ctx)), [databaseId]);
    if (result.rows.length > 1) {
      throw new Error('Ambiguous RLS module configuration');
    }
    return fromSettings(result.rows[0] ?? null);
  }
});
