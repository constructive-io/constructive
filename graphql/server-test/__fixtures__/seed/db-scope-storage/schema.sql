-- Schema for the database-scope storage plane.
--
-- A database-scope plane names its tables `buckets` and `files`, with no module
-- prefix: the plane *is* the database's storage, so there is nothing to
-- disambiguate. The `@storageBuckets`/`@storageFiles` tags are the only thing
-- that marks a plane, and the two tenants here differ only in table naming, so
-- a discovery rule that reads table names instead of tags shows up as a missing
-- upload mutation on this schema.

CREATE SCHEMA IF NOT EXISTS "tess-storage-public";
CREATE SCHEMA IF NOT EXISTS "tess-storage-private";

GRANT USAGE ON SCHEMA "tess-storage-public" TO administrator, authenticated, anonymous;
GRANT USAGE ON SCHEMA "tess-storage-private" TO administrator, authenticated, anonymous;

CREATE TABLE "tess-storage-public".buckets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text NOT NULL,
  type text NOT NULL DEFAULT 'private',
  owner_id uuid,
  is_public boolean NOT NULL DEFAULT false,
  allowed_mime_types text[] NULL,
  max_file_size bigint NULL,
  allow_custom_keys boolean NOT NULL DEFAULT false,
  allowed_origins text[] NULL,
  physical_name text NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (key)
);

COMMENT ON TABLE "tess-storage-public".buckets IS E'@storageBuckets\nStorage buckets table';

CREATE TABLE "tess-storage-public".files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bucket_id uuid NOT NULL REFERENCES "tess-storage-public".buckets(id),
  key text NOT NULL,
  content_hash text NOT NULL,
  mime_type text NOT NULL,
  size bigint,
  filename text,
  owner_id uuid,
  is_public boolean NOT NULL DEFAULT false,
  previous_version_id uuid REFERENCES "tess-storage-public".files(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (bucket_id, key)
);

COMMENT ON TABLE "tess-storage-public".files IS E'@storageFiles\nStorage files table';

GRANT SELECT, INSERT, UPDATE, DELETE ON "tess-storage-public".buckets TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON "tess-storage-public".files TO administrator, authenticated, anonymous;

CREATE FUNCTION "tess-storage-private".files_record_file(
  bucket_id uuid,
  key text,
  content_hash text,
  mime_type text,
  size bigint,
  filename text,
  upload jsonb,
  status text DEFAULT 'requested',
  previous_version_id uuid DEFAULT NULL
) RETURNS "tess-storage-public".files
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
AS $function$
DECLARE
  v_row "tess-storage-public".files;
BEGIN
  INSERT INTO "tess-storage-public".files (
    bucket_id,
    key,
    content_hash,
    mime_type,
    size,
    filename,
    owner_id,
    is_public,
    previous_version_id
  )
  SELECT
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    b.owner_id,
    b.is_public,
    $9
  FROM "tess-storage-public".buckets b
  WHERE b.id = $1
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$function$;

GRANT EXECUTE ON FUNCTION "tess-storage-private".files_record_file(uuid, text, text, text, bigint, text, jsonb, text, uuid)
  TO administrator, authenticated, anonymous;
