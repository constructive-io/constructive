/**
 * Auth Surface Loader (Tier 2 — tenant DB)
 *
 * Where a tenant's auth surface physically lives: the schemas holding the
 * generated identity procedures, and the physical names of the identifier
 * relations a caller reads back.
 *
 * This is platform knowledge, not application logic. Schema and table names
 * carry the tenant's provisioning prefix and scope, so two tenants in the same
 * cluster disagree about them and no consumer can hardcode them — every
 * consumer that touches an auth row was hand-writing this same query first
 * (constructive-planning#1414), and each hand-written copy is another chance to
 * key discovery wrong, where wrong means a cross-tenant read rather than a
 * crash.
 *
 * Procedure *names* are fixed by the generators that emit them
 * (`sign_in_identity`, `sign_up_identity`, `verify_idp`, `link_identity`); only
 * their schemas vary, which is why only schemas are resolved here.
 */

import type { AuthSurface } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';
import { requireDatabaseId } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

/**
 * One round trip for the whole surface.
 *
 * `identity_providers_module` anchors the auth schemas and
 * `connected_accounts_module` the identifier schemas; the emails relation name
 * comes from `emails_module`. The joins between them are on `database_id` for
 * the same reason the outer filter is: they must land in the *same* tenant.
 */
const AUTH_SURFACE_SQL = `
  SELECT
    auth_private.schema_name AS private_schema,
    auth_public.schema_name AS public_schema,
    identifiers_public.schema_name AS identifiers_public_schema,
    emails.table_name AS emails_table,
    'user_' || connected.table_name AS connected_accounts_view
  FROM metaschema_modules_public.identity_providers_module providers
  JOIN metaschema_public.schema auth_private ON auth_private.id = providers.private_schema_id
  JOIN metaschema_public.schema auth_public ON auth_public.id = providers.schema_id
  JOIN metaschema_modules_public.connected_accounts_module connected
    ON connected.database_id = providers.database_id
  JOIN metaschema_public.schema identifiers_public ON identifiers_public.id = connected.schema_id
  JOIN metaschema_modules_public.emails_module emails
    ON emails.database_id = providers.database_id
  WHERE providers.database_id = $1
  LIMIT 1
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface AuthSurfaceRow {
  private_schema: string;
  public_schema: string;
  identifiers_public_schema: string;
  emails_table: string;
  connected_accounts_view: string;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const authSurfaceLoader: ModuleLoader<AuthSurface> = createModuleLoader<AuthSurface>({
  name: 'authSurface',
  ttlMs: 5 * 60_000,
  async resolve(ctx: LoaderContext) {
    const { tenantPool, databaseId } = ctx;
    requireDatabaseId(databaseId, 'authSurface');

    const result = await tenantPool.query<AuthSurfaceRow>(AUTH_SURFACE_SQL, [databaseId]);
    const row = result.rows[0];
    // Absent identity modules mean this tenant has no auth surface, which is
    // the loader contract's "not provisioned" — the caller decides whether that
    // is fatal for the route it is serving.
    if (!row) return undefined;

    return {
      privateSchema: row.private_schema,
      publicSchema: row.public_schema,
      identifiersPublicSchema: row.identifiers_public_schema,
      emailsTable: row.emails_table,
      connectedAccountsView: row.connected_accounts_view
    };
  }
});
