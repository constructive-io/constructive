-- Create roles if they don't exist and grant to postgres
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anonymous') THEN
    CREATE ROLE anonymous;
  END IF;

  -- Grant roles to postgres so it can SET ROLE to them
  GRANT authenticated TO postgres;
  GRANT anonymous TO postgres;
END
$$;

-- Expose current_setting via GraphQL safely
CREATE OR REPLACE FUNCTION app_public.current_setting(name text)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT current_setting(name, true)
$$;

-- ============ PERMISSIONS ============

-- REVOKE everything by default
REVOKE ALL ON SCHEMA app_public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA app_public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA app_public FROM PUBLIC;

-- Grant to authenticated role
GRANT USAGE ON SCHEMA app_public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app_public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_public TO authenticated;

-- Grant minimal permissions to anonymous role (for testing unauthorized access)
-- Anonymous can use the schema but has no table/sequence access
GRANT USAGE ON SCHEMA app_public TO anonymous;
GRANT EXECUTE ON FUNCTION app_public.current_setting(text) TO anonymous;