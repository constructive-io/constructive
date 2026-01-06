BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS auth_private;

CREATE TABLE IF NOT EXISTS auth_private.tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_value text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 day'
);

INSERT INTO auth_private.tokens (id, user_id, token_value, expires_at) VALUES
  ('aaaaaaaa-1111-1111-1111-111111111111', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'valid-token-123', now() + interval '1 day'),
  ('bbbbbbbb-2222-2222-2222-222222222222', '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'another-valid-token', now() + interval '1 day'),
  ('cccccccc-3333-3333-3333-333333333333', '33333333-cccc-cccc-cccc-cccccccccccc', 'expired-token', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

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

CREATE TABLE IF NOT EXISTS app_public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_db text NOT NULL DEFAULT current_database(),
  owner_id uuid DEFAULT nullif(current_setting('jwt.claims.user_id', true), '')::uuid,
  is_public boolean NOT NULL DEFAULT false
);

-- Expose current_setting via GraphQL for testing JWT claims
CREATE OR REPLACE FUNCTION app_public.current_setting(name text)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT current_setting(name, true)
$$;

ALTER TABLE app_public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY items_select_public ON app_public.items
  FOR SELECT TO anonymous
  USING (is_public);

CREATE POLICY items_select_own ON app_public.items
  FOR SELECT TO authenticated
  USING (is_public OR owner_id = current_setting('jwt.claims.user_id', true)::uuid);

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

INSERT INTO app_public.items (id, name, source_db, is_public) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Public Seed Item', 'seed', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_public.items (id, name, source_db, owner_id) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Private Seed Item', 'seed', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO NOTHING;

GRANT USAGE ON SCHEMA app_public TO anonymous;
GRANT USAGE ON SCHEMA app_public TO authenticated;
GRANT USAGE ON SCHEMA app_public TO administrator;
GRANT SELECT ON app_public.items TO anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_public.items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_public.items TO administrator;
GRANT USAGE ON SCHEMA auth_private TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth_private.authenticate(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth_private.authenticate_strict(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION app_public.current_setting(text) TO anonymous;
GRANT EXECUTE ON FUNCTION app_public.current_setting(text) TO authenticated;
GRANT EXECUTE ON FUNCTION app_public.current_setting(text) TO administrator;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_public TO administrator;

COMMIT;
