/**
 * Encrypted Secrets Module Loader
 *
 * Resolves the schema name for the encrypted_secrets table from
 * metaschema_modules_public.encrypted_secrets_module. Used by OAuth
 * and other modules that need to decrypt secrets stored in the tenant DB.
 */

import type { LoaderContext, ModuleLoader } from './types';
import { createModuleLoader } from './create-loader';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EncryptedSecretsConfig {
  schemaName: string;
  tableName: string;
}

// ─── SQL ────────────────────────────────────────────────────────────────────

const ENCRYPTED_SECRETS_MODULE_SQL = `
  SELECT
    s.schema_name,
    esm.table_name
  FROM metaschema_modules_public.encrypted_secrets_module esm
  JOIN metaschema_public.schema s ON s.id = esm.schema_id
  WHERE esm.database_id = $1
  LIMIT 1
`;

// ─── Loader ─────────────────────────────────────────────────────────────────

export const encryptedSecretsLoader: ModuleLoader<EncryptedSecretsConfig> =
  createModuleLoader<EncryptedSecretsConfig>({
    name: 'encryptedSecrets',
    ttlMs: 5 * 60_000,
    async resolve(ctx: LoaderContext) {
      const { tenantPool, databaseId } = ctx;

      const result = await tenantPool.query<{
        schema_name: string;
        table_name: string;
      }>(ENCRYPTED_SECRETS_MODULE_SQL, [databaseId]);

      const row = result.rows[0];
      if (!row) return undefined;

      return {
        schemaName: row.schema_name,
        tableName: row.table_name,
      };
    },
  });
