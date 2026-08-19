-- Test data for the database-scope storage plane (tenant "Tess").
--
-- Same rows as the app-scope fixtures, with two differences that are the point
-- of the scenario: the storage module registers under scope 'database', and its
-- tables are the unprefixed `buckets` / `files`.

SET session_replication_role TO replica;

INSERT INTO metaschema_public.database (id, owner_id, name, hash)
VALUES (
  'ce551000-0000-4000-8000-000000000001',
  NULL,
  'tess-storage',
  '737d3f43-3493-8a83-b801-5d2b3f6a4557'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, description, is_public)
VALUES (
  'ce552000-0000-4000-8000-000000000001',
  'ce551000-0000-4000-8000-000000000001',
  'public',
  'tess-storage-public',
  NULL,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_public.table (id, database_id, schema_id, name, description)
VALUES
  ('ce553000-0000-4000-8000-000000000001', 'ce551000-0000-4000-8000-000000000001', 'ce552000-0000-4000-8000-000000000001', 'buckets', NULL),
  ('ce553000-0000-4000-8000-000000000002', 'ce551000-0000-4000-8000-000000000001', 'ce552000-0000-4000-8000-000000000001', 'files', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO routing_public.apis (id, database_id, name, dbname, is_published, role_name, anon_role)
VALUES (
  'ce554000-0000-4000-8000-000000000001',
  'ce551000-0000-4000-8000-000000000001',
  'tess-app',
  current_database(),
  false,
  'authenticated',
  'anonymous'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO routing_public.api_schemas (id, database_id, schema_id, api_id)
VALUES (
  'ce555000-0000-4000-8000-000000000001',
  'ce551000-0000-4000-8000-000000000001',
  'ce552000-0000-4000-8000-000000000001',
  'ce554000-0000-4000-8000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_modules_public.storage_module (
  id,
  database_id,
  schema_id,
  buckets_table_id,
  files_table_id,
  endpoint,
  public_url_prefix,
  provider,
  allowed_origins,
  scope
)
VALUES (
  'ce556000-0000-4000-8000-000000000001',
  'ce551000-0000-4000-8000-000000000001',
  'ce552000-0000-4000-8000-000000000001',
  'ce553000-0000-4000-8000-000000000001',
  'ce553000-0000-4000-8000-000000000002',
  NULL,  -- use global CDN_ENDPOINT
  NULL,  -- use global CDN_PUBLIC_URL_PREFIX
  'minio',
  ARRAY['*'],
  'database'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "tess-storage-public".buckets (id, key, type, is_public)
VALUES
  ('ce557000-0000-4000-8000-000000000001', 'public', 'public', true),
  ('ce557000-0000-4000-8000-000000000002', 'private', 'private', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO routing_public.database_settings (id, database_id)
VALUES (
  'ce558000-0000-4000-8000-000000000001',
  'ce551000-0000-4000-8000-000000000001'
) ON CONFLICT (database_id) DO NOTHING;

SET session_replication_role TO DEFAULT;
