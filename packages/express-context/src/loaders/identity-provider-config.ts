/**
 * Identity Provider Config Loader
 *
 * Loads all enabled identity providers with their full configuration,
 * including decrypted client secrets. Returns a Map keyed by provider slug
 * for O(1) lookup.
 *
 * This loader combines data from:
 *   - identity_providers table (provider config in constructive_auth_private)
 *   - platform_secrets table (encrypted client_secret in constructive_store_private)
 *
 * Secrets are PGP-encrypted at rest and decrypted via pgp_sym_decrypt.
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
 *   $1: database_id (unused, but kept for consistency with other loaders)
 *
 * Platform secrets are PGP-encrypted. We decrypt via pgp_sym_decrypt using the key_id.
 * The decrypted value is hex-encoded, so we decode and convert to text.
 */
function buildProvidersSql(ipSchema: string, ipTable: string): string {
  return `
    SELECT
      ip.slug,
      ip.kind,
      ip.display_name,
      ip.enabled,
      ip.client_id,
      CASE
        WHEN secrets.algo = 'pgp' THEN
          convert_from(decode(pgp_sym_decrypt(secrets.value, secrets.key_id::text), 'hex'), 'SQL_ASCII')
        WHEN secrets.algo = 'crypt' THEN
          convert_from(secrets.value, 'SQL_ASCII')
        ELSE
          convert_from(secrets.value, 'UTF8')
      END as client_secret,
      ip.authorization_url,
      ip.token_url,
      ip.userinfo_url,
      ip.scopes,
      ip.pkce_enabled
    FROM "${ipSchema}"."${ipTable}" ip
    LEFT JOIN "constructive_store_private"."platform_secrets" secrets ON secrets.id = ip.client_secret_id
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

      // Resolve the identity_providers module config
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

      // Build and execute the providers query
      // platform_secrets is a fixed schema/table, no module lookup needed
      const sql = buildProvidersSql(
        ipModule.private_schema_name,
        ipModule.table_name,
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
