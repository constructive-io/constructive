-- Test data for simple-seed-storage scenario
-- Seeds metaschema, services, storage_module, and bucket data

SET session_replication_role TO replica;

-- =====================================================
-- METASCHEMA DATA
-- =====================================================

-- Database entry (ID matches servicesDatabaseId in test file)
INSERT INTO metaschema_public.database (id, owner_id, name, hash)
VALUES (
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  NULL,
  'simple-storage',
  '425a0f10-0170-5760-85df-2a980c378224'
) ON CONFLICT (id) DO NOTHING;

-- Schema entries
INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, description, is_public)
VALUES
  ('6dbae92a-5450-401b-1ed5-d69e7754940d', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'public', 'simple-storage-public', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- Table entries for storage tables
-- buckets
INSERT INTO metaschema_public.table (id, database_id, schema_id, name, description)
VALUES (
  'b0000001-0000-0000-0000-000000000001',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dbae92a-5450-401b-1ed5-d69e7754940d',
  'buckets',
  NULL
) ON CONFLICT (id) DO NOTHING;

-- files
INSERT INTO metaschema_public.table (id, database_id, schema_id, name, description)
VALUES (
  'b0000001-0000-0000-0000-000000000002',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dbae92a-5450-401b-1ed5-d69e7754940d',
  'files',
  NULL
) ON CONFLICT (id) DO NOTHING;

-- upload_requests
INSERT INTO metaschema_public.table (id, database_id, schema_id, name, description)
VALUES (
  'b0000001-0000-0000-0000-000000000003',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dbae92a-5450-401b-1ed5-d69e7754940d',
  'upload_requests',
  NULL
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SERVICES DATA
-- =====================================================

INSERT INTO services_public.apis (id, database_id, name, dbname, is_public, role_name, anon_role)
VALUES
  ('6c9997a4-591b-4cb3-9313-4ef45d6f134e', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'app', current_database(), true, 'authenticated', 'anonymous')
ON CONFLICT (id) DO NOTHING;

INSERT INTO services_public.api_schemas (id, database_id, schema_id, api_id)
VALUES
  ('71181146-890e-4991-9da7-3dddf87d9e01', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dbae92a-5450-401b-1ed5-d69e7754940d', '6c9997a4-591b-4cb3-9313-4ef45d6f134e')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE MODULE CONFIG
-- =====================================================

INSERT INTO metaschema_modules_public.storage_module (
  id,
  database_id,
  schema_id,
  buckets_table_id,
  files_table_id,
  upload_requests_table_id,
  endpoint,
  public_url_prefix,
  provider,
  allowed_origins
)
VALUES (
  'c0000001-0000-0000-0000-000000000001',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dbae92a-5450-401b-1ed5-d69e7754940d',
  'b0000001-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000002',
  'b0000001-0000-0000-0000-000000000003',
  NULL,  -- use global CDN_ENDPOINT
  NULL,  -- use global CDN_PUBLIC_URL_PREFIX
  'minio',
  ARRAY['*']
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- BUCKET SEED DATA
-- =====================================================

INSERT INTO "simple-storage-public".buckets (id, key, type, is_public, owner_id)
VALUES
  ('d0000001-0000-0000-0000-000000000001', 'public', 'public', true, NULL),
  ('d0000001-0000-0000-0000-000000000002', 'private', 'private', false, NULL)
ON CONFLICT (id) DO NOTHING;

SET session_replication_role TO DEFAULT;
