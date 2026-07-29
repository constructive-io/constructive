/**
 * Exposure-surface resolution: what is actually reachable through the
 * exposed APIs. Findings on non-exposed schemas contribute nothing to the
 * score — they are reported as internal advisories.
 */

import type { ExposureConfig } from '../config/types';
import type { QueryExecutor } from './introspect';

export interface ResolvedExposure {
  /** True when a surface was configured or auto-resolved. */
  known: boolean;
  source: 'config' | 'constructive' | 'none';
  schemas: string[];
  roles?: string[];
}

export const UNKNOWN_EXPOSURE: ResolvedExposure = {
  known: false,
  source: 'none',
  schemas: []
};

/**
 * Resolve the exposure surface from config, delegating to a resolver when
 * one is named. Falls back to `UNKNOWN_EXPOSURE` when nothing is configured
 * or the resolver finds no routing plane.
 */
export async function resolveExposure(
  exec: QueryExecutor,
  config?: ExposureConfig
): Promise<ResolvedExposure> {
  if (!config) return UNKNOWN_EXPOSURE;

  if (config.resolver === 'constructive') {
    const resolved = await resolveConstructiveExposure(exec);
    if (resolved) {
      // Static schemas/roles extend (never replace) what the resolver found.
      return {
        known: true,
        source: 'constructive',
        schemas: union(resolved.schemas, config.schemas),
        roles: union(resolved.roles ?? [], config.roles)
      };
    }
    // Routing plane absent — fall through to whatever static surface exists.
  }

  if (config.schemas && config.schemas.length > 0) {
    return {
      known: true,
      source: 'config',
      schemas: [...config.schemas].sort(),
      roles: config.roles
    };
  }

  return UNKNOWN_EXPOSURE;
}

/**
 * Constructive routing-plane introspection: an API exposes a set of schemas
 * via `routing_public.apis` → `routing_public.api_schemas` →
 * `metaschema_public.schema` (and the platform plane via `platform_apis` →
 * `platform_api_schemas`). API-edge roles come from `apis.role_name` /
 * `apis.anon_role`.
 *
 * Returns `null` when the routing plane isn't present in this database.
 */
export async function resolveConstructiveExposure(
  exec: QueryExecutor
): Promise<{ schemas: string[]; roles: string[] } | null> {
  const { rows: present } = await exec.query<{ ok: boolean }>(
    `SELECT
       to_regclass('routing_public.apis') IS NOT NULL
       AND to_regclass('routing_public.api_schemas') IS NOT NULL
       AND to_regclass('metaschema_public.schema') IS NOT NULL AS ok`
  );
  if (!present[0]?.ok) return null;

  const { rows: hasPlatform } = await exec.query<{ ok: boolean }>(
    `SELECT
       to_regclass('routing_public.platform_apis') IS NOT NULL
       AND to_regclass('routing_public.platform_api_schemas') IS NOT NULL AS ok`
  );

  const planes = [
    `SELECT s.schema_name, a.role_name, a.anon_role
       FROM routing_public.apis a
       JOIN routing_public.api_schemas aps ON aps.api_id = a.id
       JOIN metaschema_public.schema s ON s.id = aps.schema_id`
  ];
  if (hasPlatform[0]?.ok) {
    planes.push(
      `SELECT s.schema_name, a.role_name, a.anon_role
         FROM routing_public.platform_apis a
         JOIN routing_public.platform_api_schemas aps ON aps.api_id = a.id
         JOIN metaschema_public.schema s ON s.id = aps.schema_id`
    );
  }

  const { rows } = await exec.query<{
    schema_name: string;
    role_name: string | null;
    anon_role: string | null;
  }>(planes.join(' UNION ALL '));

  const schemas = new Set<string>();
  const roles = new Set<string>();
  for (const r of rows) {
    if (r.schema_name) schemas.add(r.schema_name);
    if (r.role_name) roles.add(r.role_name);
    if (r.anon_role) roles.add(r.anon_role);
  }
  if (schemas.size === 0) return null;

  return { schemas: [...schemas].sort(), roles: [...roles].sort() };
}

function union(base: string[], extra?: string[]): string[] {
  if (!extra || extra.length === 0) return base;
  return [...new Set([...base, ...extra])].sort();
}
