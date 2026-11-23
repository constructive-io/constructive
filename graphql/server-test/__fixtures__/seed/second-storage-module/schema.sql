-- A second storage module in Alice's database, with its own files and buckets
-- tables, so a file can live in a module other than the first one read.

CREATE SCHEMA "second-storage-public";
CREATE SCHEMA "second-storage-public-private";
GRANT USAGE ON SCHEMA "second-storage-public", "second-storage-public-private" TO administrator, authenticated, anonymous;

CREATE TABLE "second-storage-public".team_buckets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'private',
  is_public boolean NOT NULL DEFAULT false,
  physical_name text NULL
);
COMMENT ON TABLE "second-storage-public".team_buckets IS E'@storageBuckets\nStorage buckets table';

CREATE TABLE "second-storage-public".team_files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bucket_id uuid NOT NULL REFERENCES "second-storage-public".team_buckets(id),
  key text NOT NULL,
  content_hash text NOT NULL,
  mime_type text NOT NULL,
  size bigint,
  filename text,
  is_public boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'requested',
  UNIQUE (bucket_id, key)
);
COMMENT ON TABLE "second-storage-public".team_files IS E'@storageFiles\nStorage files table';

GRANT SELECT, INSERT, UPDATE, DELETE ON "second-storage-public".team_buckets, "second-storage-public".team_files
  TO administrator, authenticated, anonymous;

CREATE FUNCTION "second-storage-public-private".team_buckets_physical_name(bucket_id uuid) RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT b.physical_name FROM "second-storage-public".team_buckets b WHERE b.id = team_buckets_physical_name.bucket_id
$$;
GRANT EXECUTE ON FUNCTION "second-storage-public-private".team_buckets_physical_name(uuid) TO administrator, authenticated, anonymous;

INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, description, is_public)
VALUES
  ('5ec0d000-0000-4000-8000-000000000001', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'second', 'second-storage-public', NULL, true),
  ('5ec0d000-0000-4000-8000-000000000002', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'second_private', 'second-storage-public-private', NULL, false);

INSERT INTO metaschema_public.table (id, database_id, schema_id, name, description)
VALUES
  ('5ec0d000-0000-4000-8000-000000000003', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '5ec0d000-0000-4000-8000-000000000001', 'team_buckets', NULL),
  ('5ec0d000-0000-4000-8000-000000000004', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '5ec0d000-0000-4000-8000-000000000001', 'team_files', NULL);

INSERT INTO metaschema_modules_public.storage_module (
  id, database_id, schema_id, buckets_table_id, files_table_id, scope, private_schema_id
)
VALUES (
  '5ec0d000-0000-4000-8000-000000000005', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '5ec0d000-0000-4000-8000-000000000001', '5ec0d000-0000-4000-8000-000000000003', '5ec0d000-0000-4000-8000-000000000004',
  'team', '5ec0d000-0000-4000-8000-000000000002'
);

INSERT INTO "second-storage-public".team_buckets (id, key, type, is_public, physical_name)
VALUES ('5ec0d000-0000-4000-8000-000000000006', 'private', 'private', false, 'team-80a2eaaf-private-0123456789ab');
