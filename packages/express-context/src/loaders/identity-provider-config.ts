/**
 * Identity Provider Config Loader
 *
 * Loads all enabled identity providers with their full configuration,
 * including decrypted client secrets. Returns a Map keyed by provider slug
 * for O(1) lookup.
 *
 * This loader combines data from:
 *   - identity_providers table (provider config)
 *   - user_secrets table (encrypted client_secret)
 *
 * Usage:
 *   const providers = await ctx.useModule('identityProviderConfig');
 *   const github = providers?.get('github');
 */

import type { LoaderContext, ModuleLoader } from './types';
import type {
  IdentityProviderFullConfig,
  IdentityProviderConfigMap,
} from '../types';
import { createModuleLoader } from './create-loader';

// ─── SQL ────────────────────────────────────────────────────────────────────

/**
 * Query to load all enabled providers with their decrypted secrets.
 * Parameters:
 *   $1: database_id
 *
 * The query dynamically uses schema/table names resolved from the loader context,
 * so we build it at runtime.
 */
function buildProvidersSql(
  ipSchema: string,
  ipTable: string,
  secretsSchema: string,
  secretsTable: string,
): string {
  return `
    SELECT
      ip.slug,
      ip.kind,
      ip.display_name,
      ip.enabled,
      ip.client_id,
      convert_from(secrets.value, 'UTF8') as client_secret,
      ip.authorization_url,
      ip.token_url,
      ip.userinfo_url,
      ip.scopes,
      ip.pkce_enabled
    FROM "${ipSchema}"."${ipTable}" ip
    LEFT JOIN "${secretsSchema}"."${secretsTable}" secrets ON secrets.id = ip.client_secret_id
    WHERE ip.enabled = true
      AND ip.client_id IS NOT NULL
      AND ip.client_secret_id IS NOT NULL
  `;
}

// ─── Row Types ──────────────────────────────────────────────────────────────

interface ProviderRow {
  slug: string;
  kind: 'oauth2' | 'oidc';
  display_name: string;
  enabled: boolean;
  client_id: string;
  client_secret: string | null;
  authorization_url: string | null;
  token_url: string | null;
  userinfo_url: string | null;
  scopes: string[] | null;
  pkce_enabled: boolean | null;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const identityProviderConfigLoader: ModuleLoader<IdentityProviderConfigMap> =
  createModuleLoader<IdentityProviderConfigMap>({
    name: 'identityProviderConfig',
    ttlMs: 5 * 60_000,
    async resolve(ctx: LoaderContext) {
      const { tenantPool, databaseId } = ctx;

      // First, resolve the identity_providers module config
      const ipModuleResult = await tenantPool.query<{
        schema_name: string;
        private_schema_name: string;
        table_name: string;
      }>(
        `
        SELECT
          s.schema_name,
          ps.schema_name AS private_schema_name,
          ipm.table_name
        FROM metaschema_modules_public.identity_providers_module ipm
        JOIN metaschema_public.schema s ON s.id = ipm.schema_id
        JOIN metaschema_public.schema ps ON ps.id = ipm.private_schema_id
        WHERE ipm.database_id = $1
        LIMIT 1
        `,
        [databaseId],
      );

      const ipModule = ipModuleResult.rows[0];
      if (!ipModule) return undefined;

      // Resolve the user_secrets module config
      const secretsModuleResult = await tenantPool.query<{
        schema_name: string;
        table_name: string;
      }>(
        `
        SELECT
          s.schema_name,
          csm.table_name
        FROM metaschema_modules_public.config_secrets_user_module csm
        JOIN metaschema_public.schema s ON s.id = csm.schema_id
        WHERE csm.database_id = $1
        LIMIT 1
        `,
        [databaseId],
      );

      const secretsModule = secretsModuleResult.rows[0];
      if (!secretsModule) return undefined;

      // Build and execute the providers query
      const sql = buildProvidersSql(
        ipModule.private_schema_name,
        ipModule.table_name,
        secretsModule.schema_name,
        secretsModule.table_name,
      );

      const result = await tenantPool.query<ProviderRow>(sql);

      // Build the Map
      const configMap: IdentityProviderConfigMap = new Map();

      for (const row of result.rows) {
        if (!row.client_id || !row.client_secret) {
          continue;
        }

        configMap.set(row.slug, {
          slug: row.slug,
          kind: row.kind,
          displayName: row.display_name,
          enabled: row.enabled,
          clientId: row.client_id,
          clientSecret: row.client_secret,
          authorizationUrl: row.authorization_url,
          tokenUrl: row.token_url,
          userinfoUrl: row.userinfo_url,
          scopes: row.scopes || [],
          pkceEnabled: row.pkce_enabled ?? true,
        });
      }

      return configMap;
    },
  });
