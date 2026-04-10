-- Setup for simple-seed-storage test scenario
-- Extends simple-seed-services with storage module tables for upload testing
--
-- This creates:
-- 1. All metaschema/services infrastructure (same as simple-seed-services)
-- 2. jwt_private schema with current_database_id() function
-- 3. storage_module table in metaschema_modules_public
-- 4. Storage tables (buckets, files, upload_requests) in the app schema

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create uuid_nil function if not exists (returns the nil UUID)
CREATE OR REPLACE FUNCTION uuid_nil() RETURNS uuid AS $$
  SELECT '00000000-0000-0000-0000-000000000000'::uuid;
$$ LANGUAGE sql IMMUTABLE;

-- Create required roles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'administrator') THEN
    CREATE ROLE administrator;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anonymous') THEN
    CREATE ROLE anonymous;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin;
  END IF;
END
$$;

-- Create stamps schema for timestamp trigger if not exists
CREATE SCHEMA IF NOT EXISTS stamps;

-- Create timestamps trigger function
CREATE OR REPLACE FUNCTION stamps.timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at = COALESCE(NEW.created_at, now());
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create hostname domain if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hostname') THEN
    CREATE DOMAIN hostname AS text;
  END IF;
END
$$;

-- =====================================================
-- JWT PRIVATE SCHEMA (required by presigned URL plugin)
-- =====================================================

CREATE SCHEMA IF NOT EXISTS jwt_private;

GRANT USAGE ON SCHEMA jwt_private TO authenticated, anonymous;

ALTER DEFAULT PRIVILEGES IN SCHEMA jwt_private
  GRANT EXECUTE ON FUNCTIONS TO authenticated;

-- current_database_id reads from pgSettings set by the middleware
CREATE OR REPLACE FUNCTION jwt_private.current_database_id() RETURNS uuid AS $EOFCODE$
DECLARE
  v_identifier_id uuid;
BEGIN
  IF current_setting('jwt.claims.database_id', TRUE)
    IS NOT NULL THEN
    BEGIN
      v_identifier_id = current_setting('jwt.claims.database_id', TRUE)::uuid;
    EXCEPTION
      WHEN OTHERS THEN
      RAISE NOTICE 'Invalid UUID value';
    RETURN NULL;
    END;
    RETURN v_identifier_id;
  ELSE
    RETURN NULL;
  END IF;
END;
$EOFCODE$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- METASCHEMA SCHEMAS
-- =====================================================

CREATE SCHEMA IF NOT EXISTS metaschema_public;
CREATE SCHEMA IF NOT EXISTS metaschema_modules_public;
CREATE SCHEMA IF NOT EXISTS services_public;

GRANT USAGE ON SCHEMA metaschema_public TO administrator, authenticated, anonymous;
GRANT USAGE ON SCHEMA metaschema_modules_public TO administrator, authenticated, anonymous;
GRANT USAGE ON SCHEMA services_public TO administrator, authenticated, anonymous;

-- Create object_category type if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'object_category' AND n.nspname = 'metaschema_public') THEN
    CREATE TYPE metaschema_public.object_category AS ENUM ('core', 'module', 'app');
  END IF;
END
$$;

-- =====================================================
-- METASCHEMA TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS metaschema_public.database (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid,
  schema_hash text,
  schema_name text,
  private_schema_name text,
  name text,
  label text,
  hash uuid,
  UNIQUE(schema_hash),
  UNIQUE(schema_name),
  UNIQUE(private_schema_name)
);

CREATE TABLE IF NOT EXISTS metaschema_public.schema (
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
  is_public boolean NOT NULL DEFAULT TRUE,
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  UNIQUE (database_id, name),
  UNIQUE (schema_name)
);

CREATE TABLE IF NOT EXISTS metaschema_public.table (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL,
  name text NOT NULL,
  label text,
  description text,
  smart_tags jsonb,
  category metaschema_public.object_category NOT NULL DEFAULT 'app',
  module text NULL,
  scope int NULL,
  use_rls boolean NOT NULL DEFAULT FALSE,
  timestamps boolean NOT NULL DEFAULT FALSE,
  peoplestamps boolean NOT NULL DEFAULT FALSE,
  plural_name text,
  singular_name text,
  tags citext[] NOT NULL DEFAULT '{}',
  inherits_id uuid NULL,
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT schema_fkey FOREIGN KEY (schema_id) REFERENCES metaschema_public.schema (id) ON DELETE CASCADE,
  UNIQUE (database_id, name)
);

CREATE TABLE IF NOT EXISTS metaschema_public.field (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  table_id uuid NOT NULL,
  name text NOT NULL,
  label text,
  description text,
  smart_tags jsonb,
  is_required boolean NOT NULL DEFAULT FALSE,
  default_value text NULL DEFAULT NULL,
  default_value_ast jsonb NULL DEFAULT NULL,
  is_hidden boolean NOT NULL DEFAULT FALSE,
  type citext NOT NULL,
  field_order int NOT NULL DEFAULT 0,
  regexp text DEFAULT NULL,
  chk jsonb DEFAULT NULL,
  chk_expr jsonb DEFAULT NULL,
  min float DEFAULT NULL,
  max float DEFAULT NULL,
  tags citext[] NOT NULL DEFAULT '{}',
  category metaschema_public.object_category NOT NULL DEFAULT 'app',
  module text NULL,
  scope int NULL,
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT table_fkey FOREIGN KEY (table_id) REFERENCES metaschema_public.table (id) ON DELETE CASCADE,
  UNIQUE (table_id, name)
);

CREATE TABLE IF NOT EXISTS metaschema_public.primary_key_constraint (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  table_id uuid NOT NULL,
  name text NOT NULL,
  type char(1) NOT NULL DEFAULT 'p',
  field_ids uuid[] NOT NULL,
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT table_fkey FOREIGN KEY (table_id) REFERENCES metaschema_public.table (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS metaschema_public.check_constraint (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  table_id uuid NOT NULL,
  name text NOT NULL,
  type char(1) NOT NULL DEFAULT 'c',
  field_ids uuid[] NOT NULL,
  expr jsonb,
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT table_fkey FOREIGN KEY (table_id) REFERENCES metaschema_public.table (id) ON DELETE CASCADE
);

-- =====================================================
-- SERVICES TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS services_public.apis (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  name text NOT NULL,
  dbname text NOT NULL DEFAULT current_database(),
  role_name text NOT NULL DEFAULT 'authenticated',
  anon_role text NOT NULL DEFAULT 'anonymous',
  is_public boolean NOT NULL DEFAULT true,
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  UNIQUE(database_id, name)
);

COMMENT ON CONSTRAINT db_fkey ON services_public.apis IS E'@omit manyToMany';
CREATE INDEX IF NOT EXISTS apis_database_id_idx ON services_public.apis (database_id);

CREATE TABLE IF NOT EXISTS services_public.domains (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  api_id uuid,
  site_id uuid,
  subdomain hostname,
  domain hostname,
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT api_fkey FOREIGN KEY (api_id) REFERENCES services_public.apis (id) ON DELETE CASCADE,
  UNIQUE (subdomain, domain)
);

COMMENT ON CONSTRAINT db_fkey ON services_public.domains IS E'@omit manyToMany';
CREATE INDEX IF NOT EXISTS domains_database_id_idx ON services_public.domains (database_id);
COMMENT ON CONSTRAINT api_fkey ON services_public.domains IS E'@omit manyToMany';
CREATE INDEX IF NOT EXISTS domains_api_id_idx ON services_public.domains (api_id);

CREATE TABLE IF NOT EXISTS services_public.api_schemas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL,
  api_id uuid NOT NULL,
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT schema_fkey FOREIGN KEY (schema_id) REFERENCES metaschema_public.schema (id) ON DELETE CASCADE,
  CONSTRAINT api_fkey FOREIGN KEY (api_id) REFERENCES services_public.apis (id) ON DELETE CASCADE,
  UNIQUE(api_id, schema_id)
);

CREATE TABLE IF NOT EXISTS services_public.api_extensions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid,
  api_id uuid,
  schema_name text,
  CONSTRAINT db_fkey2 FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT api_fkey2 FOREIGN KEY (api_id) REFERENCES services_public.apis (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS services_public.api_modules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid,
  api_id uuid,
  name text,
  data jsonb,
  CONSTRAINT db_fkey3 FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT api_fkey3 FOREIGN KEY (api_id) REFERENCES services_public.apis (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS metaschema_modules_public.rls_module (
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
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT api_fkey FOREIGN KEY (api_id) REFERENCES services_public.apis (id) ON DELETE CASCADE,
  CONSTRAINT schema_fkey FOREIGN KEY (schema_id) REFERENCES metaschema_public.schema (id) ON DELETE CASCADE,
  CONSTRAINT pschema_fkey FOREIGN KEY (private_schema_id) REFERENCES metaschema_public.schema (id) ON DELETE CASCADE,
  CONSTRAINT tokens_table_fkey FOREIGN KEY (tokens_table_id) REFERENCES metaschema_public.table (id) ON DELETE CASCADE,
  CONSTRAINT users_table_fkey FOREIGN KEY (users_table_id) REFERENCES metaschema_public.table (id) ON DELETE CASCADE,
  CONSTRAINT api_id_uniq UNIQUE(api_id)
);

COMMENT ON CONSTRAINT api_fkey ON metaschema_modules_public.rls_module IS E'@omit manyToMany';
COMMENT ON CONSTRAINT schema_fkey ON metaschema_modules_public.rls_module IS E'@omit manyToMany';
COMMENT ON CONSTRAINT pschema_fkey ON metaschema_modules_public.rls_module IS E'@omit manyToMany';
COMMENT ON CONSTRAINT db_fkey ON metaschema_modules_public.rls_module IS E'@omit';
COMMENT ON CONSTRAINT tokens_table_fkey ON metaschema_modules_public.rls_module IS E'@omit';
COMMENT ON CONSTRAINT users_table_fkey ON metaschema_modules_public.rls_module IS E'@omit';
CREATE INDEX rls_module_database_id_idx ON metaschema_modules_public.rls_module ( database_id );

-- =====================================================
-- STORAGE MODULE TABLE (metaschema_modules_public)
-- =====================================================

CREATE TABLE IF NOT EXISTS metaschema_modules_public.storage_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL DEFAULT uuid_nil(),
  private_schema_id uuid NOT NULL DEFAULT uuid_nil(),
  buckets_table_id uuid NOT NULL DEFAULT uuid_nil(),
  files_table_id uuid NOT NULL DEFAULT uuid_nil(),
  upload_requests_table_id uuid NOT NULL DEFAULT uuid_nil(),
  buckets_table_name text NOT NULL DEFAULT 'buckets',
  files_table_name text NOT NULL DEFAULT 'files',
  upload_requests_table_name text NOT NULL DEFAULT 'upload_requests',
  entity_table_id uuid NULL,
  endpoint text NULL,
  public_url_prefix text NULL,
  provider text NULL,
  allowed_origins text[] NULL,
  upload_url_expiry_seconds integer NULL,
  download_url_expiry_seconds integer NULL,
  default_max_file_size bigint NULL,
  max_filename_length integer NULL,
  cache_ttl_seconds integer NULL,
  CONSTRAINT sm_db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS storage_module_database_id_idx
  ON metaschema_modules_public.storage_module (database_id);

-- =====================================================
-- GRANT PERMISSIONS ON ALL METASCHEMA TABLES
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON metaschema_public.database TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON metaschema_public.schema TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON metaschema_public.table TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON metaschema_public.field TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON metaschema_public.primary_key_constraint TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON metaschema_public.check_constraint TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON services_public.apis TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON services_public.domains TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON services_public.api_schemas TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON services_public.api_extensions TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON services_public.api_modules TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON metaschema_modules_public.rls_module TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON metaschema_modules_public.storage_module TO administrator, authenticated, anonymous;
