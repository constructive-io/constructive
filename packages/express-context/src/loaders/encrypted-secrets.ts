/**
 * Platform Secrets Module Loader
 *
 * Returns the fixed schema and table for platform_secrets. OAuth identity
 * providers store client_secret_id references in this platform-scoped table.
 */

import type { EncryptedSecretsConfig } from '../types';
import type { ModuleLoader } from './types';
import { createModuleLoader } from './create-loader';

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
