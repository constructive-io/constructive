BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_db text NOT NULL DEFAULT current_database()
);

-- Expose current_setting via GraphQL for testing JWT claims
CREATE OR REPLACE FUNCTION app_public.current_setting(name text)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT current_setting(name, true)
$$;

GRANT USAGE ON SCHEMA app_public TO anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app_public TO anonymous;
GRANT EXECUTE ON FUNCTION app_public.current_setting(text) TO anonymous;

COMMIT;
