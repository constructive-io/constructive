-- A shared database-scope storage plane: one buckets/files pair hosted by one
-- database (the storage host's, whose id is the request's database claim) that
-- holds the rows of many databases, each keyed by its `database_id` column.
-- Membership decides which databases' rows a caller may read and write, the way
-- the platform's database-scope plane gates tenant rows.

CREATE SCHEMA "shared-storage-public";
CREATE SCHEMA "shared-storage-private";
CREATE SCHEMA "shared-storage-auth-private";
GRANT USAGE ON SCHEMA "shared-storage-public" TO administrator, authenticated, anonymous;
GRANT USAGE ON SCHEMA "shared-storage-private" TO administrator, authenticated, anonymous;
GRANT USAGE ON SCHEMA "shared-storage-auth-private" TO authenticated, anonymous;

CREATE TABLE "shared-storage-private".database_members (
  user_id uuid NOT NULL,
  database_id uuid NOT NULL,
  PRIMARY KEY (user_id, database_id)
);
GRANT SELECT ON "shared-storage-private".database_members TO authenticated;

CREATE TABLE "shared-storage-public".buckets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  key text NOT NULL,
  type text NOT NULL DEFAULT 'private',
  is_public boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  allowed_mime_types text[] NULL,
  max_file_size bigint NULL,
  allow_custom_keys boolean NOT NULL DEFAULT false,
  allowed_origins text[] NULL,
  physical_name text NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (database_id, key)
);

COMMENT ON TABLE "shared-storage-public".buckets IS E'@storageBuckets\nStorage buckets table';

CREATE TABLE "shared-storage-public".files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id uuid NOT NULL,
  bucket_id uuid NOT NULL REFERENCES "shared-storage-public".buckets(id),
  key text NOT NULL,
  content_hash text NOT NULL,
  mime_type text NOT NULL,
  size bigint,
  filename text,
  owner_id uuid,
  is_public boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'requested',
  previous_version_id uuid REFERENCES "shared-storage-public".files(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (bucket_id, key)
);

COMMENT ON TABLE "shared-storage-public".files IS E'@storageFiles\nStorage files table';

GRANT SELECT, INSERT, UPDATE, DELETE ON "shared-storage-public".buckets TO administrator, authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON "shared-storage-public".files TO administrator, authenticated, anonymous;

ALTER TABLE "shared-storage-public".buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared-storage-public".files ENABLE ROW LEVEL SECURITY;

CREATE POLICY members_select ON "shared-storage-public".buckets FOR SELECT TO authenticated
  USING (database_id IN (
    SELECT m.database_id FROM "shared-storage-private".database_members m
    WHERE m.user_id = current_setting('jwt.claims.user_id', true)::uuid
  ));

CREATE POLICY members_select ON "shared-storage-public".files FOR SELECT TO authenticated
  USING (database_id IN (
    SELECT m.database_id FROM "shared-storage-private".database_members m
    WHERE m.user_id = current_setting('jwt.claims.user_id', true)::uuid
  ));

CREATE POLICY members_insert ON "shared-storage-public".files FOR INSERT TO authenticated
  WITH CHECK (database_id IN (
    SELECT m.database_id FROM "shared-storage-private".database_members m
    WHERE m.user_id = current_setting('jwt.claims.user_id', true)::uuid
  ));

-- The file inherits its database from its bucket, as the generated plane's
-- files_inherit_from_parent trigger does.
CREATE FUNCTION "shared-storage-private".files_record_file(
  bucket_id uuid,
  key text,
  content_hash text,
  mime_type text,
  size bigint,
  filename text,
  upload jsonb,
  status text DEFAULT 'requested',
  previous_version_id uuid DEFAULT NULL
) RETURNS "shared-storage-public".files
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
AS $function$
DECLARE
  v_row "shared-storage-public".files;
BEGIN
  INSERT INTO "shared-storage-public".files (
    database_id, bucket_id, key, content_hash, mime_type, size, filename, is_public, previous_version_id
  )
  SELECT b.database_id, $1, $2, $3, $4, $5, $6, b.is_public, $9
  FROM "shared-storage-public".buckets b
  WHERE b.id = $1
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$function$;

GRANT EXECUTE ON FUNCTION "shared-storage-private".files_record_file(uuid, text, text, text, bigint, text, jsonb, text, uuid)
  TO administrator, authenticated, anonymous;

-- Stand-in auth module: each fixture token signs in one user.
CREATE FUNCTION "shared-storage-auth-private".authenticate(token_str text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  session_id uuid,
  access_level text,
  kind text,
  principal_id uuid,
  root_session_id uuid,
  parent_session_id uuid,
  intent text
) AS $$
  SELECT t.id, t.user_id, NULL::uuid, 'full'::text, 'session'::text, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text
  FROM (VALUES
    ('a11ce000-0000-4000-8000-000000000003'::uuid, 'a11ce000-0000-4000-8000-000000000001'::uuid, 'alice-token'),
    ('b0b00000-0000-4000-8000-000000000003'::uuid, 'b0b00000-0000-4000-8000-000000000001'::uuid, 'bob-token')
  ) AS t(id, user_id, token)
  WHERE t.token = token_str;
$$ LANGUAGE sql STABLE;
