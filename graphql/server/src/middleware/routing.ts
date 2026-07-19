import { Logger } from '@pgpmjs/logger';
import { Pool } from 'pg';

import { ApiOptions, ApiStructure } from '../types';

const log = new Logger('routing');

// =============================================================================
// Scoped routing plane (resolve_route contract)
// =============================================================================
//
// One indexed call resolves an incoming request across scopes:
//
//   SELECT * FROM <schema>.resolve_route(request_host, request_path, request_method)
//
// Contract (constructive-db docs/architecture/scoped-domain-routing.md):
// a single row is always returned; no match → route_binding_id IS NULL.
// resolved_config is a jsonb snapshot the server consumes without further
// lookups.

/** Row shape returned by <schema>.resolve_route() — frozen DB↔server contract. */
export interface ResolvedRoute {
  route_binding_id: string | null;
  hostname: string | null;
  matched_wildcard: boolean | null;
  matched_path: string | null;
  method: string | null;
  priority: number | null;
  domain_id: string | null;
  target_catalog_id: string | null;
  target_module: string | null;
  target_source_id: string | null;
  target_owner_scope: string | null;
  target_owner_key: string | null;
  resolved_config: Record<string, unknown> | null;
  verification_status: string | null;
  tls_status: string | null;
  tls_secret_name: string | null;
}

const RESOLVER_FUNCTION = 'resolve_route';

const isValidSchemaName = (name: string): boolean =>
  /^[a-z_][a-z0-9_]*$/.test(name);

/**
 * Resolve host/path/method through the compiled scoped-routing plane.
 * Returns null when there is no match (route_binding_id IS NULL) or when the
 * resolver is not installed in the target database — callers fall back to the
 * legacy services_public lookup in both cases.
 */
export const resolveRoute = async (
  pool: Pool,
  schema: string,
  host: string,
  path: string,
  method: string
): Promise<ResolvedRoute | null> => {
  if (!isValidSchemaName(schema)) {
    log.warn(`[resolve-route] invalid routing schema name: ${schema}`);
    return null;
  }

  try {
    const result = await pool.query<ResolvedRoute>(
      `SELECT * FROM "${schema}".${RESOLVER_FUNCTION}($1, $2, $3)`,
      [host, path, method]
    );
    const row = result.rows[0];
    if (!row || row.route_binding_id === null) {
      log.debug(`[resolve-route] no match for host=${host} path=${path} method=${method}`);
      return null;
    }
    return row;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    // 42883 undefined_function / 3F000 invalid_schema_name: resolver not
    // installed in this database — treat as no-match so the caller falls back.
    if (err.code === '42883' || err.code === '3F000') {
      log.debug(`[resolve-route] resolver not installed (${err.code}); falling back`);
      return null;
    }
    throw error;
  }
};

/**
 * Config keys the scoped api surface folds into `config` (and route
 * `resolved_config`) that the server maps onto ApiStructure.
 */
interface ApiSurfaceConfig {
  api_id?: string;
  database_id?: string;
  dbname?: string;
  role_name?: string;
  anon_role?: string;
  is_public?: boolean;
  schemas?: string[];
}

/**
 * Map a resolved api-target route onto the legacy ApiStructure shape consumed
 * by the rest of the middleware chain. Returns null when the route target is
 * not an api surface or its resolved_config lacks the api essentials — the
 * caller falls back to the legacy lookup.
 */
export const routeToApiStructure = (
  route: ResolvedRoute,
  opts: ApiOptions
): ApiStructure | null => {
  if (route.target_module !== 'apis' && route.target_module !== 'api') {
    return null;
  }

  const config = (route.resolved_config ?? {}) as ApiSurfaceConfig;
  if (!config.dbname || !config.schemas?.length) {
    log.debug('[resolve-route] api target missing dbname/schemas in resolved_config; falling back');
    return null;
  }

  return {
    apiId: config.api_id ?? route.target_source_id ?? undefined,
    dbname: config.dbname || opts.pg?.database || '',
    anonRole: config.anon_role || 'anon',
    roleName: config.role_name || 'authenticated',
    schema: config.schemas,
    apiModules: [],
    domains: [],
    databaseId: config.database_id,
    isPublic: config.is_public ?? (opts.api?.isPublic ?? false),
  };
};
