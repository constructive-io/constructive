import { Logger } from '@pgpmjs/logger';
import { Pool } from 'pg';

import { ApiOptions, ApiStructure } from '../types';

const log = new Logger('routing');

// =============================================================================
// Scoped routing plane (resolve_route contract)
// =============================================================================
//
// One indexed call resolves an incoming request across scopes. The server's
// projection is HOST-ONLY: Traefik/Ingress owns L7 path/method routing, so
// the server always calls the frozen contract with the root path and no
// method:
//
//   SELECT * FROM <schema>.resolve_route(request_host, '/', NULL)
//
// Contract (constructive-db docs/architecture/scoped-domain-routing.md):
// a single row is always returned; no match → route_binding_id IS NULL.

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

/** Published logical name of the database-scope routing plane. */
export const DEFAULT_ROUTING_SCHEMA = 'routing_public';

/** The routing-plane schema in effect: configured override or the published default. */
export const getRoutingSchema = (opts: {
  api?: { routingSchema?: string };
}): string =>
  opts.api?.routingSchema || DEFAULT_ROUTING_SCHEMA;

export const isValidSchemaName = (name: string): boolean =>
  /^[a-z_][a-z0-9_]*$/.test(name);

/**
 * Constructive physical schemas may contain the generated dash separators used
 * by tenant prefixes. They are always passed as data or quoted identifiers, but
 * keep the accepted alphabet deliberately narrow and reject system namespaces.
 */
export const isValidPhysicalSchemaName = (name: string): boolean =>
  /^[a-z_][a-z0-9_-]*$/.test(name)
  && name.length <= 63
  && name !== 'information_schema'
  && !name.startsWith('pg_');

/**
 * Resolve a hostname through the compiled scoped-routing plane (host-only:
 * path/method routing belongs to Traefik/Ingress, not the server).
 * Returns null when there is no match (route_binding_id IS NULL) or when the
 * resolver is not installed in the target database — in both cases the caller
 * treats it as a hard no-match (→ 404); there is no legacy fallback.
 */
export const resolveRoute = async (
  pool: Pool,
  schema: string,
  host: string
): Promise<ResolvedRoute | null> => {
  if (!isValidSchemaName(schema)) {
    log.warn(`[resolve-route] invalid routing schema name: ${schema}`);
    return null;
  }

  try {
    const result = await pool.query<ResolvedRoute>(
      `SELECT * FROM "${schema}".${RESOLVER_FUNCTION}($1, '/', NULL)`,
      [host]
    );
    if (result.rows.length !== 1) {
      log.warn(
        `[resolve-route] expected exactly one resolver row for host=${host}; `
          + `received ${result.rows.length}`
      );
      return null;
    }
    const row = result.rows[0];
    if (!row || row.route_binding_id === null) {
      log.debug(`[resolve-route] no match for host=${host}`);
      return null;
    }
    return row;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    // 42883 undefined_function / 3F000 invalid_schema_name: resolver not
    // installed in this database — treat as a hard no-match.
    if (err.code === '42883' || err.code === '3F000') {
      log.debug(`[resolve-route] resolver not installed (${err.code}); no match`);
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
 * Map a resolved api-target route onto the ApiStructure shape consumed by the
 * rest of the middleware chain. Returns null when the route target is not an
 * api surface or its resolved_config lacks the api essentials (→ 404).
 */
export const routeToApiStructure = (
  route: ResolvedRoute,
  opts: ApiOptions
): ApiStructure | null => {
  if (route.target_module !== 'apis' && route.target_module !== 'api') {
    return null;
  }

  const config = (route.resolved_config ?? {}) as ApiSurfaceConfig;
  const expectedPublic = opts.api?.isPublic ?? false;
  if (typeof config.is_public !== 'boolean' || config.is_public !== expectedPublic) {
    log.warn('[resolve-route] api visibility does not match this server ingress; no match');
    return null;
  }

  if (
    !config.api_id
    || !config.database_id
    || route.target_source_id !== config.api_id
    || route.target_owner_scope !== 'database'
    || route.target_owner_key !== config.database_id
  ) {
    log.warn('[resolve-route] api target missing exact api/database identity; no match');
    return null;
  }

  if (
    !config.schemas?.length
    || config.schemas.some((schema) => !isValidPhysicalSchemaName(schema))
    || new Set(config.schemas).size !== config.schemas.length
  ) {
    log.warn('[resolve-route] api target has an invalid physical schema contract; no match');
    return null;
  }

  if (!config.role_name || !config.anon_role) {
    log.warn('[resolve-route] api target missing exact request roles; no match');
    return null;
  }

  return {
    apiId: config.api_id,
    // Scoped APIs leave dbname NULL when their schemas live in the serving
    // database; fall back to the server's own database in that case.
    dbname: config.dbname || opts.pg?.database || '',
    anonRole: config.anon_role,
    roleName: config.role_name,
    schema: config.schemas,
    domains: [],
    databaseId: config.database_id,
    isPublic: config.is_public
  };
};
