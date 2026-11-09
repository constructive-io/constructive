-- Test data for the shared database-scope plane. The plane is hosted by
-- database H (the request's database claim); databases A and B each keep their
-- `default` and `default-public` buckets on it. Alice is a member of A only,
-- Bob of B only.

SET session_replication_role TO replica;

INSERT INTO metaschema_public.database (id, owner_id, name, hash)
VALUES
  ('5a4ed000-0000-4000-8000-000000000001', NULL, 'shared-storage-host', '5a4ed000-3493-8a83-b801-5d2b3f6a4557'),
  ('5a4ed000-0000-4000-8000-00000000000a', NULL, 'shared-storage-tenant-a', '5a4ed00a-3493-8a83-b801-5d2b3f6a4557'),
  ('5a4ed000-0000-4000-8000-00000000000b', NULL, 'shared-storage-tenant-b', '5a4ed00b-3493-8a83-b801-5d2b3f6a4557')
ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, description, is_public)
VALUES
  ('5a4ed200-0000-4000-8000-000000000001', '5a4ed000-0000-4000-8000-000000000001', 'public', 'shared-storage-public', NULL, true),
  ('5a4ed200-0000-4000-8000-000000000002', '5a4ed000-0000-4000-8000-000000000001', 'private', 'shared-storage-private', NULL, false),
  ('5a4ed200-0000-4000-8000-000000000003', '5a4ed000-0000-4000-8000-000000000001', 'auth_private', 'shared-storage-auth-private', NULL, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_public.table (id, database_id, schema_id, name, description)
VALUES
  ('5a4ed300-0000-4000-8000-000000000001', '5a4ed000-0000-4000-8000-000000000001', '5a4ed200-0000-4000-8000-000000000001', 'buckets', NULL),
  ('5a4ed300-0000-4000-8000-000000000002', '5a4ed000-0000-4000-8000-000000000001', '5a4ed200-0000-4000-8000-000000000001', 'files', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_public.function (id, database_id, schema_id, name)
VALUES ('5a4ed400-0000-4000-8000-000000000001', '5a4ed000-0000-4000-8000-000000000001', '5a4ed200-0000-4000-8000-000000000003', 'authenticate')
ON CONFLICT (id) DO NOTHING;

INSERT INTO routing_public.rls_settings
  (id, database_id, authenticate_schema_id, authenticate_function_id, authenticate_strict_function_id)
VALUES
  ('5a4ed500-0000-4000-8000-000000000001', '5a4ed000-0000-4000-8000-000000000001',
   '5a4ed200-0000-4000-8000-000000000003', '5a4ed400-0000-4000-8000-000000000001', '5a4ed400-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO routing_public.apis (id, database_id, name, is_published, role_name, anon_role)
VALUES ('5a4ed600-0000-4000-8000-000000000001', '5a4ed000-0000-4000-8000-000000000001', 'shared-storage', false, 'authenticated', 'anonymous')
ON CONFLICT (id) DO NOTHING;

INSERT INTO routing_public.api_schemas (id, database_id, schema_id, api_id)
VALUES ('5a4ed700-0000-4000-8000-000000000001', '5a4ed000-0000-4000-8000-000000000001', '5a4ed200-0000-4000-8000-000000000001', '5a4ed600-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- The deployment's object store: the platform database's platform plane.
INSERT INTO metaschema_public.database (id, owner_id, name, platform)
VALUES ('f1a7f000-0000-4000-8000-000000000001', NULL, 'platform', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_modules_public.storage_module (
  id, database_id, schema_id, buckets_table_id, files_table_id,
  endpoint, provider, region, scope, private_schema_id
)
VALUES (
  'f1a7f000-0000-4000-8000-000000000002',
  'f1a7f000-0000-4000-8000-000000000001',
  '5a4ed200-0000-4000-8000-000000000001', '5a4ed300-0000-4000-8000-000000000001', '5a4ed300-0000-4000-8000-000000000002',
  'http://127.0.0.1:9000', 'minio', 'us-east-1', 'platform', '5a4ed200-0000-4000-8000-000000000002'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO metaschema_modules_public.storage_module (
  id, database_id, schema_id, buckets_table_id, files_table_id,
  allowed_origins, scope, private_schema_id, has_versioning
)
VALUES (
  '5a4ed800-0000-4000-8000-000000000001',
  '5a4ed000-0000-4000-8000-000000000001',
  '5a4ed200-0000-4000-8000-000000000001', '5a4ed300-0000-4000-8000-000000000001', '5a4ed300-0000-4000-8000-000000000002',
  ARRAY['*'], 'database', '5a4ed200-0000-4000-8000-000000000002', true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "shared-storage-public".buckets (id, database_id, key, type, is_public, tags, physical_name)
VALUES
  ('5a4ed900-0000-4000-8000-0000000000a1', '5a4ed000-0000-4000-8000-00000000000a', 'default', 'private', false, ARRAY['default'], 'database-5a4ed00a-default-0000000000a1'),
  ('5a4ed900-0000-4000-8000-0000000000a2', '5a4ed000-0000-4000-8000-00000000000a', 'default-public', 'public', true, ARRAY['default-public'], 'database-5a4ed00a-public-0000000000a2'),
  ('5a4ed900-0000-4000-8000-0000000000b1', '5a4ed000-0000-4000-8000-00000000000b', 'default', 'private', false, ARRAY['default'], 'database-5a4ed00b-default-0000000000b1'),
  ('5a4ed900-0000-4000-8000-0000000000b2', '5a4ed000-0000-4000-8000-00000000000b', 'default-public', 'public', true, ARRAY['default-public'], 'database-5a4ed00b-public-0000000000b2')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "shared-storage-private".database_members (user_id, database_id)
VALUES
  ('a11ce000-0000-4000-8000-000000000001', '5a4ed000-0000-4000-8000-00000000000a'),
  ('b0b00000-0000-4000-8000-000000000001', '5a4ed000-0000-4000-8000-00000000000b')
ON CONFLICT DO NOTHING;

INSERT INTO routing_public.database_settings (id, database_id, enable_introspection)
VALUES ('5a4eda00-0000-4000-8000-000000000001', '5a4ed000-0000-4000-8000-000000000001', true)
ON CONFLICT (database_id) DO NOTHING;

SET session_replication_role TO DEFAULT;
