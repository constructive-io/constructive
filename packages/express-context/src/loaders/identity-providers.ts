/**
 * Identity Providers Module Loader
 *
 * Resolves the identity_providers_module config for the current request and
 * loads enabled provider credentials from the platform database.
 */

import { QuoteUtils } from '@pgsql/quotes';

import type {
  IdentityProviderConfigMap,
  IdentityProvidersConfig,
  IdentityProvidersModuleRow,
  PlatformDatabaseRow,
  ProviderRow,
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

const PLATFORM_DATABASE_SQL = `
  SELECT id AS database_id
  FROM metaschema_public.database
  WHERE owner_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1
`;

function buildProvidersSql(
  ipSchema: string,
  ipTable: string,
): string {
  const providersTable = QuoteUtils.quoteQualifiedIdentifier(ipSchema, ipTable);

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
    FROM ${providersTable} ip
    LEFT JOIN "constructive_store_private"."platform_secrets" secrets
      ON secrets.id = ip.client_secret_id
     AND secrets.database_id = $1
    WHERE ip.enabled = true
      AND ip.client_id IS NOT NULL
      AND ip.client_secret_id IS NOT NULL
  `;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

export const identityProvidersLoader: ModuleLoader<IdentityProvidersConfig> =
  createModuleLoader<IdentityProvidersConfig>({
    name: 'identityProviders',
    ttlMs: 5 * 60_000,
    async resolve(ctx: LoaderContext) {
      const { servicesPool, tenantPool, databaseId } = ctx;

      const moduleResult = await tenantPool.query<IdentityProvidersModuleRow>(
        IDENTITY_PROVIDERS_MODULE_SQL,
        [databaseId],
      );
      const moduleRow = moduleResult.rows[0];
      if (!moduleRow) return undefined;
      const functionPrefix = moduleRow.prefix || 'platform';

      // Provider credentials are platform-managed; auth functions remain scoped
      // to the current request database.
      const platformDatabaseResult =
        await servicesPool.query<PlatformDatabaseRow>(PLATFORM_DATABASE_SQL);
      const platformDatabaseId = platformDatabaseResult.rows[0]?.database_id;
      if (!platformDatabaseId) return undefined;

      const providerModuleRow =
        platformDatabaseId === databaseId
          ? moduleRow
          : (
              await servicesPool.query<IdentityProvidersModuleRow>(
                IDENTITY_PROVIDERS_MODULE_SQL,
                [platformDatabaseId],
              )
            ).rows[0];
      if (!providerModuleRow) return undefined;

      const providersResult = await servicesPool.query<ProviderRow>(
        buildProvidersSql(
          providerModuleRow.private_schema_name,
          providerModuleRow.table_name,
        ),
        [platformDatabaseId],
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
        prefix: functionPrefix,
        rotateSecretFunction: `rotate_identity_provider_${functionPrefix}_secret`,
        providers,
      };
    },
  });
