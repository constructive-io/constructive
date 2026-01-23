CREATE SCHEMA "simple-pets-public";

GRANT USAGE ON SCHEMA "simple-pets-public" TO administrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-public"
  GRANT ALL ON TABLES TO administrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-public"
  GRANT USAGE ON SEQUENCES TO administrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-public"
  GRANT ALL ON FUNCTIONS TO administrator;

GRANT USAGE ON SCHEMA "simple-pets-public" TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-public"
  GRANT ALL ON FUNCTIONS TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-public"
  GRANT USAGE ON SEQUENCES TO authenticated;

GRANT USAGE ON SCHEMA "simple-pets-public" TO anonymous;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-public"
  GRANT ALL ON FUNCTIONS TO anonymous;

CREATE SCHEMA "simple-pets-private";

GRANT USAGE ON SCHEMA "simple-pets-private" TO administrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-private"
  GRANT ALL ON TABLES TO administrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-private"
  GRANT USAGE ON SEQUENCES TO administrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-private"
  GRANT ALL ON FUNCTIONS TO administrator;

GRANT USAGE ON SCHEMA "simple-pets-private" TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-private"
  GRANT ALL ON FUNCTIONS TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-private"
  GRANT USAGE ON SEQUENCES TO authenticated;

GRANT USAGE ON SCHEMA "simple-pets-private" TO anonymous;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-private"
  GRANT ALL ON FUNCTIONS TO anonymous;

CREATE SCHEMA "simple-pets-pets-public";

GRANT USAGE ON SCHEMA "simple-pets-pets-public" TO administrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-pets-public"
  GRANT ALL ON TABLES TO administrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-pets-public"
  GRANT USAGE ON SEQUENCES TO administrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-pets-public"
  GRANT ALL ON FUNCTIONS TO administrator;

GRANT USAGE ON SCHEMA "simple-pets-pets-public" TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-pets-public"
  GRANT ALL ON FUNCTIONS TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-pets-public"
  GRANT USAGE ON SEQUENCES TO authenticated;

GRANT USAGE ON SCHEMA "simple-pets-pets-public" TO anonymous;

ALTER DEFAULT PRIVILEGES IN SCHEMA "simple-pets-pets-public"
  GRANT ALL ON FUNCTIONS TO anonymous;

CREATE TABLE "simple-pets-pets-public".animals ();

ALTER TABLE "simple-pets-pets-public".animals 
  DISABLE ROW LEVEL SECURITY;

ALTER TABLE "simple-pets-pets-public".animals 
  ADD COLUMN id uuid;

ALTER TABLE "simple-pets-pets-public".animals 
  ALTER COLUMN id SET NOT NULL;

ALTER TABLE "simple-pets-pets-public".animals 
  ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE "simple-pets-pets-public".animals 
  ADD CONSTRAINT animals_pkey PRIMARY KEY (id);

ALTER TABLE "simple-pets-pets-public".animals 
  ADD COLUMN name text;

ALTER TABLE "simple-pets-pets-public".animals 
  ALTER COLUMN name SET NOT NULL;

ALTER TABLE "simple-pets-pets-public".animals 
  ADD CONSTRAINT animals_name_chk 
    CHECK (character_length(name) <= 256);

ALTER TABLE "simple-pets-pets-public".animals 
  ADD COLUMN species text;

ALTER TABLE "simple-pets-pets-public".animals 
  ALTER COLUMN species SET NOT NULL;

ALTER TABLE "simple-pets-pets-public".animals 
  ADD CONSTRAINT animals_species_chk 
    CHECK (character_length(species) <= 100);

ALTER TABLE "simple-pets-pets-public".animals 
  ADD COLUMN owner_id uuid;

ALTER TABLE "simple-pets-pets-public".animals 
  ADD COLUMN created_at timestamptz;

ALTER TABLE "simple-pets-pets-public".animals 
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE "simple-pets-pets-public".animals 
  ADD COLUMN updated_at timestamptz;

ALTER TABLE "simple-pets-pets-public".animals 
  ALTER COLUMN updated_at SET DEFAULT now();

CREATE TRIGGER timestamps_tg
  BEFORE INSERT OR UPDATE
  ON "simple-pets-pets-public".animals
  FOR EACH ROW
  EXECUTE PROCEDURE stamps.timestamps();

CREATE INDEX animals_created_at_idx ON "simple-pets-pets-public".animals (created_at);

CREATE INDEX animals_updated_at_idx ON "simple-pets-pets-public".animals (updated_at);