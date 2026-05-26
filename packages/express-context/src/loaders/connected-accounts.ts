/**
 * Connected Accounts Module Loader
 *
 * Resolves the connected_accounts_module config from metaschema_modules_public.
 * Provides schema names for querying OAuth identity associations.
 */

import type { LoaderContext, ModuleLoader } from './types';
import { createModuleLoader } from './create-loader';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ConnectedAccountsConfig {
  schemaName: string;
  privateSchemaName: string;
  tableName: string;
}

// ─── SQL ────────────────────────────────────────────────────────────────────

const CONNECTED_ACCOUNTS_MODULE_SQL = `
  SELECT
    s.schema_name,
    ps.schema_name AS private_schema_name,
    cam.table_name
  FROM metaschema_modules_public.connected_accounts_module cam
  JOIN metaschema_public.schema s ON s.id = cam.schema_id
  JOIN metaschema_public.schema ps ON ps.id = cam.private_schema_id
  WHERE cam.database_id = $1
  LIMIT 1
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface ConnectedAccountsModuleRow {
  schema_name: string;
  private_schema_name: string;
  table_name: string;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const connectedAccountsLoader: ModuleLoader<ConnectedAccountsConfig> =
  createModuleLoader<ConnectedAccountsConfig>({
    name: 'connectedAccounts',
    ttlMs: 5 * 60_000,
    async resolve(ctx: LoaderContext) {
      const { tenantPool, databaseId } = ctx;

      const result = await tenantPool.query<ConnectedAccountsModuleRow>(
        CONNECTED_ACCOUNTS_MODULE_SQL,
        [databaseId],
      );
      const row = result.rows[0];
      if (!row) return undefined;

      return {
        schemaName: row.schema_name,
        privateSchemaName: row.private_schema_name,
        tableName: row.table_name,
      };
    },
  });
