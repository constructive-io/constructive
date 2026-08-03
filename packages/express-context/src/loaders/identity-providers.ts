/**
 * Identity Providers Module Loader
 *
 * Resolves the identity_providers_module config and enabled provider
 * credentials for the current request database.
 */

import { QuoteUtils } from '@pgsql/quotes';

import type {
  IdentityProviderConfigMap,
  IdentityProvidersConfig,
  IdentityProvidersModuleRow,
  InternalSecretsModuleRow,
  ProviderRow,
  SchemaAndTableRow
} from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';

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
`;

const INTERNAL_SECRETS_MODULE_SQL = `
  SELECT ism.internal_secrets_table_id
  FROM metaschema_modules_public.internal_secrets_module ism
  WHERE ism.database_id = $1
    AND ism.scope = $2
  LIMIT 1
`;

const SCHEMA_AND_TABLE_SQL = `
  SELECT schema_name, table_name
  FROM metaschema.schema_and_table($1)
`;

function buildProvidersSql(
  ipSchema: string,
  ipTable: string,
  secretsSchema: string,
  secretsTable: string
): string {
  const providersTable = QuoteUtils.quoteQualifiedIdentifier(ipSchema, ipTable);
  const secretsTableName = QuoteUtils.quoteQualifiedIdentifier(
    secretsSchema,
    secretsTable
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
      ip.extra_authorization_params,
      ip.pkce_enabled
    FROM ${providersTable} ip
    LEFT JOIN ${secretsTableName} secrets
      ON secrets.id = ip.client_secret_id
    WHERE ip.enabled = true
      AND ip.client_id IS NOT NULL
      AND ip.client_secret_id IS NOT NULL
  `;
}

function normalizeStringParams(
  params: Record<string, unknown> | null
): Record<string, string> {
  if (!params) return {};
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      normalized[key] = value;
    }
  }
  return normalized;
}

// ─── Loader ─────────────────────────────────────────────────────────────────

async function resolveSecretsTable(
  ctx: LoaderContext,
  databaseId: string,
  scope: string
): Promise<SchemaAndTableRow> {
  const secretsModuleResult =
    await ctx.tenantPool.query<InternalSecretsModuleRow>(
      INTERNAL_SECRETS_MODULE_SQL,
      [databaseId, scope]
    );
  const tableId = secretsModuleResult.rows[0]?.internal_secrets_table_id;
  if (!tableId) {
    throw new Error(
      `internal_secrets_module missing for scope ${scope} on database ${databaseId}`
    );
  }

  try {
    const schemaResult = await ctx.tenantPool.query<SchemaAndTableRow>(
      SCHEMA_AND_TABLE_SQL,
      [tableId]
    );
    const schemaRow = schemaResult.rows[0];
    if (schemaRow) return schemaRow;
  } catch {
    // Re-throw a module-specific error instead of leaking metaschema internals.
  }

  throw new Error(
    `schema/table resolution missing for internal_secrets_module scope ${scope} on database ${databaseId}`
  );
}

export async function resolveIdentityProvidersConfig(
  ctx: LoaderContext
): Promise<IdentityProvidersConfig | undefined> {
  const { tenantPool, databaseId } = ctx;

  const moduleResult = await tenantPool.query<IdentityProvidersModuleRow>(
    IDENTITY_PROVIDERS_MODULE_SQL,
    [databaseId]
  );
  if (moduleResult.rows.length > 1) {
    throw new Error(
      `multiple identity_providers_module rows found for database ${databaseId}; provider ownership scope must be explicit`
    );
  }
  const moduleRow = moduleResult.rows[0];
  if (!moduleRow) {
    return undefined;
  }
  const functionPrefix = moduleRow.prefix || moduleRow.scope;

  const secretsTable = await resolveSecretsTable(
    ctx,
    databaseId,
    moduleRow.scope
  );

  const providersResult = await tenantPool.query<ProviderRow>(
    buildProvidersSql(
      moduleRow.private_schema_name,
      moduleRow.table_name,
      secretsTable.schema_name,
      secretsTable.table_name
    )
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
      scopes: row.scopes,
      authorizationParams: normalizeStringParams(
        row.extra_authorization_params
      ),
      pkceEnabled: row.pkce_enabled ?? true
    });
  }

  return {
    schemaName: moduleRow.schema_name,
    privateSchemaName: moduleRow.private_schema_name,
    tableName: moduleRow.table_name,
    scope: moduleRow.scope,
    prefix: functionPrefix,
    rotateSecretFunction: `rotate_identity_provider_${functionPrefix}_secret`,
    providers
  };
}

export const identityProvidersLoader: ModuleLoader<IdentityProvidersConfig> =
  createModuleLoader<IdentityProvidersConfig>({
    name: 'identityProviders',
    ttlMs: 5 * 60_000,
    resolve: resolveIdentityProvidersConfig
  });

export { buildProvidersSql };
