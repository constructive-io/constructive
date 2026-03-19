-- =============================================================================
-- Constructive Upload System -- files_store_public schema
-- =============================================================================
-- Run: psql -h localhost -U postgres -d constructive < migrations/files_store.sql
-- =============================================================================

BEGIN;

-- Ensure required roles exist (idempotent for dev environments)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

-- Require app_jobs.add_job to exist (provided by pgpm-database-jobs).
-- Deploy pgpm-database-jobs BEFORE running this migration.
-- DO NOT stub this function here -- CREATE OR REPLACE would silently overwrite
-- the production implementation, causing all trigger-enqueued jobs to be lost.
CREATE SCHEMA IF NOT EXISTS app_jobs;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'app_jobs' AND p.proname = 'add_job'
  ) THEN
    RAISE EXCEPTION 'app_jobs.add_job not found. Deploy pgpm-database-jobs before running this migration.';
  END IF;
END $$;

-- Ensure schema exists
CREATE SCHEMA IF NOT EXISTS files_store_public;

-- ---------------------------------------------------------------------------
-- 1. Status ENUM
-- ---------------------------------------------------------------------------

CREATE TYPE files_store_public.file_status AS ENUM (
  'pending',
  'processing',
  'ready',
  'error',
  'deleting'
);

COMMENT ON TYPE files_store_public.file_status IS
  'Lifecycle states for managed files. Transitions: pending->{processing,error}, processing->{ready,error,deleting}, ready->deleting, error->{deleting,pending(retry)}.';

-- ---------------------------------------------------------------------------
-- 2. Files Table
-- ---------------------------------------------------------------------------

CREATE TABLE files_store_public.files (
  id            uuid          NOT NULL DEFAULT gen_random_uuid(),
  database_id   uuid          NOT NULL,
  bucket_key    text          NOT NULL DEFAULT 'default',
  key           text          NOT NULL,
  status        files_store_public.file_status NOT NULL DEFAULT 'pending',
  status_reason text,
  etag          text,
  source_table  text,
  source_column text,
  source_id     uuid,
  processing_started_at timestamptz,
  created_by    uuid,
  versions      jsonb,
  mime_type     text,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT files_pkey PRIMARY KEY (id, database_id),
  CONSTRAINT files_key_unique UNIQUE (key, database_id),
  CONSTRAINT files_key_not_empty CHECK (key <> ''),
  CONSTRAINT files_key_max_length CHECK (length(key) <= 1024),
  CONSTRAINT files_bucket_key_format CHECK (bucket_key ~ '^[a-z][a-z0-9_-]*$'),
  CONSTRAINT files_source_table_format CHECK (
    source_table IS NULL OR source_table ~ '^[a-z_]+\.[a-z_]+$'
  ),
  CONSTRAINT files_source_complete CHECK (
    (source_table IS NULL AND source_column IS NULL AND source_id IS NULL)
    OR (source_table IS NOT NULL AND source_column IS NOT NULL AND source_id IS NOT NULL)
  )
);

COMMENT ON TABLE files_store_public.files IS
  'Operational index for S3 objects. One row per uploaded file. Generated versions (thumbnail, medium) stored inline in the versions JSONB column.';
COMMENT ON COLUMN files_store_public.files.key IS
  'Full S3 object key. Format: {database_id}/{bucket_key}/{uuid}_{version_name}. Origin files use _origin suffix.';
COMMENT ON COLUMN files_store_public.files.etag IS
  'S3 ETag for reconciliation and cache validation.';
COMMENT ON COLUMN files_store_public.files.status_reason IS
  'Human-readable reason for current status (error details, deletion reason).';
COMMENT ON COLUMN files_store_public.files.processing_started_at IS
  'Timestamp when processing began. Used to detect stuck jobs (alert at 15 min).';
COMMENT ON COLUMN files_store_public.files.source_table IS
  'Schema-qualified table name referencing this file (e.g. constructive_users_public.users). NULL until the domain trigger populates it. Free text -- no FK possible.';
COMMENT ON COLUMN files_store_public.files.source_column IS
  'Column name on the source table (e.g. profile_picture). NULL until domain trigger populates it.';
COMMENT ON COLUMN files_store_public.files.source_id IS
  'Primary key of the row in the source table. NULL until domain trigger populates it.';
COMMENT ON COLUMN files_store_public.files.versions IS
  'JSONB array of generated versions. Each entry: { key, mime, width, height }. NULL until process-image completes. Non-image files remain NULL.';
COMMENT ON COLUMN files_store_public.files.mime_type IS
  'Detected MIME type of the file. Set at upload time for origins, at processing time for versions.';


-- ---------------------------------------------------------------------------
-- 3. Buckets Table
-- ---------------------------------------------------------------------------

CREATE TABLE files_store_public.buckets (
  id            uuid          NOT NULL DEFAULT gen_random_uuid(),
  database_id   uuid          NOT NULL,
  key           text          NOT NULL,
  name          text          NOT NULL,
  is_public     boolean       NOT NULL DEFAULT false,
  config        jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_by    uuid,
  updated_by    uuid,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT buckets_pkey PRIMARY KEY (id, database_id),
  CONSTRAINT buckets_key_unique UNIQUE (key, database_id),
  CONSTRAINT buckets_key_format CHECK (key ~ '^[a-z][a-z0-9_-]*$')
);

COMMENT ON TABLE files_store_public.buckets IS
  'Logical bucket configuration per tenant. The bucket key maps to the S3 key prefix segment. is_public controls RLS policy for anonymous reads.';

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------

-- Tenant queries
CREATE INDEX files_database_id_idx
  ON files_store_public.files (database_id);

-- Bucket + tenant queries
CREATE INDEX files_bucket_database_id_idx
  ON files_store_public.files (bucket_key, database_id);

-- "My uploads" queries
CREATE INDEX files_created_by_database_id_created_at_idx
  ON files_store_public.files (created_by, database_id, created_at DESC);

-- Back-reference lookups (cleanup worker, attachment queries)
CREATE INDEX files_source_ref_idx
  ON files_store_public.files (source_table, source_column, source_id);

-- Pending file reaper (hourly cron)
CREATE INDEX files_pending_created_at_idx
  ON files_store_public.files (created_at)
  WHERE status = 'pending';

-- Stuck processing detection
CREATE INDEX files_processing_idx
  ON files_store_public.files (processing_started_at)
  WHERE status = 'processing';

-- Deletion job queue
CREATE INDEX files_deleting_idx
  ON files_store_public.files (updated_at)
  WHERE status = 'deleting';

-- Time-range scans on large tables
CREATE INDEX files_created_at_brin_idx
  ON files_store_public.files USING brin (created_at);


-- ---------------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------------

-- 5a. AFTER INSERT -- enqueue process-image job

CREATE OR REPLACE FUNCTION files_store_public.files_after_insert_queue_processing()
RETURNS trigger AS $$
BEGIN
  PERFORM app_jobs.add_job(
    NEW.database_id,
    'process-image',
    json_build_object(
      'file_id', NEW.id,
      'database_id', NEW.database_id
    ),
    job_key := 'file:' || NEW.id::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER files_after_insert_queue_processing
  AFTER INSERT ON files_store_public.files
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION files_store_public.files_after_insert_queue_processing();

COMMENT ON TRIGGER files_after_insert_queue_processing ON files_store_public.files IS
  'Enqueues process-image job for new uploads (status=pending).';

-- 5b. BEFORE UPDATE -- timestamp + state machine

CREATE OR REPLACE FUNCTION files_store_public.files_before_update_timestamp()
RETURNS trigger AS $$
BEGIN
  -- Always update timestamp
  NEW.updated_at := now();

  -- State machine validation (only when status changes)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'pending'    AND NEW.status IN ('processing', 'error'))
      OR (OLD.status = 'processing' AND NEW.status IN ('ready', 'error', 'deleting'))
      OR (OLD.status = 'ready'      AND NEW.status = 'deleting')
      OR (OLD.status = 'error'      AND NEW.status IN ('deleting', 'pending'))
    ) THEN
      RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
    END IF;

    -- Track processing start/end
    IF NEW.status = 'processing' THEN
      NEW.processing_started_at := now();
    ELSIF OLD.status = 'processing' AND NEW.status <> 'processing' THEN
      NEW.processing_started_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER files_before_update_timestamp
  BEFORE UPDATE ON files_store_public.files
  FOR EACH ROW
  EXECUTE FUNCTION files_store_public.files_before_update_timestamp();

COMMENT ON TRIGGER files_before_update_timestamp ON files_store_public.files IS
  'Enforces status transition rules and maintains updated_at / processing_started_at timestamps.';

-- 5c. AFTER UPDATE -- enqueue delete-s3-object job

CREATE OR REPLACE FUNCTION files_store_public.files_after_update_queue_deletion()
RETURNS trigger AS $$
DECLARE
  version_keys json;
BEGIN
  -- Collect version S3 keys from the versions JSONB column
  IF NEW.versions IS NOT NULL THEN
    SELECT json_agg(v->>'key')
    INTO version_keys
    FROM jsonb_array_elements(NEW.versions) v
    WHERE v->>'key' IS NOT NULL;
  END IF;

  PERFORM app_jobs.add_job(
    NEW.database_id,
    'delete-s3-object',
    json_build_object(
      'file_id', NEW.id,
      'database_id', NEW.database_id,
      'key', NEW.key,
      'version_keys', COALESCE(version_keys, '[]'::json)
    ),
    job_key := 'delete:' || NEW.id::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER files_after_update_queue_deletion
  AFTER UPDATE ON files_store_public.files
  FOR EACH ROW
  WHEN (NEW.status = 'deleting' AND OLD.status <> 'deleting')
  EXECUTE FUNCTION files_store_public.files_after_update_queue_deletion();

COMMENT ON TRIGGER files_after_update_queue_deletion ON files_store_public.files IS
  'Enqueues delete-s3-object job when a file transitions to deleting status. Version S3 keys from the versions JSONB column are included in the job payload.';

-- 5d. AFTER UPDATE -- re-enqueue process-image on error->pending retry

CREATE OR REPLACE FUNCTION files_store_public.files_after_update_queue_retry()
RETURNS trigger AS $$
BEGIN
  PERFORM app_jobs.add_job(
    NEW.database_id,
    'process-image',
    json_build_object(
      'file_id', NEW.id,
      'database_id', NEW.database_id
    ),
    job_key := 'file:' || NEW.id::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER files_after_update_queue_retry
  AFTER UPDATE ON files_store_public.files
  FOR EACH ROW
  WHEN (OLD.status = 'error' AND NEW.status = 'pending')
  EXECUTE FUNCTION files_store_public.files_after_update_queue_retry();

COMMENT ON TRIGGER files_after_update_queue_retry ON files_store_public.files IS
  'Re-enqueues process-image job when a file is retried (error->pending). Without this trigger, the retry would change status but never re-enqueue the processing job.';

-- ---------------------------------------------------------------------------
-- 6. RLS Policies & Grants
-- ---------------------------------------------------------------------------

ALTER TABLE files_store_public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE files_store_public.files FORCE ROW LEVEL SECURITY;

-- Policy 1: Tenant isolation (RESTRICTIVE -- always ANDed with all other policies)
-- Without this being RESTRICTIVE, permissive policies would OR together and
-- allow cross-tenant access (e.g. a ready file in tenant 2 visible via files_visibility).
CREATE POLICY files_tenant_isolation ON files_store_public.files
  AS RESTRICTIVE
  FOR ALL
  USING (database_id = current_setting('app.database_id')::uuid)
  WITH CHECK (database_id = current_setting('app.database_id')::uuid);

-- Policy 2: Visibility for SELECT (authenticated + service_role only)
-- Non-ready files visible only to the uploader. Uses NULLIF for safe uuid handling
-- when app.user_id is missing or empty (returns NULL instead of cast error).
-- Scoped to authenticated/service_role so anonymous only gets public_bucket_read.
CREATE POLICY files_visibility ON files_store_public.files
  FOR SELECT
  TO authenticated, service_role
  USING (
    status = 'ready'
    OR created_by = NULLIF(current_setting('app.user_id', true), '')::uuid
  );

-- Policy 3: Public bucket read for SELECT (all roles including anonymous)
CREATE POLICY files_public_bucket_read ON files_store_public.files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM files_store_public.buckets b
      WHERE b.key = bucket_key
        AND b.database_id = files.database_id
        AND b.is_public = true
    )
    AND status = 'ready'
  );

-- Policy 4: Admin override (all operations, authenticated + service_role)
CREATE POLICY files_admin_override ON files_store_public.files
  FOR ALL
  TO authenticated, service_role
  USING (current_setting('app.role', true) = 'administrator')
  WITH CHECK (current_setting('app.role', true) = 'administrator');

-- Policy 5: INSERT access (permissive base so non-admin users can insert)
CREATE POLICY files_insert_access ON files_store_public.files
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Policy 6: UPDATE access (replicates visibility for row targeting)
-- Non-admin users can only update rows they can see (ready or own).
-- Admin override policy covers admin UPDATE access separately.
CREATE POLICY files_update_access ON files_store_public.files
  FOR UPDATE
  TO authenticated, service_role
  USING (
    status = 'ready'
    OR created_by = NULLIF(current_setting('app.user_id', true), '')::uuid
  )
  WITH CHECK (true);

-- Policy 7: DELETE access (service_role only, grants already restrict authenticated)
CREATE POLICY files_delete_access ON files_store_public.files
  FOR DELETE
  TO service_role
  USING (true);

-- Grants
GRANT SELECT, INSERT, UPDATE ON files_store_public.files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON files_store_public.files TO service_role;

COMMENT ON POLICY files_tenant_isolation ON files_store_public.files IS
  'Every query is scoped to the current tenant via app.database_id session variable.';
COMMENT ON POLICY files_visibility ON files_store_public.files IS
  'Users see all ready files in their tenant. Non-ready files visible only to the uploader.';
COMMENT ON POLICY files_public_bucket_read ON files_store_public.files IS
  'Allows unauthenticated reads on ready files in public buckets.';
COMMENT ON POLICY files_admin_override ON files_store_public.files IS
  'Administrators can see and modify all files in the tenant regardless of status or creator.';

-- ---------------------------------------------------------------------------
-- 7. Domain Table Triggers
-- ---------------------------------------------------------------------------

-- 7a. Generic trigger function: back-reference population
--
-- When a domain table's image/upload/attachment column is updated with an S3 key,
-- find the files row by key and populate source_table, source_column, source_id.
-- Also finds version rows by key prefix and populates the same back-reference.
--
-- Parameters (passed via TG_ARGV):
--   TG_ARGV[0] = column name (e.g. 'profile_picture')
--   TG_ARGV[1] = schema-qualified table name (e.g. 'constructive_users_public.users')

CREATE OR REPLACE FUNCTION files_store_public.populate_file_back_reference()
RETURNS trigger AS $$
DECLARE
  col_name text := TG_ARGV[0];
  table_name text := TG_ARGV[1];
  new_val jsonb;
  old_val jsonb;
  new_key text;
  old_key text;
  db_id uuid;
  file_id uuid;
  old_file_id uuid;
  versions_json jsonb;
BEGIN
  -- Get the database_id from session context
  db_id := current_setting('app.database_id')::uuid;

  -- Extract the jsonb value from the specified column (dynamic)
  EXECUTE format('SELECT ($1).%I::jsonb', col_name) INTO new_val USING NEW;
  EXECUTE format('SELECT ($1).%I::jsonb', col_name) INTO old_val USING OLD;

  -- Extract the key from the new and old values
  new_key := new_val ->> 'key';
  old_key := old_val ->> 'key';

  -- If no key change, nothing to do
  IF new_key IS NOT DISTINCT FROM old_key THEN
    RETURN NEW;
  END IF;

  -- Handle file replacement: mark old file as deleting
  IF old_key IS NOT NULL AND old_key <> '' THEN
    SELECT id INTO old_file_id
    FROM files_store_public.files
    WHERE key = old_key AND database_id = db_id;

    IF old_file_id IS NOT NULL THEN
      UPDATE files_store_public.files
      SET status = 'deleting', status_reason = 'replaced by new file'
      WHERE id = old_file_id AND database_id = db_id
        AND status NOT IN ('deleting');
    END IF;
  END IF;

  -- Populate back-reference on new file
  IF new_key IS NOT NULL AND new_key <> '' THEN
    SELECT id, versions INTO file_id, versions_json
    FROM files_store_public.files
    WHERE key = new_key AND database_id = db_id;

    IF file_id IS NOT NULL THEN
      -- Update file row with source back-reference
      UPDATE files_store_public.files
      SET source_table = table_name, source_column = col_name, source_id = NEW.id
      WHERE id = file_id AND database_id = db_id;

      -- Backfill versions into domain JSONB if process-image already completed.
      -- RECURSION GUARD: Only the 'versions' subfield is modified -- the 'key'
      -- field is unchanged, so the IS NOT DISTINCT FROM check above returns early.
      IF versions_json IS NOT NULL THEN
        EXECUTE format(
          'UPDATE %s SET %I = jsonb_set(COALESCE(%I, ''{}''::jsonb), ''{versions}'', $1::jsonb) WHERE id = $2',
          table_name, col_name, col_name
        ) USING versions_json, NEW.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION files_store_public.populate_file_back_reference() IS
  'Generic trigger function for domain tables. Populates source_table/source_column/source_id on files rows when image/upload/attachment columns are updated. Handles file replacement by marking old files as deleting.';

-- 7b. Generic trigger function: source row deletion
--
-- When a domain row is deleted, mark all associated files as deleting.

CREATE OR REPLACE FUNCTION files_store_public.mark_files_deleting_on_source_delete()
RETURNS trigger AS $$
DECLARE
  col_name text := TG_ARGV[0];
  table_name text := TG_ARGV[1];
  db_id uuid;
BEGIN
  db_id := current_setting('app.database_id')::uuid;

  -- Mark all files for this source row + column as deleting
  UPDATE files_store_public.files
  SET status = 'deleting', status_reason = 'source row deleted'
  WHERE database_id = db_id
    AND source_table = table_name
    AND source_column = col_name
    AND source_id = OLD.id
    AND status NOT IN ('deleting');

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION files_store_public.mark_files_deleting_on_source_delete() IS
  'Generic trigger function for domain tables. Marks all associated files as deleting when a domain row is deleted.';

-- 7c. CREATE TRIGGER statements for all 6 tables, 9 columns
--
-- Each domain column gets two triggers:
--   - AFTER UPDATE: back-reference population + file replacement
--   - BEFORE DELETE: mark files deleting on source row deletion
--
-- These are wrapped in a DO block so they gracefully skip tables that
-- don't exist yet (e.g. in fresh dev environments). In production,
-- domain tables will exist before this migration runs.

DO $domain_triggers$
DECLARE
  _tbl text;
BEGIN
  -- constructive_users_public.users.profile_picture
  SELECT 'constructive_users_public.users' INTO _tbl
    FROM information_schema.tables
    WHERE table_schema = 'constructive_users_public' AND table_name = 'users';
  IF FOUND THEN
    EXECUTE 'CREATE TRIGGER users_profile_picture_file_ref
      AFTER UPDATE OF profile_picture ON constructive_users_public.users
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.populate_file_back_reference(''profile_picture'', ''constructive_users_public.users'')';
    EXECUTE 'CREATE TRIGGER users_profile_picture_file_delete
      BEFORE DELETE ON constructive_users_public.users
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.mark_files_deleting_on_source_delete(''profile_picture'', ''constructive_users_public.users'')';
    RAISE NOTICE 'Created triggers for constructive_users_public.users.profile_picture';
  ELSE
    RAISE NOTICE 'Skipped triggers for constructive_users_public.users (table not found)';
  END IF;

  -- constructive_status_public.app_levels.image
  SELECT 'constructive_status_public.app_levels' INTO _tbl
    FROM information_schema.tables
    WHERE table_schema = 'constructive_status_public' AND table_name = 'app_levels';
  IF FOUND THEN
    EXECUTE 'CREATE TRIGGER app_levels_image_file_ref
      AFTER UPDATE OF image ON constructive_status_public.app_levels
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.populate_file_back_reference(''image'', ''constructive_status_public.app_levels'')';
    EXECUTE 'CREATE TRIGGER app_levels_image_file_delete
      BEFORE DELETE ON constructive_status_public.app_levels
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.mark_files_deleting_on_source_delete(''image'', ''constructive_status_public.app_levels'')';
    RAISE NOTICE 'Created triggers for constructive_status_public.app_levels.image';
  ELSE
    RAISE NOTICE 'Skipped triggers for constructive_status_public.app_levels (table not found)';
  END IF;

  -- services_public.sites (og_image, apple_touch_icon, logo, favicon)
  SELECT 'services_public.sites' INTO _tbl
    FROM information_schema.tables
    WHERE table_schema = 'services_public' AND table_name = 'sites';
  IF FOUND THEN
    EXECUTE 'CREATE TRIGGER sites_og_image_file_ref
      AFTER UPDATE OF og_image ON services_public.sites
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.populate_file_back_reference(''og_image'', ''services_public.sites'')';
    EXECUTE 'CREATE TRIGGER sites_og_image_file_delete
      BEFORE DELETE ON services_public.sites
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.mark_files_deleting_on_source_delete(''og_image'', ''services_public.sites'')';

    EXECUTE 'CREATE TRIGGER sites_apple_touch_icon_file_ref
      AFTER UPDATE OF apple_touch_icon ON services_public.sites
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.populate_file_back_reference(''apple_touch_icon'', ''services_public.sites'')';
    EXECUTE 'CREATE TRIGGER sites_apple_touch_icon_file_delete
      BEFORE DELETE ON services_public.sites
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.mark_files_deleting_on_source_delete(''apple_touch_icon'', ''services_public.sites'')';

    EXECUTE 'CREATE TRIGGER sites_logo_file_ref
      AFTER UPDATE OF logo ON services_public.sites
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.populate_file_back_reference(''logo'', ''services_public.sites'')';
    EXECUTE 'CREATE TRIGGER sites_logo_file_delete
      BEFORE DELETE ON services_public.sites
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.mark_files_deleting_on_source_delete(''logo'', ''services_public.sites'')';

    EXECUTE 'CREATE TRIGGER sites_favicon_file_ref
      AFTER UPDATE OF favicon ON services_public.sites
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.populate_file_back_reference(''favicon'', ''services_public.sites'')';
    EXECUTE 'CREATE TRIGGER sites_favicon_file_delete
      BEFORE DELETE ON services_public.sites
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.mark_files_deleting_on_source_delete(''favicon'', ''services_public.sites'')';
    RAISE NOTICE 'Created triggers for services_public.sites (og_image, apple_touch_icon, logo, favicon)';
  ELSE
    RAISE NOTICE 'Skipped triggers for services_public.sites (table not found)';
  END IF;

  -- services_public.apps.app_image
  SELECT 'services_public.apps' INTO _tbl
    FROM information_schema.tables
    WHERE table_schema = 'services_public' AND table_name = 'apps';
  IF FOUND THEN
    EXECUTE 'CREATE TRIGGER apps_app_image_file_ref
      AFTER UPDATE OF app_image ON services_public.apps
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.populate_file_back_reference(''app_image'', ''services_public.apps'')';
    EXECUTE 'CREATE TRIGGER apps_app_image_file_delete
      BEFORE DELETE ON services_public.apps
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.mark_files_deleting_on_source_delete(''app_image'', ''services_public.apps'')';
    RAISE NOTICE 'Created triggers for services_public.apps.app_image';
  ELSE
    RAISE NOTICE 'Skipped triggers for services_public.apps (table not found)';
  END IF;

  -- services_public.site_metadata.og_image
  SELECT 'services_public.site_metadata' INTO _tbl
    FROM information_schema.tables
    WHERE table_schema = 'services_public' AND table_name = 'site_metadata';
  IF FOUND THEN
    EXECUTE 'CREATE TRIGGER site_metadata_og_image_file_ref
      AFTER UPDATE OF og_image ON services_public.site_metadata
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.populate_file_back_reference(''og_image'', ''services_public.site_metadata'')';
    EXECUTE 'CREATE TRIGGER site_metadata_og_image_file_delete
      BEFORE DELETE ON services_public.site_metadata
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.mark_files_deleting_on_source_delete(''og_image'', ''services_public.site_metadata'')';
    RAISE NOTICE 'Created triggers for services_public.site_metadata.og_image';
  ELSE
    RAISE NOTICE 'Skipped triggers for services_public.site_metadata (table not found)';
  END IF;

  -- db_migrate.migrate_files.upload
  SELECT 'db_migrate.migrate_files' INTO _tbl
    FROM information_schema.tables
    WHERE table_schema = 'db_migrate' AND table_name = 'migrate_files';
  IF FOUND THEN
    EXECUTE 'CREATE TRIGGER migrate_files_upload_file_ref
      AFTER UPDATE OF upload ON db_migrate.migrate_files
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.populate_file_back_reference(''upload'', ''db_migrate.migrate_files'')';
    EXECUTE 'CREATE TRIGGER migrate_files_upload_file_delete
      BEFORE DELETE ON db_migrate.migrate_files
      FOR EACH ROW
      EXECUTE FUNCTION files_store_public.mark_files_deleting_on_source_delete(''upload'', ''db_migrate.migrate_files'')';
    RAISE NOTICE 'Created triggers for db_migrate.migrate_files.upload';
  ELSE
    RAISE NOTICE 'Skipped triggers for db_migrate.migrate_files (table not found)';
  END IF;
END
$domain_triggers$;

-- ---------------------------------------------------------------------------
-- 8. Scheduled cleanup jobs (requires pgpm-database-jobs with scheduling)
-- ---------------------------------------------------------------------------
-- Register recurring file-cleanup jobs via app_jobs.add_scheduled_job.
-- The scheduler (knative-job-service) picks these up and spawns one-shot jobs
-- on the configured schedule. Each job calls the file-cleanup function with
-- the appropriate cleanup type.
--
-- Schedules:
--   pending_reaper:     every hour          (clear stale pending uploads)
--   error_cleanup:      daily at 03:00 UTC  (expire old error files)
--   unattached_cleanup: daily at 04:00 UTC  (clean unattached ready files)
-- ---------------------------------------------------------------------------

DO $cron$
DECLARE
  v_db_id uuid;
BEGIN
  -- Look up the database ID for the current database.
  -- If metaschema_public.database is not deployed yet, skip silently.
  BEGIN
    SELECT id INTO v_db_id
    FROM metaschema_public.database
    ORDER BY created_at
    LIMIT 1;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'metaschema_public.database not found, skipping scheduled job registration.';
    RETURN;
  END;

  IF v_db_id IS NULL THEN
    RAISE NOTICE 'No database row found, skipping scheduled job registration.';
    RETURN;
  END IF;

  -- pending_reaper: every hour (minute 0)
  PERFORM app_jobs.add_scheduled_job(
    db_id        := v_db_id,
    identifier   := 'file-cleanup',
    payload      := '{"type":"pending_reaper"}'::json,
    schedule_info := '{"minute": 0}'::json,
    job_key      := 'file-cleanup:pending_reaper',
    queue_name   := 'maintenance',
    max_attempts := 3,
    priority     := 100
  );

  -- error_cleanup: daily at 03:00 UTC
  PERFORM app_jobs.add_scheduled_job(
    db_id        := v_db_id,
    identifier   := 'file-cleanup',
    payload      := '{"type":"error_cleanup"}'::json,
    schedule_info := '{"hour": 3, "minute": 0}'::json,
    job_key      := 'file-cleanup:error_cleanup',
    queue_name   := 'maintenance',
    max_attempts := 3,
    priority     := 100
  );

  -- unattached_cleanup: daily at 04:00 UTC
  PERFORM app_jobs.add_scheduled_job(
    db_id        := v_db_id,
    identifier   := 'file-cleanup',
    payload      := '{"type":"unattached_cleanup"}'::json,
    schedule_info := '{"hour": 4, "minute": 0}'::json,
    job_key      := 'file-cleanup:unattached_cleanup',
    queue_name   := 'maintenance',
    max_attempts := 3,
    priority     := 100
  );

  RAISE NOTICE 'Registered 3 file-cleanup scheduled jobs for database %', v_db_id;
END
$cron$;

COMMIT;
