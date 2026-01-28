-- Schema creation for simple-seed test scenario
-- Creates the simple-pets schemas and animals table

-- Create schemas
CREATE SCHEMA IF NOT EXISTS "simple-pets-public";
CREATE SCHEMA IF NOT EXISTS "simple-pets-pets-public";

-- Grant schema usage
GRANT USAGE ON SCHEMA "simple-pets-public" TO administrator, authenticated, anonymous;
GRANT USAGE ON SCHEMA "simple-pets-pets-public" TO administrator, authenticated, anonymous;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-public"
  GRANT ALL ON TABLES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-public"
  GRANT USAGE ON SEQUENCES TO administrator, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-public"
  GRANT ALL ON FUNCTIONS TO administrator, authenticated, anonymous;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-pets-public"
  GRANT ALL ON TABLES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-pets-public"
  GRANT USAGE ON SEQUENCES TO administrator, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-pets-public"
  GRANT ALL ON FUNCTIONS TO administrator, authenticated, anonymous;

-- Create animals table
CREATE TABLE IF NOT EXISTS "simple-pets-pets-public".animals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  species text NOT NULL,
  owner_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT animals_name_chk CHECK (character_length(name) <= 256),
  CONSTRAINT animals_species_chk CHECK (character_length(species) <= 100)
);

-- Create timestamp trigger
DROP TRIGGER IF EXISTS timestamps_tg ON "simple-pets-pets-public".animals;
CREATE TRIGGER timestamps_tg
  BEFORE INSERT OR UPDATE
  ON "simple-pets-pets-public".animals
  FOR EACH ROW
  EXECUTE PROCEDURE stamps.timestamps();

-- Create indexes
CREATE INDEX IF NOT EXISTS animals_created_at_idx ON "simple-pets-pets-public".animals (created_at);
CREATE INDEX IF NOT EXISTS animals_updated_at_idx ON "simple-pets-pets-public".animals (updated_at);

-- Grant table permissions (allow anonymous to do CRUD for tests)
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-pets-pets-public".animals TO administrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-pets-pets-public".animals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-pets-pets-public".animals TO anonymous;
