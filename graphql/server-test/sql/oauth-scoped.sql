-- Minimal current-contract OAuth metadata for scoped server integration tests.
--
-- This deliberately models the constructive-db per-database ownership
-- contract: identity provider metadata and its matching internal secrets
-- module share the routed database_id and scope. It does not recreate the
-- removed services_public/default-database compatibility plane.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "simple-pets-private".oauth_internal_secrets (
  id uuid PRIMARY KEY,
  value bytea NOT NULL,
  algo text NOT NULL,
  key_id uuid
);

CREATE TABLE "simple-pets-private".oauth_identity_providers (
  slug text PRIMARY KEY,
  kind text NOT NULL,
  display_name text NOT NULL,
  enabled boolean NOT NULL,
  client_id text,
  client_secret_id uuid,
  authorization_url text,
  token_url text,
  userinfo_url text,
  scopes text[],
  extra_authorization_params jsonb,
  pkce_enabled boolean
);

INSERT INTO metaschema_public.table (id, database_id, schema_id, name)
VALUES
  (
    '0a000000-0000-4000-8000-000000000001',
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    '6dba9876-043f-48ee-399d-ddc991ad978d',
    'oauth_internal_secrets'
  ),
  (
    '0a000000-0000-4000-8000-000000000002',
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    '6dba9876-043f-48ee-399d-ddc991ad978d',
    'oauth_identity_providers'
  )
ON CONFLICT (id) DO NOTHING;

SET session_replication_role TO replica;

INSERT INTO metaschema_modules_public.internal_secrets_module (
  id,
  database_id,
  schema_id,
  private_schema_id,
  internal_secrets_table_id,
  internal_secrets_table_name,
  scope,
  prefix
)
VALUES (
  '0a000000-0000-4000-8000-000000000003',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dba9876-043f-48ee-399d-ddc991ad978d',
  '6dba9876-043f-48ee-399d-ddc991ad978d',
  '0a000000-0000-4000-8000-000000000001',
  'oauth_internal_secrets',
  'platform',
  'platform'
)
ON CONFLICT (database_id, scope) DO NOTHING;

INSERT INTO metaschema_modules_public.identity_providers_module (
  id,
  database_id,
  schema_id,
  private_schema_id,
  table_id,
  table_name,
  scope,
  prefix
)
VALUES (
  '0a000000-0000-4000-8000-000000000004',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dbae92a-5450-401b-1ed5-d69e7754940d',
  '6dba9876-043f-48ee-399d-ddc991ad978d',
  '0a000000-0000-4000-8000-000000000002',
  'oauth_identity_providers',
  'platform',
  'platform'
)
ON CONFLICT (database_id, scope) DO NOTHING;

-- /auth/providers resolves user_auth_module together with provider metadata.
-- It does not execute these auth functions, so the lightweight fixture can
-- reference the provider table metadata for the required foreign keys.
INSERT INTO metaschema_modules_public.user_auth_module (
  id,
  database_id,
  schema_id,
  emails_table_id,
  users_table_id,
  secrets_table_id,
  encrypted_table_id,
  sessions_table_id,
  session_credentials_table_id,
  audits_table_id
)
VALUES (
  '0a000000-0000-4000-8000-000000000005',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dbae92a-5450-401b-1ed5-d69e7754940d',
  '0a000000-0000-4000-8000-000000000002',
  '0a000000-0000-4000-8000-000000000002',
  '0a000000-0000-4000-8000-000000000002',
  '0a000000-0000-4000-8000-000000000002',
  '0a000000-0000-4000-8000-000000000002',
  '0a000000-0000-4000-8000-000000000002',
  '0a000000-0000-4000-8000-000000000002'
)
ON CONFLICT (id) DO NOTHING;

SET session_replication_role TO DEFAULT;

INSERT INTO "simple-pets-private".oauth_internal_secrets (
  id,
  value,
  algo,
  key_id
)
VALUES (
  '0a000000-0000-4000-8000-000000000006',
  convert_to('scoped-routing-test-secret', 'UTF8'),
  'raw',
  NULL
);

INSERT INTO "simple-pets-private".oauth_identity_providers (
  slug,
  kind,
  display_name,
  enabled,
  client_id,
  client_secret_id,
  authorization_url,
  token_url,
  userinfo_url,
  scopes,
  extra_authorization_params,
  pkce_enabled
)
VALUES (
  'github',
  'oauth2',
  'GitHub',
  true,
  'scoped-routing-client',
  '0a000000-0000-4000-8000-000000000006',
  'https://github.example.test/authorize',
  'https://github.example.test/token',
  'https://github.example.test/userinfo',
  ARRAY['read:user'],
  '{"prompt":"select_account"}'::jsonb,
  true
);
