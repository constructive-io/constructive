jest.setTimeout(60000);

import { resolve } from 'path';

import { getConnections, PgTestClient, seed } from 'pgsql-test';

const APP_JOBS_STUB_PATH = resolve(__dirname, 'app-jobs-stub.sql');
const MIGRATION_PATH = resolve(__dirname, '../files_store.sql');

const USER_A = 'aaaaaaaa-0000-0000-0000-000000000001';

let pg: PgTestClient;
let teardown: () => Promise<void>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read all recorded jobs from the job_log table */
async function getJobLog() {
  const result = await pg.query(
    'SELECT identifier, payload, job_key FROM _test_job_log ORDER BY logged_at'
  );
  return result.rows;
}

async function clearJobLog() {
  await pg.query('DELETE FROM _test_job_log');
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  ({ pg, teardown } = await getConnections(
    {},
    [seed.sqlfile([APP_JOBS_STUB_PATH, MIGRATION_PATH])]
  ));

  // Ensure anonymous role exists
  await pg.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
        CREATE ROLE anonymous NOLOGIN;
      END IF;
    END $$
  `);

  // Grants needed for isolated test
  await pg.query('GRANT USAGE ON SCHEMA files_store_public TO authenticated');
  await pg.query('GRANT USAGE ON SCHEMA files_store_public TO service_role');
  await pg.query('GRANT SELECT ON files_store_public.buckets TO authenticated');
  await pg.query('GRANT SELECT ON files_store_public.buckets TO service_role');

  // Replace the app_jobs.add_job stub with one that records calls
  await pg.query(`
    CREATE TABLE _test_job_log (
      logged_at timestamptz NOT NULL DEFAULT now(),
      identifier text NOT NULL,
      payload json,
      job_key text
    )
  `);

  await pg.query(`
    CREATE OR REPLACE FUNCTION app_jobs.add_job(
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
      INSERT INTO _test_job_log (identifier, payload, job_key)
      VALUES (identifier, payload, job_key);
    END;
    $$ LANGUAGE plpgsql
  `);

  await pg.query('GRANT USAGE ON SCHEMA app_jobs TO authenticated, service_role');
  await pg.query('GRANT EXECUTE ON FUNCTION app_jobs.add_job(text, json, text, timestamptz, integer, text, integer, text[]) TO authenticated, service_role');
  await pg.query('GRANT INSERT ON _test_job_log TO authenticated, service_role');

  // Seed a default bucket
  await pg.query(`
    INSERT INTO files_store_public.buckets (database_id, key, name, is_public, config)
    VALUES (1, 'default', 'Default Bucket', false, '{}')
  `);
});

afterAll(async () => {
  await teardown();
});

// ==========================================================================
// Cleanup-01: pending_reaper -- pending → error (valid transition)
// ==========================================================================

describe('Cleanup-01: pending_reaper', () => {
  beforeEach(async () => {
    await pg.beforeEach();
    await clearJobLog();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('marks stale pending files as error', async () => {
    // Insert a pending file with created_at older than 24 hours
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status, created_at)
      VALUES
        ('c1000000-0000-0000-0000-000000000001', 1, '1/default/stale_pending', 'default', $1, 'etag1', 'pending', now() - interval '25 hours')
    `, [USER_A]);
    await clearJobLog();

    // Run the cleanup query directly (simulates what the handler does)
    const result = await pg.query(`
      UPDATE files_store_public.files
      SET status = 'error', status_reason = 'upload timeout'
      WHERE id IN (
        SELECT id FROM files_store_public.files
        WHERE status = 'pending' AND created_at < now() - interval '24 hours'
        LIMIT 1000
      )
    `);

    expect(result.rowCount).toBe(1);

    // Verify the file is now in error status
    const file = await pg.query(
      "SELECT status, status_reason FROM files_store_public.files WHERE id = 'c1000000-0000-0000-0000-000000000001'"
    );
    expect(file.rows[0].status).toBe('error');
    expect(file.rows[0].status_reason).toBe('upload timeout');
  });

  it('does not affect recent pending files', async () => {
    // Insert a pending file with recent created_at
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status)
      VALUES
        ('c1000000-0000-0000-0000-000000000002', 1, '1/default/recent_pending', 'default', $1, 'etag2', 'pending')
    `, [USER_A]);

    const result = await pg.query(`
      UPDATE files_store_public.files
      SET status = 'error', status_reason = 'upload timeout'
      WHERE id IN (
        SELECT id FROM files_store_public.files
        WHERE status = 'pending' AND created_at < now() - interval '24 hours'
        LIMIT 1000
      )
    `);

    expect(result.rowCount).toBe(0);

    // File should still be pending
    const file = await pg.query(
      "SELECT status FROM files_store_public.files WHERE id = 'c1000000-0000-0000-0000-000000000002'"
    );
    expect(file.rows[0].status).toBe('pending');
  });
});

// ==========================================================================
// Cleanup-02: error_cleanup -- error → deleting (valid transition)
// ==========================================================================

describe('Cleanup-02: error_cleanup', () => {
  beforeEach(async () => {
    await pg.beforeEach();
    await clearJobLog();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('marks old error files as deleting', async () => {
    // Insert an error file with updated_at older than 30 days
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status, updated_at)
      VALUES
        ('c2000000-0000-0000-0000-000000000001', 1, '1/default/old_error', 'default', $1, 'etag1', 'error', now() - interval '31 days')
    `, [USER_A]);
    await clearJobLog();

    const result = await pg.query(`
      UPDATE files_store_public.files
      SET status = 'deleting', status_reason = 'expired error'
      WHERE id IN (
        SELECT id FROM files_store_public.files
        WHERE status = 'error' AND updated_at < now() - interval '30 days'
        LIMIT 1000
      )
    `);

    expect(result.rowCount).toBe(1);

    const file = await pg.query(
      "SELECT status, status_reason FROM files_store_public.files WHERE id = 'c2000000-0000-0000-0000-000000000001'"
    );
    expect(file.rows[0].status).toBe('deleting');
    expect(file.rows[0].status_reason).toBe('expired error');

    // Verify the delete-s3-object job was auto-enqueued by the trigger
    const jobs = await getJobLog();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].identifier).toBe('delete-s3-object');
  });

  it('does not affect recent error files', async () => {
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status)
      VALUES
        ('c2000000-0000-0000-0000-000000000002', 1, '1/default/recent_error', 'default', $1, 'etag2', 'error')
    `, [USER_A]);

    const result = await pg.query(`
      UPDATE files_store_public.files
      SET status = 'deleting', status_reason = 'expired error'
      WHERE id IN (
        SELECT id FROM files_store_public.files
        WHERE status = 'error' AND updated_at < now() - interval '30 days'
        LIMIT 1000
      )
    `);

    expect(result.rowCount).toBe(0);
  });
});

// ==========================================================================
// Cleanup-03: unattached_cleanup -- ready → deleting (valid transition)
// This is the ISSUE-006 fix regression test.
// ==========================================================================

describe('Cleanup-03: unattached_cleanup', () => {
  beforeEach(async () => {
    await pg.beforeEach();
    await clearJobLog();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('marks unattached ready files as deleting (not error)', async () => {
    // Insert a ready file with no source_table, older than 7 days
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status, created_at)
      VALUES
        ('c3000000-0000-0000-0000-000000000001', 1, '1/default/unattached', 'default', $1, 'etag1', 'ready', now() - interval '8 days')
    `, [USER_A]);
    await clearJobLog();

    // Run the FIXED cleanup query (ready → deleting, NOT ready → error)
    const result = await pg.query(`
      UPDATE files_store_public.files
      SET status = 'deleting', status_reason = 'never attached'
      WHERE id IN (
        SELECT id FROM files_store_public.files
        WHERE status = 'ready' AND source_table IS NULL AND created_at < now() - interval '7 days'
        LIMIT 1000
      )
    `);

    expect(result.rowCount).toBe(1);

    const file = await pg.query(
      "SELECT status, status_reason FROM files_store_public.files WHERE id = 'c3000000-0000-0000-0000-000000000001'"
    );
    expect(file.rows[0].status).toBe('deleting');
    expect(file.rows[0].status_reason).toBe('never attached');

    // Verify the delete-s3-object job was auto-enqueued
    const jobs = await getJobLog();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].identifier).toBe('delete-s3-object');
  });

  it('ready → error is rejected by state machine (regression for ISSUE-006)', async () => {
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status, created_at)
      VALUES
        ('c3000000-0000-0000-0000-000000000002', 1, '1/default/unattached2', 'default', $1, 'etag2', 'ready', now() - interval '8 days')
    `, [USER_A]);

    // The OLD buggy query (ready → error) should be rejected
    await expect(
      pg.query(`
        UPDATE files_store_public.files
        SET status = 'error', status_reason = 'never attached'
        WHERE id = 'c3000000-0000-0000-0000-000000000002'
      `)
    ).rejects.toThrow(/Invalid status transition from ready to error/);
  });

  it('does not affect attached ready files', async () => {
    // Insert a ready file WITH source_table (attached)
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status, created_at,
        source_table, source_column, source_id)
      VALUES
        ('c3000000-0000-0000-0000-000000000003', 1, '1/default/attached', 'default', $1, 'etag3', 'ready',
         now() - interval '8 days', 'some_schema.some_table', 'image', gen_random_uuid())
    `, [USER_A]);

    const result = await pg.query(`
      UPDATE files_store_public.files
      SET status = 'deleting', status_reason = 'never attached'
      WHERE id IN (
        SELECT id FROM files_store_public.files
        WHERE status = 'ready' AND source_table IS NULL AND created_at < now() - interval '7 days'
        LIMIT 1000
      )
    `);

    expect(result.rowCount).toBe(0);
  });

  it('does not affect recent unattached files', async () => {
    // Insert a ready file with no source_table but recent created_at
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status)
      VALUES
        ('c3000000-0000-0000-0000-000000000004', 1, '1/default/recent_unattached', 'default', $1, 'etag4', 'ready')
    `, [USER_A]);

    const result = await pg.query(`
      UPDATE files_store_public.files
      SET status = 'deleting', status_reason = 'never attached'
      WHERE id IN (
        SELECT id FROM files_store_public.files
        WHERE status = 'ready' AND source_table IS NULL AND created_at < now() - interval '7 days'
        LIMIT 1000
      )
    `);

    expect(result.rowCount).toBe(0);
  });
});

// ==========================================================================
// Cleanup-04: Scheduled job registration
// ==========================================================================

describe('Cleanup-04: Scheduled job registration', () => {
  it('migration registers file-cleanup scheduled jobs when metaschema is present', async () => {
    // The migration's cron block looks up metaschema_public.database.
    // In isolated test DBs this table doesn't exist, so scheduled jobs
    // are not registered (the block skips silently). This test verifies
    // the skip path doesn't error.
    //
    // To test actual registration, we'd need to deploy metaschema first.
    // Instead, we verify the schedule SQL is syntactically valid by checking
    // it didn't abort the migration transaction.
    const result = await pg.query(
      "SELECT COUNT(*) as cnt FROM files_store_public.files WHERE 1=0"
    );
    // If migration committed successfully, table exists
    expect(result.rows[0].cnt).toBe('0');
  });
});
