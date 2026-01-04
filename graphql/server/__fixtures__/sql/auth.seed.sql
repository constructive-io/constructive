BEGIN;

-- Auth schema
CREATE SCHEMA IF NOT EXISTS auth_private;

-- Tokens table
CREATE TABLE IF NOT EXISTS auth_private.tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_value text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 day'
);

-- Users table (minimal for metadata parity)
CREATE TABLE IF NOT EXISTS auth_private.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text
);

-- Test tokens
INSERT INTO auth_private.tokens (id, user_id, token_value, expires_at) VALUES
  ('aaaaaaaa-1111-1111-1111-111111111111', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'valid-token-123', now() + interval '1 day'),
  ('bbbbbbbb-2222-2222-2222-222222222222', '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'another-valid-token', now() + interval '1 day'),
  ('cccccccc-3333-3333-3333-333333333333', '33333333-cccc-cccc-cccc-cccccccccccc', 'expired-token', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- Authenticate functions
CREATE OR REPLACE FUNCTION auth_private.authenticate(p_token text)
RETURNS TABLE (id uuid, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id, user_id
  FROM auth_private.tokens
  WHERE token_value = p_token
    AND expires_at > now();
$$;

CREATE OR REPLACE FUNCTION auth_private.authenticate_strict(p_token text)
RETURNS TABLE (id uuid, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id, user_id
  FROM auth_private.tokens
  WHERE token_value = p_token
    AND expires_at > now()
    AND false;
$$;

GRANT USAGE ON SCHEMA auth_private TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth_private.authenticate(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth_private.authenticate_strict(text) TO PUBLIC;

-- Helper for testing settings in GraphQL
CREATE OR REPLACE FUNCTION meta_public.current_setting(name text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT current_setting(name, true);
$$;

GRANT EXECUTE ON FUNCTION meta_public.current_setting(text) TO PUBLIC;

-- Metadata for auth schema and tables
INSERT INTO collections_public.schema (id, database_id, name, schema_name, label, description)
VALUES (
  'eeeeeeee-5555-5555-5555-555555555555',
  '0b22e268-16d6-582b-950a-24e108688849',
  'auth-private',
  'auth_private',
  'Auth Private',
  'Auth schema for tests'
)
ON CONFLICT (schema_name) DO NOTHING;

INSERT INTO collections_public.table (id, database_id, schema_id, name, label)
VALUES
  ('ffffffff-6666-6666-6666-666666666666', '0b22e268-16d6-582b-950a-24e108688849', 'eeeeeeee-5555-5555-5555-555555555555', 'tokens', 'Tokens'),
  ('99999999-7777-7777-7777-777777777777', '0b22e268-16d6-582b-950a-24e108688849', 'eeeeeeee-5555-5555-5555-555555555555', 'users', 'Users')
ON CONFLICT (database_id, name) DO NOTHING;

-- RLS module entry
INSERT INTO meta_public.rls_module (
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
  'dddddddd-4444-4444-4444-444444444444',
  '0b22e268-16d6-582b-950a-24e108688849',
  '11111111-1111-1111-1111-111111111111',
  'eeeeeeee-5555-5555-5555-555555555555',
  'eeeeeeee-5555-5555-5555-555555555555',
  'ffffffff-6666-6666-6666-666666666666',
  '99999999-7777-7777-7777-777777777777',
  'authenticate',
  'authenticate_strict'
)
ON CONFLICT (api_id) DO NOTHING;

COMMIT;
