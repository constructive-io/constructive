-- Schema creation for auth-seed test scenario
-- Creates the auth-test schemas, users table, tokens table, and authentication functions

-- Create schemas
CREATE SCHEMA IF NOT EXISTS "auth-test-public";
CREATE SCHEMA IF NOT EXISTS "auth-test-private";

-- Grant schema usage
GRANT USAGE ON SCHEMA "auth-test-public" TO administrator, authenticated, anonymous;
GRANT USAGE ON SCHEMA "auth-test-private" TO administrator, authenticated, anonymous;

-- Set default privileges for auth-test-public
ALTER DEFAULT PRIVILEGES IN SCHEMA "auth-test-public"
  GRANT ALL ON TABLES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA "auth-test-public"
  GRANT USAGE ON SEQUENCES TO administrator, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA "auth-test-public"
  GRANT ALL ON FUNCTIONS TO administrator, authenticated, anonymous;

-- Set default privileges for auth-test-private
ALTER DEFAULT PRIVILEGES IN SCHEMA "auth-test-private"
  GRANT ALL ON TABLES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA "auth-test-private"
  GRANT USAGE ON SEQUENCES TO administrator, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA "auth-test-private"
  GRANT ALL ON FUNCTIONS TO administrator, authenticated, anonymous;

-- Create users table
CREATE TABLE IF NOT EXISTS "auth-test-private".users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'authenticated',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tokens table
CREATE TABLE IF NOT EXISTS "auth-test-private".tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES "auth-test-private".users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 day'),
  created_at timestamptz DEFAULT now()
);

-- Create timestamp triggers
DROP TRIGGER IF EXISTS timestamps_tg ON "auth-test-private".users;
CREATE TRIGGER timestamps_tg
  BEFORE INSERT OR UPDATE
  ON "auth-test-private".users
  FOR EACH ROW
  EXECUTE PROCEDURE stamps.timestamps();

-- Create indexes
CREATE INDEX IF NOT EXISTS tokens_user_id_idx ON "auth-test-private".tokens (user_id);
CREATE INDEX IF NOT EXISTS tokens_token_idx ON "auth-test-private".tokens (token);
CREATE INDEX IF NOT EXISTS tokens_expires_at_idx ON "auth-test-private".tokens (expires_at);

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "auth-test-private".users TO administrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON "auth-test-private".tokens TO administrator;
GRANT SELECT ON "auth-test-private".users TO authenticated, anonymous;
GRANT SELECT ON "auth-test-private".tokens TO authenticated, anonymous;

-- Create a simple items table for testing authenticated queries
CREATE TABLE IF NOT EXISTS "auth-test-public".items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  owner_id uuid REFERENCES "auth-test-private".users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS timestamps_tg ON "auth-test-public".items;
CREATE TRIGGER timestamps_tg
  BEFORE INSERT OR UPDATE
  ON "auth-test-public".items
  FOR EACH ROW
  EXECUTE PROCEDURE stamps.timestamps();

GRANT SELECT, INSERT, UPDATE, DELETE ON "auth-test-public".items TO administrator, authenticated;
GRANT SELECT ON "auth-test-public".items TO anonymous;

-- Create the authenticate function
-- This function validates a bearer token and returns user info
CREATE OR REPLACE FUNCTION "auth-test-private".authenticate(token_value text)
RETURNS TABLE (
  token_id uuid,
  user_id uuid,
  role text,
  exp bigint
) AS $$
DECLARE
  found_token "auth-test-private".tokens%ROWTYPE;
  found_user "auth-test-private".users%ROWTYPE;
BEGIN
  -- Find the token
  SELECT * INTO found_token
  FROM "auth-test-private".tokens t
  WHERE t.token = token_value
    AND t.expires_at > now();

  IF NOT FOUND THEN
    -- Return empty result for invalid/expired token
    RETURN;
  END IF;

  -- Find the user
  SELECT * INTO found_user
  FROM "auth-test-private".users u
  WHERE u.id = found_token.user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Return the authentication result
  RETURN QUERY SELECT
    found_token.id,
    found_user.id,
    found_user.role,
    EXTRACT(EPOCH FROM found_token.expires_at)::bigint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create authenticate_strict function (same as authenticate for this test)
CREATE OR REPLACE FUNCTION "auth-test-private".authenticate_strict(token_value text)
RETURNS TABLE (
  token_id uuid,
  user_id uuid,
  role text,
  exp bigint
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM "auth-test-private".authenticate(token_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on authenticate functions
GRANT EXECUTE ON FUNCTION "auth-test-private".authenticate(text) TO administrator, authenticated, anonymous;
GRANT EXECUTE ON FUNCTION "auth-test-private".authenticate_strict(text) TO administrator, authenticated, anonymous;
