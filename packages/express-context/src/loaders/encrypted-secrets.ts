/**
 * Encrypted Secrets Module Loader
 *
 * Resolves the schema and table name for user_secrets from
 * metaschema_modules_public.config_secrets_user_module.
 *
 * Note: The generator creates both user_secrets and app_secrets tables:
 *   - user_secrets: per-user/entity secrets (passwords, OAuth client_secret)
 *   - app_secrets: app-level secrets (API keys, admin-only)
 *
 * OAuth uses user_secrets because identity_providers.client_secret_id points
 * to user_secrets (see rotate_identity_provider_secret procedure).
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
  SELECT s.schema_name
  FROM metaschema_modules_public.config_secrets_user_module csm
  JOIN metaschema_public.schema s ON s.id = csm.schema_id
  WHERE csm.database_id = $1
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
      }>(ENCRYPTED_SECRETS_MODULE_SQL, [databaseId]);

      const row = result.rows[0];
      if (!row) return undefined;

      return {
        schemaName: row.schema_name,
        tableName: 'user_secrets',
      };
    },
  });
