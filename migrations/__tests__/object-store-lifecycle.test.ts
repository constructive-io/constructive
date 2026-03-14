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

async function switchRole(
  role: string,
  context: Record<string, string> = {}
) {
  await pg.query(`SET LOCAL ROLE ${role}`);
  for (const [key, value] of Object.entries(context)) {
    await pg.query('SELECT set_config($1, $2, true)', [key, value]);
  }
}

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

  // Grants needed for isolated test (normally from pgpm extension deploy)
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

  // Grant app_jobs access to roles that trigger job-enqueuing functions.
  // In production, the database-jobs pgpm module handles these grants.
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
// E2E-01: Full Upload Lifecycle (happy path)
// ==========================================================================

describe('E2E-01: Upload Lifecycle -- happy path', () => {
  const ORIGIN_ID = '10000000-0000-0000-0000-000000000001';
  const ORIGIN_KEY = '1/default/abc123_origin';
  const VERSION_THUMB_KEY = '1/default/abc123_thumb';
  const VERSION_LARGE_KEY = '1/default/abc123_large';

  beforeEach(async () => {
    await pg.beforeEach();
    await clearJobLog();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('step 1: user uploads file → status=pending, process-image job queued', async () => {
    // Authenticated user inserts a file (simulates upload endpoint)
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag)
      VALUES ($1, 1, $2, 'default', $3, 'etag-origin')
    `, [ORIGIN_ID, ORIGIN_KEY, USER_A]);

    // Verify file exists with pending status
    const file = await pg.query(
      'SELECT * FROM files_store_public.files WHERE id = $1',
      [ORIGIN_ID]
    );
    expect(file.rowCount).toBe(1);
    expect(file.rows[0].status).toBe('pending');
    expect(file.rows[0].created_by).toBe(USER_A);

    // Verify process-image job was queued (read job log as superuser)
    await pg.query('RESET ROLE');
    const jobs = await getJobLog();
    expect(jobs).toEqual([
      expect.objectContaining({
        identifier: 'process-image',
        job_key: `file:${ORIGIN_ID}`,
      }),
    ]);
    const payload = jobs[0].payload;
    expect(payload.file_id).toBe(ORIGIN_ID);
    expect(payload.database_id).toBe(1);
  });

  it('step 2: service_role transitions pending → processing', async () => {
    // Insert as superuser first
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status)
      VALUES ($1, 1, $2, 'default', $3, 'etag-origin', 'pending')
    `, [ORIGIN_ID, ORIGIN_KEY, USER_A]);
    await clearJobLog();

    // Service role picks up the job
    await switchRole('service_role', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    await pg.query(
      `UPDATE files_store_public.files SET status = 'processing' WHERE id = $1 AND database_id = 1`,
      [ORIGIN_ID]
    );

    // Verify processing_started_at is set
    await pg.query('RESET ROLE');
    const file = await pg.query(
      'SELECT status, processing_started_at FROM files_store_public.files WHERE id = $1',
      [ORIGIN_ID]
    );
    expect(file.rows[0].status).toBe('processing');
    expect(file.rows[0].processing_started_at).not.toBeNull();
  });

  it('step 3: service_role inserts version rows (status=ready, bypasses job trigger)', async () => {
    // Setup: origin in processing state
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status)
      VALUES ($1, 1, $2, 'default', $3, 'etag-origin', 'processing')
    `, [ORIGIN_ID, ORIGIN_KEY, USER_A]);
    await clearJobLog();

    // Service role creates version rows with status='ready'
    await switchRole('service_role', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    await pg.query(`
      INSERT INTO files_store_public.files (database_id, key, bucket_key, created_by, etag, status)
      VALUES
        (1, $1, 'default', $2, 'etag-thumb', 'ready'),
        (1, $3, 'default', $2, 'etag-large', 'ready')
    `, [VERSION_THUMB_KEY, USER_A, VERSION_LARGE_KEY]);

    // Version rows with status='ready' should NOT trigger process-image
    await pg.query('RESET ROLE');
    const jobs = await getJobLog();
    expect(jobs).toHaveLength(0);

    // Verify all three rows exist
    const files = await pg.query(
      `SELECT key, status FROM files_store_public.files WHERE database_id = 1 ORDER BY key`
    );
    expect(files.rowCount).toBe(3);
    expect(files.rows.map((r: any) => ({ key: r.key, status: r.status }))).toEqual([
      { key: VERSION_LARGE_KEY, status: 'ready' },
      { key: ORIGIN_KEY, status: 'processing' },
      { key: VERSION_THUMB_KEY, status: 'ready' },
    ]);
  });

  it('step 4: service_role transitions origin processing → ready', async () => {
    // Setup: origin in processing state
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status)
      VALUES ($1, 1, $2, 'default', $3, 'etag-origin', 'processing')
    `, [ORIGIN_ID, ORIGIN_KEY, USER_A]);

    await switchRole('service_role', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    await pg.query(
      `UPDATE files_store_public.files SET status = 'ready' WHERE id = $1 AND database_id = 1`,
      [ORIGIN_ID]
    );

    // Verify status and processing_started_at cleared
    await pg.query('RESET ROLE');
    const file = await pg.query(
      'SELECT status, processing_started_at, updated_at, created_at FROM files_store_public.files WHERE id = $1',
      [ORIGIN_ID]
    );
    expect(file.rows[0].status).toBe('ready');
    expect(file.rows[0].processing_started_at).toBeNull();
    // updated_at should be refreshed
    expect(new Date(file.rows[0].updated_at).getTime())
      .toBeGreaterThanOrEqual(new Date(file.rows[0].created_at).getTime());
  });

  it('step 5: user sees origin + versions after processing completes', async () => {
    // Setup: origin ready + 2 version rows ready
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status)
      VALUES
        ($1, 1, $2, 'default', $4, 'etag-origin', 'ready'),
        (gen_random_uuid(), 1, $3, 'default', $4, 'etag-thumb', 'ready'),
        (gen_random_uuid(), 1, $5, 'default', $4, 'etag-large', 'ready')
    `, [ORIGIN_ID, ORIGIN_KEY, VERSION_THUMB_KEY, USER_A, VERSION_LARGE_KEY]);

    // Authenticated user queries
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    const files = await pg.query(
      `SELECT key, status FROM files_store_public.files WHERE key LIKE '1/default/abc123%' ORDER BY key`
    );
    expect(files.rowCount).toBe(3);
    expect(files.rows.every((r: any) => r.status === 'ready')).toBe(true);
  });
});

// ==========================================================================
// E2E-02: Error + Retry Path
// ==========================================================================

describe('E2E-02: Error + Retry Path', () => {
  const ORIGIN_ID = '20000000-0000-0000-0000-000000000001';
  const ORIGIN_KEY = '1/default/err123_origin';

  beforeEach(async () => {
    await pg.beforeEach();
    await clearJobLog();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('processing → error stores status_reason', async () => {
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status)
      VALUES ($1, 1, $2, 'default', $3, 'etag', 'processing')
    `, [ORIGIN_ID, ORIGIN_KEY, USER_A]);

    await switchRole('service_role', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    await pg.query(
      `UPDATE files_store_public.files
       SET status = 'error', status_reason = 'sharp: unsupported image format'
       WHERE id = $1 AND database_id = 1`,
      [ORIGIN_ID]
    );

    await pg.query('RESET ROLE');
    const file = await pg.query(
      'SELECT status, status_reason, processing_started_at FROM files_store_public.files WHERE id = $1',
      [ORIGIN_ID]
    );
    expect(file.rows[0].status).toBe('error');
    expect(file.rows[0].status_reason).toBe('sharp: unsupported image format');
    // processing_started_at cleared on exit from processing
    expect(file.rows[0].processing_started_at).toBeNull();
  });

  it('error → pending (retry) re-queues process-image job', async () => {
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status)
      VALUES ($1, 1, $2, 'default', $3, 'etag', 'error')
    `, [ORIGIN_ID, ORIGIN_KEY, USER_A]);
    await clearJobLog();

    await switchRole('service_role', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    await pg.query(
      `UPDATE files_store_public.files SET status = 'pending' WHERE id = $1 AND database_id = 1`,
      [ORIGIN_ID]
    );

    // Verify retry job queued
    await pg.query('RESET ROLE');
    const jobs = await getJobLog();
    expect(jobs).toEqual([
      expect.objectContaining({
        identifier: 'process-image',
        job_key: `file:${ORIGIN_ID}`,
      }),
    ]);
  });

  it('full retry cycle: pending → processing → error → pending → processing → ready', async () => {
    // Step 1: upload (pending)
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag)
      VALUES ($1, 1, $2, 'default', $3, 'etag')
    `, [ORIGIN_ID, ORIGIN_KEY, USER_A]);

    await clearJobLog();

    // Step 2: processing
    await pg.query(
      `UPDATE files_store_public.files SET status = 'processing' WHERE id = $1`,
      [ORIGIN_ID]
    );
    let file = await pg.query('SELECT * FROM files_store_public.files WHERE id = $1', [ORIGIN_ID]);
    expect(file.rows[0].status).toBe('processing');
    expect(file.rows[0].processing_started_at).not.toBeNull();

    // Step 3: error
    await pg.query(
      `UPDATE files_store_public.files SET status = 'error', status_reason = 'timeout' WHERE id = $1`,
      [ORIGIN_ID]
    );
    file = await pg.query('SELECT * FROM files_store_public.files WHERE id = $1', [ORIGIN_ID]);
    expect(file.rows[0].status).toBe('error');
    expect(file.rows[0].processing_started_at).toBeNull();

    // Step 4: retry (error → pending) — should re-queue job
    await pg.query(
      `UPDATE files_store_public.files SET status = 'pending' WHERE id = $1`,
      [ORIGIN_ID]
    );
    let jobs = await getJobLog();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].identifier).toBe('process-image');

    // Step 5: processing again
    await clearJobLog();
    await pg.query(
      `UPDATE files_store_public.files SET status = 'processing' WHERE id = $1`,
      [ORIGIN_ID]
    );

    // Step 6: ready
    await pg.query(
      `UPDATE files_store_public.files SET status = 'ready' WHERE id = $1`,
      [ORIGIN_ID]
    );
    file = await pg.query('SELECT * FROM files_store_public.files WHERE id = $1', [ORIGIN_ID]);
    expect(file.rows[0].status).toBe('ready');
    expect(file.rows[0].processing_started_at).toBeNull();
  });
});

// ==========================================================================
// E2E-03: Deletion Flow
// ==========================================================================

describe('E2E-03: Deletion Flow', () => {
  const ORIGIN_ID = '30000000-0000-0000-0000-000000000001';
  const ORIGIN_KEY = '1/default/del123_origin';
  const VERSION_KEY = '1/default/del123_thumb';

  beforeEach(async () => {
    await pg.beforeEach();
    await clearJobLog();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('ready → deleting queues delete-s3-object job', async () => {
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status)
      VALUES ($1, 1, $2, 'default', $3, 'etag', 'ready')
    `, [ORIGIN_ID, ORIGIN_KEY, USER_A]);
    await clearJobLog();

    await pg.query(
      `UPDATE files_store_public.files SET status = 'deleting' WHERE id = $1`,
      [ORIGIN_ID]
    );

    const jobs = await getJobLog();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].identifier).toBe('delete-s3-object');
    expect(jobs[0].job_key).toBe(`delete:${ORIGIN_ID}`);
    expect(jobs[0].payload.key).toBe(ORIGIN_KEY);
  });

  it('deleting origin + version rows each queue separate jobs', async () => {
    const VERSION_ID = '30000000-0000-0000-0000-000000000002';
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status)
      VALUES
        ($1, 1, $2, 'default', $4, 'etag-origin', 'ready'),
        ($3, 1, $5, 'default', $4, 'etag-thumb', 'ready')
    `, [ORIGIN_ID, ORIGIN_KEY, VERSION_ID, USER_A, VERSION_KEY]);
    await clearJobLog();

    // Delete both
    await pg.query(
      `UPDATE files_store_public.files SET status = 'deleting'
       WHERE database_id = 1 AND key LIKE '1/default/del123%'`
    );

    const jobs = await getJobLog();
    expect(jobs).toHaveLength(2);
    const keys = jobs.map((j: any) => j.payload.key).sort();
    expect(keys).toEqual([ORIGIN_KEY, VERSION_KEY]);
  });

  it('error → deleting is valid (skip processing on permanent failure)', async () => {
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status)
      VALUES ($1, 1, $2, 'default', $3, 'etag', 'error')
    `, [ORIGIN_ID, ORIGIN_KEY, USER_A]);
    await clearJobLog();

    await pg.query(
      `UPDATE files_store_public.files SET status = 'deleting', status_reason = 'user cancelled'
       WHERE id = $1`,
      [ORIGIN_ID]
    );

    const file = await pg.query('SELECT status, status_reason FROM files_store_public.files WHERE id = $1', [ORIGIN_ID]);
    expect(file.rows[0].status).toBe('deleting');
    expect(file.rows[0].status_reason).toBe('user cancelled');

    const jobs = await getJobLog();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].identifier).toBe('delete-s3-object');
  });

  it('service_role can hard-DELETE after marking as deleting', async () => {
    await pg.query(`
      INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status)
      VALUES ($1, 1, $2, 'default', $3, 'etag', 'deleting')
    `, [ORIGIN_ID, ORIGIN_KEY, USER_A]);

    await switchRole('service_role', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    const result = await pg.query(
      'DELETE FROM files_store_public.files WHERE id = $1 AND database_id = 1',
      [ORIGIN_ID]
    );
    expect(result.rowCount).toBe(1);

    // Verify gone
    await pg.query('RESET ROLE');
    const check = await pg.query(
      'SELECT * FROM files_store_public.files WHERE id = $1',
      [ORIGIN_ID]
    );
    expect(check.rowCount).toBe(0);
  });
});

// ==========================================================================
// E2E-04: State Machine Validation
// ==========================================================================

describe('E2E-04: State Machine Validation', () => {
  const ORIGIN_ID = '40000000-0000-0000-0000-000000000001';
  const ORIGIN_KEY = '1/default/sm123_origin';

  beforeEach(async () => {
    await pg.beforeEach();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  const invalidTransitions = [
    ['pending', 'ready'],
    ['pending', 'deleting'],
    ['processing', 'pending'],
    ['ready', 'pending'],
    ['ready', 'processing'],
    ['ready', 'error'],
    ['error', 'processing'],
    ['error', 'ready'],
  ];

  it.each(invalidTransitions)(
    'rejects %s → %s',
    async (from, to) => {
      await pg.query(`
        INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status)
        VALUES ($1, 1, $2, 'default', $3, 'etag', $4)
      `, [ORIGIN_ID, ORIGIN_KEY, USER_A, from]);

      await expect(
        pg.query(
          `UPDATE files_store_public.files SET status = $1 WHERE id = $2`,
          [to, ORIGIN_ID]
        )
      ).rejects.toThrow(/Invalid status transition/);
    }
  );

  const validTransitions = [
    ['pending', 'processing'],
    ['pending', 'error'],
    ['processing', 'ready'],
    ['processing', 'error'],
    ['processing', 'deleting'],
    ['ready', 'deleting'],
    ['error', 'deleting'],
    ['error', 'pending'],
  ];

  it.each(validTransitions)(
    'allows %s → %s',
    async (from, to) => {
      await pg.query(`
        INSERT INTO files_store_public.files (id, database_id, key, bucket_key, created_by, etag, status)
        VALUES ($1, 1, $2, 'default', $3, 'etag', $4)
      `, [ORIGIN_ID, ORIGIN_KEY, USER_A, from]);

      await pg.query(
        `UPDATE files_store_public.files SET status = $1 WHERE id = $2`,
        [to, ORIGIN_ID]
      );

      const file = await pg.query(
        'SELECT status FROM files_store_public.files WHERE id = $1',
        [ORIGIN_ID]
      );
      expect(file.rows[0].status).toBe(to);
    }
  );
});

// ==========================================================================
// E2E-05: Constraints
// ==========================================================================

describe('E2E-05: Constraints', () => {
  beforeEach(async () => {
    await pg.beforeEach();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('rejects empty key', async () => {
    await expect(
      pg.query(`
        INSERT INTO files_store_public.files (database_id, key, bucket_key, etag)
        VALUES (1, '', 'default', 'x')
      `)
    ).rejects.toThrow(/files_key_not_empty/);
  });

  it('rejects key exceeding 1024 chars', async () => {
    const longKey = '1/default/' + 'a'.repeat(1020);
    await expect(
      pg.query(`
        INSERT INTO files_store_public.files (database_id, key, bucket_key, etag)
        VALUES (1, $1, 'default', 'x')
      `, [longKey])
    ).rejects.toThrow(/files_key_max_length/);
  });

  it('rejects invalid bucket_key format', async () => {
    await expect(
      pg.query(`
        INSERT INTO files_store_public.files (database_id, key, bucket_key, etag)
        VALUES (1, '1/BAD/test_origin', 'BAD-BUCKET', 'x')
      `)
    ).rejects.toThrow(/files_bucket_key_format/);
  });

  it('rejects partial source reference (source_table without source_column)', async () => {
    await expect(
      pg.query(`
        INSERT INTO files_store_public.files (database_id, key, bucket_key, etag, source_table)
        VALUES (1, '1/default/partial_origin', 'default', 'x', 'some_schema.some_table')
      `)
    ).rejects.toThrow(/files_source_complete/);
  });

  it('accepts complete source reference', async () => {
    const result = await pg.query(`
      INSERT INTO files_store_public.files
        (database_id, key, bucket_key, etag, source_table, source_column, source_id)
      VALUES (1, '1/default/ref_origin', 'default', 'x',
              'some_schema.some_table', 'image', gen_random_uuid())
      RETURNING source_table, source_column, source_id
    `);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].source_table).toBe('some_schema.some_table');
  });

  it('enforces unique key per tenant', async () => {
    await pg.query(`
      INSERT INTO files_store_public.files (database_id, key, bucket_key, etag)
      VALUES (1, '1/default/dup_origin', 'default', 'e1')
    `);

    await expect(
      pg.query(`
        INSERT INTO files_store_public.files (database_id, key, bucket_key, etag)
        VALUES (1, '1/default/dup_origin', 'default', 'e2')
      `)
    ).rejects.toThrow(/files_key_unique/);
  });

  it('allows same key in different tenants', async () => {
    await pg.query(`
      INSERT INTO files_store_public.files (database_id, key, bucket_key, etag)
      VALUES (1, '1/default/shared_origin', 'default', 'e1')
    `);

    const result = await pg.query(`
      INSERT INTO files_store_public.files (database_id, key, bucket_key, etag)
      VALUES (2, '1/default/shared_origin', 'default', 'e2')
      RETURNING *
    `);
    expect(result.rowCount).toBe(1);
  });
});

// ==========================================================================
// E2E-06: Full E2E -- upload through versions processed (under RLS)
// ==========================================================================

describe('E2E-06: Full lifecycle under RLS', () => {
  const ORIGIN_KEY = '1/default/full_e2e_origin';
  const THUMB_KEY = '1/default/full_e2e_thumb';
  const LARGE_KEY = '1/default/full_e2e_large';

  beforeEach(async () => {
    await pg.beforeEach();
    await pg.query(`
      INSERT INTO files_store_public.buckets (database_id, key, name, is_public, config)
      VALUES (1, 'default', 'Default Bucket', false, '{}')
      ON CONFLICT DO NOTHING
    `);
    await clearJobLog();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('complete upload → process → versions → ready → visible → delete', async () => {
    // ---------------------------------------------------------------
    // 1. User uploads an image (INSERT as authenticated)
    // ---------------------------------------------------------------
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    await pg.query(`
      INSERT INTO files_store_public.files (database_id, key, bucket_key, created_by, etag)
      VALUES (1, $1, 'default', $2, 'etag-origin')
    `, [ORIGIN_KEY, USER_A]);

    // Verify: user sees their pending file
    let myFiles = await pg.query(
      `SELECT key, status FROM files_store_public.files WHERE key = $1`,
      [ORIGIN_KEY]
    );
    expect(myFiles.rowCount).toBe(1);
    expect(myFiles.rows[0].status).toBe('pending');

    // Verify: process-image job queued
    await pg.query('RESET ROLE');
    let jobs = await getJobLog();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].identifier).toBe('process-image');

    // Get the origin ID for later
    const originRow = await pg.query(
      `SELECT id FROM files_store_public.files WHERE key = $1 AND database_id = 1`,
      [ORIGIN_KEY]
    );
    const originId = originRow.rows[0].id;

    // ---------------------------------------------------------------
    // 2. Job worker picks up → pending → processing (as service_role)
    // ---------------------------------------------------------------
    await clearJobLog();
    await switchRole('service_role', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    await pg.query(
      `UPDATE files_store_public.files SET status = 'processing' WHERE id = $1 AND database_id = 1`,
      [originId]
    );

    await pg.query('RESET ROLE');
    let origin = await pg.query(
      'SELECT status, processing_started_at FROM files_store_public.files WHERE id = $1',
      [originId]
    );
    expect(origin.rows[0].status).toBe('processing');
    expect(origin.rows[0].processing_started_at).not.toBeNull();

    // ---------------------------------------------------------------
    // 3. Processor creates version rows (thumb + large)
    // ---------------------------------------------------------------
    await switchRole('service_role', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    await pg.query(`
      INSERT INTO files_store_public.files (database_id, key, bucket_key, created_by, etag, status)
      VALUES
        (1, $1, 'default', $2, 'etag-thumb', 'ready'),
        (1, $3, 'default', $2, 'etag-large', 'ready')
    `, [THUMB_KEY, USER_A, LARGE_KEY]);

    // No additional jobs should be queued (version rows are ready, not pending)
    await pg.query('RESET ROLE');
    jobs = await getJobLog();
    expect(jobs).toHaveLength(0);

    // ---------------------------------------------------------------
    // 4. Processor marks origin as ready
    // ---------------------------------------------------------------
    await switchRole('service_role', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    await pg.query(
      `UPDATE files_store_public.files SET status = 'ready' WHERE id = $1 AND database_id = 1`,
      [originId]
    );

    await pg.query('RESET ROLE');
    origin = await pg.query(
      'SELECT status, processing_started_at FROM files_store_public.files WHERE id = $1',
      [originId]
    );
    expect(origin.rows[0].status).toBe('ready');
    expect(origin.rows[0].processing_started_at).toBeNull();

    // ---------------------------------------------------------------
    // 5. User can see all 3 files (origin + 2 versions)
    // ---------------------------------------------------------------
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    const allFiles = await pg.query(
      `SELECT key, status FROM files_store_public.files
       WHERE key LIKE '1/default/full_e2e%'
       ORDER BY key`
    );
    expect(allFiles.rowCount).toBe(3);
    expect(allFiles.rows).toEqual([
      { key: LARGE_KEY, status: 'ready' },
      { key: ORIGIN_KEY, status: 'ready' },
      { key: THUMB_KEY, status: 'ready' },
    ]);

    // ---------------------------------------------------------------
    // 6. Deletion: mark all as deleting (as service_role)
    // ---------------------------------------------------------------
    await pg.query('RESET ROLE');
    await clearJobLog();

    await switchRole('service_role', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    await pg.query(
      `UPDATE files_store_public.files SET status = 'deleting'
       WHERE key LIKE '1/default/full_e2e%' AND database_id = 1`
    );

    // All 3 deletion jobs queued
    await pg.query('RESET ROLE');
    jobs = await getJobLog();
    expect(jobs).toHaveLength(3);
    expect(jobs.every((j: any) => j.identifier === 'delete-s3-object')).toBe(true);
    const deletedKeys = jobs.map((j: any) => j.payload.key).sort();
    expect(deletedKeys).toEqual([LARGE_KEY, ORIGIN_KEY, THUMB_KEY]);

    // ---------------------------------------------------------------
    // 7. Cleanup worker hard-deletes rows
    // ---------------------------------------------------------------
    await switchRole('service_role', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    const deleted = await pg.query(
      `DELETE FROM files_store_public.files
       WHERE key LIKE '1/default/full_e2e%' AND database_id = 1`
    );
    expect(deleted.rowCount).toBe(3);

    // Verify: no files remain
    await pg.query('RESET ROLE');
    const remaining = await pg.query(
      `SELECT * FROM files_store_public.files WHERE key LIKE '1/default/full_e2e%'`
    );
    expect(remaining.rowCount).toBe(0);
  });
});
