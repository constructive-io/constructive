/**
 * Unified-auth SSO Surface Loader (Tier 2 — tenant DB)
 *
 * Resolves only the private schema provisioned for the current database's
 * database-scoped unified_auth_module. Procedure names are fixed by the DB
 * module contract; policy, Site configuration, and Provider secrets remain in
 * their owning loaders/functions.
 *
 * This loader is opt-in and is not registered by createDefaultRegistry().
 */

import type { SsoSurface } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';
import { requireDatabaseId } from './types';

const SSO_SURFACE_SQL = `
  SELECT private_schema.schema_name AS private_schema
  FROM metaschema_modules_public.unified_auth_module unified_auth
  JOIN metaschema_public.schema private_schema
    ON private_schema.id = unified_auth.private_schema_id
  WHERE unified_auth.database_id = $1
    AND unified_auth.scope = 'database'
  LIMIT 1
`;

interface SsoSurfaceRow {
  private_schema: string;
}

export const ssoSurfaceLoader: ModuleLoader<SsoSurface> =
  createModuleLoader<SsoSurface>({
    name: 'ssoSurface',
    ttlMs: 5 * 60_000,
    async resolve(ctx: LoaderContext) {
      const { tenantPool, databaseId } = ctx;
      requireDatabaseId(databaseId, 'ssoSurface');

      const result = await tenantPool.query<SsoSurfaceRow>(SSO_SURFACE_SQL, [
        databaseId
      ]);
      const row = result.rows[0];
      return row ? { privateSchema: row.private_schema } : undefined;
    }
  });
