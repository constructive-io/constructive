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

SET session_replication_role TO replica;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;

DO $EOFCODE$
  DECLARE
  BEGIN

    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_user');
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_admin');

  END;
$EOFCODE$;

INSERT INTO metaschema_public.database (
  id,
  owner_id,
  name,
  hash
) VALUES
(
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  NULL,
  'simple-pets',
  '425a0f10-0170-5760-85df-2a980c378224'
);

SET session_replication_role TO DEFAULT;

SET session_replication_role TO replica;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;

DO $EOFCODE$
  DECLARE
  BEGIN

    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_user');
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_admin');

  END;
$EOFCODE$;

INSERT INTO metaschema_public.schema (
  id,
  database_id,
  name,
  schema_name,
  description,
  is_public
) VALUES
(
  '6dbae92a-5450-401b-1ed5-d69e7754940d',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'public',
  'simple-pets-public',
  NULL,
  true
),
(
  '6dba9876-043f-48ee-399d-ddc991ad978d',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'private',
  'simple-pets-private',
  NULL,
  false
),
(
  '6dba6f21-0193-43f4-3bdb-61b4b956b6b6',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'pets_public',
  'simple-pets-pets-public',
  NULL,
  true
);

SET session_replication_role TO DEFAULT;

SET session_replication_role TO replica;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;

DO $EOFCODE$
  DECLARE
  BEGIN

    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_user');
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_admin');

  END;
$EOFCODE$;

INSERT INTO metaschema_public.table (
  id,
  database_id,
  schema_id,
  name,
  description
) VALUES
(
  '6dba36e9-b098-4157-1b4c-e5b6e3a885de',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dba6f21-0193-43f4-3bdb-61b4b956b6b6',
  'animals',
  NULL
);

SET session_replication_role TO DEFAULT;

SET session_replication_role TO replica;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;

DO $EOFCODE$
  DECLARE
  BEGIN

    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_user');
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_admin');

  END;
$EOFCODE$;

INSERT INTO metaschema_public.field (
  id,
  database_id,
  table_id,
  name,
  type,
  description
) VALUES
(
  '6dbace4d-bcf9-4d55-e363-6b24623f0d8a',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dba36e9-b098-4157-1b4c-e5b6e3a885de',
  'id',
  'uuid',
  NULL
),
(
  '6dbae9c7-3460-4f65-8290-b2a8e05eb714',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dba36e9-b098-4157-1b4c-e5b6e3a885de',
  'name',
  'text',
  NULL
),
(
  '6dbacc68-876e-4ece-b190-706819ae4f00',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dba36e9-b098-4157-1b4c-e5b6e3a885de',
  'species',
  'text',
  NULL
),
(
  '6dba080e-bb3f-4556-8ca7-425ceb98a519',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dba36e9-b098-4157-1b4c-e5b6e3a885de',
  'owner_id',
  'uuid',
  NULL
) ON CONFLICT DO NOTHING;

SET session_replication_role TO DEFAULT;

SET session_replication_role TO replica;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;

DO $EOFCODE$
  DECLARE
  BEGIN

    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_user');
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_admin');

  END;
$EOFCODE$;

INSERT INTO metaschema_public.primary_key_constraint (
  id,
  database_id,
  table_id,
  name,
  type,
  field_ids
) VALUES
(
  '6dbaeb74-b5cf-46d5-4724-6ab26c27da2d',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dba36e9-b098-4157-1b4c-e5b6e3a885de',
  'animals_pkey',
  'p',
  '{6dbace4d-bcf9-4d55-e363-6b24623f0d8a}'
);

SET session_replication_role TO DEFAULT;

SET session_replication_role TO replica;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;

DO $EOFCODE$
  DECLARE
  BEGIN

    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_user');
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_admin');

  END;
$EOFCODE$;

INSERT INTO metaschema_public.check_constraint (
  id,
  database_id,
  table_id,
  name,
  type,
  field_ids,
  expr
) VALUES
(
  '6dbade3d-1f49-4535-148f-a55415f91990',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dba36e9-b098-4157-1b4c-e5b6e3a885de',
  'animals_name_chk',
  'c',
  '{6dbae9c7-3460-4f65-8290-b2a8e05eb714}',
  '{"A_Expr":{"kind":"AEXPR_OP","name":[{"String":{"sval":"<="}}],"lexpr":{"FuncCall":{"args":[{"ColumnRef":{"fields":[{"String":{"sval":"name"}}]}}],"funcname":[{"String":{"sval":"character_length"}}]}},"rexpr":{"A_Const":{"ival":256}}}}'
),
(
  '6dba5892-fa63-4c33-b067-43d07fc93032',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dba36e9-b098-4157-1b4c-e5b6e3a885de',
  'animals_species_chk',
  'c',
  '{6dbacc68-876e-4ece-b190-706819ae4f00}',
  '{"A_Expr":{"kind":"AEXPR_OP","name":[{"String":{"sval":"<="}}],"lexpr":{"FuncCall":{"args":[{"ColumnRef":{"fields":[{"String":{"sval":"species"}}]}}],"funcname":[{"String":{"sval":"character_length"}}]}},"rexpr":{"A_Const":{"ival":100}}}}'
);

SET session_replication_role TO DEFAULT;

SET session_replication_role TO replica;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;

DO $EOFCODE$
  DECLARE
  BEGIN

    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_user');
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_admin');

  END;
$EOFCODE$;

INSERT INTO services_public.domains (
  id,
  database_id,
  site_id,
  api_id,
  domain,
  subdomain
) VALUES
(
  '41181146-890e-4991-9da7-3dddf87d9e78',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  NULL,
  NULL,
  'test.constructive.io',
  'app'
);

SET session_replication_role TO DEFAULT;

SET session_replication_role TO replica;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;

DO $EOFCODE$
  DECLARE
  BEGIN

    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_user');
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_admin');

  END;
$EOFCODE$;

INSERT INTO services_public.apis (
  id,
  database_id,
  name,
  dbname,
  is_public,
  role_name,
  anon_role
) VALUES
(
  '28199444-da40-40b1-8a4c-53edbf91c738',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'public',
  'db-322da82c-f774-4830-b88d-1bb88d02d930',
  true,
  'authenticated',
  'anonymous'
),
(
  'cc1e8389-e69d-4e12-9089-a98bf11fc75f',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'admin',
  'db-322da82c-f774-4830-b88d-1bb88d02d930',
  true,
  'authenticated',
  'anonymous'
),
(
  'e257c53d-6ba6-40de-b679-61b37188a316',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'private',
  'db-322da82c-f774-4830-b88d-1bb88d02d930',
  false,
  'administrator',
  'administrator'
),
(
  'a2e6098f-2c11-4f2a-b481-c19175bc62ef',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'auth',
  'db-322da82c-f774-4830-b88d-1bb88d02d930',
  true,
  'authenticated',
  'anonymous'
),
(
  '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'app',
  'db-322da82c-f774-4830-b88d-1bb88d02d930',
  true,
  'authenticated',
  'anonymous'
);

SET session_replication_role TO DEFAULT;
