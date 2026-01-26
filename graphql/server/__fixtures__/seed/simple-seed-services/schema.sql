-- Metaschema Schema DDL

CREATE SCHEMA metaschema_private;

GRANT USAGE ON SCHEMA metaschema_private TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_private
  GRANT ALL ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_private
  GRANT ALL ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_private
  GRANT ALL ON FUNCTIONS TO authenticated;

CREATE SCHEMA metaschema_public;

GRANT USAGE ON SCHEMA metaschema_public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_public
  GRANT ALL ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_public
  GRANT ALL ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_public
  GRANT ALL ON FUNCTIONS TO authenticated;

CREATE TYPE metaschema_public.object_category AS ENUM ('core', 'module', 'app');

CREATE TABLE metaschema_public.database (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid,
  schema_hash text,
  schema_name text,
  private_schema_name text,
  name text,
  label text,
  hash uuid,
  UNIQUE (schema_hash),
  UNIQUE (schema_name),
  UNIQUE (private_schema_name)
);

ALTER TABLE metaschema_public.database 
  ADD CONSTRAINT db_namechk 
    CHECK (char_length(name) > 2);

COMMENT ON COLUMN metaschema_public.database.schema_hash IS '@omit';

CREATE TABLE metaschema_public.schema (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  name text NOT NULL,
  schema_name text NOT NULL,
  label text,
  description text,
  smart_tags jsonb,
  category metaschema_public.object_category NOT NULL DEFAULT 'app',
  module text NULL,
  scope int NULL,
  tags citext[] NOT NULL DEFAULT '{}',
  is_public boolean NOT NULL DEFAULT true,
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  UNIQUE (database_id, name),
  UNIQUE (schema_name)
);

ALTER TABLE metaschema_public.schema 
  ADD CONSTRAINT schema_namechk 
    CHECK (char_length(name) > 2);

COMMENT ON CONSTRAINT db_fkey ON metaschema_public.schema IS '@omit manyToMany';

CREATE INDEX schema_database_id_idx ON metaschema_public.schema (database_id);

CREATE TABLE metaschema_public."table" (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL DEFAULT uuid_nil(),
  schema_id uuid NOT NULL,
  name text NOT NULL,
  label text,
  description text,
  smart_tags jsonb,
  category metaschema_public.object_category NOT NULL DEFAULT 'app',
  module text NULL,
  scope int NULL,
  use_rls boolean NOT NULL DEFAULT false,
  timestamps boolean NOT NULL DEFAULT false,
  peoplestamps boolean NOT NULL DEFAULT false,
  plural_name text,
  singular_name text,
  tags citext[] NOT NULL DEFAULT '{}',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  UNIQUE (database_id, name)
);

ALTER TABLE metaschema_public."table" 
  ADD COLUMN inherits_id uuid
    NULL
    REFERENCES metaschema_public."table" (id);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_public."table" IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_public."table" IS '@omit manyToMany';

CREATE INDEX table_schema_id_idx ON metaschema_public."table" (schema_id);

CREATE INDEX table_database_id_idx ON metaschema_public."table" (database_id);

CREATE TABLE metaschema_public.check_constraint (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL,
  name text,
  type text,
  field_ids uuid[] NOT NULL,
  expr jsonb,
  smart_tags jsonb,
  category metaschema_public.object_category NOT NULL DEFAULT 'app',
  module text NULL,
  scope int NULL,
  tags citext[] NOT NULL DEFAULT '{}',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public."table" (id)
    ON DELETE CASCADE,
  UNIQUE (table_id, name),
  CHECK (field_ids <> '{}')
);

COMMENT ON CONSTRAINT table_fkey ON metaschema_public.check_constraint IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_public.check_constraint IS '@omit manyToMany';

CREATE INDEX check_constraint_table_id_idx ON metaschema_public.check_constraint (table_id);

CREATE INDEX check_constraint_database_id_idx ON metaschema_public.check_constraint (database_id);

CREATE FUNCTION metaschema_private.database_name_hash(name text) RETURNS bytea AS $EOFCODE$
  SELECT
    DECODE(MD5(LOWER(inflection.plural (name))), 'hex');
$EOFCODE$ LANGUAGE sql IMMUTABLE;

CREATE UNIQUE INDEX databases_database_unique_name_idx ON metaschema_public.database (owner_id, (metaschema_private.database_name_hash(name)));

CREATE TABLE metaschema_public.field (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL,
  name text NOT NULL,
  label text,
  description text,
  smart_tags jsonb,
  is_required boolean NOT NULL DEFAULT false,
  default_value text NULL DEFAULT NULL,
  default_value_ast jsonb NULL DEFAULT NULL,
  is_hidden boolean NOT NULL DEFAULT false,
  type citext NOT NULL,
  field_order int NOT NULL DEFAULT 0,
  regexp text DEFAULT NULL,
  chk jsonb DEFAULT NULL,
  chk_expr jsonb DEFAULT NULL,
  min double precision DEFAULT NULL,
  max double precision DEFAULT NULL,
  tags citext[] NOT NULL DEFAULT '{}',
  category metaschema_public.object_category NOT NULL DEFAULT 'app',
  module text NULL,
  scope int NULL,
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public."table" (id)
    ON DELETE CASCADE,
  UNIQUE (table_id, name)
);

COMMENT ON CONSTRAINT table_fkey ON metaschema_public.field IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_public.field IS '@omit manyToMany';

CREATE INDEX field_table_id_idx ON metaschema_public.field (table_id);

CREATE INDEX field_database_id_idx ON metaschema_public.field (database_id);

COMMENT ON COLUMN metaschema_public.field.default_value IS '@sqlExpression';

CREATE UNIQUE INDEX databases_field_uniq_names_idx ON metaschema_public.field (table_id, (decode(md5(lower(CASE 
  WHEN type = 'uuid' THEN regexp_replace(name, '^(.+?)(_row_id|_id|_uuid|_fk|_pk)$', E'\\1', 'i') 
  ELSE name 
END)), 'hex')));

CREATE TABLE metaschema_public.foreign_key_constraint (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL,
  name text,
  description text,
  smart_tags jsonb,
  type text,
  field_ids uuid[] NOT NULL,
  ref_table_id uuid NOT NULL REFERENCES metaschema_public."table" (id)
    ON DELETE CASCADE,
  ref_field_ids uuid[] NOT NULL,
  delete_action char(1) DEFAULT 'c',
  update_action char(1) DEFAULT 'a',
  category metaschema_public.object_category NOT NULL DEFAULT 'app',
  module text NULL,
  scope int NULL,
  tags citext[] NOT NULL DEFAULT '{}',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public."table" (id)
    ON DELETE CASCADE,
  UNIQUE (table_id, name),
  CHECK (field_ids <> '{}'),
  CHECK (ref_field_ids <> '{}')
);

COMMENT ON CONSTRAINT table_fkey ON metaschema_public.foreign_key_constraint IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_public.foreign_key_constraint IS '@omit manyToMany';

CREATE INDEX foreign_key_constraint_table_id_idx ON metaschema_public.foreign_key_constraint (table_id);

CREATE INDEX foreign_key_constraint_database_id_idx ON metaschema_public.foreign_key_constraint (database_id);

CREATE TABLE metaschema_public.full_text_search (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL,
  field_id uuid NOT NULL,
  field_ids uuid[] NOT NULL,
  weights text[] NOT NULL,
  langs text[] NOT NULL,
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public."table" (id)
    ON DELETE CASCADE,
  CHECK (
    cardinality(field_ids) = cardinality(weights)
      AND cardinality(weights) = cardinality(langs)
  )
);

COMMENT ON CONSTRAINT table_fkey ON metaschema_public.full_text_search IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_public.full_text_search IS '@omit manyToMany';

CREATE INDEX full_text_search_table_id_idx ON metaschema_public.full_text_search (table_id);

CREATE INDEX full_text_search_database_id_idx ON metaschema_public.full_text_search (database_id);

CREATE TABLE metaschema_public.index (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  table_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  field_ids uuid[],
  include_field_ids uuid[],
  access_method text NOT NULL DEFAULT 'BTREE',
  index_params jsonb,
  where_clause jsonb,
  is_unique boolean NOT NULL DEFAULT false,
  smart_tags jsonb,
  category metaschema_public.object_category NOT NULL DEFAULT 'app',
  module text NULL,
  scope int NULL,
  tags citext[] NOT NULL DEFAULT '{}',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public."table" (id)
    ON DELETE CASCADE,
  UNIQUE (database_id, name)
);

COMMENT ON CONSTRAINT table_fkey ON metaschema_public.index IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_public.index IS '@omit manyToMany';

CREATE INDEX index_table_id_idx ON metaschema_public.index (table_id);

CREATE INDEX index_database_id_idx ON metaschema_public.index (database_id);

CREATE TABLE metaschema_public.limit_function (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL,
  name text,
  label text,
  description text,
  data jsonb,
  security int DEFAULT 0,
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public."table" (id)
    ON DELETE CASCADE,
  UNIQUE (database_id, name)
);

COMMENT ON CONSTRAINT db_fkey ON metaschema_public.limit_function IS '@omit manyToMany';

COMMENT ON CONSTRAINT table_fkey ON metaschema_public.limit_function IS '@omit manyToMany';

CREATE INDEX limit_function_table_id_idx ON metaschema_public.limit_function (table_id);

CREATE INDEX limit_function_database_id_idx ON metaschema_public.limit_function (database_id);

CREATE TABLE metaschema_public.policy (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL,
  name text,
  role_name text,
  privilege text,
  permissive boolean DEFAULT true,
  disabled boolean DEFAULT false,
  policy_type text,
  data jsonb,
  smart_tags jsonb,
  category metaschema_public.object_category NOT NULL DEFAULT 'app',
  module text NULL,
  scope int NULL,
  tags citext[] NOT NULL DEFAULT '{}',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public."table" (id)
    ON DELETE CASCADE,
  UNIQUE (table_id, name)
);

COMMENT ON CONSTRAINT table_fkey ON metaschema_public.policy IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_public.policy IS '@omit manyToMany';

CREATE INDEX policy_table_id_idx ON metaschema_public.policy (table_id);

CREATE INDEX policy_database_id_idx ON metaschema_public.policy (database_id);

CREATE TABLE metaschema_public.primary_key_constraint (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL,
  name text,
  type text,
  field_ids uuid[] NOT NULL,
  smart_tags jsonb,
  category metaschema_public.object_category NOT NULL DEFAULT 'app',
  module text NULL,
  scope int NULL,
  tags citext[] NOT NULL DEFAULT '{}',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public."table" (id)
    ON DELETE CASCADE,
  UNIQUE (table_id, name),
  CHECK (field_ids <> '{}')
);

COMMENT ON CONSTRAINT table_fkey ON metaschema_public.primary_key_constraint IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_public.primary_key_constraint IS '@omit manyToMany';

CREATE INDEX primary_key_constraint_table_id_idx ON metaschema_public.primary_key_constraint (table_id);

CREATE INDEX primary_key_constraint_database_id_idx ON metaschema_public.primary_key_constraint (database_id);

CREATE TABLE metaschema_public.procedure (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL DEFAULT uuid_nil(),
  name text NOT NULL,
  argnames text[],
  argtypes text[],
  argdefaults text[],
  lang_name text,
  definition text,
  smart_tags jsonb,
  category metaschema_public.object_category NOT NULL DEFAULT 'app',
  module text NULL,
  scope int NULL,
  tags citext[] NOT NULL DEFAULT '{}',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  UNIQUE (database_id, name)
);

COMMENT ON CONSTRAINT db_fkey ON metaschema_public.procedure IS '@omit manyToMany';

CREATE INDEX procedure_database_id_idx ON metaschema_public.procedure (database_id);

CREATE TABLE metaschema_public.schema_grant (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL DEFAULT uuid_nil(),
  schema_id uuid NOT NULL,
  grantee_name text NOT NULL,
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_public.schema_grant IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_public.schema_grant IS '@omit manyToMany';

CREATE INDEX schema_grant_schema_id_idx ON metaschema_public.schema_grant (schema_id);

CREATE INDEX schema_grant_database_id_idx ON metaschema_public.schema_grant (database_id);

CREATE TABLE metaschema_public.table_grant (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL,
  privilege text NOT NULL,
  role_name text NOT NULL,
  field_ids uuid[],
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public."table" (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT table_fkey ON metaschema_public.table_grant IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_public.table_grant IS '@omit manyToMany';

CREATE INDEX table_grant_table_id_idx ON metaschema_public.table_grant (table_id);

CREATE INDEX table_grant_database_id_idx ON metaschema_public.table_grant (database_id);

CREATE FUNCTION metaschema_private.table_name_hash(name text) RETURNS bytea AS $EOFCODE$
  SELECT
    DECODE(MD5(LOWER(inflection.plural (name))), 'hex');
$EOFCODE$ LANGUAGE sql IMMUTABLE;

CREATE UNIQUE INDEX databases_table_unique_name_idx ON metaschema_public."table" (database_id, (metaschema_private.table_name_hash(name)));

CREATE TABLE metaschema_public.trigger_function (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  UNIQUE (database_id, name)
);

COMMENT ON CONSTRAINT db_fkey ON metaschema_public.trigger_function IS '@omit manyToMany';

CREATE INDEX trigger_function_database_id_idx ON metaschema_public.trigger_function (database_id);

CREATE TABLE metaschema_public.trigger (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL,
  name text NOT NULL,
  event text,
  function_name text,
  smart_tags jsonb,
  category metaschema_public.object_category NOT NULL DEFAULT 'app',
  module text NULL,
  scope int NULL,
  tags citext[] NOT NULL DEFAULT '{}',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public."table" (id)
    ON DELETE CASCADE,
  UNIQUE (table_id, name)
);

COMMENT ON CONSTRAINT table_fkey ON metaschema_public.trigger IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_public.trigger IS '@omit manyToMany';

CREATE INDEX trigger_table_id_idx ON metaschema_public.trigger (table_id);

CREATE INDEX trigger_database_id_idx ON metaschema_public.trigger (database_id);

CREATE TABLE metaschema_public.unique_constraint (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL,
  name text,
  description text,
  smart_tags jsonb,
  type text,
  field_ids uuid[] NOT NULL,
  category metaschema_public.object_category NOT NULL DEFAULT 'app',
  module text NULL,
  scope int NULL,
  tags citext[] NOT NULL DEFAULT '{}',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public."table" (id)
    ON DELETE CASCADE,
  UNIQUE (table_id, name),
  CHECK (field_ids <> '{}')
);

COMMENT ON CONSTRAINT table_fkey ON metaschema_public.unique_constraint IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_public.unique_constraint IS '@omit manyToMany';

CREATE INDEX unique_constraint_table_id_idx ON metaschema_public.unique_constraint (table_id);

CREATE INDEX unique_constraint_database_id_idx ON metaschema_public.unique_constraint (database_id);



-- Services Schema DDL

-- Deploy schemas/services_public/schema to pg


BEGIN;

CREATE SCHEMA services_public;

GRANT USAGE ON SCHEMA services_public TO authenticated;
GRANT USAGE ON SCHEMA services_public TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA services_public GRANT ALL ON TABLES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA services_public GRANT ALL ON SEQUENCES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA services_public GRANT ALL ON FUNCTIONS TO administrator;


COMMIT;


-- Deploy schemas/services_public/tables/apis/table to pg

-- requires: schemas/services_public/schema
-- requires: schemas/metaschema_public/tables/database/table 

BEGIN;

CREATE TABLE services_public.apis (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    database_id uuid NOT NULL,
    name text NOT NULL,
    dbname text NOT NULL DEFAULT current_database(),
    role_name text NOT NULL DEFAULT 'authenticated',
    anon_role text NOT NULL DEFAULT 'anonymous',
    is_public boolean NOT NULL DEFAULT true,

    --

    CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
    UNIQUE(database_id, name)
);

COMMENT ON CONSTRAINT db_fkey ON services_public.apis IS E'@omit manyToMany';
CREATE INDEX apis_database_id_idx ON services_public.apis ( database_id );

COMMIT;


-- Deploy schemas/services_public/tables/sites/table to pg

-- requires: schemas/services_public/schema
-- requires: schemas/metaschema_public/tables/database/table 

BEGIN;

CREATE TABLE services_public.sites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
  database_id uuid NOT NULL,
  title text,
  description text,
  og_image image,
  favicon attachment,
  apple_touch_icon image,
  logo image,
  
  -- do we need this?
  dbname text NOT NULL DEFAULT current_database(),

  --
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT max_title CHECK ( character_length(title) <= 120 ),
  CONSTRAINT max_descr CHECK ( character_length(description) <= 120 )
);

COMMENT ON CONSTRAINT db_fkey ON services_public.sites IS E'@omit manyToMany';
CREATE INDEX sites_database_id_idx ON services_public.sites ( database_id );

COMMIT;


-- Deploy schemas/services_public/tables/domains/table to pg

-- requires: schemas/services_public/schema
-- requires: schemas/services_public/tables/apis/table 
-- requires: schemas/services_public/tables/sites/table 
-- requires: schemas/metaschema_public/tables/database/table 

BEGIN;

CREATE TABLE services_public.domains (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    database_id uuid NOT NULL,
    
    api_id uuid,
    site_id uuid,

    subdomain hostname,
    domain hostname,

    --
    CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
    CONSTRAINT api_fkey FOREIGN KEY (api_id) REFERENCES services_public.apis (id) ON DELETE CASCADE,
    CONSTRAINT site_fkey FOREIGN KEY (site_id) REFERENCES services_public.sites (id) ON DELETE CASCADE,
    CONSTRAINT one_route_chk CHECK (
        (api_id IS NULL AND site_id IS NULL) OR
        (api_id IS NULL AND site_id IS NOT NULL) OR
        (api_id IS NOT NULL AND site_id IS NULL)
    ),
    UNIQUE ( subdomain, domain )
);

COMMENT ON CONSTRAINT db_fkey ON services_public.domains IS E'@omit manyToMany';
CREATE INDEX domains_database_id_idx ON services_public.domains ( database_id );

COMMENT ON CONSTRAINT api_fkey ON services_public.domains IS E'@omit manyToMany';
CREATE INDEX domains_api_id_idx ON services_public.domains ( api_id );

COMMENT ON CONSTRAINT site_fkey ON services_public.domains IS E'@omit manyToMany';
CREATE INDEX domains_site_id_idx ON services_public.domains ( site_id );

COMMIT;


-- Deploy schemas/services_public/tables/api_extensions/table to pg

-- requires: schemas/services_public/schema
-- requires: schemas/services_public/tables/apis/table
-- requires: schemas/metaschema_public/tables/database/table

BEGIN;

-- NOTE: not directly mapping to extensions on purpose, to make it simple for api usage

CREATE TABLE services_public.api_extensions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    schema_name text,
    database_id uuid NOT NULL,
    api_id uuid NOT NULL,

    --

    CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
    CONSTRAINT api_fkey FOREIGN KEY (api_id) REFERENCES services_public.apis (id) ON DELETE CASCADE,

    UNIQUE (schema_name, api_id)
);

-- WE DO WANT m2m!
-- COMMENT ON CONSTRAINT db_fkey ON services_public.api_extensions IS E'@omit manyToMany';
-- COMMENT ON CONSTRAINT api_fkey ON services_public.api_extensions IS E'@omit manyToMany';

CREATE INDEX api_extension_database_id_idx ON services_public.api_extensions ( database_id );
CREATE INDEX api_extension_api_id_idx ON services_public.api_extensions ( api_id );

COMMIT;


-- Deploy schemas/services_public/tables/api_schemas/table to pg

-- requires: schemas/services_public/schema

BEGIN;

CREATE TABLE services_public.api_schemas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL,
  api_id uuid NOT NULL,
  
  --

  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT schema_fkey FOREIGN KEY (schema_id) REFERENCES metaschema_public.schema (id) ON DELETE CASCADE,
  CONSTRAINT api_fkey FOREIGN KEY (api_id) REFERENCES services_public.apis (id) ON DELETE CASCADE,
  unique(api_id, schema_id)
);

-- COMMENT ON CONSTRAINT schema_fkey ON services_public.api_schemas IS E'@omit manyToMany';
-- COMMENT ON CONSTRAINT api_fkey ON services_public.api_schemas IS E'@omit manyToMany';
COMMENT ON CONSTRAINT db_fkey ON services_public.api_schemas IS E'@omit manyToMany';


CREATE INDEX api_schemas_database_id_idx ON services_public.api_schemas ( database_id );
CREATE INDEX api_schemas_schema_id_idx ON services_public.api_schemas ( schema_id );
CREATE INDEX api_schemas_api_id_idx ON services_public.api_schemas ( api_id );

COMMIT;


-- Deploy schemas/services_public/tables/api_modules/table to pg

-- requires: schemas/services_public/schema
-- requires: schemas/services_public/tables/apis/table 
-- requires: schemas/metaschema_public/tables/database/table 

BEGIN;

CREATE TABLE services_public.api_modules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    database_id uuid NOT NULL,
    api_id uuid NOT NULL,
    name text NOT NULL,
    data json NOT NULL,

    --

    CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE

);

ALTER TABLE services_public.api_modules ADD CONSTRAINT api_modules_api_id_fkey FOREIGN KEY ( api_id ) REFERENCES services_public.apis ( id );
COMMENT ON CONSTRAINT api_modules_api_id_fkey ON services_public.api_modules IS E'@omit manyToMany';
CREATE INDEX api_modules_api_id_idx ON services_public.api_modules ( api_id );

COMMENT ON CONSTRAINT db_fkey ON services_public.api_modules IS E'@omit manyToMany';
CREATE INDEX api_modules_database_id_idx ON services_public.api_modules ( database_id );


COMMIT;


-- Deploy schemas/services_public/tables/site_modules/table to pg

-- requires: schemas/services_public/schema
-- requires: schemas/services_public/tables/sites/table 
-- requires: schemas/metaschema_public/tables/database/table 

BEGIN;

CREATE TABLE services_public.site_modules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    database_id uuid NOT NULL,
    site_id uuid NOT NULL,
    name text NOT NULL,
    data json NOT NULL,

    --
    CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE
);

ALTER TABLE services_public.site_modules ADD CONSTRAINT site_modules_site_id_fkey FOREIGN KEY ( site_id ) REFERENCES services_public.sites ( id );
COMMENT ON CONSTRAINT site_modules_site_id_fkey ON services_public.site_modules IS E'@omit manyToMany';
CREATE INDEX site_modules_site_id_idx ON services_public.site_modules ( site_id );

COMMENT ON CONSTRAINT db_fkey ON services_public.site_modules IS E'@omit manyToMany';
CREATE INDEX site_modules_database_id_idx ON services_public.site_modules ( database_id );


COMMIT;


-- Deploy schemas/services_public/tables/site_metadata/table to pg

-- requires: schemas/services_public/schema
-- requires: schemas/services_public/tables/sites/table 
-- requires: schemas/metaschema_public/tables/database/table 

BEGIN;

CREATE TABLE services_public.site_metadata (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    database_id uuid NOT NULL,
    site_id uuid NOT NULL,
    title text,
    description text,
    og_image image,

    --

    CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,

    CHECK ( character_length(title) <= 120 ),
    CHECK ( character_length(description) <= 120 )
);


ALTER TABLE services_public.site_metadata ADD CONSTRAINT site_metadata_site_id_fkey FOREIGN KEY ( site_id ) REFERENCES services_public.sites ( id );
COMMENT ON CONSTRAINT site_metadata_site_id_fkey ON services_public.site_metadata IS E'@omit manyToMany';
CREATE INDEX site_metadata_site_id_idx ON services_public.site_metadata ( site_id );

COMMENT ON CONSTRAINT db_fkey ON services_public.site_metadata IS E'@omit manyToMany';
CREATE INDEX site_metadata_database_id_idx ON services_public.site_metadata ( database_id );

COMMIT;


-- Deploy schemas/services_public/tables/site_themes/table to pg

-- requires: schemas/services_public/schema
-- requires: schemas/services_public/tables/sites/table 
-- requires: schemas/metaschema_public/tables/database/table 

BEGIN;

CREATE TABLE services_public.site_themes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    database_id uuid NOT NULL,
    site_id uuid NOT NULL,
    theme jsonb NOT NULL,

    --

    CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE
);

ALTER TABLE services_public.site_themes ADD CONSTRAINT site_themes_site_id_fkey FOREIGN KEY ( site_id ) REFERENCES services_public.sites ( id );
COMMENT ON CONSTRAINT site_themes_site_id_fkey ON services_public.site_themes IS E'@omit manyToMany';
CREATE INDEX site_themes_site_id_idx ON services_public.site_themes ( site_id );

COMMENT ON CONSTRAINT db_fkey ON services_public.site_themes IS E'@omit manyToMany';
CREATE INDEX site_themes_database_id_idx ON services_public.site_themes ( database_id );

COMMIT;


-- Deploy schemas/services_public/tables/apps/table to pg

-- requires: schemas/services_public/schema
-- requires: schemas/services_public/tables/sites/table 
-- requires: schemas/metaschema_public/tables/database/table 

BEGIN;

CREATE TABLE services_public.apps (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
    database_id uuid NOT NULL,
    site_id uuid NOT NULL,
    name text,
    app_image image,
    app_store_link url,
    app_store_id text,
    app_id_prefix text,
    play_store_link url,

    --

    CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
    UNIQUE ( site_id )
);

ALTER TABLE services_public.apps ADD CONSTRAINT apps_site_id_fkey FOREIGN KEY ( site_id ) REFERENCES services_public.sites ( id );
COMMENT ON CONSTRAINT apps_site_id_fkey ON services_public.apps IS E'@omit manyToMany';
CREATE INDEX apps_site_id_idx ON services_public.apps ( site_id );

COMMENT ON CONSTRAINT db_fkey ON services_public.apps IS E'@omit manyToMany';
CREATE INDEX apps_database_id_idx ON services_public.apps ( database_id );


COMMIT;


-- Deploy schemas/services_private/schema to pg


BEGIN;

CREATE SCHEMA services_private;

GRANT USAGE ON SCHEMA services_private TO authenticated;
GRANT USAGE ON SCHEMA services_private TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA services_private GRANT ALL ON TABLES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA services_private GRANT ALL ON SEQUENCES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA services_private GRANT ALL ON FUNCTIONS TO administrator;

COMMIT;




-- Metaschema Modules Schema DDL

CREATE SCHEMA metaschema_modules_public;

GRANT USAGE ON SCHEMA metaschema_modules_public TO authenticated;

GRANT USAGE ON SCHEMA metaschema_modules_public TO administrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_modules_public
  GRANT ALL ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_modules_public
  GRANT ALL ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_modules_public
  GRANT ALL ON FUNCTIONS TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_modules_public
  GRANT ALL ON TABLES TO administrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_modules_public
  GRANT ALL ON SEQUENCES TO administrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_modules_public
  GRANT ALL ON FUNCTIONS TO administrator;

CREATE TABLE metaschema_modules_public.connected_accounts_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  private_schema_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL DEFAULT uuid_nil(),
  owner_table_id uuid NOT NULL DEFAULT uuid_nil(),
  table_name text NOT NULL,
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT owner_table_fkey
    FOREIGN KEY(owner_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT private_schema_fkey
    FOREIGN KEY(private_schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.connected_accounts_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT private_schema_fkey ON metaschema_modules_public.connected_accounts_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT table_fkey ON metaschema_modules_public.connected_accounts_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT owner_table_fkey ON metaschema_modules_public.connected_accounts_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.connected_accounts_module IS '@omit manyToMany';

CREATE INDEX connected_accounts_module_database_id_idx ON metaschema_modules_public.connected_accounts_module (database_id);

CREATE TABLE metaschema_modules_public.crypto_addresses_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  private_schema_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL DEFAULT uuid_nil(),
  owner_table_id uuid NOT NULL DEFAULT uuid_nil(),
  table_name text NOT NULL,
  crypto_network text NOT NULL DEFAULT 'BTC',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT owner_table_fkey
    FOREIGN KEY(owner_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT private_schema_fkey
    FOREIGN KEY(private_schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.crypto_addresses_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT private_schema_fkey ON metaschema_modules_public.crypto_addresses_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT table_fkey ON metaschema_modules_public.crypto_addresses_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT owner_table_fkey ON metaschema_modules_public.crypto_addresses_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.crypto_addresses_module IS '@omit manyToMany';

CREATE INDEX crypto_addresses_module_database_id_idx ON metaschema_modules_public.crypto_addresses_module (database_id);

CREATE TABLE metaschema_modules_public.crypto_auth_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  users_table_id uuid NOT NULL DEFAULT uuid_nil(),
  tokens_table_id uuid NOT NULL DEFAULT uuid_nil(),
  secrets_table_id uuid NOT NULL DEFAULT uuid_nil(),
  addresses_table_id uuid NOT NULL DEFAULT uuid_nil(),
  user_field text NOT NULL,
  crypto_network text NOT NULL DEFAULT 'BTC',
  sign_in_request_challenge text NOT NULL DEFAULT 'sign_in_request_challenge',
  sign_in_record_failure text NOT NULL DEFAULT 'sign_in_record_failure',
  sign_up_with_key text NOT NULL DEFAULT 'sign_up_with_key',
  sign_in_with_challenge text NOT NULL DEFAULT 'sign_in_with_challenge',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT secrets_table_fkey
    FOREIGN KEY(secrets_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT users_table_fkey
    FOREIGN KEY(users_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT tokens_table_fkey
    FOREIGN KEY(tokens_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.crypto_auth_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT secrets_table_fkey ON metaschema_modules_public.crypto_auth_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT users_table_fkey ON metaschema_modules_public.crypto_auth_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT tokens_table_fkey ON metaschema_modules_public.crypto_auth_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.crypto_auth_module IS '@omit manyToMany';

CREATE INDEX crypto_auth_module_database_id_idx ON metaschema_modules_public.crypto_auth_module (database_id);

CREATE TABLE metaschema_modules_public.default_ids_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.default_ids_module IS '@omit manyToMany';

CREATE INDEX default_ids_module_database_id_idx ON metaschema_modules_public.default_ids_module (database_id);

CREATE TABLE metaschema_modules_public.denormalized_table_field (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  table_id uuid NOT NULL,
  field_id uuid NOT NULL,
  set_ids uuid[],
  ref_table_id uuid NOT NULL,
  ref_field_id uuid NOT NULL,
  ref_ids uuid[],
  use_updates bool NOT NULL DEFAULT true,
  update_defaults bool NOT NULL DEFAULT true,
  func_name text NULL,
  func_order int NOT NULL DEFAULT 0,
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT ref_table_fkey
    FOREIGN KEY(ref_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT field_fkey
    FOREIGN KEY(field_id)
    REFERENCES metaschema_public.field (id)
    ON DELETE CASCADE,
  CONSTRAINT ref_field_fkey
    FOREIGN KEY(ref_field_id)
    REFERENCES metaschema_public.field (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.denormalized_table_field IS '@omit manyToMany';

COMMENT ON CONSTRAINT table_fkey ON metaschema_modules_public.denormalized_table_field IS '@omit manyToMany';

COMMENT ON CONSTRAINT ref_table_fkey ON metaschema_modules_public.denormalized_table_field IS '@omit manyToMany';

COMMENT ON CONSTRAINT field_fkey ON metaschema_modules_public.denormalized_table_field IS '@omit manyToMany';

COMMENT ON CONSTRAINT ref_field_fkey ON metaschema_modules_public.denormalized_table_field IS '@omit manyToMany';

CREATE INDEX denormalized_table_field_database_id_idx ON metaschema_modules_public.denormalized_table_field (database_id);

CREATE TABLE metaschema_modules_public.emails_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  private_schema_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL DEFAULT uuid_nil(),
  owner_table_id uuid NOT NULL DEFAULT uuid_nil(),
  table_name text NOT NULL,
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT owner_table_fkey
    FOREIGN KEY(owner_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT private_schema_fkey
    FOREIGN KEY(private_schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.emails_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT private_schema_fkey ON metaschema_modules_public.emails_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT table_fkey ON metaschema_modules_public.emails_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT owner_table_fkey ON metaschema_modules_public.emails_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.emails_module IS '@omit manyToMany';

CREATE INDEX emails_module_database_id_idx ON metaschema_modules_public.emails_module (database_id);

CREATE TABLE metaschema_modules_public.encrypted_secrets_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL DEFAULT uuid_nil(),
  table_name text NOT NULL DEFAULT 'encrypted_secrets',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.encrypted_secrets_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.encrypted_secrets_module IS '@omit manyToMany';

CREATE INDEX encrypted_secrets_module_database_id_idx ON metaschema_modules_public.encrypted_secrets_module (database_id);

COMMENT ON CONSTRAINT table_fkey ON metaschema_modules_public.encrypted_secrets_module IS '@omit manyToMany';

CREATE TABLE metaschema_modules_public.field_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  private_schema_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL DEFAULT uuid_nil(),
  field_id uuid NOT NULL DEFAULT uuid_nil(),
  data jsonb NOT NULL DEFAULT '{}',
  triggers text[],
  functions text[],
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT field_fkey
    FOREIGN KEY(field_id)
    REFERENCES metaschema_public.field (id)
    ON DELETE CASCADE,
  CONSTRAINT private_schema_fkey
    FOREIGN KEY(private_schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT private_schema_fkey ON metaschema_modules_public.field_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT table_fkey ON metaschema_modules_public.field_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT field_fkey ON metaschema_modules_public.field_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.field_module IS '@omit manyToMany';

CREATE INDEX field_module_database_id_idx ON metaschema_modules_public.field_module (database_id);

CREATE TABLE metaschema_modules_public.invites_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  private_schema_id uuid NOT NULL DEFAULT uuid_nil(),
  emails_table_id uuid NOT NULL DEFAULT uuid_nil(),
  users_table_id uuid NOT NULL DEFAULT uuid_nil(),
  invites_table_id uuid NOT NULL DEFAULT uuid_nil(),
  claimed_invites_table_id uuid NOT NULL DEFAULT uuid_nil(),
  invites_table_name text NOT NULL DEFAULT '',
  claimed_invites_table_name text NOT NULL DEFAULT '',
  submit_invite_code_function text NOT NULL DEFAULT '',
  prefix text NULL,
  membership_type int NOT NULL,
  entity_table_id uuid NULL,
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT invites_table_fkey
    FOREIGN KEY(invites_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT emails_table_fkey
    FOREIGN KEY(emails_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT users_table_fkey
    FOREIGN KEY(users_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT entity_table_fkey
    FOREIGN KEY(entity_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT claimed_invites_table_fkey
    FOREIGN KEY(claimed_invites_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT pschema_fkey
    FOREIGN KEY(private_schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.invites_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT emails_table_fkey ON metaschema_modules_public.invites_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT users_table_fkey ON metaschema_modules_public.invites_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT invites_table_fkey ON metaschema_modules_public.invites_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT claimed_invites_table_fkey ON metaschema_modules_public.invites_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.invites_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT pschema_fkey ON metaschema_modules_public.invites_module IS '@omit manyToMany';

CREATE INDEX invites_module_database_id_idx ON metaschema_modules_public.invites_module (database_id);

CREATE TABLE metaschema_modules_public.levels_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  private_schema_id uuid NOT NULL DEFAULT uuid_nil(),
  steps_table_id uuid NOT NULL DEFAULT uuid_nil(),
  steps_table_name text NOT NULL DEFAULT '',
  achievements_table_id uuid NOT NULL DEFAULT uuid_nil(),
  achievements_table_name text NOT NULL DEFAULT '',
  levels_table_id uuid NOT NULL DEFAULT uuid_nil(),
  levels_table_name text NOT NULL DEFAULT '',
  level_requirements_table_id uuid NOT NULL DEFAULT uuid_nil(),
  level_requirements_table_name text NOT NULL DEFAULT '',
  completed_step text NOT NULL DEFAULT '',
  incompleted_step text NOT NULL DEFAULT '',
  tg_achievement text NOT NULL DEFAULT '',
  tg_achievement_toggle text NOT NULL DEFAULT '',
  tg_achievement_toggle_boolean text NOT NULL DEFAULT '',
  tg_achievement_boolean text NOT NULL DEFAULT '',
  upsert_achievement text NOT NULL DEFAULT '',
  tg_update_achievements text NOT NULL DEFAULT '',
  steps_required text NOT NULL DEFAULT '',
  level_achieved text NOT NULL DEFAULT '',
  prefix text NULL,
  membership_type int NOT NULL,
  entity_table_id uuid NULL,
  actor_table_id uuid NOT NULL DEFAULT uuid_nil(),
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT private_schema_fkey
    FOREIGN KEY(private_schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT steps_table_fkey
    FOREIGN KEY(steps_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT achievements_table_fkey
    FOREIGN KEY(achievements_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT levels_table_fkey
    FOREIGN KEY(levels_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT level_requirements_table_fkey
    FOREIGN KEY(level_requirements_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT entity_table_fkey
    FOREIGN KEY(entity_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT actor_table_fkey
    FOREIGN KEY(actor_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.levels_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.levels_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT steps_table_fkey ON metaschema_modules_public.levels_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT achievements_table_fkey ON metaschema_modules_public.levels_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT levels_table_fkey ON metaschema_modules_public.levels_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT level_requirements_table_fkey ON metaschema_modules_public.levels_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT actor_table_fkey ON metaschema_modules_public.levels_module IS '@omit manyToMany';

CREATE INDEX user_status_module_database_id_idx ON metaschema_modules_public.levels_module (database_id);

CREATE TABLE metaschema_modules_public.limits_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  private_schema_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL DEFAULT uuid_nil(),
  table_name text NOT NULL DEFAULT '',
  default_table_id uuid NOT NULL DEFAULT uuid_nil(),
  default_table_name text NOT NULL DEFAULT '',
  limit_increment_function text NOT NULL DEFAULT '',
  limit_decrement_function text NOT NULL DEFAULT '',
  limit_increment_trigger text NOT NULL DEFAULT '',
  limit_decrement_trigger text NOT NULL DEFAULT '',
  limit_update_trigger text NOT NULL DEFAULT '',
  limit_check_function text NOT NULL DEFAULT '',
  prefix text NULL,
  membership_type int NOT NULL,
  entity_table_id uuid NULL,
  actor_table_id uuid NOT NULL DEFAULT uuid_nil(),
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT private_schema_fkey
    FOREIGN KEY(private_schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT default_table_fkey
    FOREIGN KEY(default_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT entity_table_fkey
    FOREIGN KEY(entity_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT actor_table_fkey
    FOREIGN KEY(actor_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.limits_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT private_schema_fkey ON metaschema_modules_public.limits_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.limits_module IS '@omit manyToMany';

CREATE INDEX limits_module_database_id_idx ON metaschema_modules_public.limits_module (database_id);

COMMENT ON CONSTRAINT table_fkey ON metaschema_modules_public.limits_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT default_table_fkey ON metaschema_modules_public.limits_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT actor_table_fkey ON metaschema_modules_public.limits_module IS '@omit manyToMany';

CREATE TABLE metaschema_modules_public.membership_types_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL DEFAULT uuid_nil(),
  table_name text NOT NULL DEFAULT 'membership_types',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.membership_types_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.membership_types_module IS '@omit manyToMany';

CREATE INDEX membership_types_module_database_id_idx ON metaschema_modules_public.membership_types_module (database_id);

COMMENT ON CONSTRAINT table_fkey ON metaschema_modules_public.membership_types_module IS '@omit manyToMany';

CREATE TABLE metaschema_modules_public.memberships_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  private_schema_id uuid NOT NULL DEFAULT uuid_nil(),
  memberships_table_id uuid NOT NULL DEFAULT uuid_nil(),
  memberships_table_name text NOT NULL DEFAULT '',
  members_table_id uuid NOT NULL DEFAULT uuid_nil(),
  members_table_name text NOT NULL DEFAULT '',
  membership_defaults_table_id uuid NOT NULL DEFAULT uuid_nil(),
  membership_defaults_table_name text NOT NULL DEFAULT '',
  grants_table_id uuid NOT NULL DEFAULT uuid_nil(),
  grants_table_name text NOT NULL DEFAULT '',
  actor_table_id uuid NOT NULL DEFAULT uuid_nil(),
  limits_table_id uuid NOT NULL DEFAULT uuid_nil(),
  default_limits_table_id uuid NOT NULL DEFAULT uuid_nil(),
  permissions_table_id uuid NOT NULL DEFAULT uuid_nil(),
  default_permissions_table_id uuid NOT NULL DEFAULT uuid_nil(),
  sprt_table_id uuid NOT NULL DEFAULT uuid_nil(),
  admin_grants_table_id uuid NOT NULL DEFAULT uuid_nil(),
  admin_grants_table_name text NOT NULL DEFAULT '',
  owner_grants_table_id uuid NOT NULL DEFAULT uuid_nil(),
  owner_grants_table_name text NOT NULL DEFAULT '',
  membership_type int NOT NULL,
  entity_table_id uuid NULL,
  entity_table_owner_id uuid NULL,
  prefix text NULL,
  actor_mask_check text NOT NULL DEFAULT '',
  actor_perm_check text NOT NULL DEFAULT '',
  entity_ids_by_mask text NULL,
  entity_ids_by_perm text NULL,
  entity_ids_function text NULL,
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT private_schema_fkey
    FOREIGN KEY(private_schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT memberships_table_fkey
    FOREIGN KEY(memberships_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT membership_defaults_table_fkey
    FOREIGN KEY(membership_defaults_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT members_table_fkey
    FOREIGN KEY(members_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT grants_table_fkey
    FOREIGN KEY(grants_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT sprt_table_fkey
    FOREIGN KEY(sprt_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT entity_table_fkey
    FOREIGN KEY(entity_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT entity_table_owner_fkey
    FOREIGN KEY(entity_table_owner_id)
    REFERENCES metaschema_public.field (id)
    ON DELETE CASCADE,
  CONSTRAINT actor_table_fkey
    FOREIGN KEY(actor_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT limits_table_fkey
    FOREIGN KEY(limits_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT default_limits_table_fkey
    FOREIGN KEY(default_limits_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT permissions_table_fkey
    FOREIGN KEY(permissions_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT default_permissions_table_fkey
    FOREIGN KEY(default_permissions_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.memberships_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT private_schema_fkey ON metaschema_modules_public.memberships_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.memberships_module IS '@omit manyToMany';

CREATE INDEX memberships_module_database_id_idx ON metaschema_modules_public.memberships_module (database_id);

COMMENT ON CONSTRAINT entity_table_fkey ON metaschema_modules_public.memberships_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT entity_table_owner_fkey ON metaschema_modules_public.memberships_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT memberships_table_fkey ON metaschema_modules_public.memberships_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT members_table_fkey ON metaschema_modules_public.memberships_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT membership_defaults_table_fkey ON metaschema_modules_public.memberships_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT grants_table_fkey ON metaschema_modules_public.memberships_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT sprt_table_fkey ON metaschema_modules_public.memberships_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT actor_table_fkey ON metaschema_modules_public.memberships_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT limits_table_fkey ON metaschema_modules_public.memberships_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT default_limits_table_fkey ON metaschema_modules_public.memberships_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT permissions_table_fkey ON metaschema_modules_public.memberships_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT default_permissions_table_fkey ON metaschema_modules_public.memberships_module IS '@omit manyToMany';

CREATE TABLE metaschema_modules_public.permissions_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  private_schema_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL DEFAULT uuid_nil(),
  table_name text NOT NULL DEFAULT '',
  default_table_id uuid NOT NULL DEFAULT uuid_nil(),
  default_table_name text NOT NULL DEFAULT '',
  bitlen int NOT NULL DEFAULT 24,
  membership_type int NOT NULL,
  entity_table_id uuid NULL,
  actor_table_id uuid NOT NULL DEFAULT uuid_nil(),
  prefix text NULL,
  get_padded_mask text NOT NULL DEFAULT '',
  get_mask text NOT NULL DEFAULT '',
  get_by_mask text NOT NULL DEFAULT '',
  get_mask_by_name text NOT NULL DEFAULT '',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT private_schema_fkey
    FOREIGN KEY(private_schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT default_table_fkey
    FOREIGN KEY(default_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT entity_table_fkey
    FOREIGN KEY(entity_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT actor_table_fkey
    FOREIGN KEY(actor_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.permissions_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT private_schema_fkey ON metaschema_modules_public.permissions_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.permissions_module IS '@omit manyToMany';

CREATE INDEX permissions_module_database_id_idx ON metaschema_modules_public.permissions_module (database_id);

COMMENT ON CONSTRAINT table_fkey ON metaschema_modules_public.permissions_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT default_table_fkey ON metaschema_modules_public.permissions_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT actor_table_fkey ON metaschema_modules_public.permissions_module IS '@omit manyToMany';

CREATE TABLE metaschema_modules_public.phone_numbers_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  private_schema_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL DEFAULT uuid_nil(),
  owner_table_id uuid NOT NULL DEFAULT uuid_nil(),
  table_name text NOT NULL,
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT owner_table_fkey
    FOREIGN KEY(owner_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT private_schema_fkey
    FOREIGN KEY(private_schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.phone_numbers_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT private_schema_fkey ON metaschema_modules_public.phone_numbers_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT table_fkey ON metaschema_modules_public.phone_numbers_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT owner_table_fkey ON metaschema_modules_public.phone_numbers_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.phone_numbers_module IS '@omit manyToMany';

CREATE INDEX phone_numbers_module_database_id_idx ON metaschema_modules_public.phone_numbers_module (database_id);

CREATE TABLE metaschema_modules_public.profiles_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  private_schema_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL DEFAULT uuid_nil(),
  table_name text NOT NULL DEFAULT '',
  profile_permissions_table_id uuid NOT NULL DEFAULT uuid_nil(),
  profile_permissions_table_name text NOT NULL DEFAULT '',
  profile_grants_table_id uuid NOT NULL DEFAULT uuid_nil(),
  profile_grants_table_name text NOT NULL DEFAULT '',
  profile_definition_grants_table_id uuid NOT NULL DEFAULT uuid_nil(),
  profile_definition_grants_table_name text NOT NULL DEFAULT '',
  bitlen int NOT NULL DEFAULT 24,
  membership_type int NOT NULL,
  entity_table_id uuid NULL,
  actor_table_id uuid NOT NULL DEFAULT uuid_nil(),
  permissions_table_id uuid NOT NULL DEFAULT uuid_nil(),
  memberships_table_id uuid NOT NULL DEFAULT uuid_nil(),
  prefix text NULL,
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT private_schema_fkey
    FOREIGN KEY(private_schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT profile_permissions_table_fkey
    FOREIGN KEY(profile_permissions_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT profile_grants_table_fkey
    FOREIGN KEY(profile_grants_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT profile_definition_grants_table_fkey
    FOREIGN KEY(profile_definition_grants_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT entity_table_fkey
    FOREIGN KEY(entity_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT actor_table_fkey
    FOREIGN KEY(actor_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT permissions_table_fkey
    FOREIGN KEY(permissions_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT memberships_table_fkey
    FOREIGN KEY(memberships_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT profiles_module_unique 
    UNIQUE (database_id, membership_type)
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.profiles_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT private_schema_fkey ON metaschema_modules_public.profiles_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.profiles_module IS '@omit manyToMany';

CREATE INDEX profiles_module_database_id_idx ON metaschema_modules_public.profiles_module (database_id);

COMMENT ON CONSTRAINT table_fkey ON metaschema_modules_public.profiles_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT profile_permissions_table_fkey ON metaschema_modules_public.profiles_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT profile_grants_table_fkey ON metaschema_modules_public.profiles_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT profile_definition_grants_table_fkey ON metaschema_modules_public.profiles_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT entity_table_fkey ON metaschema_modules_public.profiles_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT actor_table_fkey ON metaschema_modules_public.profiles_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT permissions_table_fkey ON metaschema_modules_public.profiles_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT memberships_table_fkey ON metaschema_modules_public.profiles_module IS '@omit manyToMany';

CREATE TABLE metaschema_modules_public.rls_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  api_id uuid NOT NULL DEFAULT uuid_nil(),
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  private_schema_id uuid NOT NULL DEFAULT uuid_nil(),
  tokens_table_id uuid NOT NULL DEFAULT uuid_nil(),
  users_table_id uuid NOT NULL DEFAULT uuid_nil(),
  authenticate text NOT NULL DEFAULT 'authenticate',
  authenticate_strict text NOT NULL DEFAULT 'authenticate_strict',
  "current_role" text NOT NULL DEFAULT 'current_user',
  current_role_id text NOT NULL DEFAULT 'current_user_id',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT api_fkey
    FOREIGN KEY(api_id)
    REFERENCES services_public.apis (id)
    ON DELETE CASCADE,
  CONSTRAINT tokens_table_fkey
    FOREIGN KEY(tokens_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT users_table_fkey
    FOREIGN KEY(users_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT pschema_fkey
    FOREIGN KEY(private_schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT api_id_uniq 
    UNIQUE (api_id)
);

COMMENT ON CONSTRAINT api_fkey ON metaschema_modules_public.rls_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.rls_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT pschema_fkey ON metaschema_modules_public.rls_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.rls_module IS '@omit';

COMMENT ON CONSTRAINT tokens_table_fkey ON metaschema_modules_public.rls_module IS '@omit';

COMMENT ON CONSTRAINT users_table_fkey ON metaschema_modules_public.rls_module IS '@omit';

CREATE INDEX rls_module_database_id_idx ON metaschema_modules_public.rls_module (database_id);

CREATE TABLE metaschema_modules_public.secrets_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL DEFAULT uuid_nil(),
  table_name text NOT NULL DEFAULT 'secrets',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.secrets_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.secrets_module IS '@omit manyToMany';

CREATE INDEX secrets_module_database_id_idx ON metaschema_modules_public.secrets_module (database_id);

COMMENT ON CONSTRAINT table_fkey ON metaschema_modules_public.secrets_module IS '@omit manyToMany';

CREATE TABLE metaschema_modules_public.tokens_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL DEFAULT uuid_nil(),
  owned_table_id uuid NOT NULL DEFAULT uuid_nil(),
  tokens_default_expiration interval NOT NULL DEFAULT '3 days'::interval,
  tokens_table text NOT NULL DEFAULT 'api_tokens',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT owned_table_fkey
    FOREIGN KEY(owned_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.tokens_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.tokens_module IS '@omit manyToMany';

CREATE INDEX tokens_module_database_id_idx ON metaschema_modules_public.tokens_module (database_id);

COMMENT ON CONSTRAINT owned_table_fkey ON metaschema_modules_public.tokens_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT table_fkey ON metaschema_modules_public.tokens_module IS '@omit manyToMany';

CREATE TABLE metaschema_modules_public.user_auth_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  emails_table_id uuid NOT NULL DEFAULT uuid_nil(),
  users_table_id uuid NOT NULL DEFAULT uuid_nil(),
  secrets_table_id uuid NOT NULL DEFAULT uuid_nil(),
  encrypted_table_id uuid NOT NULL DEFAULT uuid_nil(),
  tokens_table_id uuid NOT NULL DEFAULT uuid_nil(),
  audits_table_id uuid NOT NULL DEFAULT uuid_nil(),
  audits_table_name text NOT NULL DEFAULT 'audit_logs',
  sign_in_function text NOT NULL DEFAULT 'sign_in',
  sign_up_function text NOT NULL DEFAULT 'sign_up',
  sign_out_function text NOT NULL DEFAULT 'sign_out',
  set_password_function text NOT NULL DEFAULT 'set_password',
  reset_password_function text NOT NULL DEFAULT 'reset_password',
  forgot_password_function text NOT NULL DEFAULT 'forgot_password',
  send_verification_email_function text NOT NULL DEFAULT 'send_verification_email',
  verify_email_function text NOT NULL DEFAULT 'verify_email',
  verify_password_function text NOT NULL DEFAULT 'verify_password',
  check_password_function text NOT NULL DEFAULT 'check_password',
  send_account_deletion_email_function text NOT NULL DEFAULT 'send_account_deletion_email',
  delete_account_function text NOT NULL DEFAULT 'confirm_delete_account',
  sign_in_one_time_token_function text NOT NULL DEFAULT 'sign_in_one_time_token',
  one_time_token_function text NOT NULL DEFAULT 'one_time_token',
  extend_token_expires text NOT NULL DEFAULT 'extend_token_expires',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT email_table_fkey
    FOREIGN KEY(emails_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT users_table_fkey
    FOREIGN KEY(users_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT secrets_table_fkey
    FOREIGN KEY(secrets_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT encrypted_table_fkey
    FOREIGN KEY(encrypted_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT tokens_table_fkey
    FOREIGN KEY(tokens_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.user_auth_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.user_auth_module IS '@omit manyToMany';

CREATE INDEX user_auth_module_database_id_idx ON metaschema_modules_public.user_auth_module (database_id);

COMMENT ON CONSTRAINT email_table_fkey ON metaschema_modules_public.user_auth_module IS '@omit';

COMMENT ON CONSTRAINT users_table_fkey ON metaschema_modules_public.user_auth_module IS '@omit';

COMMENT ON CONSTRAINT secrets_table_fkey ON metaschema_modules_public.user_auth_module IS '@omit';

COMMENT ON CONSTRAINT encrypted_table_fkey ON metaschema_modules_public.user_auth_module IS '@omit';

COMMENT ON CONSTRAINT tokens_table_fkey ON metaschema_modules_public.user_auth_module IS '@omit';

CREATE TABLE metaschema_modules_public.users_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  table_id uuid NOT NULL DEFAULT uuid_nil(),
  table_name text NOT NULL DEFAULT 'users',
  type_table_id uuid NOT NULL DEFAULT uuid_nil(),
  type_table_name text NOT NULL DEFAULT 'role_types',
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT table_fkey
    FOREIGN KEY(table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT type_table_fkey
    FOREIGN KEY(type_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.users_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.users_module IS '@omit manyToMany';

CREATE INDEX users_module_database_id_idx ON metaschema_modules_public.users_module (database_id);

COMMENT ON CONSTRAINT table_fkey ON metaschema_modules_public.users_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT type_table_fkey ON metaschema_modules_public.users_module IS '@omit manyToMany';

CREATE TABLE metaschema_modules_public.uuid_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  uuid_function text NOT NULL DEFAULT 'uuid_generate_v4',
  uuid_seed text NOT NULL,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE
);

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.uuid_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.uuid_module IS '@omit manyToMany';

CREATE INDEX uuid_module_database_id_idx ON metaschema_modules_public.uuid_module (database_id);

CREATE TABLE metaschema_modules_public.hierarchy_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  private_schema_id uuid NOT NULL DEFAULT uuid_nil(),
  chart_edges_table_id uuid NOT NULL DEFAULT uuid_nil(),
  chart_edges_table_name text NOT NULL DEFAULT '',
  hierarchy_sprt_table_id uuid NOT NULL DEFAULT uuid_nil(),
  hierarchy_sprt_table_name text NOT NULL DEFAULT '',
  chart_edge_grants_table_id uuid NOT NULL DEFAULT uuid_nil(),
  chart_edge_grants_table_name text NOT NULL DEFAULT '',
  entity_table_id uuid NOT NULL,
  users_table_id uuid NOT NULL,
  prefix text NOT NULL DEFAULT 'org',
  private_schema_name text NOT NULL DEFAULT '',
  sprt_table_name text NOT NULL DEFAULT '',
  rebuild_hierarchy_function text NOT NULL DEFAULT '',
  get_subordinates_function text NOT NULL DEFAULT '',
  get_managers_function text NOT NULL DEFAULT '',
  is_manager_of_function text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT db_fkey
    FOREIGN KEY(database_id)
    REFERENCES metaschema_public.database (id)
    ON DELETE CASCADE,
  CONSTRAINT schema_fkey
    FOREIGN KEY(schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT private_schema_fkey
    FOREIGN KEY(private_schema_id)
    REFERENCES metaschema_public.schema (id)
    ON DELETE CASCADE,
  CONSTRAINT chart_edges_table_fkey
    FOREIGN KEY(chart_edges_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT hierarchy_sprt_table_fkey
    FOREIGN KEY(hierarchy_sprt_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT chart_edge_grants_table_fkey
    FOREIGN KEY(chart_edge_grants_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT entity_table_fkey
    FOREIGN KEY(entity_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT users_table_fkey
    FOREIGN KEY(users_table_id)
    REFERENCES metaschema_public.table (id)
    ON DELETE CASCADE,
  CONSTRAINT hierarchy_module_database_unique 
    UNIQUE (database_id)
);

COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.hierarchy_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT private_schema_fkey ON metaschema_modules_public.hierarchy_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.hierarchy_module IS '@omit manyToMany';

CREATE INDEX hierarchy_module_database_id_idx ON metaschema_modules_public.hierarchy_module (database_id);

COMMENT ON CONSTRAINT chart_edges_table_fkey ON metaschema_modules_public.hierarchy_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT hierarchy_sprt_table_fkey ON metaschema_modules_public.hierarchy_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT chart_edge_grants_table_fkey ON metaschema_modules_public.hierarchy_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT entity_table_fkey ON metaschema_modules_public.hierarchy_module IS '@omit manyToMany';

COMMENT ON CONSTRAINT users_table_fkey ON metaschema_modules_public.hierarchy_module IS '@omit manyToMany';



-- Simple Seed Schema DDL

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



-- Simple Seed Services Data

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
  '6d264733-40be-4214-0c97-c3dbe8ba3b05',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'public',
  'simple-pets-public',
  NULL,
  true
),
(
  '6d26be55-2885-41de-0bb0-98e7f37d4cc8',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'private',
  'simple-pets-private',
  NULL,
  false
),
(
  '6d263af4-8431-4454-0f8b-301a421fd6cc',
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
  '6d2610a4-5dd9-4b3b-ce27-ddaec2693ec9',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6d263af4-8431-4454-0f8b-301a421fd6cc',
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
  '6d269e83-be3c-4727-1c8e-1cbcfbb38bdd',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6d2610a4-5dd9-4b3b-ce27-ddaec2693ec9',
  'id',
  'uuid',
  NULL
),
(
  '6d26cf32-2366-494a-0454-173d8c92d26e',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6d2610a4-5dd9-4b3b-ce27-ddaec2693ec9',
  'name',
  'text',
  NULL
),
(
  '6d26d7fa-0578-4722-cc86-1cd2f4520d1a',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6d2610a4-5dd9-4b3b-ce27-ddaec2693ec9',
  'species',
  'text',
  NULL
),
(
  '6d263700-f043-43ce-b0fd-e9c4fdb21e6d',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6d2610a4-5dd9-4b3b-ce27-ddaec2693ec9',
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
  '6d269670-578d-433d-efac-18eab9153236',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6d2610a4-5dd9-4b3b-ce27-ddaec2693ec9',
  'animals_pkey',
  'p',
  '{6d269e83-be3c-4727-1c8e-1cbcfbb38bdd}'
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
  '6d26af64-0dc6-45c9-ff25-d46ad858085f',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6d2610a4-5dd9-4b3b-ce27-ddaec2693ec9',
  'animals_name_chk',
  'c',
  '{6d26cf32-2366-494a-0454-173d8c92d26e}',
  '{"A_Expr":{"kind":"AEXPR_OP","name":[{"String":{"sval":"<="}}],"lexpr":{"FuncCall":{"args":[{"ColumnRef":{"fields":[{"String":{"sval":"name"}}]}}],"funcname":[{"String":{"sval":"character_length"}}]}},"rexpr":{"A_Const":{"ival":256}}}}'
),
(
  '6d268780-04ee-4608-ee79-1f43a8576058',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6d2610a4-5dd9-4b3b-ce27-ddaec2693ec9',
  'animals_species_chk',
  'c',
  '{6d26d7fa-0578-4722-cc86-1cd2f4520d1a}',
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
  '7dd64225-5042-42bc-ab70-c72582caf543',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  NULL,
  '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
  'constructive.io',
  'app.test'
),
(
  '0cf41fbf-6e7a-4ee2-a19b-b47ca5bf2b15',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  NULL,
  'e257c53d-6ba6-40de-b679-61b37188a316',
  'constructive.io',
  'private.test'
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
  'db-0bbfdf18-0688-4474-b728-c1f63c656fa6',
  true,
  'authenticated',
  'anonymous'
),
(
  'cc1e8389-e69d-4e12-9089-a98bf11fc75f',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'admin',
  'db-0bbfdf18-0688-4474-b728-c1f63c656fa6',
  true,
  'authenticated',
  'anonymous'
),
(
  'e257c53d-6ba6-40de-b679-61b37188a316',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'private',
  'db-0bbfdf18-0688-4474-b728-c1f63c656fa6',
  false,
  'administrator',
  'administrator'
),
(
  'a2e6098f-2c11-4f2a-b481-c19175bc62ef',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'auth',
  'db-0bbfdf18-0688-4474-b728-c1f63c656fa6',
  true,
  'authenticated',
  'anonymous'
),
(
  '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  'app',
  'db-0bbfdf18-0688-4474-b728-c1f63c656fa6',
  true,
  'authenticated',
  'anonymous'
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

INSERT INTO services_public.api_schemas (
  id,
  database_id,
  schema_id,
  api_id
) VALUES
(
  'd37621f0-55e5-49b2-ba2a-63ebc43e3aa0',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6d264733-40be-4214-0c97-c3dbe8ba3b05',
  '6c9997a4-591b-4cb3-9313-4ef45d6f134e'
),
(
  '5fb9e4c0-5caa-4ced-8825-74dd519b3678',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6d264733-40be-4214-0c97-c3dbe8ba3b05',
  'e257c53d-6ba6-40de-b679-61b37188a316'
),
(
  'c406acf9-5004-4596-8905-86726fc95b2e',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6d26be55-2885-41de-0bb0-98e7f37d4cc8',
  '6c9997a4-591b-4cb3-9313-4ef45d6f134e'
),
(
  '951dae80-ec85-420a-a9a3-ca735eb316f2',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6d26be55-2885-41de-0bb0-98e7f37d4cc8',
  'e257c53d-6ba6-40de-b679-61b37188a316'
),
(
  'ac4a7d5d-c98e-4708-860a-3b1f1107d544',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6d263af4-8431-4454-0f8b-301a421fd6cc',
  '6c9997a4-591b-4cb3-9313-4ef45d6f134e'
),
(
  'acad9849-4e70-4be5-9e0e-b08834cb718d',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6d263af4-8431-4454-0f8b-301a421fd6cc',
  'e257c53d-6ba6-40de-b679-61b37188a316'
);

SET session_replication_role TO DEFAULT;
