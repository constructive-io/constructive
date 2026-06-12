/**
 * Identity Providers Module Loader
 *
 * Resolves the identity_providers_module config from metaschema_modules_public
 * and loads all enabled providers with their full runtime configuration.
 */

import { QuoteUtils } from '@pgsql/quotes';

import type {
  IdentityProviderConfigMap,
  IdentityProvidersConfig,
} from '../types';
import type { LoaderContext, ModuleLoader } from './types';
import { createModuleLoader } from './create-loader';

// ─── SQL ────────────────────────────────────────────────────────────────────

const IDENTITY_PROVIDERS_MODULE_SQL = `
  SELECT
    s.schema_name,
    ps.schema_name AS private_schema_name,
    ipm.table_name,
    ipm.prefix
  FROM metaschema_modules_public.identity_providers_module ipm
  JOIN metaschema_public.schema s ON s.id = ipm.schema_id
  JOIN metaschema_public.schema ps ON ps.id = ipm.private_schema_id
  WHERE ipm.database_id = $1
  LIMIT 1
`;

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
      END AS client_secret,
      ip.authorization_url,
      ip.token_url,
      ip.userinfo_url,
      ip.scopes,
      ip.pkce_enabled
    FROM ${QuoteUtils.quoteQualifiedIdentifier(ipSchema, ipTable)} ip
    LEFT JOIN "constructive_store_private"."platform_secrets" secrets ON secrets.id = ip.client_secret_id
    WHERE ip.enabled = true
      AND ip.client_id IS NOT NULL
      AND ip.client_secret_id IS NOT NULL
  `;
}

// ─── Row Types ──────────────────────────────────────────────────────────────

interface IdentityProvidersModuleRow {
  schema_name: string;
  private_schema_name: string;
  table_name: string;
  prefix: string;
}

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

export const identityProvidersLoader: ModuleLoader<IdentityProvidersConfig> =
  createModuleLoader<IdentityProvidersConfig>({
    name: 'identityProviders',
    ttlMs: 5 * 60_000,
    async resolve(ctx: LoaderContext) {
      const { tenantPool, databaseId } = ctx;

      const moduleResult = await tenantPool.query<IdentityProvidersModuleRow>(
        IDENTITY_PROVIDERS_MODULE_SQL,
        [databaseId],
      );
      const moduleRow = moduleResult.rows[0];
      if (!moduleRow) return undefined;

      const providersResult = await tenantPool.query<ProviderRow>(
        buildProvidersSql(moduleRow.private_schema_name, moduleRow.table_name),
      );

      const providers: IdentityProviderConfigMap = new Map();
      for (const row of providersResult.rows) {
        if (!row.client_id || !row.client_secret) {
          continue;
        }
        providers.set(row.slug, {
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

      return {
        schemaName: moduleRow.schema_name,
        privateSchemaName: moduleRow.private_schema_name,
        tableName: moduleRow.table_name,
        prefix: moduleRow.prefix,
        rotateSecretFunction: `rotate_identity_provider_${moduleRow.prefix}_secret`,
        signInIdentityFunction: 'sign_in_identity',
        signUpIdentityFunction: 'sign_up_identity',
        providers,
      };
    },
  });
