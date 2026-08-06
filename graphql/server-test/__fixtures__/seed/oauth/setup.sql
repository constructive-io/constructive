-- OAuth server integration fixture.
--
-- This models only the CNC-owned seams: loader discovery, internal-secret
-- resolution and the sign_in_identity/sign_up_identity procedure contract.
-- The constructive-db implementation and its internal invariants remain owned
-- by constructive-db tests.

CREATE SCHEMA oauth_auth_public;
CREATE SCHEMA oauth_auth_private;
CREATE SCHEMA oauth_identifiers_public;
CREATE SCHEMA oauth_secrets_private;

CREATE TABLE oauth_auth_private.identity_providers (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  kind text NOT NULL,
  display_name text,
  enabled boolean NOT NULL,
  client_id text,
  client_secret_id uuid,
  authorization_url text,
  token_url text,
  userinfo_url text,
  issuer_url text,
  discovery_url_override text,
  discovery_doc jsonb,
  jwks jsonb,
  jwks_fetched_at timestamptz,
  acceptable_client_ids text[],
  scopes text[],
  extra_authorization_params jsonb,
  email_optional boolean,
  allow_link_by_email boolean,
  skip_nonce_check boolean,
  pkce_enabled boolean
);

INSERT INTO oauth_auth_private.identity_providers (
  id, slug, kind, display_name, enabled, client_id, client_secret_id,
  authorization_url, token_url, userinfo_url, scopes,
  extra_authorization_params, email_optional, allow_link_by_email,
  skip_nonce_check, pkce_enabled
) VALUES (
  '10000000-0000-4000-8000-000000000001',
  'google',
  'oauth2',
  'Google',
  true,
  'test-google-client',
  '10000000-0000-4000-8000-000000000002',
  'https://accounts.google.com/o/oauth2/v2/auth',
  'https://oauth2.googleapis.com/token',
  'https://openidconnect.googleapis.com/v1/userinfo',
  ARRAY['email', 'profile'],
  '{}'::jsonb,
  false,
  false,
  false,
  true
), (
  '10000000-0000-4000-8000-000000000003',
  'github',
  'oauth2',
  'GitHub',
  true,
  'test-github-client',
  '10000000-0000-4000-8000-000000000004',
  'https://github.com/login/oauth/authorize',
  'https://github.com/login/oauth/access_token',
  'https://api.github.com/user',
  ARRAY['user:email', 'read:user'],
  '{}'::jsonb,
  false,
  false,
  false,
  true
);

CREATE TABLE oauth_secrets_private.internal_secrets (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  value text NOT NULL
);

CREATE FUNCTION oauth_secrets_private.internal_secrets_get(name text, namespace_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE name
    WHEN 'google/client-secret' THEN 'test-google-secret'
    WHEN 'github/client-secret' THEN 'test-github-secret'
    ELSE NULL
  END
$$;

CREATE TABLE oauth_auth_public.app_settings_auth (
  cookie_secure boolean NOT NULL DEFAULT false,
  cookie_samesite text NOT NULL DEFAULT 'lax',
  cookie_domain text,
  cookie_httponly boolean NOT NULL DEFAULT true,
  cookie_max_age text,
  cookie_path text NOT NULL DEFAULT '/',
  remember_me_duration text,
  enable_captcha boolean NOT NULL DEFAULT false,
  captcha_site_key text
);

INSERT INTO oauth_auth_public.app_settings_auth (cookie_max_age)
VALUES ('3600');

CREATE TABLE oauth_identifiers_public.connected_accounts (
  service text NOT NULL,
  identifier text NOT NULL,
  user_id uuid NOT NULL,
  details jsonb,
  UNIQUE (service, identifier)
);

CREATE TABLE oauth_identifiers_public.emails (
  email text PRIMARY KEY,
  user_id uuid NOT NULL
);

CREATE FUNCTION oauth_auth_private.sign_in_identity(
  service text,
  identifier text,
  details jsonb DEFAULT NULL,
  email text DEFAULT NULL,
  credential_kind text DEFAULT 'bearer',
  remember_me boolean DEFAULT false,
  device_token text DEFAULT NULL,
  OUT user_id uuid,
  OUT access_token text,
  OUT mfa_required boolean,
  OUT mfa_challenge_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  SELECT account.user_id
    INTO sign_in_identity.user_id
    FROM oauth_identifiers_public.connected_accounts account
   WHERE account.service = sign_in_identity.service
     AND account.identifier = sign_in_identity.identifier;

  IF sign_in_identity.user_id IS NULL THEN
    RAISE EXCEPTION 'IDENTITY_ACCOUNT_NOT_FOUND';
  END IF;

  access_token := 'cnc_live_at_' || replace(sign_in_identity.user_id::text, '-', '');
  mfa_required := false;
  mfa_challenge_token := NULL;
END
$$;

CREATE FUNCTION oauth_auth_private.sign_up_identity(
  service text,
  identifier text,
  email text,
  details jsonb DEFAULT NULL,
  credential_kind text DEFAULT 'access_token',
  remember_me boolean DEFAULT false,
  device_token text DEFAULT NULL,
  OUT user_id uuid,
  OUT access_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  user_id := md5(service || ':' || identifier)::uuid;
  INSERT INTO oauth_identifiers_public.connected_accounts
    (service, identifier, user_id, details)
  VALUES
    (service, identifier, user_id, details);
  INSERT INTO oauth_identifiers_public.emails (email, user_id)
  VALUES (lower(trim(email)), user_id);
  access_token := 'cnc_live_at_' || replace(user_id::text, '-', '');
END
$$;

GRANT USAGE ON SCHEMA oauth_auth_private, oauth_auth_public,
  oauth_identifiers_public, oauth_secrets_private TO anonymous, authenticated;
GRANT EXECUTE ON FUNCTION oauth_auth_private.sign_in_identity(
  text, text, jsonb, text, text, boolean, text
) TO anonymous;
GRANT EXECUTE ON FUNCTION oauth_auth_private.sign_up_identity(
  text, text, text, jsonb, text, boolean, text
) TO anonymous;

SET session_replication_role TO replica;

INSERT INTO metaschema_public.schema
  (id, database_id, name, schema_name, description, is_public)
VALUES
  ('20000000-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'oauth_auth_public', 'oauth_auth_public', NULL, true),
  ('20000000-0000-4000-8000-000000000002', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'oauth_auth_private', 'oauth_auth_private', NULL, false),
  ('20000000-0000-4000-8000-000000000003', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'oauth_identifiers_public', 'oauth_identifiers_public', NULL, true),
  ('20000000-0000-4000-8000-000000000004', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'oauth_secrets_private', 'oauth_secrets_private', NULL, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_public.table (id, database_id, schema_id, name, description)
VALUES
  ('30000000-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '20000000-0000-4000-8000-000000000002', 'identity_providers', NULL),
  ('30000000-0000-4000-8000-000000000002', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '20000000-0000-4000-8000-000000000004', 'internal_secrets', NULL),
  ('30000000-0000-4000-8000-000000000003', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '20000000-0000-4000-8000-000000000001', 'app_settings_auth', NULL),
  ('30000000-0000-4000-8000-000000000004', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '20000000-0000-4000-8000-000000000003', 'connected_accounts', NULL),
  ('30000000-0000-4000-8000-000000000005', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '20000000-0000-4000-8000-000000000003', 'emails', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_modules_public.identity_providers_module
  (id, database_id, schema_id, private_schema_id, table_id, table_name, scope)
VALUES (
  '40000000-0000-4000-8000-000000000001',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000001',
  'identity_providers',
  'app'
);

INSERT INTO metaschema_modules_public.internal_secrets_module
  (id, database_id, schema_id, private_schema_id, internal_secrets_table_id,
   internal_secrets_table_name, scope)
VALUES (
  '40000000-0000-4000-8000-000000000002',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '20000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000004',
  '30000000-0000-4000-8000-000000000002',
  'internal_secrets',
  'app'
);

INSERT INTO metaschema_modules_public.sessions_module
  (id, database_id, schema_id, sessions_table_id,
   session_credentials_table_id, auth_settings_table_id, users_table_id,
   auth_settings_table_name)
VALUES (
  '40000000-0000-4000-8000-000000000003',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000003',
  '30000000-0000-4000-8000-000000000003',
  '30000000-0000-4000-8000-000000000003',
  '30000000-0000-4000-8000-000000000003',
  'app_settings_auth'
);

INSERT INTO metaschema_modules_public.connected_accounts_module
  (id, database_id, schema_id, private_schema_id, table_id, owner_table_id, table_name)
VALUES (
  '40000000-0000-4000-8000-000000000004',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '20000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000004',
  '30000000-0000-4000-8000-000000000004',
  'connected_accounts'
);

INSERT INTO metaschema_modules_public.emails_module
  (id, database_id, schema_id, private_schema_id, table_id, owner_table_id, table_name)
VALUES (
  '40000000-0000-4000-8000-000000000005',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '20000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000005',
  '30000000-0000-4000-8000-000000000005',
  'emails'
);

-- A second verified host targeting the same API proves state is bound to the
-- exact initiating host, not merely to database/api identity.
INSERT INTO catalog_public.domains
  (id, owner_scope, owner_key, is_visible, database_id, hostname, is_wildcard,
   parent_hostname, managed, verification_status, tls_status)
VALUES (
  '50000000-0000-4000-8000-000000000001',
  'database',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  true,
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'oauth-alt.test.constructive.io',
  false,
  NULL,
  false,
  'verified',
  'ready'
);

INSERT INTO routing_public.hostname_bindings
  (id, hostname, domain_id, is_wildcard, parent_hostname, managed,
   verification_status, tls_status, tls_secret_name, updated_at)
VALUES (
  (md5(concat('50000000-0000-4000-8000-000000000001', '|', 'oauth-alt.test.constructive.io')))::uuid,
  'oauth-alt.test.constructive.io',
  '50000000-0000-4000-8000-000000000001',
  false,
  NULL,
  false,
  'verified',
  'ready',
  NULL,
  now()
);

INSERT INTO routing_public.route_bindings
  (id, domain_id, target_api_id, target_site_id, target_function_id,
   path, method, priority, is_active, updated_at)
VALUES (
  '50000000-0000-4000-8000-000000000002',
  '50000000-0000-4000-8000-000000000001',
  '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
  NULL,
  NULL,
  '/',
  NULL,
  0,
  true,
  now()
);

SET session_replication_role TO DEFAULT;
