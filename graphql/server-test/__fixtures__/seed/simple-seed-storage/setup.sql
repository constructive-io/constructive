-- Storage-module additions for upload testing
--
-- This file is loaded AFTER simple-seed-services/setup.sql, which already
-- creates all metaschema / services tables, roles, extensions, etc.
-- We only add the bits that are specific to the storage module here.

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
  buckets_table_name text NOT NULL DEFAULT 'app_buckets',
  files_table_name text NOT NULL DEFAULT 'app_files',
  upload_requests_table_name text NOT NULL DEFAULT 'app_upload_requests',
  membership_type int DEFAULT NULL,
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

CREATE UNIQUE INDEX IF NOT EXISTS storage_module_unique_scope
  ON metaschema_modules_public.storage_module (database_id, COALESCE(membership_type, -1));

GRANT SELECT, INSERT, UPDATE, DELETE ON metaschema_modules_public.storage_module TO administrator, authenticated, anonymous;
