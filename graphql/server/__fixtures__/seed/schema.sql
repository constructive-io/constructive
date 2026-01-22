-- Schema: Database schemas and tables

-- Create schemas
CREATE SCHEMA IF NOT EXISTS "simple-pets-public";
CREATE SCHEMA IF NOT EXISTS "simple-pets-private";
CREATE SCHEMA IF NOT EXISTS "simple-pets-pets-public";

-- Animals table
CREATE TABLE "simple-pets-pets-public".animals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL CONSTRAINT animals_name_chk CHECK (character_length(name) <= 256),
  species text NOT NULL CONSTRAINT animals_species_chk CHECK (character_length(species) <= 100),
  owner_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Disable RLS for testing simplicity
ALTER TABLE "simple-pets-pets-public".animals DISABLE ROW LEVEL SECURITY;

-- Timestamps trigger (uses public.timestamps from setup.sql)
CREATE TRIGGER timestamps_tg
  BEFORE INSERT OR UPDATE
  ON "simple-pets-pets-public".animals
  FOR EACH ROW
  EXECUTE FUNCTION public.timestamps();

-- Indexes
CREATE INDEX animals_created_at_idx ON "simple-pets-pets-public".animals (created_at);
CREATE INDEX animals_updated_at_idx ON "simple-pets-pets-public".animals (updated_at);
