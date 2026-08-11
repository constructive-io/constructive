/**
 * Identity Providers Loader (Tier 2 — tenant DB)
 *
 * Per-tenant OIDC/OAuth provider configuration: client id, client secret,
 * endpoints, scopes and the linking policy. This is tenant *data*, not
 * deployment config — a second tenant in the same process has different
 * providers, and an env var cannot express that, so nothing here reads
 * `process.env`.
 *
 * Which fields a provider config must carry is platform knowledge too. Deriving
 * the shape per integration is how one of them ends up not checking `nonce`
 * (constructive-planning#1414), so the field set — issuer, JWKS, acceptable
 * audiences, `skipNonceCheck`, `pkceEnabled` — is fixed here rather than
 * rediscovered.
 *
 * NOT registered in the default registry: it costs three round trips and
 * decrypts secrets, so it is opt-in for the services that actually serve an
 * auth flow.
 *
 *   registry.register(identityProvidersLoader);
 */

import type { IdentityProviderConfig, IdentityProvidersModule } from '../types';
import { createModuleLoader } from './create-loader';
import type { LoaderContext, ModuleLoader } from './types';
import { requireDatabaseId } from './types';

// ─── SQL ────────────────────────────────────────────────────────────────────

const IDENTITY_PROVIDERS_DISCOVERY_SQL = `
  SELECT s.schema_name AS schema_name, m.table_name AS table_name,
         m.scope, m.prefix
  FROM metaschema_modules_public.identity_providers_module m
  JOIN metaschema_public.schema s ON s.id = m.private_schema_id
  WHERE m.database_id = $1
  LIMIT 1
`;

const INTERNAL_SECRETS_DISCOVERY_SQL = `
  SELECT s.schema_name AS schema_name, m.internal_secrets_table_name AS table_name,
         m.scope, m.prefix
  FROM metaschema_modules_public.internal_secrets_module m
  JOIN metaschema_public.schema s ON s.id = m.private_schema_id
  WHERE m.database_id = $1 AND m.scope = $2
  LIMIT 1
`;

interface DiscoveredLocation {
  schema_name: string;
  table_name: string;
  scope: string;
  prefix: string;
}

/**
 * The providers query, with the tenant's own secret getter inlined.
 *
 * The getter is the generated internal-secrets getter in the discovered store
 * schema — the same function the auth procedures use, so a secret rotated
 * through the platform's rotate verb is picked up with no further
 * coordination. Database-scoped stores take the current database ID as their
 * first argument; app/platform stores do not. A provider whose
 * `client_secret_id` is set but whose secret does not resolve yields
 * `clientSecret: null`, which the caller must treat as a configuration fault
 * rather than as a public client.
 */
const buildProvidersQuery = (
  providers: DiscoveredLocation,
  secrets: DiscoveredLocation
) => `
  SELECT
    p.id,
    p.slug,
    p.kind,
    p.display_name,
    p.enabled,
    p.client_id,
    CASE
      WHEN p.client_secret_id IS NULL THEN NULL
      ELSE "${secrets.schema_name}"."${secrets.prefix}_internal_secrets_get"(
        ${secrets.scope === 'database' ? '$1,' : ''}
        p.slug || '/client-secret',
        uuid_nil()
      )
    END AS client_secret,
    p.authorization_url,
    p.token_url,
    p.userinfo_url,
    p.issuer_url,
    p.discovery_url_override,
    p.discovery_doc,
    p.jwks,
    p.jwks_fetched_at,
    p.acceptable_client_ids,
    p.scopes,
    p.extra_authorization_params,
    p.email_optional,
    p.allow_link_by_email,
    p.skip_nonce_check,
    p.pkce_enabled
  FROM "${providers.schema_name}"."${providers.table_name}" p
`;

// ─── Row Types ──────────────────────────────────────────────────────────────

interface ProviderRow {
  id: string;
  slug: string;
  kind: string;
  display_name: string | null;
  enabled: boolean;
  client_id: string | null;
  client_secret: string | null;
  authorization_url: string | null;
  token_url: string | null;
  userinfo_url: string | null;
  issuer_url: string | null;
  discovery_url_override: string | null;
  discovery_doc: Record<string, unknown> | null;
  jwks: Record<string, unknown> | null;
  jwks_fetched_at: Date | null;
  acceptable_client_ids: string[] | null;
  scopes: string[] | null;
  extra_authorization_params: Record<string, string> | null;
  email_optional: boolean | null;
  allow_link_by_email: boolean | null;
  skip_nonce_check: boolean | null;
  pkce_enabled: boolean | null;
}

// ─── Transforms ─────────────────────────────────────────────────────────────

const toProviderConfig = (row: ProviderRow): IdentityProviderConfig => {
  if (!row.client_id) {
    throw new Error(`identity provider "${row.slug}": client_id is not set`);
  }
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    displayName: row.display_name ?? row.slug,
    enabled: row.enabled,
    clientId: row.client_id,
    clientSecret: row.client_secret,
    authorizationUrl: row.authorization_url,
    tokenUrl: row.token_url,
    userinfoUrl: row.userinfo_url,
    issuerUrl: row.issuer_url,
    discoveryUrlOverride: row.discovery_url_override,
    discoveryDoc: row.discovery_doc,
    jwks: row.jwks,
    jwksFetchedAt: row.jwks_fetched_at,
    acceptableClientIds: row.acceptable_client_ids ?? [],
    scopes: row.scopes ?? [],
    extraAuthorizationParams: row.extra_authorization_params ?? {},
    emailOptional: row.email_optional ?? false,
    allowLinkByEmail: row.allow_link_by_email ?? false,
    // Both default to the safe side: a config that does not say otherwise gets
    // nonce checking and PKCE.
    skipNonceCheck: row.skip_nonce_check ?? false,
    pkceEnabled: row.pkce_enabled ?? true
  };
};

const discoverOne = async (
  ctx: LoaderContext,
  sql: string,
  values: unknown[]
): Promise<DiscoveredLocation | undefined> => {
  const result = await ctx.tenantPool.query<DiscoveredLocation>(sql, values);
  const row = result.rows[0];
  if (!row?.schema_name || !row?.table_name) {
    // Not provisioned for this tenant — the loader contract's undefined. The
    // module name is kept in the debug trail rather than guessed at by callers.
    return undefined;
  }
  return row;
};

// ─── Loader ─────────────────────────────────────────────────────────────────

/**
 * Short TTL on purpose: an operator disabling a provider or rotating a secret
 * expects the next sign-in attempt to see it, and the whole set is one query.
 */
export const identityProvidersLoader: ModuleLoader<IdentityProvidersModule> =
  createModuleLoader<IdentityProvidersModule>({
    name: 'identityProviders',
    ttlMs: 30_000,
    async resolve(ctx: LoaderContext) {
      const { tenantPool, databaseId } = ctx;
      requireDatabaseId(databaseId, 'identityProviders');

      const providers = await discoverOne(
        ctx,
        IDENTITY_PROVIDERS_DISCOVERY_SQL,
        [databaseId]
      );
      if (!providers) return undefined;

      const secrets = await discoverOne(
        ctx,
        INTERNAL_SECRETS_DISCOVERY_SQL,
        [databaseId, providers.scope]
      );
      // A provider table without its secret store cannot yield a usable client
      // secret, and silently returning secret-less providers would present a
      // confidential client as a public one.
      if (!secrets) {
        throw new Error(
          `identityProviders: database ${databaseId} provisions identity_providers_module ` +
            'but not internal_secrets_module, so client secrets cannot be resolved'
        );
      }

      const result = await tenantPool.query<ProviderRow>(
        buildProvidersQuery(providers, secrets),
        secrets.scope === 'database' ? [databaseId] : []
      );

      const bySlug: Record<string, IdentityProviderConfig> = {};
      for (const row of result.rows) {
        bySlug[row.slug] = toProviderConfig(row);
      }

      return {
        providers: bySlug,
        source: { schemaName: providers.schema_name, tableName: providers.table_name }
      };
    }
  });

/**
 * Pick one provider by slug, failing loud on unknown or disabled providers — a
 * start leg for a provider the tenant never configured is a 404, not a redirect
 * to a half-built authorize URL.
 */
export function requireIdentityProvider(
  module: IdentityProvidersModule | undefined,
  slug: string
): IdentityProviderConfig {
  if (!module) {
    throw new Error('identityProviders: module is not provisioned for this database');
  }
  const provider = module.providers[slug];
  if (!provider) {
    throw new Error(`identity provider "${slug}" is not configured`);
  }
  if (!provider.enabled) {
    throw new Error(`identity provider "${slug}" is disabled`);
  }
  return provider;
}
