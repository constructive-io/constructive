import { promises as fs } from 'node:fs';
import path from 'node:path';

const SIMPLE_SEED_SQL = path.resolve(
  __dirname,
  '../../../../constructive-db/testing/simple-seed/sql/simple-seed--0.0.1.sql'
);
const SERVICES_SQL = path.resolve(
  __dirname,
  '../../../../constructive-db/testing/simple-seed-services/sql/simple-seed-services--0.0.1.sql'
);
const DEST_DIR = path.resolve(
  __dirname,
  '../__fixtures__/seed/simple-seed-services'
);

const SETUP_SQL = `-- Prerequisites
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'administrator') THEN CREATE ROLE administrator; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN CREATE ROLE anonymous; END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS stamps;
CREATE OR REPLACE FUNCTION stamps.timestamps() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.created_at = COALESCE(NEW.created_at, now()); END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

const METASCHEMA_SQL = `-- Minimal metaschema schema for tests
CREATE SCHEMA IF NOT EXISTS metaschema_public;

CREATE TYPE metaschema_public.object_category AS ENUM ('core', 'module', 'app');

CREATE TABLE metaschema_public.database (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
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

ALTER TABLE metaschema_public.database
  ADD CONSTRAINT db_namechk CHECK (char_length(name) > 2);

CREATE TABLE metaschema_public.schema (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
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

ALTER TABLE metaschema_public.schema
  ADD CONSTRAINT schema_namechk CHECK (char_length(name) > 2);

CREATE TABLE metaschema_public.table (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
  database_id uuid NOT NULL DEFAULT uuid_nil(),
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
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT schema_fkey FOREIGN KEY (schema_id) REFERENCES metaschema_public.schema (id) ON DELETE CASCADE,
  UNIQUE (database_id, name)
);

ALTER TABLE metaschema_public.table
  ADD COLUMN inherits_id uuid NULL REFERENCES metaschema_public.table(id);

CREATE TABLE metaschema_public.field (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
  database_id uuid NOT NULL DEFAULT uuid_nil(),
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

CREATE TABLE metaschema_public.primary_key_constraint (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
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
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT table_fkey FOREIGN KEY (table_id) REFERENCES metaschema_public.table (id) ON DELETE CASCADE,
  UNIQUE (table_id, name),
  CHECK (field_ids <> '{}')
);

CREATE TABLE metaschema_public.check_constraint (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
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
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT table_fkey FOREIGN KEY (table_id) REFERENCES metaschema_public.table (id) ON DELETE CASCADE,
  UNIQUE (table_id, name),
  CHECK (field_ids <> '{}')
);
`;

const SERVICES_SCHEMA_SQL = `-- Minimal services schema for tests
CREATE DOMAIN hostname AS text CHECK (
  VALUE ~ '^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9])$'
);

CREATE DOMAIN attachment AS text CHECK (
  VALUE ~ '^(https?)://[^\\s/$.?#].[^\\s]*$'
);
COMMENT ON DOMAIN attachment IS E'@name pgpmInternalTypeAttachment';

CREATE DOMAIN image AS jsonb CHECK (
  value ?& ARRAY['url', 'mime']
  AND
  value->>'url' ~ '^(https?)://[^\\s/$.?#].[^\\s]*$'
);
COMMENT ON DOMAIN image IS E'@name pgpmInternalTypeImage';

CREATE SCHEMA IF NOT EXISTS services_public;

GRANT USAGE ON SCHEMA services_public TO authenticated;
GRANT USAGE ON SCHEMA services_public TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA services_public GRANT ALL ON TABLES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA services_public GRANT ALL ON SEQUENCES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA services_public GRANT ALL ON FUNCTIONS TO administrator;

CREATE TABLE services_public.apis (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
  database_id uuid NOT NULL,
  name text NOT NULL,
  dbname text NOT NULL DEFAULT current_database(),
  role_name text NOT NULL DEFAULT 'authenticated',
  anon_role text NOT NULL DEFAULT 'anonymous',
  is_public boolean NOT NULL DEFAULT true,
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  UNIQUE(database_id, name)
);

CREATE TABLE services_public.sites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
  database_id uuid NOT NULL,
  title text,
  description text,
  og_image image,
  favicon attachment,
  apple_touch_icon image,
  logo image,
  dbname text NOT NULL DEFAULT current_database(),
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT max_title CHECK (char_length(title) <= 120),
  CONSTRAINT max_descr CHECK (char_length(description) <= 120)
);

CREATE INDEX sites_database_id_idx ON services_public.sites (database_id);

CREATE TABLE services_public.domains (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
  database_id uuid NOT NULL,
  api_id uuid,
  site_id uuid,
  subdomain hostname,
  domain hostname,
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT api_fkey FOREIGN KEY (api_id) REFERENCES services_public.apis (id) ON DELETE CASCADE,
  CONSTRAINT site_fkey FOREIGN KEY (site_id) REFERENCES services_public.sites (id) ON DELETE CASCADE,
  CONSTRAINT one_route_chk CHECK (
    (api_id IS NULL AND site_id IS NULL) OR
    (api_id IS NULL AND site_id IS NOT NULL) OR
    (api_id IS NOT NULL AND site_id IS NULL)
  ),
  UNIQUE (subdomain, domain)
);

CREATE INDEX domains_database_id_idx ON services_public.domains (database_id);
CREATE INDEX domains_api_id_idx ON services_public.domains (api_id);
CREATE INDEX domains_site_id_idx ON services_public.domains (site_id);

CREATE TABLE services_public.api_schemas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
  database_id uuid NOT NULL,
  schema_id uuid NOT NULL,
  api_id uuid NOT NULL,
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT schema_fkey FOREIGN KEY (schema_id) REFERENCES metaschema_public.schema (id) ON DELETE CASCADE,
  CONSTRAINT api_fkey FOREIGN KEY (api_id) REFERENCES services_public.apis (id) ON DELETE CASCADE,
  UNIQUE(api_id, schema_id)
);

CREATE TABLE services_public.api_extensions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
  schema_name text,
  database_id uuid NOT NULL,
  api_id uuid NOT NULL,
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT api_fkey FOREIGN KEY (api_id) REFERENCES services_public.apis (id) ON DELETE CASCADE,
  UNIQUE (schema_name, api_id)
);

CREATE TABLE services_public.api_modules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
  database_id uuid NOT NULL,
  api_id uuid NOT NULL,
  name text NOT NULL,
  data json NOT NULL,
  CONSTRAINT db_fkey FOREIGN KEY (database_id) REFERENCES metaschema_public.database (id) ON DELETE CASCADE,
  CONSTRAINT api_modules_api_id_fkey FOREIGN KEY (api_id) REFERENCES services_public.apis (id)
);
`;

const MODULES_SCHEMA_SQL = `-- Minimal metaschema modules schema for tests
CREATE SCHEMA IF NOT EXISTS metaschema_modules_public;

GRANT USAGE ON SCHEMA metaschema_modules_public TO authenticated;
GRANT USAGE ON SCHEMA metaschema_modules_public TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_modules_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_modules_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_modules_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_modules_public GRANT ALL ON TABLES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_modules_public GRANT ALL ON SEQUENCES TO administrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA metaschema_modules_public GRANT ALL ON FUNCTIONS TO administrator;

CREATE TABLE metaschema_modules_public.rls_module (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
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
  CONSTRAINT tokens_table_fkey FOREIGN KEY (tokens_table_id) REFERENCES metaschema_public.table (id) ON DELETE CASCADE,
  CONSTRAINT users_table_fkey FOREIGN KEY (users_table_id) REFERENCES metaschema_public.table (id) ON DELETE CASCADE,
  CONSTRAINT schema_fkey FOREIGN KEY (schema_id) REFERENCES metaschema_public.schema (id) ON DELETE CASCADE,
  CONSTRAINT pschema_fkey FOREIGN KEY (private_schema_id) REFERENCES metaschema_public.schema (id) ON DELETE CASCADE,
  CONSTRAINT api_id_uniq UNIQUE(api_id)
);
`;

const TEST_DATA_SQL = `-- Test data
INSERT INTO "simple-pets-pets-public".animals (name, species) VALUES
  ('Max', 'Dog'), ('Whiskers', 'Cat'), ('Buddy', 'Dog'), ('Luna', 'Cat'), ('Charlie', 'Bird');

-- Explicit grants (ALTER DEFAULT PRIVILEGES doesn't apply in test context)
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-pets-pets-public".animals TO administrator, authenticated, anonymous;

-- Admin access for meta schemas
GRANT USAGE ON SCHEMA metaschema_public TO administrator;
GRANT SELECT ON ALL TABLES IN SCHEMA metaschema_public TO administrator;
GRANT USAGE ON SCHEMA metaschema_modules_public TO administrator;
GRANT SELECT ON ALL TABLES IN SCHEMA metaschema_modules_public TO administrator;

-- Services API wiring for integration tests
UPDATE services_public.apis
SET dbname = current_database()
WHERE database_id = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';

INSERT INTO services_public.domains (
  id,
  database_id,
  site_id,
  api_id,
  domain,
  subdomain
) VALUES (
  uuid_generate_v4(),
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  NULL,
  '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
  'constructive.io',
  'app.test'
) ON CONFLICT (subdomain, domain)
DO UPDATE SET api_id = EXCLUDED.api_id;

INSERT INTO services_public.api_schemas (
  id,
  database_id,
  schema_id,
  api_id
) VALUES
(
  uuid_generate_v4(),
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dbae92a-5450-401b-1ed5-d69e7754940d',
  '6c9997a4-591b-4cb3-9313-4ef45d6f134e'
),
(
  uuid_generate_v4(),
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dba6f21-0193-43f4-3bdb-61b4b956b6b6',
  '6c9997a4-591b-4cb3-9313-4ef45d6f134e'
);
`;

function stripPgpmHeader(sql: string): string {
  const lines = sql.split(/\r?\n/);
  const filtered = lines.filter((line) => {
    if (line.startsWith('\\echo Use "CREATE EXTENSION')) {
      return false;
    }
    if (line.trim() === '\\quit') {
      return false;
    }
    return true;
  });
  return filtered.join('\n').trim();
}

async function writeSeedFiles(): Promise<void> {
  const baseSql = await fs.readFile(SIMPLE_SEED_SQL, 'utf8');
  const servicesSql = await fs.readFile(SERVICES_SQL, 'utf8');
  const schemaSql = [
    stripPgpmHeader(baseSql),
    METASCHEMA_SQL,
    SERVICES_SCHEMA_SQL,
    MODULES_SCHEMA_SQL,
    stripPgpmHeader(servicesSql)
  ].join('\n\n');

  await fs.mkdir(DEST_DIR, { recursive: true });
  await fs.writeFile(path.join(DEST_DIR, 'setup.sql'), `${SETUP_SQL}\n`, 'utf8');
  await fs.writeFile(path.join(DEST_DIR, 'schema.sql'), `${schemaSql}\n`, 'utf8');
  await fs.writeFile(path.join(DEST_DIR, 'test-data.sql'), `${TEST_DATA_SQL}\n`, 'utf8');

  console.log(`Seed SQL written to ${DEST_DIR}`);
}

writeSeedFiles().catch((error) => {
  console.error('Failed to collect simple-seed-services:', error);
  process.exitCode = 1;
});
