BEGIN;

CREATE SCHEMA IF NOT EXISTS app_public;
CREATE SCHEMA IF NOT EXISTS users_public;
CREATE SCHEMA IF NOT EXISTS billing_public;
CREATE SCHEMA IF NOT EXISTS extra_public;

CREATE TABLE IF NOT EXISTS app_public.items (
  id serial PRIMARY KEY,
  name text NOT NULL,
  owner_id uuid DEFAULT nullif(current_setting('jwt.claims.user_id', true), '')::uuid,
  search_document tsvector
);

CREATE TABLE IF NOT EXISTS app_public.public_items (
  id serial PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS app_public.admin_notes (
  id serial PRIMARY KEY,
  body text NOT NULL
);

CREATE TABLE IF NOT EXISTS app_public.user_accounts (
  id serial PRIMARY KEY,
  user_name text NOT NULL
);

CREATE TABLE IF NOT EXISTS users_public.profiles (
  id serial PRIMARY KEY,
  display_name text
);

CREATE TABLE IF NOT EXISTS billing_public.invoices (
  id serial PRIMARY KEY,
  amount numeric
);

CREATE TABLE IF NOT EXISTS extra_public.notes (
  id serial PRIMARY KEY,
  body text
);

CREATE OR REPLACE FUNCTION app_public.current_setting(name text)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT current_setting(name, true)
$$;

CREATE OR REPLACE FUNCTION app_public.sign_up_with_key(public_key text)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT public_key;
$$;

CREATE OR REPLACE FUNCTION app_public.sign_in_request_challenge(public_key text)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT 'challenge-' || public_key;
$$;

CREATE OR REPLACE FUNCTION app_public.sign_in_record_failure(public_key text)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT public_key;
$$;

CREATE OR REPLACE FUNCTION app_public.sign_in_with_challenge(public_key text, message text)
RETURNS TABLE(access_token text, access_token_expires_at timestamptz)
LANGUAGE sql STABLE
AS $$
  SELECT 'token-' || public_key, now() + interval '1 day';
$$;

ALTER TABLE app_public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY items_select_own ON app_public.items
  FOR SELECT TO authenticated
  USING (owner_id = current_setting('jwt.claims.user_id', true)::uuid);

CREATE POLICY items_insert_own ON app_public.items
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = current_setting('jwt.claims.user_id', true)::uuid);

CREATE POLICY items_update_own ON app_public.items
  FOR UPDATE TO authenticated
  USING (owner_id = current_setting('jwt.claims.user_id', true)::uuid)
  WITH CHECK (owner_id = current_setting('jwt.claims.user_id', true)::uuid);

CREATE POLICY items_delete_own ON app_public.items
  FOR DELETE TO authenticated
  USING (owner_id = current_setting('jwt.claims.user_id', true)::uuid);

INSERT INTO app_public.public_items (id, name) VALUES
  (1, 'Public Item')
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_public.items (id, name, owner_id) VALUES
  (1, 'User Item A', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  (2, 'User Item B', '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_public.admin_notes (id, body) VALUES
  (1, 'Admin Only')
ON CONFLICT (id) DO NOTHING;

GRANT USAGE ON SCHEMA app_public TO anonymous;
GRANT USAGE ON SCHEMA users_public TO anonymous;
GRANT USAGE ON SCHEMA billing_public TO anonymous;
GRANT USAGE ON SCHEMA extra_public TO anonymous;
GRANT USAGE ON SCHEMA app_public TO authenticated;
GRANT USAGE ON SCHEMA users_public TO authenticated;
GRANT USAGE ON SCHEMA billing_public TO authenticated;
GRANT USAGE ON SCHEMA extra_public TO authenticated;
GRANT USAGE ON SCHEMA app_public TO administrator;
GRANT USAGE ON SCHEMA users_public TO administrator;
GRANT USAGE ON SCHEMA billing_public TO administrator;
GRANT USAGE ON SCHEMA extra_public TO administrator;

GRANT SELECT ON app_public.public_items TO anonymous;
GRANT EXECUTE ON FUNCTION app_public.current_setting(text) TO anonymous;
GRANT EXECUTE ON FUNCTION app_public.sign_up_with_key(text) TO anonymous;
GRANT EXECUTE ON FUNCTION app_public.sign_in_request_challenge(text) TO anonymous;
GRANT EXECUTE ON FUNCTION app_public.sign_in_record_failure(text) TO anonymous;
GRANT EXECUTE ON FUNCTION app_public.sign_in_with_challenge(text, text) TO anonymous;

GRANT SELECT ON app_public.public_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_public.items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_public.user_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON users_public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON extra_public.notes TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON app_public.public_items TO administrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_public.items TO administrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_public.user_accounts TO administrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_public.admin_notes TO administrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON users_public.profiles TO administrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_public.invoices TO administrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON extra_public.notes TO administrator;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_public TO administrator;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA users_public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA billing_public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA extra_public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_public TO administrator;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA users_public TO administrator;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA billing_public TO administrator;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA extra_public TO administrator;

-- Database
INSERT INTO metaschema_public.database (id, name) VALUES
  ('0b22e268-16d6-582b-950a-24e108688849', 'test-db')
ON CONFLICT (id) DO NOTHING;

-- Schemas for api_schemata join table
INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, label, description) VALUES
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '0b22e268-16d6-582b-950a-24e108688849', 'app-public', 'app_public', 'App Public', 'App schema'),
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '0b22e268-16d6-582b-950a-24e108688849', 'users-public', 'users_public', 'Users Public', 'Users schema'),
  ('33333333-cccc-cccc-cccc-cccccccccccc', '0b22e268-16d6-582b-950a-24e108688849', 'billing-public', 'billing_public', 'Billing Public', 'Billing schema'),
  ('44444444-dddd-dddd-dddd-dddddddddddd', '0b22e268-16d6-582b-950a-24e108688849', 'extra-public', 'extra_public', 'Extra Public', 'Extra schema');

-- API with full configuration
INSERT INTO services_public.apis (id, database_id, name, is_public, role_name, anon_role) VALUES
  ('55555555-1111-2222-3333-444444444444', '0b22e268-16d6-582b-950a-24e108688849', 'full-api', true, 'authenticated', 'anonymous');

-- Private API for is_public filtering
INSERT INTO services_public.apis (id, database_id, name, is_public, role_name, anon_role) VALUES
  ('66666666-2222-3333-4444-555555555555', '0b22e268-16d6-582b-950a-24e108688849', 'admin-api', false, 'administrator', 'administrator');

-- Public API without rls_module
INSERT INTO services_public.apis (id, database_id, name, is_public, role_name, anon_role) VALUES
  ('77777777-3333-4444-5555-666666666666', '0b22e268-16d6-582b-950a-24e108688849', 'no-rls-api', true, 'authenticated', 'anonymous');

-- Multiple domains for same API
INSERT INTO services_public.domains (id, database_id, api_id, domain, subdomain) VALUES
  ('aaaaaaaa-1111-1111-1111-111111111111', '0b22e268-16d6-582b-950a-24e108688849', '55555555-1111-2222-3333-444444444444', 'example.com', 'api'),
  ('aaaaaaaa-2222-2222-2222-222222222222', '0b22e268-16d6-582b-950a-24e108688849', '55555555-1111-2222-3333-444444444444', 'example.com', 'www'),
  ('aaaaaaaa-6666-6666-6666-666666666666', '0b22e268-16d6-582b-950a-24e108688849', '55555555-1111-2222-3333-444444444444', 'example.com', NULL),
  ('aaaaaaaa-3333-3333-3333-333333333333', '0b22e268-16d6-582b-950a-24e108688849', '55555555-1111-2222-3333-444444444444', 'example.io', NULL),
  ('aaaaaaaa-4444-4444-4444-444444444444', '0b22e268-16d6-582b-950a-24e108688849', '66666666-2222-3333-4444-555555555555', 'example.com', 'admin'),
  ('aaaaaaaa-5555-5555-5555-555555555555', '0b22e268-16d6-582b-950a-24e108688849', '77777777-3333-4444-5555-666666666666', 'example.com', 'no-auth');

-- Multiple schema extensions
INSERT INTO services_public.api_extensions (id, database_id, api_id, schema_name) VALUES
  ('bbbbbbbb-1111-1111-1111-111111111111', '0b22e268-16d6-582b-950a-24e108688849', '55555555-1111-2222-3333-444444444444', 'app_public'),
  ('bbbbbbbb-2222-2222-2222-222222222222', '0b22e268-16d6-582b-950a-24e108688849', '55555555-1111-2222-3333-444444444444', 'users_public'),
  ('bbbbbbbb-3333-3333-3333-333333333333', '0b22e268-16d6-582b-950a-24e108688849', '55555555-1111-2222-3333-444444444444', 'billing_public'),
  ('bbbbbbbb-4444-4444-4444-444444444444', '0b22e268-16d6-582b-950a-24e108688849', '66666666-2222-3333-4444-555555555555', 'metaschema_public'),
  ('bbbbbbbb-5555-5555-5555-555555555555', '0b22e268-16d6-582b-950a-24e108688849', '66666666-2222-3333-4444-555555555555', 'services_public'),
  ('bbbbbbbb-6666-6666-6666-666666666666', '0b22e268-16d6-582b-950a-24e108688849', '77777777-3333-4444-5555-666666666666', 'app_public');

-- Additional schema via join table
INSERT INTO services_public.api_schemata (id, database_id, api_id, schema_id) VALUES
  ('cccccccc-1111-1111-1111-111111111111', '0b22e268-16d6-582b-950a-24e108688849', '55555555-1111-2222-3333-444444444444', '44444444-dddd-dddd-dddd-dddddddddddd');

-- RLS module configuration (auth_private schema/table IDs are inserted by auth.seed.sql)
INSERT INTO metaschema_modules_public.rls_module (
  id,
  database_id,
  api_id,
  schema_id,
  private_schema_id,
  tokens_table_id,
  users_table_id,
  authenticate,
  authenticate_strict
) VALUES (
  'dddddddd-1111-1111-1111-111111111111',
  '0b22e268-16d6-582b-950a-24e108688849',
  '55555555-1111-2222-3333-444444444444',
  'eeeeeeee-5555-5555-5555-555555555555',
  'eeeeeeee-5555-5555-5555-555555555555',
  'ffffffff-6666-6666-6666-666666666666',
  '99999999-7777-7777-7777-777777777777',
  'authenticate',
  'authenticate_strict'
);

-- API modules
INSERT INTO services_public.api_modules (id, database_id, api_id, name, data) VALUES
  ('eeeeeeee-1111-1111-1111-111111111111', '0b22e268-16d6-582b-950a-24e108688849', '55555555-1111-2222-3333-444444444444', 'cors', '{"urls": ["https://app.example.com"]}'),
  ('eeeeeeee-2222-2222-2222-222222222222', '0b22e268-16d6-582b-950a-24e108688849', '55555555-1111-2222-3333-444444444444', 'pubkey_challenge',
   '{"schema": "app_public", "crypto_network": "test", "sign_up_with_key": "sign_up_with_key", "sign_in_request_challenge": "sign_in_request_challenge", "sign_in_record_failure": "sign_in_record_failure", "sign_in_with_challenge": "sign_in_with_challenge"}');

COMMIT;
