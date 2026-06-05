/**
 * Platform Secrets Module Loader
 *
 * Returns the fixed schema and table for platform_secrets.
 * Platform secrets use the new platform-scoped infrastructure (PRs #1449, #1459, #1461):
 *   - Schema: constructive_store_private
 *   - Table: platform_secrets
 *
 * OAuth identity_providers.client_secret_id points to platform_secrets
 * (see rotate_identity_provider_platform_secret procedure in constructive_auth_private).
 *
 * Secrets are PGP-encrypted at rest by BEFORE INSERT/UPDATE triggers.
 * Use platform_secrets_get(name, default, namespace) to decrypt, or JOIN with
 * pgp_sym_decrypt(value, key_id::text) for batch queries.
 */

import type { ModuleLoader } from './types';
import { createModuleLoader } from './create-loader';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EncryptedSecretsConfig {
  schemaName: string;
  tableName: string;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const encryptedSecretsLoader: ModuleLoader<EncryptedSecretsConfig> =
  createModuleLoader<EncryptedSecretsConfig>({
    name: 'encryptedSecrets',
    ttlMs: 5 * 60_000,
    async resolve() {
      return {
        schemaName: 'constructive_store_private',
        tableName: 'platform_secrets',
      };
    },
  });
