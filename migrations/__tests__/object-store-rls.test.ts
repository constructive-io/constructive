jest.setTimeout(60000);

import { resolve } from 'path';

import { getConnections, PgTestClient, seed } from 'pgsql-test';

const MIGRATION_PATH = resolve(__dirname, '../files_store.sql');

const USER_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const USER_C = 'cccccccc-0000-0000-0000-000000000003';

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

async function insertBuckets() {
  await pg.query(`
    INSERT INTO files_store_public.buckets (database_id, key, name, is_public, config)
    VALUES
      (1, 'default', 'Default Bucket', false, '{}'),
      (1, 'public-assets', 'Public Assets', true, '{}'),
      (2, 'default', 'Default Bucket (Tenant 2)', false, '{}')
  `);
}

async function insertFixtures() {
  await pg.query(`
    INSERT INTO files_store_public.files (id, database_id, bucket_key, key, status, created_by, etag)
    VALUES
      ('11111111-0000-0000-0000-000000000001', 1, 'default', '1/default/aaa_origin', 'ready', $1, 'etag1'),
      ('11111111-0000-0000-0000-000000000002', 1, 'default', '1/default/bbb_origin', 'pending', $1, 'etag2'),
      ('11111111-0000-0000-0000-000000000003', 1, 'default', '1/default/ccc_origin', 'processing', $1, 'etag3'),
      ('11111111-0000-0000-0000-000000000004', 1, 'default', '1/default/ddd_origin', 'error', $1, 'etag4')
  `, [USER_A]);

  await pg.query(`
    INSERT INTO files_store_public.files (id, database_id, bucket_key, key, status, created_by, etag)
    VALUES
      ('22222222-0000-0000-0000-000000000001', 1, 'default', '1/default/eee_origin', 'ready', $1, 'etag5'),
      ('22222222-0000-0000-0000-000000000002', 1, 'default', '1/default/fff_origin', 'pending', $1, 'etag6')
  `, [USER_B]);

  await pg.query(`
    INSERT INTO files_store_public.files (id, database_id, bucket_key, key, status, created_by, etag)
    VALUES
      ('33333333-0000-0000-0000-000000000001', 1, 'public-assets', '1/public-assets/ggg_origin', 'ready', $1, 'etag7'),
      ('33333333-0000-0000-0000-000000000002', 1, 'public-assets', '1/public-assets/hhh_origin', 'pending', $1, 'etag8')
  `, [USER_A]);

  await pg.query(`
    INSERT INTO files_store_public.files (id, database_id, bucket_key, key, status, created_by, etag)
    VALUES
      ('44444444-0000-0000-0000-000000000001', 2, 'default', '2/default/iii_origin', 'ready', $1, 'etag9')
  `, [USER_C]);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  ({ pg, teardown } = await getConnections(
    {},
    [seed.sqlfile([MIGRATION_PATH])]
  ));

  // Ensure anonymous role exists (cluster-wide, idempotent)
  await pg.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
        CREATE ROLE anonymous NOLOGIN;
      END IF;
    END $$
  `);

  // The migration assumes files_store_public schema USAGE is already granted
  // (from the original object-store pgpm extension). In isolation, grant explicitly.
  await pg.query('GRANT USAGE ON SCHEMA files_store_public TO authenticated');
  await pg.query('GRANT USAGE ON SCHEMA files_store_public TO service_role');
  await pg.query('GRANT USAGE ON SCHEMA files_store_public TO anonymous');

  // Grant SELECT on buckets to roles that need it for the public_bucket_read policy subquery.
  // Without this, the EXISTS subquery in files_public_bucket_read fails with
  // "permission denied for table buckets".
  await pg.query('GRANT SELECT ON files_store_public.buckets TO authenticated');
  await pg.query('GRANT SELECT ON files_store_public.buckets TO service_role');
  await pg.query('GRANT SELECT ON files_store_public.buckets TO anonymous');
});

afterAll(async () => {
  await teardown();
});

// ==========================================================================
// RLS-07: Superuser Bypass (negative control -- run first)
// ==========================================================================

describe('RLS-07: Superuser Bypass', () => {
  beforeEach(async () => {
    await pg.beforeEach();
    await insertBuckets();
    await insertFixtures();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('RLS-07a: superuser sees all tenants', async () => {
    const result = await pg.query('SELECT * FROM files_store_public.files');
    expect(result.rowCount).toBe(9);
  });

  it('RLS-07b: superuser can INSERT into any tenant', async () => {
    const result = await pg.query(`
      INSERT INTO files_store_public.files (database_id, key, bucket_key, etag)
      VALUES (999, '999/default/su_origin', 'default', 'su-etag')
      RETURNING id
    `);
    expect(result.rowCount).toBe(1);
  });

  it('RLS-07c: superuser can DELETE any row', async () => {
    const result = await pg.query(
      'DELETE FROM files_store_public.files WHERE database_id = 2'
    );
    expect(result.rowCount).toBeGreaterThan(0);
  });
});

// ==========================================================================
// RLS-01: Tenant Isolation (authenticated)
// ==========================================================================

describe('RLS-01: Tenant Isolation', () => {
  beforeEach(async () => {
    await pg.beforeEach();
    await insertBuckets();
    await insertFixtures();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  // RLS-01d runs FIRST so app.database_id has never been set in this session.
  // current_setting('app.database_id') without missing_ok raises "unrecognized".
  it('RLS-01d: missing app.database_id raises error', async () => {
    await switchRole('authenticated');

    await expect(
      pg.query('SELECT * FROM files_store_public.files')
    ).rejects.toThrow(/app\.database_id|invalid input syntax for type integer/);
  });

  it('RLS-01a: SELECT scoped to own tenant', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    const result = await pg.query('SELECT * FROM files_store_public.files');
    // Must return rows (prevents vacuous pass on empty result from Array.every)
    expect(result.rowCount).toBeGreaterThan(0);
    expect(result.rows.every((r: any) => r.database_id === 1)).toBe(true);
    expect(result.rows.find((r: any) => r.database_id === 2)).toBeUndefined();
  });

  it('RLS-01b: INSERT rejected for wrong tenant', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    await expect(
      pg.query(`
        INSERT INTO files_store_public.files (database_id, bucket_key, key, created_by, etag)
        VALUES (2, 'default', '2/default/bad_origin', $1, 'bad-etag')
      `, [USER_A])
    ).rejects.toThrow(/row-level security/i);
  });

  it('RLS-01c: UPDATE rejected for wrong tenant (0 rows)', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    const result = await pg.query(`
      UPDATE files_store_public.files
      SET status_reason = 'test'
      WHERE id = '44444444-0000-0000-0000-000000000001' AND database_id = 2
    `);
    expect(result.rowCount).toBe(0);
  });
});

// ==========================================================================
// RLS-02: Visibility (authenticated)
// ==========================================================================

describe('RLS-02: Visibility', () => {
  beforeEach(async () => {
    await pg.beforeEach();
    await insertBuckets();
    await insertFixtures();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('RLS-02a: User A sees own files in all statuses', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    const result = await pg.query(
      'SELECT * FROM files_store_public.files WHERE created_by = $1',
      [USER_A]
    );
    expect(result.rowCount).toBe(6);
  });

  it('RLS-02b: User A sees other users\' ready files only', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    const result = await pg.query(
      'SELECT * FROM files_store_public.files WHERE created_by = $1',
      [USER_B]
    );
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].status).toBe('ready');
  });

  it('RLS-02c: User B sees own pending files', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_B,
    });

    const result = await pg.query(
      'SELECT * FROM files_store_public.files WHERE created_by = $1',
      [USER_B]
    );
    expect(result.rowCount).toBe(2);
  });

  it('RLS-02d: User B cannot see User A\'s non-ready files', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_B,
    });

    const result = await pg.query(
      `SELECT * FROM files_store_public.files
       WHERE created_by = $1 AND status != 'ready'`,
      [USER_A]
    );
    expect(result.rowCount).toBe(0);
  });
});

// ==========================================================================
// RLS-03: INSERT/UPDATE Permissions (authenticated)
// ==========================================================================

describe('RLS-03: INSERT/UPDATE Permissions', () => {
  beforeEach(async () => {
    await pg.beforeEach();
    await insertBuckets();
    await insertFixtures();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('RLS-03a: INSERT succeeds with correct tenant', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    const result = await pg.query(`
      INSERT INTO files_store_public.files (database_id, bucket_key, key, created_by, etag)
      VALUES (1, 'default', '1/default/new_origin', $1, 'newtag')
      RETURNING *
    `, [USER_A]);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].status).toBe('pending');
  });

  it('RLS-03b: UPDATE own file succeeds', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    const result = await pg.query(`
      UPDATE files_store_public.files
      SET status_reason = 'user note'
      WHERE id = '11111111-0000-0000-0000-000000000001' AND database_id = 1
    `);
    expect(result.rowCount).toBe(1);
  });

  it('RLS-03c: DELETE denied (no DELETE grant)', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    await expect(
      pg.query(`
        DELETE FROM files_store_public.files
        WHERE id = '11111111-0000-0000-0000-000000000001' AND database_id = 1
      `)
    ).rejects.toThrow(/permission denied/i);
  });

  it('RLS-03d: UPDATE invisible file (other user\'s pending) -- 0 rows', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    const result = await pg.query(`
      UPDATE files_store_public.files
      SET status_reason = 'hacked'
      WHERE id = '22222222-0000-0000-0000-000000000002' AND database_id = 1
    `);
    expect(result.rowCount).toBe(0);
  });
});

// ==========================================================================
// RLS-04: Anonymous -- No Access
// ==========================================================================

describe('RLS-04: Anonymous -- No Access', () => {
  beforeEach(async () => {
    await pg.beforeEach();
    await insertBuckets();
    await insertFixtures();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('RLS-04a: SELECT denied', async () => {
    await switchRole('anonymous', { 'app.database_id': '1' });

    await expect(
      pg.query('SELECT * FROM files_store_public.files')
    ).rejects.toThrow(/permission denied/i);
  });

  it('RLS-04b: INSERT denied', async () => {
    await switchRole('anonymous', { 'app.database_id': '1' });

    await expect(
      pg.query(`
        INSERT INTO files_store_public.files (database_id, key, bucket_key, etag)
        VALUES (1, '1/default/anon_origin', 'default', 'x')
      `)
    ).rejects.toThrow(/permission denied/i);
  });

  it('RLS-04c: public bucket policy works with temporary GRANT', async () => {
    // Temporarily grant SELECT to anonymous (rolled back in afterEach)
    await pg.query('GRANT SELECT ON files_store_public.files TO anonymous');

    await switchRole('anonymous', { 'app.database_id': '1' });

    const result = await pg.query('SELECT * FROM files_store_public.files');

    // Anonymous only has files_public_bucket_read (files_visibility is TO authenticated).
    // Should see only public-assets bucket + ready status.
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].id).toBe('33333333-0000-0000-0000-000000000001');
    expect(result.rows[0].bucket_key).toBe('public-assets');
    expect(result.rows[0].status).toBe('ready');
  });
});

// ==========================================================================
// RLS-05: Administrator Override
// ==========================================================================

describe('RLS-05: Administrator Override', () => {
  beforeEach(async () => {
    await pg.beforeEach();
    await insertBuckets();
    await insertFixtures();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('RLS-05a: admin sees all files in tenant regardless of status/creator', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    const result = await pg.query('SELECT * FROM files_store_public.files');
    expect(result.rowCount).toBe(8);
    expect(result.rows.every((r: any) => r.database_id === 1)).toBe(true);
  });

  it('RLS-05b: admin sees other users\' pending/error files', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    const result = await pg.query(`
      SELECT * FROM files_store_public.files
      WHERE status IN ('pending', 'error')
    `);
    expect(result.rowCount).toBe(4);
  });

  it('RLS-05c: admin can UPDATE any file in tenant', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    const result = await pg.query(`
      UPDATE files_store_public.files
      SET status_reason = 'admin override'
      WHERE id = '22222222-0000-0000-0000-000000000002' AND database_id = 1
    `);
    expect(result.rowCount).toBe(1);
  });

  it('RLS-05d: admin still cannot access other tenants', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    const result = await pg.query(
      'SELECT * FROM files_store_public.files WHERE database_id = 2'
    );
    expect(result.rowCount).toBe(0);
  });

  it('RLS-05e: admin DELETE still denied (no DELETE grant on authenticated)', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    await expect(
      pg.query(`
        DELETE FROM files_store_public.files
        WHERE id = '11111111-0000-0000-0000-000000000001' AND database_id = 1
      `)
    ).rejects.toThrow(/permission denied/i);
  });
});

// ==========================================================================
// RLS-06: service_role -- Full Access Including DELETE
// ==========================================================================

describe('RLS-06: service_role', () => {
  beforeEach(async () => {
    await pg.beforeEach();
    await insertBuckets();
    await insertFixtures();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('RLS-06a: service_role sees all files in tenant (with admin override)', async () => {
    await switchRole('service_role', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    const result = await pg.query('SELECT * FROM files_store_public.files');
    expect(result.rowCount).toBe(8);
    expect(result.rows.every((r: any) => r.database_id === 1)).toBe(true);
  });

  it('RLS-06b: service_role with app.role=administrator sees all', async () => {
    await switchRole('service_role', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    const result = await pg.query('SELECT * FROM files_store_public.files');
    expect(result.rowCount).toBe(8);
  });

  it('RLS-06c: service_role without app.role sees only ready (visibility gap)', async () => {
    await switchRole('service_role', {
      'app.database_id': '1',
    });

    const result = await pg.query('SELECT * FROM files_store_public.files');
    // Without app.role and without app.user_id, visibility policy reduces to
    // status = 'ready' (NULLIF on empty user_id → NULL → created_by check is NULL).
    // Expect ready files in tenant 1: 111...01, 222...01, 333...01 = 3
    expect(result.rowCount).toBe(3);
    expect(result.rows.every((r: any) => r.status === 'ready')).toBe(true);
  });

  it('RLS-06d: service_role can DELETE files', async () => {
    await switchRole('service_role', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    const result = await pg.query(`
      DELETE FROM files_store_public.files
      WHERE id = '11111111-0000-0000-0000-000000000001' AND database_id = 1
    `);
    expect(result.rowCount).toBe(1);
  });

  it('RLS-06e: service_role cannot DELETE cross-tenant', async () => {
    await switchRole('service_role', {
      'app.database_id': '1',
      'app.role': 'administrator',
    });

    const result = await pg.query(`
      DELETE FROM files_store_public.files
      WHERE id = '44444444-0000-0000-0000-000000000001' AND database_id = 2
    `);
    expect(result.rowCount).toBe(0);
  });
});

// ==========================================================================
// RLS-08: Buckets Table Access
// ==========================================================================

describe('RLS-08: Buckets Table Access', () => {
  beforeEach(async () => {
    await pg.beforeEach();
    await insertBuckets();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('RLS-08a: authenticated role can read buckets (GRANT added for policy subquery)', async () => {
    await switchRole('authenticated', { 'app.database_id': '1' });

    const result = await pg.query('SELECT * FROM files_store_public.buckets');
    // Buckets has no RLS -- all 3 seeded buckets visible (2 tenant 1 + 1 tenant 2)
    expect(result.rowCount).toBe(3);
  });

  it('RLS-08b: service_role can read buckets (GRANT added for policy subquery)', async () => {
    await switchRole('service_role', { 'app.database_id': '1' });

    const result = await pg.query('SELECT * FROM files_store_public.buckets');
    expect(result.rowCount).toBe(3);
  });
});

// ==========================================================================
// RLS-09: Edge Cases
// ==========================================================================

describe('RLS-09: Edge Cases', () => {
  beforeEach(async () => {
    await pg.beforeEach();
    await insertBuckets();
    await insertFixtures();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('RLS-09a: app.database_id type mismatch', async () => {
    await switchRole('authenticated', {
      'app.database_id': 'not-a-number',
      'app.user_id': USER_A,
    });

    await expect(
      pg.query('SELECT * FROM files_store_public.files')
    ).rejects.toThrow(/invalid input syntax for type integer/);
  });

  it('RLS-09b: app.user_id type mismatch', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': 'not-a-uuid',
    });

    await expect(
      pg.query('SELECT * FROM files_store_public.files')
    ).rejects.toThrow(/invalid input syntax for type uuid/);
  });

  it('RLS-09c: empty tenant (no files for database_id=999)', async () => {
    await switchRole('authenticated', {
      'app.database_id': '999',
      'app.user_id': USER_A,
    });

    const result = await pg.query('SELECT * FROM files_store_public.files');
    expect(result.rowCount).toBe(0);
  });

  it('RLS-09d: INSERT with mismatched created_by (spoofing)', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    // created_by is NOT enforced by RLS -- application layer must set it correctly.
    // Note: RETURNING * would fail here because SELECT policies block reading
    // the row back (created_by=USER_B != app.user_id=USER_A and status='pending').
    const result = await pg.query(`
      INSERT INTO files_store_public.files (database_id, key, bucket_key, created_by, etag)
      VALUES (1, '1/default/spoof_origin', 'default', $1, 'x')
    `, [USER_B]);
    expect(result.rowCount).toBe(1);

    // Verify the spoofed created_by was persisted by reading as superuser
    await pg.query('RESET ROLE');
    const verify = await pg.query(
      `SELECT created_by FROM files_store_public.files WHERE key = '1/default/spoof_origin'`
    );
    expect(verify.rows[0].created_by).toBe(USER_B);
  });

  it('RLS-09e: multiple policies combine with OR for SELECT', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
      'app.role': 'authenticated',
    });

    const result = await pg.query('SELECT * FROM files_store_public.files');
    // Policies: RESTRICTIVE(tenant_isolation) AND PERMISSIVE(visibility OR public_bucket_read OR admin_override)
    // User A sees: own files (all 6) + User B's ready file (1) = 7
    // (User B's pending file is invisible; admin_override is false)
    expect(result.rowCount).toBe(7);
  });
});

// ==========================================================================
// RLS-10: State Machine with RLS
// ==========================================================================

describe('RLS-10: State Machine with RLS', () => {
  beforeEach(async () => {
    await pg.beforeEach();
    await insertBuckets();
    await insertFixtures();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  it('RLS-10a: authenticated user can transition own file pending->processing', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    const result = await pg.query(`
      UPDATE files_store_public.files
      SET status = 'processing'
      WHERE id = '11111111-0000-0000-0000-000000000002' AND database_id = 1
      RETURNING *
    `);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].processing_started_at).not.toBeNull();
  });

  it('RLS-10b: authenticated user cannot transition other\'s pending file (invisible)', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    const result = await pg.query(`
      UPDATE files_store_public.files
      SET status = 'processing'
      WHERE id = '22222222-0000-0000-0000-000000000002' AND database_id = 1
    `);
    expect(result.rowCount).toBe(0);
  });

  it('RLS-10c: invalid transition still raises under RLS', async () => {
    await switchRole('authenticated', {
      'app.database_id': '1',
      'app.user_id': USER_A,
    });

    await expect(
      pg.query(`
        UPDATE files_store_public.files
        SET status = 'deleting'
        WHERE id = '11111111-0000-0000-0000-000000000002' AND database_id = 1
      `)
    ).rejects.toThrow(/Invalid status transition from pending to deleting/);
  });
});
