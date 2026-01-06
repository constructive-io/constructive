BEGIN;

CREATE SCHEMA IF NOT EXISTS app_public;

CREATE TABLE IF NOT EXISTS app_public.items (
  id serial PRIMARY KEY,
  name text NOT NULL,
  owner_id uuid DEFAULT nullif(current_setting('jwt.claims.user_id', true), '')::uuid
);

CREATE TABLE IF NOT EXISTS app_public.public_items (
  id serial PRIMARY KEY,
  name text NOT NULL
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

GRANT USAGE ON SCHEMA app_public TO anonymous;
GRANT USAGE ON SCHEMA app_public TO authenticated;
GRANT USAGE ON SCHEMA app_public TO administrator;

GRANT SELECT ON app_public.public_items TO anonymous;
GRANT SELECT ON app_public.public_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_public.public_items TO administrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_public.items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_public.items TO administrator;

GRANT EXECUTE ON FUNCTION app_public.current_setting(text) TO anonymous;
GRANT EXECUTE ON FUNCTION app_public.sign_up_with_key(text) TO anonymous;
GRANT EXECUTE ON FUNCTION app_public.sign_in_request_challenge(text) TO anonymous;
GRANT EXECUTE ON FUNCTION app_public.sign_in_record_failure(text) TO anonymous;
GRANT EXECUTE ON FUNCTION app_public.sign_in_with_challenge(text, text) TO anonymous;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_public TO administrator;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_public TO administrator;

-- Database
INSERT INTO metaschema_public.database (id, name) VALUES
  ('0b22e268-16d6-582b-950a-24e108688849', 'test-db')
ON CONFLICT (id) DO NOTHING;

-- API with modules
INSERT INTO services_public.apis (id, database_id, name, is_public, role_name, anon_role) VALUES
  ('88888888-1111-2222-3333-444444444444', '0b22e268-16d6-582b-950a-24e108688849', 'modules-api', true, 'authenticated', 'anonymous');

-- API without modules
INSERT INTO services_public.apis (id, database_id, name, is_public, role_name, anon_role) VALUES
  ('88888888-2222-3333-4444-555555555555', '0b22e268-16d6-582b-950a-24e108688849', 'no-modules-api', true, 'authenticated', 'anonymous');

-- API with unknown module
INSERT INTO services_public.apis (id, database_id, name, is_public, role_name, anon_role) VALUES
  ('88888888-3333-4444-5555-666666666666', '0b22e268-16d6-582b-950a-24e108688849', 'unknown-module-api', true, 'authenticated', 'anonymous');

-- API with invalid module data
INSERT INTO services_public.apis (id, database_id, name, is_public, role_name, anon_role) VALUES
  ('88888888-4444-5555-6666-777777777777', '0b22e268-16d6-582b-950a-24e108688849', 'invalid-module-api', true, 'authenticated', 'anonymous');

-- Domains
INSERT INTO services_public.domains (id, database_id, api_id, domain, subdomain) VALUES
  ('99999999-1111-1111-1111-111111111111', '0b22e268-16d6-582b-950a-24e108688849', '88888888-1111-2222-3333-444444444444', 'example.com', 'modules'),
  ('99999999-2222-2222-2222-222222222222', '0b22e268-16d6-582b-950a-24e108688849', '88888888-2222-3333-4444-555555555555', 'example.com', 'no-modules'),
  ('99999999-3333-3333-3333-333333333333', '0b22e268-16d6-582b-950a-24e108688849', '88888888-3333-4444-5555-666666666666', 'example.com', 'unknown-module'),
  ('99999999-4444-4444-4444-444444444444', '0b22e268-16d6-582b-950a-24e108688849', '88888888-4444-5555-6666-777777777777', 'example.com', 'invalid-module');

-- Schema extensions
INSERT INTO services_public.api_extensions (id, database_id, api_id, schema_name) VALUES
  ('aaaaaaaa-1111-1111-1111-111111111111', '0b22e268-16d6-582b-950a-24e108688849', '88888888-1111-2222-3333-444444444444', 'app_public'),
  ('aaaaaaaa-2222-2222-2222-222222222222', '0b22e268-16d6-582b-950a-24e108688849', '88888888-2222-3333-4444-555555555555', 'app_public'),
  ('aaaaaaaa-3333-3333-3333-333333333333', '0b22e268-16d6-582b-950a-24e108688849', '88888888-3333-4444-5555-666666666666', 'app_public'),
  ('aaaaaaaa-4444-4444-4444-444444444444', '0b22e268-16d6-582b-950a-24e108688849', '88888888-4444-5555-6666-777777777777', 'app_public');

-- API modules
INSERT INTO services_public.api_modules (id, database_id, api_id, name, data) VALUES
  ('bbbbbbbb-1111-1111-1111-111111111111', '0b22e268-16d6-582b-950a-24e108688849', '88888888-1111-2222-3333-444444444444', 'cors',
   '{"urls": ["https://allowed1.com", "https://allowed2.com"]}'),
  ('bbbbbbbb-2222-2222-2222-222222222222', '0b22e268-16d6-582b-950a-24e108688849', '88888888-1111-2222-3333-444444444444', 'pubkey_challenge',
   '{"schema": "app_public", "crypto_network": "test", "sign_up_with_key": "sign_up_with_key", "sign_in_request_challenge": "sign_in_request_challenge", "sign_in_record_failure": "sign_in_record_failure", "sign_in_with_challenge": "sign_in_with_challenge"}'),
  ('bbbbbbbb-3333-3333-3333-333333333333', '0b22e268-16d6-582b-950a-24e108688849', '88888888-3333-4444-5555-666666666666', 'unknown_module',
   '{"value": "ignored"}'),
  ('bbbbbbbb-4444-4444-4444-444444444444', '0b22e268-16d6-582b-950a-24e108688849', '88888888-4444-5555-6666-777777777777', 'pubkey_challenge',
   '{"crypto_network": "test"}');

-- RLS module configuration for modules API (auth_private IDs from auth.seed.sql)
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
  'cccccccc-1111-1111-1111-111111111111',
  '0b22e268-16d6-582b-950a-24e108688849',
  '88888888-1111-2222-3333-444444444444',
  'eeeeeeee-5555-5555-5555-555555555555',
  'eeeeeeee-5555-5555-5555-555555555555',
  'ffffffff-6666-6666-6666-666666666666',
  '99999999-7777-7777-7777-777777777777',
  'authenticate',
  'authenticate_strict'
);

COMMIT;
