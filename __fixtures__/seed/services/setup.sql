-- Shared fixture: metaschema + services DDL
--
-- Creates the minimum tables needed to emulate a production Constructive
-- database with API resolution, domain routing, and RLS module support.
-- Roles (administrator, authenticated, anonymous) are created upstream by
-- pgsql-test's createUserRole() — do NOT recreate them here.
--
-- Usage (via pgsql-test seed adapter):
--   seed.sqlfile([
--     '__fixtures__/seed/services/setup.sql',
--     '__fixtures__/seed/services/test-data.sql',
--     // ... then your app-specific schema + data
--   ])

-- =====================================================
-- EXTENSIONS & BASE TYPES
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

CREATE SCHEMA IF NOT EXISTS stamps;

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

CREATE OR REPLACE FUNCTION uuid_nil() RETURNS uuid AS $$
  SELECT '00000000-0000-0000-0000-000000000000'::uuid;
$$ LANGUAGE sql IMMUTABLE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hostname') THEN
    CREATE DOMAIN hostname AS text;
  END IF;
END
$$;

-- =====================================================
-- METASCHEMA SCHEMAS
-- =====================================================

CREATE SCHEMA IF NOT EXISTS metaschema_public;
CREATE SCHEMA IF NOT EXISTS metaschema_modules_public;
CREATE SCHEMA IF NOT EXISTS services_public;

GRANT USAGE ON SCHEMA metaschema_public TO administrator, authenticated, anonymous;
GRANT USAGE ON SCHEMA metaschema_modules_public TO administrator, authenticated, anonymous;
GRANT USAGE ON SCHEMA services_public TO administrator, authenticated, anonymous;

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

-- =====================================================
-- HTTP ROUTES (Stage B) + resolver
-- =====================================================
--
-- Mirrors the constructive-db route storage + resolver contract
-- (services_public.resolve_http_route). Two scopes exist in production
-- (platform_http_routes / http_routes); the resolver unions both. Routes are
-- unseeded by default — tests insert their own.

CREATE TABLE IF NOT EXISTS services_public.http_routes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  domain_id uuid NOT NULL,
  path text NOT NULL DEFAULT '/',
  method text,
  target_kind text NOT NULL CHECK (target_kind IN ('api', 'site', 'service', 'function', 'bucket')),
  channel text,
  api_id uuid,
  site_id uuid,
  service_id uuid,
  function_definition_id uuid,
  bucket_id uuid,
  priority int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT hr_db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT hr_domain_fkey FOREIGN KEY (domain_id) REFERENCES services_public.domains (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS http_routes_domain_id_idx ON services_public.http_routes (domain_id);

CREATE TABLE IF NOT EXISTS services_public.platform_http_routes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain_id uuid NOT NULL,
  path text NOT NULL DEFAULT '/',
  method text,
  target_kind text NOT NULL CHECK (target_kind IN ('api', 'site', 'service', 'function', 'bucket')),
  channel text,
  api_id uuid,
  site_id uuid,
  service_id uuid,
  function_definition_id uuid,
  bucket_id uuid,
  priority int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT phr_domain_fkey FOREIGN KEY (domain_id) REFERENCES services_public.domains (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS platform_http_routes_domain_id_idx ON services_public.platform_http_routes (domain_id);

CREATE OR REPLACE FUNCTION services_public.resolve_http_route(
  p_host text,
  p_path text,
  p_method text,
  OUT route_id uuid,
  OUT domain_id uuid,
  OUT matched_path text,
  OUT method text,
  OUT target_kind text,
  OUT channel text,
  OUT api_id uuid,
  OUT site_id uuid,
  OUT service_id uuid,
  OUT function_definition_id uuid,
  OUT bucket_id uuid,
  OUT route_scope text
) RETURNS record AS $_PGFN_$
SELECT
  route_id, domain_id, matched_path, method, target_kind, channel,
  api_id, site_id, service_id, function_definition_id, bucket_id, route_scope
FROM (
  SELECT
    r.id AS route_id,
    r.domain_id AS domain_id,
    r.path AS matched_path,
    r.method AS method,
    r.target_kind::text AS target_kind,
    CASE r.target_kind WHEN 'function' THEN r.channel ELSE NULL END::text AS channel,
    CASE r.target_kind WHEN 'api' THEN r.api_id ELSE NULL END AS api_id,
    CASE r.target_kind WHEN 'site' THEN r.site_id ELSE NULL END AS site_id,
    CASE r.target_kind WHEN 'service' THEN r.service_id ELSE NULL END AS service_id,
    CASE r.target_kind WHEN 'function' THEN r.function_definition_id ELSE NULL END AS function_definition_id,
    CASE r.target_kind WHEN 'bucket' THEN r.bucket_id ELSE NULL END AS bucket_id,
    'platform' AS route_scope,
    length(r.path) AS path_length,
    r.method IS NOT NULL AS method_specific,
    r.priority AS priority
  FROM services_public.platform_http_routes AS r
  INNER JOIN services_public.domains AS d ON d.id = r.domain_id
  WHERE lower(concat_ws('.', d.subdomain, d.domain)) = split_part(lower(p_host), ':', 1)
    AND ((r.path = '/' OR (concat('/', ltrim(COALESCE(p_path, '/'), '/')) = r.path
      OR "left"(concat('/', ltrim(COALESCE(p_path, '/'), '/')), length(r.path) + 1) = (r.path || '/')))
      AND ((r.method IS NULL OR upper(r.method) = upper(p_method)) AND r.is_active))
  UNION ALL
  SELECT
    r.id AS route_id,
    r.domain_id AS domain_id,
    r.path AS matched_path,
    r.method AS method,
    r.target_kind::text AS target_kind,
    CASE r.target_kind WHEN 'function' THEN r.channel ELSE NULL END::text AS channel,
    CASE r.target_kind WHEN 'api' THEN r.api_id ELSE NULL END AS api_id,
    CASE r.target_kind WHEN 'site' THEN r.site_id ELSE NULL END AS site_id,
    CASE r.target_kind WHEN 'service' THEN r.service_id ELSE NULL END AS service_id,
    CASE r.target_kind WHEN 'function' THEN r.function_definition_id ELSE NULL END AS function_definition_id,
    CASE r.target_kind WHEN 'bucket' THEN r.bucket_id ELSE NULL END AS bucket_id,
    'database' AS route_scope,
    length(r.path) AS path_length,
    r.method IS NOT NULL AS method_specific,
    r.priority AS priority
  FROM services_public.http_routes AS r
  INNER JOIN services_public.domains AS d ON d.id = r.domain_id
  WHERE lower(concat_ws('.', d.subdomain, d.domain)) = split_part(lower(p_host), ':', 1)
    AND ((r.path = '/' OR (concat('/', ltrim(COALESCE(p_path, '/'), '/')) = r.path
      OR "left"(concat('/', ltrim(COALESCE(p_path, '/'), '/')), length(r.path) + 1) = (r.path || '/')))
      AND ((r.method IS NULL OR upper(r.method) = upper(p_method)) AND r.is_active))
) AS candidates
ORDER BY path_length DESC, method_specific DESC, priority DESC, route_id ASC
LIMIT 1
$_PGFN_$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =====================================================
-- MODULES TABLES
-- =====================================================

-- CONSTRAINT api_id_uniq UNIQUE(api_id) creates the singular 'rlsModule' relation on Api type
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
-- SETTINGS TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS services_public.database_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL UNIQUE,
  enable_aggregates boolean NOT NULL DEFAULT false,
  enable_postgis boolean NOT NULL DEFAULT true,
  enable_search boolean NOT NULL DEFAULT true,
  enable_direct_uploads boolean NOT NULL DEFAULT true,
  enable_presigned_uploads boolean NOT NULL DEFAULT true,
  enable_many_to_many boolean NOT NULL DEFAULT true,
  enable_connection_filter boolean NOT NULL DEFAULT true,
  enable_ltree boolean NOT NULL DEFAULT true,
  enable_llm boolean NOT NULL DEFAULT true,
  enable_realtime boolean NOT NULL DEFAULT false,
  enable_bulk boolean NOT NULL DEFAULT false,
  enable_i18n boolean NOT NULL DEFAULT false,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT ds_db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS services_public.api_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  api_id uuid NOT NULL UNIQUE,
  enable_aggregates boolean,
  enable_postgis boolean,
  enable_search boolean,
  enable_direct_uploads boolean,
  enable_presigned_uploads boolean,
  enable_many_to_many boolean,
  enable_connection_filter boolean,
  enable_ltree boolean,
  enable_llm boolean,
  enable_realtime boolean,
  enable_bulk boolean,
  enable_i18n boolean,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT as_db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT as_api_fkey FOREIGN KEY (api_id) REFERENCES services_public.apis (id) ON DELETE CASCADE
);

-- =====================================================
-- GRANTS
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
GRANT SELECT, INSERT, UPDATE, DELETE ON services_public.database_settings TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON services_public.api_settings TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON metaschema_modules_public.rls_module TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON services_public.http_routes TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON services_public.platform_http_routes TO administrator, authenticated, anonymous;
GRANT EXECUTE ON FUNCTION services_public.resolve_http_route(text, text, text) TO administrator, authenticated, anonymous;
