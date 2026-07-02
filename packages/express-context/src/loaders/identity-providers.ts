/**
 * Identity Providers Module Loader
 *
 * Resolves the identity_providers_module config for the current request and
 * loads enabled provider credentials from the platform database.
 */

import { QuoteUtils } from '@pgsql/quotes';

import type {
  ConfigSecretsModuleRow,
  IdentityProviderConfigMap,
  IdentityProvidersConfig,
  IdentityProvidersModuleRow,
  PlatformDatabaseRow,
  ProviderRow,
  SchemaAndTableRow,
} from '../types';
import type { LoaderContext, ModuleLoader } from './types';
import { createModuleLoader } from './create-loader';

// ─── SQL ────────────────────────────────────────────────────────────────────

const IDENTITY_PROVIDERS_MODULE_SQL = `
  SELECT
    ipm.database_id,
    s.schema_name,
    ps.schema_name AS private_schema_name,
    ipm.table_name,
    ipm.scope,
    ipm.prefix
  FROM metaschema_modules_public.identity_providers_module ipm
  JOIN metaschema_public.schema s ON s.id = ipm.schema_id
  JOIN metaschema_public.schema ps ON ps.id = ipm.private_schema_id
  WHERE ipm.database_id = $1
  LIMIT 1
`;

const CONFIG_SECRETS_MODULE_SQL = `
  SELECT csm.table_id
  FROM metaschema_modules_public.config_secrets_module csm
  WHERE csm.database_id = $1
    AND csm.scope = $2
  LIMIT 1
`;

const SCHEMA_AND_TABLE_SQL = `
  SELECT schema_name, table_name
  FROM metaschema.schema_and_table($1)
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
  secretsSchema: string,
  secretsTable: string,
): string {
  const providersTable = QuoteUtils.quoteQualifiedIdentifier(ipSchema, ipTable);
  const secretsTableName = QuoteUtils.quoteQualifiedIdentifier(
    secretsSchema,
    secretsTable,
  );

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
    LEFT JOIN ${secretsTableName} secrets
      ON secrets.id = ip.client_secret_id
    WHERE ip.enabled = true
      AND ip.client_id IS NOT NULL
      AND ip.client_secret_id IS NOT NULL
  `;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

async function resolveSecretsTable(
  ctx: LoaderContext,
  databaseId: string,
  scope: string,
): Promise<SchemaAndTableRow> {
  const secretsModuleResult =
    await ctx.servicesPool.query<ConfigSecretsModuleRow>(
      CONFIG_SECRETS_MODULE_SQL,
      [databaseId, scope],
    );
  const secretsModuleRow = secretsModuleResult.rows[0];
  if (!secretsModuleRow) {
    throw new Error(
      `config_secrets_module missing for scope ${scope} on database ${databaseId}`,
    );
  }

  try {
    const schemaResult = await ctx.servicesPool.query<SchemaAndTableRow>(
      SCHEMA_AND_TABLE_SQL,
      [secretsModuleRow.table_id],
    );
    const schemaRow = schemaResult.rows[0];
    if (schemaRow) return schemaRow;
  } catch {
    // Re-throw a module-specific error instead of leaking metaschema internals.
  }

  throw new Error(
    `schema/table resolution missing for config_secrets_module scope ${scope} on database ${databaseId}`,
  );
}

export async function resolveIdentityProvidersConfig(
  ctx: LoaderContext,
): Promise<IdentityProvidersConfig | undefined> {
  const { servicesPool, tenantPool, databaseId } = ctx;

  const moduleResult = await tenantPool.query<IdentityProvidersModuleRow>(
    IDENTITY_PROVIDERS_MODULE_SQL,
    [databaseId],
  );
  const moduleRow = moduleResult.rows[0];
  if (!moduleRow) {
    throw new Error(`identity_providers_module missing for database ${databaseId}`);
  }
  const functionPrefix = moduleRow.prefix || moduleRow.scope || 'platform';

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
  if (!providerModuleRow) {
    throw new Error(
      `identity_providers_module missing for database ${platformDatabaseId}`,
    );
  }

  const secretsTable = await resolveSecretsTable(
    ctx,
    providerModuleRow.database_id,
    providerModuleRow.scope,
  );

  const providersResult = await servicesPool.query<ProviderRow>(
    buildProvidersSql(
      providerModuleRow.private_schema_name,
      providerModuleRow.table_name,
      secretsTable.schema_name,
      secretsTable.table_name,
    ),
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
    scope: moduleRow.scope,
    prefix: functionPrefix,
    rotateSecretFunction: `rotate_identity_provider_${functionPrefix}_secret`,
    providers,
  };
}

export const identityProvidersLoader: ModuleLoader<IdentityProvidersConfig> =
  createModuleLoader<IdentityProvidersConfig>({
    name: 'identityProviders',
    ttlMs: 5 * 60_000,
    resolve: resolveIdentityProvidersConfig,
  });

export { buildProvidersSql };
