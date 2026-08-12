import { Parser } from 'csv-to-pg';

/**
 * Catalog plane projection: catalog_private.apis is trigger-derived from
 * routing_public.apis by catalog_private.tg_apis_catalog_sync(). During
 * migration replay the sync trigger is skipped (session_replication_role),
 * and the catalog tables cannot be queried through the meta API (bare-name
 * collisions with routing_public) — so the projection is materialized at
 * export time, mirroring the trigger mapping 1:1. resolve_route() needs
 * these rows to build resolved_config for api targets.
 *
 * Both the SQL and GraphQL export flows run this projection so their output
 * stays byte-identical (cross-flow parity).
 */
export const projectCatalogApis = async (
  apisRows: Record<string, unknown>[]
): Promise<string | undefined> => {
  if (!apisRows.length) return undefined;

  const projected = apisRows.map((r) => ({
    id: r.id,
    owner_scope: 'database',
    owner_key: r.database_id,
    is_visible: r.is_published ?? false,
    database_id: r.database_id,
    name: r.name,
    dbname: r.dbname,
    role_name: r.role_name,
    anon_role: r.anon_role,
    config: r.config ?? null
  }));

  const parser = new Parser({
    schema: 'catalog_private',
    table: 'apis',
    fields: {
      id: 'uuid',
      owner_scope: 'text',
      owner_key: 'uuid',
      is_visible: 'boolean',
      database_id: 'uuid',
      name: 'text',
      dbname: 'text',
      role_name: 'text',
      anon_role: 'text',
      config: 'jsonb'
    }
  });

  const parsed = await parser.parse(projected);
  return parsed || undefined;
};
