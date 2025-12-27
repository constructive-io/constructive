-- Demo SQL Fixture for Export Testing
-- A simplified meta-schema for a "pets" application
-- Used for testing the pgpm export flow
--
-- PREREQUISITES:
-- This fixture assumes the following pgpm modules are already deployed:
--   - db-meta-schema (provides collections_public.* tables)
--   - db-meta-modules (provides meta_public.* tables)
--   - db-migrate (provides db_migrate.sql_actions table)
--
-- USAGE:
--   1. Set up a pgpm workspace
--   2. Install required modules: pgpm install @pgpm/db-meta-schema @pgpm/db-meta-modules @pgpm/db-migrate
--   3. Deploy to a test database: pgpm deploy --createdb
--   4. Run this fixture: psql -d <dbname> -f pets-export-fixture.sql
--   5. Test export: pgpm export

SET session_replication_role TO replica;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public to public;

DO $LQLMIGRATION$
  DECLARE
  BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_user');
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'app_admin');
  END;
$LQLMIGRATION$;

-- ============================================================================
-- DATABASE
-- ============================================================================

INSERT INTO collections_public.database (
  id,
  owner_id,
  name,
  hash
) VALUES
  ('a1b2c3d4-e5f6-4708-b250-000000000001', '00000000-0000-0000-0000-000000000001', 'pets', 'f1e2d3c4-b5a6-5c2e-9a07-000000000001');

-- ============================================================================
-- SCHEMAS
-- ============================================================================

INSERT INTO collections_public.schema (
  id,
  database_id,
  name,
  schema_name,
  description
) VALUES
  ('aaaa0001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'public', 'pets_public', 'Public-facing tables and functions'),
  ('aaaa0002-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'private', 'pets_private', 'Internal tables and functions');

-- ============================================================================
-- TABLES
-- ============================================================================

INSERT INTO collections_public.table (
  id,
  database_id,
  schema_id,
  name,
  description
) VALUES
  -- Public schema tables
  ('bbbb0001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 'owners', 'Pet owners'),
  ('bbbb0002-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 'pets', 'Pets and their information'),
  ('bbbb0003-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 'species', 'Pet species (dog, cat, etc.)'),
  ('bbbb0004-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 'visits', 'Vet visits'),
  -- Private schema tables
  ('bbbb0005-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'aaaa0002-0000-0000-0000-000000000001', 'medical_records', 'Private medical records');

-- ============================================================================
-- FIELDS
-- ============================================================================

INSERT INTO collections_public.field (
  id,
  database_id,
  table_id,
  name,
  type,
  description
) VALUES
  -- owners fields
  ('cccc0001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0001-0000-0000-0000-000000000001', 'id', 'uuid', 'Primary key'),
  ('cccc0002-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0001-0000-0000-0000-000000000001', 'name', 'text', 'Owner name'),
  ('cccc0003-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0001-0000-0000-0000-000000000001', 'email', 'email', 'Contact email'),
  ('cccc0004-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0001-0000-0000-0000-000000000001', 'phone', 'text', 'Phone number'),
  ('cccc0005-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0001-0000-0000-0000-000000000001', 'address', 'text', 'Mailing address'),
  ('cccc0006-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0001-0000-0000-0000-000000000001', 'created_at', 'timestamptz', NULL),
  ('cccc0007-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0001-0000-0000-0000-000000000001', 'updated_at', 'timestamptz', NULL),

  -- pets fields
  ('cccc0010-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'id', 'uuid', 'Primary key'),
  ('cccc0011-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'owner_id', 'uuid', 'Reference to owner'),
  ('cccc0012-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'species_id', 'uuid', 'Reference to species'),
  ('cccc0013-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'name', 'text', 'Pet name'),
  ('cccc0014-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'breed', 'text', 'Breed'),
  ('cccc0015-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'birth_date', 'date', 'Date of birth'),
  ('cccc0016-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'weight', 'numeric', 'Weight in kg'),
  ('cccc0017-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'color', 'text', 'Primary color'),
  ('cccc0018-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'microchip_id', 'text', 'Microchip identifier'),
  ('cccc0019-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'is_neutered', 'boolean', 'Spayed/neutered status'),
  ('cccc001a-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'created_at', 'timestamptz', NULL),
  ('cccc001b-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'updated_at', 'timestamptz', NULL),

  -- species fields
  ('cccc0020-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0003-0000-0000-0000-000000000001', 'id', 'uuid', 'Primary key'),
  ('cccc0021-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0003-0000-0000-0000-000000000001', 'name', 'citext', 'Species name'),
  ('cccc0022-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0003-0000-0000-0000-000000000001', 'description', 'text', 'Description'),

  -- visits fields
  ('cccc0030-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0004-0000-0000-0000-000000000001', 'id', 'uuid', 'Primary key'),
  ('cccc0031-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0004-0000-0000-0000-000000000001', 'pet_id', 'uuid', 'Reference to pet'),
  ('cccc0032-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0004-0000-0000-0000-000000000001', 'visit_date', 'timestamptz', 'Date of visit'),
  ('cccc0033-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0004-0000-0000-0000-000000000001', 'reason', 'text', 'Reason for visit'),
  ('cccc0034-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0004-0000-0000-0000-000000000001', 'notes', 'text', 'Visit notes'),
  ('cccc0035-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0004-0000-0000-0000-000000000001', 'cost', 'numeric', 'Visit cost'),
  ('cccc0036-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0004-0000-0000-0000-000000000001', 'created_at', 'timestamptz', NULL),

  -- medical_records fields (private)
  ('cccc0040-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0005-0000-0000-0000-000000000001', 'id', 'uuid', 'Primary key'),
  ('cccc0041-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0005-0000-0000-0000-000000000001', 'pet_id', 'uuid', 'Reference to pet'),
  ('cccc0042-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0005-0000-0000-0000-000000000001', 'visit_id', 'uuid', 'Reference to visit'),
  ('cccc0043-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0005-0000-0000-0000-000000000001', 'diagnosis', 'text', 'Medical diagnosis'),
  ('cccc0044-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0005-0000-0000-0000-000000000001', 'treatment', 'text', 'Treatment prescribed'),
  ('cccc0045-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0005-0000-0000-0000-000000000001', 'medications', 'jsonb', 'Medications prescribed'),
  ('cccc0046-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0005-0000-0000-0000-000000000001', 'is_confidential', 'boolean', 'Confidential record flag'),
  ('cccc0047-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0005-0000-0000-0000-000000000001', 'created_at', 'timestamptz', NULL);

-- ============================================================================
-- DOMAINS
-- ============================================================================

INSERT INTO meta_public.domains (
  id,
  database_id,
  site_id,
  api_id,
  domain,
  subdomain
) VALUES
  ('dddd0001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', NULL, NULL, 'localhost', 'pets');

-- ============================================================================
-- APIS
-- ============================================================================

INSERT INTO meta_public.apis (
  id,
  database_id,
  name,
  dbname,
  is_public,
  role_name,
  anon_role
) VALUES
  ('eeee0001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'public', 'pets-db', true, 'authenticated', 'anonymous'),
  ('eeee0002-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'admin', 'pets-db', false, 'authenticated', 'anonymous');

-- ============================================================================
-- SITES
-- ============================================================================

INSERT INTO meta_public.sites (
  id,
  database_id,
  title,
  description,
  og_image,
  favicon,
  apple_touch_icon,
  logo,
  dbname
) VALUES
  ('ffff0001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'Pet Clinic', 'A simple pet management application', NULL, NULL, NULL, NULL, 'pets');

-- ============================================================================
-- API SCHEMATA (which schemas are exposed via which APIs)
-- ============================================================================

INSERT INTO meta_public.api_schemata (
  id,
  database_id,
  schema_id,
  api_id
) VALUES
  -- Public API exposes public schema
  ('1111aaaa-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001'),
  -- Admin API exposes both public and private schemas
  ('1111aaaa-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 'eeee0002-0000-0000-0000-000000000001'),
  ('1111aaaa-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'aaaa0002-0000-0000-0000-000000000001', 'eeee0002-0000-0000-0000-000000000001');

-- ============================================================================
-- DB_MIGRATE.SQL_ACTIONS (sample migration records)
-- These represent the migrations that would be exported
-- ============================================================================

INSERT INTO db_migrate.sql_actions (
  name,
  database_id,
  deploy,
  deps,
  content,
  revert,
  verify
) VALUES
  -- Schema creation
  (
    'Create pets_public schema',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_public/schema',
    ARRAY[]::text[],
    'CREATE SCHEMA pets_public;',
    'DROP SCHEMA pets_public;',
    'SELECT 1 FROM information_schema.schemata WHERE schema_name = ''pets_public'';'
  ),
  (
    'Create pets_private schema',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_private/schema',
    ARRAY[]::text[],
    'CREATE SCHEMA pets_private;',
    'DROP SCHEMA pets_private;',
    'SELECT 1 FROM information_schema.schemata WHERE schema_name = ''pets_private'';'
  ),
  
  -- Species table (no dependencies on other tables)
  (
    'Create species table',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_public/tables/species/table',
    ARRAY['schemas/pets_public/schema']::text[],
    E'CREATE TABLE pets_public.species (\n  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),\n  name citext NOT NULL UNIQUE,\n  description text,\n  created_at timestamptz DEFAULT now(),\n  updated_at timestamptz DEFAULT now()\n);',
    'DROP TABLE pets_public.species;',
    'SELECT 1 FROM information_schema.tables WHERE table_schema = ''pets_public'' AND table_name = ''species'';'
  ),
  
  -- Owners table
  (
    'Create owners table',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_public/tables/owners/table',
    ARRAY['schemas/pets_public/schema']::text[],
    E'CREATE TABLE pets_public.owners (\n  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),\n  name text NOT NULL,\n  email text UNIQUE,\n  phone text,\n  address text,\n  created_at timestamptz DEFAULT now(),\n  updated_at timestamptz DEFAULT now()\n);',
    'DROP TABLE pets_public.owners;',
    'SELECT 1 FROM information_schema.tables WHERE table_schema = ''pets_public'' AND table_name = ''owners'';'
  ),
  
  -- Pets table (depends on owners and species)
  (
    'Create pets table',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_public/tables/pets/table',
    ARRAY['schemas/pets_public/tables/owners/table', 'schemas/pets_public/tables/species/table']::text[],
    E'CREATE TABLE pets_public.pets (\n  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),\n  owner_id uuid NOT NULL REFERENCES pets_public.owners(id),\n  species_id uuid REFERENCES pets_public.species(id),\n  name text NOT NULL,\n  breed text,\n  birth_date date,\n  weight numeric,\n  color text,\n  microchip_id text UNIQUE,\n  is_neutered boolean DEFAULT false,\n  created_at timestamptz DEFAULT now(),\n  updated_at timestamptz DEFAULT now()\n);',
    'DROP TABLE pets_public.pets;',
    'SELECT 1 FROM information_schema.tables WHERE table_schema = ''pets_public'' AND table_name = ''pets'';'
  ),
  
  -- Visits table (depends on pets)
  (
    'Create visits table',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_public/tables/visits/table',
    ARRAY['schemas/pets_public/tables/pets/table']::text[],
    E'CREATE TABLE pets_public.visits (\n  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),\n  pet_id uuid NOT NULL REFERENCES pets_public.pets(id),\n  visit_date timestamptz NOT NULL DEFAULT now(),\n  reason text,\n  notes text,\n  cost numeric(10,2),\n  created_at timestamptz DEFAULT now()\n);',
    'DROP TABLE pets_public.visits;',
    'SELECT 1 FROM information_schema.tables WHERE table_schema = ''pets_public'' AND table_name = ''visits'';'
  ),
  
  -- Medical records table (private, depends on pets and visits)
  (
    'Create medical_records table',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_private/tables/medical_records/table',
    ARRAY['schemas/pets_private/schema', 'schemas/pets_public/tables/pets/table', 'schemas/pets_public/tables/visits/table']::text[],
    E'CREATE TABLE pets_private.medical_records (\n  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),\n  pet_id uuid NOT NULL REFERENCES pets_public.pets(id),\n  visit_id uuid REFERENCES pets_public.visits(id),\n  diagnosis text,\n  treatment text,\n  medications jsonb,\n  is_confidential boolean DEFAULT false,\n  created_at timestamptz DEFAULT now()\n);',
    'DROP TABLE pets_private.medical_records;',
    'SELECT 1 FROM information_schema.tables WHERE table_schema = ''pets_private'' AND table_name = ''medical_records'';'
  ),
  
  -- Indexes
  (
    'Create pets owner_id index',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_public/tables/pets/indexes/owner_id',
    ARRAY['schemas/pets_public/tables/pets/table']::text[],
    'CREATE INDEX idx_pets_owner_id ON pets_public.pets(owner_id);',
    'DROP INDEX pets_public.idx_pets_owner_id;',
    'SELECT 1 FROM pg_indexes WHERE schemaname = ''pets_public'' AND indexname = ''idx_pets_owner_id'';'
  ),
  (
    'Create visits pet_id index',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_public/tables/visits/indexes/pet_id',
    ARRAY['schemas/pets_public/tables/visits/table']::text[],
    'CREATE INDEX idx_visits_pet_id ON pets_public.visits(pet_id);',
    'DROP INDEX pets_public.idx_visits_pet_id;',
    'SELECT 1 FROM pg_indexes WHERE schemaname = ''pets_public'' AND indexname = ''idx_visits_pet_id'';'
  ),
  
  -- RLS policies
  (
    'Enable RLS on owners',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_public/tables/owners/policies/rls',
    ARRAY['schemas/pets_public/tables/owners/table']::text[],
    E'ALTER TABLE pets_public.owners ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY owners_select ON pets_public.owners FOR SELECT USING (true);\nCREATE POLICY owners_insert ON pets_public.owners FOR INSERT WITH CHECK (true);\nCREATE POLICY owners_update ON pets_public.owners FOR UPDATE USING (true);\nCREATE POLICY owners_delete ON pets_public.owners FOR DELETE USING (true);',
    E'DROP POLICY IF EXISTS owners_select ON pets_public.owners;\nDROP POLICY IF EXISTS owners_insert ON pets_public.owners;\nDROP POLICY IF EXISTS owners_update ON pets_public.owners;\nDROP POLICY IF EXISTS owners_delete ON pets_public.owners;\nALTER TABLE pets_public.owners DISABLE ROW LEVEL SECURITY;',
    'SELECT 1 FROM pg_tables WHERE schemaname = ''pets_public'' AND tablename = ''owners'' AND rowsecurity = true;'
  ),
  
  -- Grants
  (
    'Grant schema usage',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_public/grants/usage',
    ARRAY['schemas/pets_public/schema']::text[],
    E'GRANT USAGE ON SCHEMA pets_public TO authenticated, anonymous;\nGRANT ALL ON ALL TABLES IN SCHEMA pets_public TO authenticated;\nGRANT SELECT ON ALL TABLES IN SCHEMA pets_public TO anonymous;',
    E'REVOKE ALL ON ALL TABLES IN SCHEMA pets_public FROM authenticated, anonymous;\nREVOKE USAGE ON SCHEMA pets_public FROM authenticated, anonymous;',
    'SELECT 1;'
  );

SET session_replication_role TO DEFAULT;
