-- Test-only stub for app_jobs.add_job.
-- In production, this is provided by pgpm-database-jobs.
-- This file must be loaded BEFORE files_store.sql in test seeds.

CREATE SCHEMA IF NOT EXISTS app_jobs;

CREATE FUNCTION app_jobs.add_job(
  identifier text,
  payload json DEFAULT '{}'::json,
  queue_name text DEFAULT NULL,
  run_at timestamptz DEFAULT NULL,
  max_attempts integer DEFAULT NULL,
  job_key text DEFAULT NULL,
  priority integer DEFAULT NULL,
  flags text[] DEFAULT NULL
) RETURNS void AS $$
BEGIN
  RAISE NOTICE '[TEST STUB] app_jobs.add_job: % %', identifier, payload;
END;
$$ LANGUAGE plpgsql;
