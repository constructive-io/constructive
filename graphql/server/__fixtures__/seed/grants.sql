-- Grants: Permission setup for all roles

-- Schema: simple-pets-public
GRANT USAGE ON SCHEMA "simple-pets-public" TO administrator, authenticated, anonymous;

-- Schema: simple-pets-private
GRANT USAGE ON SCHEMA "simple-pets-private" TO administrator, authenticated, anonymous;

-- Schema: simple-pets-pets-public
GRANT USAGE ON SCHEMA "simple-pets-pets-public" TO administrator, authenticated, anonymous;

-- Table grants for animals
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-pets-pets-public".animals TO administrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-pets-pets-public".animals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-pets-pets-public".animals TO anonymous;

-- Default privileges for future tables (administrator gets full access)
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-public" GRANT ALL ON TABLES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-public" GRANT USAGE ON SEQUENCES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-public" GRANT ALL ON FUNCTIONS TO administrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-private" GRANT ALL ON TABLES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-private" GRANT USAGE ON SEQUENCES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-private" GRANT ALL ON FUNCTIONS TO administrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-pets-public" GRANT ALL ON TABLES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-pets-public" GRANT USAGE ON SEQUENCES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-pets-public" GRANT ALL ON FUNCTIONS TO administrator;

-- Default privileges for authenticated and anonymous (functions and sequences only)
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-public" GRANT ALL ON FUNCTIONS TO authenticated, anonymous;
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-public" GRANT USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-private" GRANT ALL ON FUNCTIONS TO authenticated, anonymous;
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-private" GRANT USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-pets-public" GRANT ALL ON FUNCTIONS TO authenticated, anonymous;
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-pets-public" GRANT USAGE ON SEQUENCES TO authenticated;
