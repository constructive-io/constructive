import { createHash } from 'node:crypto';

import type { SeedAdapter, SeedContext } from 'pgsql-test/seed/types';

export const REAL_RUNTIME_FIXTURE = {
  ownerId: 'f0000000-0000-4000-8000-000000000001',
  siteId: 'f1000000-0000-4000-8000-000000000001',
  runtimeBucketId: 'f1100000-0000-4000-8000-000000000001',
  serviceUserId: 'f2000000-0000-4000-8000-000000000001',
  serviceSessionId: 'f3000000-0000-4000-8000-000000000001',
  serviceCredentialId: 'f4000000-0000-4000-8000-000000000001',
  servicePrincipalId: 'f5000000-0000-4000-8000-000000000001',
  serviceApiKey: 'cnc_live_bt_sso_site_runtime_fixture',
  authHost: 'auth-auth-sso-e2e.test.constructive.io',
  siteHost: 'api-auth-sso-e2e.test.constructive.io'
} as const;

const modules = [
  'users_module',
  'membership_types_module',
  ['permissions_module', { scope: 'app' }],
  ['limits_module', { scope: 'app' }],
  ['levels_module', { scope: 'app' }],
  ['memberships_module', { scope: 'app' }],
  ['permissions_module', { scope: 'org' }],
  ['limits_module', { scope: 'org' }],
  ['memberships_module', { scope: 'org' }],
  'sessions_module',
  'user_state_module',
  'user_credentials_module',
  ['internal_secrets_module', { scope: 'app' }],
  ['internal_secrets_module', { scope: 'database' }],
  'emails_module',
  'rls_module',
  'connected_accounts_module',
  ['identity_providers_module', { scope: 'database' }],
  'user_auth_module',
  [
    'catalog_module',
    { scope: 'database', public_schema_name: 'catalog_private', policies: [] }
  ],
  [
    'site_surface_module',
    {
      scope: 'database',
      prefix: '',
      public_schema_name: 'routing_public',
      policies: []
    }
  ],
  ['oauth_requests_module', { scope: 'database', prefix: '' }],
  ['unified_auth_module', { scope: 'database', prefix: '' }]
] as const;

const quoteIdentifier = (value: string): string =>
  `"${value.replaceAll('"', '""')}"`;

const relation = (schema: string, table: string): string =>
  `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;

const schemaName = async (ctx: SeedContext, schemaId: string): Promise<string> => {
  const row = await ctx.pg.one<{ schema_name: string }>(
    'SELECT schema_name FROM metaschema_public.schema WHERE id = $1',
    [schemaId]
  );
  return row.schema_name;
};

const tableName = async (ctx: SeedContext, tableId: string): Promise<string> => {
  const row = await ctx.pg.one<{ name: string }>(
    'SELECT name FROM metaschema_public.table WHERE id = $1',
    [tableId]
  );
  return row.name;
};

const hasColumn = async (
  ctx: SeedContext,
  schema: string,
  table: string,
  column: string
): Promise<boolean> => {
  const row = await ctx.pg.one<{ present: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
     ) AS present`,
    [schema, table, column]
  );
  return row.present;
};

/**
 * Provision only test data around the real generated Constructive DB runtime.
 * No SSO table or function is reproduced here.
 */
export const seedRealUnifiedAuthRuntime = (): SeedAdapter => ({
  async seed(ctx) {
    await ctx.pg.any(
      `INSERT INTO constructive_users_public.users (id, username)
       VALUES ($1, 'sso_e2e_owner')
       ON CONFLICT (id) DO NOTHING`,
      [REAL_RUNTIME_FIXTURE.ownerId]
    );

    await ctx.pg.any("SET constructive.allow_super_constructive = 'true'");
    const provisioned = await ctx.pg.one<{ database_id: string }>(
      `SELECT metaschema_generators.provision_database(
         v_database_name := 'auth-sso-e2e',
         v_owner_id := $1,
         v_subdomain := 'auth-sso-e2e',
         v_domain := 'test.constructive.io',
         v_modules := $2::jsonb,
         v_options := '{}'::jsonb
       ) AS database_id`,
      [REAL_RUNTIME_FIXTURE.ownerId, JSON.stringify(modules)]
    );
    await ctx.pg.any('RESET constructive.allow_super_constructive');
    const databaseId = provisioned.database_id;

    const siteModule = await ctx.pg.one<{
      schema_id: string;
      sites_table_id: string;
    }>(
      `SELECT schema_id, sites_table_id
       FROM metaschema_modules_public.site_surface_module
       WHERE database_id = $1 AND scope = 'database'`,
      [databaseId]
    );
    const catalogModule = await ctx.pg.one<{
      schema_id: string;
      buckets_table_id: string;
    }>(
      `SELECT schema_id, buckets_table_id
       FROM metaschema_modules_public.catalog_module
       WHERE database_id = $1 AND scope = 'database'`,
      [databaseId]
    );
    const unifiedModule = await ctx.pg.one<{
      private_schema_id: string;
      site_auth_callbacks_table_name: string;
      site_runtime_clients_table_name: string;
    }>(
      `SELECT private_schema_id, site_auth_callbacks_table_name,
              site_runtime_clients_table_name
       FROM metaschema_modules_public.unified_auth_module
       WHERE database_id = $1 AND scope = 'database'`,
      [databaseId]
    );
    const sessionsModule = await ctx.pg.one<{
      schema_id: string;
      sessions_table_id: string;
      session_credentials_table_id: string;
      auth_settings_table_id: string;
    }>(
      `SELECT schema_id, sessions_table_id, session_credentials_table_id,
              auth_settings_table_id
       FROM metaschema_modules_public.sessions_module
       WHERE database_id = $1`,
      [databaseId]
    );
    const usersModule = await ctx.pg.one<{
      schema_id: string;
      table_id: string;
    }>(
      `SELECT schema_id, table_id
       FROM metaschema_modules_public.users_module
       WHERE database_id = $1`,
      [databaseId]
    );
    const providersModule = await ctx.pg.one<{
      private_schema_id: string;
      table_name: string;
    }>(
      `SELECT private_schema_id, table_name
       FROM metaschema_modules_public.identity_providers_module
       WHERE database_id = $1`,
      [databaseId]
    );
    const secretsModule = await ctx.pg.one<{
      private_schema_id: string;
      internal_secrets_table_name: string;
      prefix: string;
    }>(
      `SELECT private_schema_id, internal_secrets_table_name, prefix
       FROM metaschema_modules_public.internal_secrets_module
       WHERE database_id = $1 AND scope = 'database'`,
      [databaseId]
    );

    const [
      siteSchema,
      catalogSchema,
      privateSchema,
      sessionsSchema,
      usersSchema,
      providersSchema,
      secretsPrivateSchema
    ] =
      await Promise.all([
        schemaName(ctx, siteModule.schema_id),
        schemaName(ctx, catalogModule.schema_id),
        schemaName(ctx, unifiedModule.private_schema_id),
        schemaName(ctx, sessionsModule.schema_id),
        schemaName(ctx, usersModule.schema_id),
        schemaName(ctx, providersModule.private_schema_id),
        schemaName(ctx, secretsModule.private_schema_id)
      ]);
    const { schema_name: secretsPublicSchema } = await ctx.pg.one<{
      schema_name: string;
    }>(
      `SELECT schema_name
       FROM metaschema_public.schema
       WHERE database_id = $1 AND schema_name LIKE '%store-public'
       ORDER BY schema_name
       LIMIT 1`,
      [databaseId]
    );
    const [sitesTable, bucketsTable, sessionsTable, credentialsTable, authSettingsTable, usersTable] =
      await Promise.all([
        tableName(ctx, siteModule.sites_table_id),
        tableName(ctx, catalogModule.buckets_table_id),
        tableName(ctx, sessionsModule.sessions_table_id),
        tableName(ctx, sessionsModule.session_credentials_table_id),
        tableName(ctx, sessionsModule.auth_settings_table_id),
        tableName(ctx, usersModule.table_id)
      ]);

    const bucket = await ctx.pg.one<{ id: string }>(
      `INSERT INTO ${relation(catalogSchema, bucketsTable)}
         (owner_scope, owner_key, is_visible, database_id, key, type)
       VALUES ('platform', NULL, true, $1, 'sso-e2e-site', 'public')
       RETURNING id`,
      [databaseId]
    );
    await ctx.pg.any(
      `INSERT INTO ${relation(siteSchema, sitesTable)}
         (id, name, title, bucket_id, is_published, unified_auth_enabled,
          unified_auth_sign_in_mode, unified_auth_sso_group_key, database_id)
       VALUES ($1, 'customer-portal', 'Customer Portal', $2, true, true,
               'confirm', 'customer-apps', $3)`,
      [REAL_RUNTIME_FIXTURE.siteId, bucket.id, databaseId]
    );
    await ctx.pg.any(
      `INSERT INTO catalog_private.buckets
         (id, owner_scope, owner_key, is_visible, database_id, key, type)
       VALUES ($1, 'database', $2, true, $2, 'sso-e2e-runtime', 'public')`,
      [REAL_RUNTIME_FIXTURE.runtimeBucketId, databaseId]
    );
    await ctx.pg.any(
      `INSERT INTO routing_public.sites
         (id, database_id, name, title, bucket_id, is_published)
       VALUES ($1, $2, 'customer-portal-runtime', 'Customer Portal', $3, true)`,
      [
        REAL_RUNTIME_FIXTURE.siteId,
        databaseId,
        REAL_RUNTIME_FIXTURE.runtimeBucketId
      ]
    );
    await ctx.pg.any(
      `INSERT INTO ${relation(siteSchema, unifiedModule.site_auth_callbacks_table_name)}
         (site_id, callback_url, active, database_id)
       VALUES ($1, $2, true, $3)`,
      [
        REAL_RUNTIME_FIXTURE.siteId,
        `https://${REAL_RUNTIME_FIXTURE.siteHost}/auth/complete`,
        databaseId
      ]
    );

    const siteApi = await ctx.pg.one<{ id: string }>(
      `SELECT id FROM routing_public.apis
       WHERE database_id = $1 AND name = 'api'`,
      [databaseId]
    );
    await ctx.pg.any(
      `INSERT INTO ${relation(siteSchema, unifiedModule.site_runtime_clients_table_name)}
         (site_id, api_id, principal_id, active, database_id)
       VALUES ($1, $2, $3, true, $4)`,
      [
        REAL_RUNTIME_FIXTURE.siteId,
        siteApi.id,
        REAL_RUNTIME_FIXTURE.servicePrincipalId,
        databaseId
      ]
    );
    await ctx.pg.any(
      `UPDATE routing_public.routes
       SET runtime_site_id = $1
       WHERE database_id = $2 AND target_api_id = $3`,
      [REAL_RUNTIME_FIXTURE.siteId, databaseId, siteApi.id]
    );

    await ctx.pg.any(
      `UPDATE ${relation(sessionsSchema, authSettingsTable)}
       SET require_csrf_for_auth = false,
           allow_identity_sign_in = true,
           allow_identity_sign_up = true`
    );

    const secretSetFunction = `${secretsModule.prefix}_internal_secrets_set`;
    await ctx.pg.any("SELECT set_config('jwt.claims.database_id', $1, false)", [
      databaseId
    ]);
    await ctx.pg.any(
      `SELECT ${relation(
        secretsPublicSchema,
        secretSetFunction
      )}($1, 'github/client-secret', 'github-client-secret', uuid_nil(), 'pgp')`,
      [databaseId]
    );
    const providerSecret = await ctx.pg.one<{ id: string }>(
      `SELECT id
       FROM ${relation(
        secretsPrivateSchema,
        secretsModule.internal_secrets_table_name
      )}
       WHERE name = 'github/client-secret'
         AND namespace_id = uuid_nil()
         AND retired_at IS NULL`,
    );
    await ctx.pg.any(
      `INSERT INTO ${relation(providersSchema, providersModule.table_name)}
         (slug, kind, display_name, enabled, client_id, client_secret_id,
          authorization_url, token_url, userinfo_url, scopes, pkce_enabled)
       VALUES ('github', 'github', 'GitHub', true, 'github-client', $1,
               'https://github.com/login/oauth/authorize',
               'https://github.com/login/oauth/access_token',
               'https://api.github.com/user',
               ARRAY['read:user', 'user:email'], true)`,
      [providerSecret.id]
    );

    const userColumns = ['id', 'username'];
    const userValues: unknown[] = [REAL_RUNTIME_FIXTURE.serviceUserId, 'sso_site_runtime'];
    if (await hasColumn(ctx, usersSchema, usersTable, 'database_id')) {
      userColumns.push('database_id');
      userValues.push(databaseId);
    }
    await ctx.pg.any(
      `INSERT INTO ${relation(usersSchema, usersTable)}
         (${userColumns.map(quoteIdentifier).join(', ')})
       VALUES (${userValues.map((_, index) => `$${index + 1}`).join(', ')})`,
      userValues
    );

    const sessionColumns = [
      'id',
      'user_id',
      'is_anonymous',
      'expires_at',
      'csrf_secret',
      'fingerprint_mode',
      'auth_method'
    ];
    const sessionValues: unknown[] = [
      REAL_RUNTIME_FIXTURE.serviceSessionId,
      REAL_RUNTIME_FIXTURE.serviceUserId,
      false,
      new Date(Date.now() + 60 * 60 * 1000),
      Buffer.alloc(32, 7),
      'none',
      'api_key'
    ];
    if (await hasColumn(ctx, sessionsSchema, sessionsTable, 'database_id')) {
      sessionColumns.push('database_id');
      sessionValues.push(databaseId);
    }
    await ctx.pg.any(
      `INSERT INTO ${relation(sessionsSchema, sessionsTable)}
         (${sessionColumns.map(quoteIdentifier).join(', ')})
       VALUES (${sessionValues.map((_, index) => `$${index + 1}`).join(', ')})`,
      sessionValues
    );

    const credentialColumns = [
      'id',
      'session_id',
      'kind',
      'secret_hash',
      'expires_at',
      'principal_id',
      'access_level'
    ];
    const credentialValues: unknown[] = [
      REAL_RUNTIME_FIXTURE.serviceCredentialId,
      REAL_RUNTIME_FIXTURE.serviceSessionId,
      'api_key',
      createHash('sha256').update(REAL_RUNTIME_FIXTURE.serviceApiKey).digest(),
      new Date(Date.now() + 60 * 60 * 1000),
      REAL_RUNTIME_FIXTURE.servicePrincipalId,
      'full_access'
    ];
    if (await hasColumn(ctx, sessionsSchema, credentialsTable, 'database_id')) {
      credentialColumns.push('database_id');
      credentialValues.push(databaseId);
    }
    await ctx.pg.any(
      `INSERT INTO ${relation(sessionsSchema, credentialsTable)}
         (${credentialColumns.map(quoteIdentifier).join(', ')})
       VALUES (${credentialValues.map((_, index) => `$${index + 1}`).join(', ')})`,
      credentialValues
    );

    await ctx.pg.any(`
      CREATE TABLE public.oauth_sso_real_runtime_fixture (
        database_id uuid PRIMARY KEY,
        private_schema text NOT NULL,
        sessions_schema text NOT NULL,
        sessions_table text NOT NULL,
        credentials_table text NOT NULL,
        site_api_id uuid NOT NULL
      )
    `);
    await ctx.pg.any(
      `INSERT INTO public.oauth_sso_real_runtime_fixture
         (database_id, private_schema, sessions_schema, sessions_table,
          credentials_table, site_api_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        databaseId,
        privateSchema,
        sessionsSchema,
        sessionsTable,
        credentialsTable,
        siteApi.id
      ]
    );
  }
});
