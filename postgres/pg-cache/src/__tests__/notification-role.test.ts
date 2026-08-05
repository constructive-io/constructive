import type { Pool } from 'pg';

import {
  assertPgNotificationRole,
  assertPgNotificationRoleClient,
  auditPgNotificationRole,
  auditPgNotificationRoleClient,
  normalizePgNotificationRoleContracts,
  PG_NOTIFICATION_ROLE_AUDIT_SQL,
  PG_NOTIFICATION_ROLE_AUDIT_VERSION,
  type PgNotificationRoleClient,
  PgNotificationRoleContractError,
  type PgNotificationRoleViolationCode,
  UnsafePgNotificationRoleError
} from '../notification-role';

const contract = {
  role: 'tenant_001_notification',
  database: 'tenant_001'
};

const safeRow = {
  expected_role: contract.role,
  session_role: contract.role,
  active_role: contract.role,
  active_database: contract.database,
  rolcanlogin: true,
  rolinherit: false,
  rolsuper: false,
  rolbypassrls: false,
  rolcreaterole: false,
  rolcreatedb: false,
  rolreplication: false,
  membership_count: 0,
  target_database_exists: true,
  target_connect: true,
  other_database_connect_count: 0,
  target_database_owner: false,
  target_database_create: false,
  target_database_temp: false,
  schema_owner_count: 0,
  schema_create_count: 0,
  schema_usage_count: 0,
  relation_privilege_count: 0,
  function_privilege_count: 0,
  sequence_privilege_count: 0
};

const poolWithRow = (row: Record<string, unknown> | undefined) => {
  const client = {
    query: jest.fn(async (query: string) => query === PG_NOTIFICATION_ROLE_AUDIT_SQL
      ? { rows: row ? [row] : [] }
      : { rows: [] }),
    release: jest.fn()
  };
  return {
    pool: { connect: jest.fn(async () => client) } as unknown as Pool,
    client
  };
};

describe('PostgreSQL notification-role audit', () => {
  it('returns a frozen credential-free attestation for an exact safe login', async () => {
    const { pool, client } = poolWithRow(safeRow);
    const audit = await assertPgNotificationRole(
      pool,
      { ...contract, password: 'must-not-escape' } as typeof contract
    );

    expect(audit).toEqual({
      version: PG_NOTIFICATION_ROLE_AUDIT_VERSION,
      ...contract,
      safe: true,
      violations: []
    });
    expect(Object.isFrozen(audit)).toBe(true);
    expect(Object.isFrozen(audit.violations)).toBe(true);
    expect(JSON.stringify(audit)).not.toContain('must-not-escape');
    expect(client.query).toHaveBeenNthCalledWith(
      1,
      'BEGIN READ ONLY'
    );
    expect(client.query).toHaveBeenNthCalledWith(2, 'SET LOCAL jit TO off');
    expect(client.query).toHaveBeenNthCalledWith(3, PG_NOTIFICATION_ROLE_AUDIT_SQL, [
      contract.role,
      contract.database
    ]);
    expect(client.query).toHaveBeenNthCalledWith(4, 'COMMIT');
    expect(client.release).toHaveBeenCalledWith(false);
  });

  it('audits an already-owned listener client without releasing it', async () => {
    const { client } = poolWithRow(safeRow);

    await expect(assertPgNotificationRoleClient(
      client as unknown as PgNotificationRoleClient,
      contract
    )).resolves
      .toMatchObject({ ...contract, safe: true });
    expect(client.release).not.toHaveBeenCalled();
  });

  it('rolls back a failed pinned-client audit without taking ownership of release', async () => {
    const failure = new Error('catalog unavailable');
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(failure)
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn()
    };

    await expect(auditPgNotificationRoleClient(client, contract)).rejects.toBe(failure);
    expect(client.query).toHaveBeenNthCalledWith(4, 'ROLLBACK');
    expect(client.release).not.toHaveBeenCalled();
  });

  it.each<[
  keyof typeof safeRow,
  unknown,
  PgNotificationRoleViolationCode
  ]>([
    ['session_role', 'different_login', 'LOGIN_ROLE_MISMATCH'],
    ['active_role', 'set_role_target', 'CURRENT_ROLE_MISMATCH'],
    ['active_database', 'different_database', 'DATABASE_MISMATCH'],
    ['rolcanlogin', false, 'LOGIN_REQUIRED'],
    ['rolinherit', true, 'NOINHERIT_REQUIRED'],
    ['rolsuper', true, 'SUPERUSER'],
    ['rolbypassrls', true, 'BYPASSRLS'],
    ['rolcreaterole', true, 'CREATEROLE'],
    ['rolcreatedb', true, 'CREATEDB'],
    ['rolreplication', true, 'REPLICATION'],
    ['membership_count', 1, 'ROLE_MEMBERSHIP'],
    ['target_database_exists', false, 'TARGET_DATABASE_MISSING'],
    ['target_connect', false, 'TARGET_CONNECT_REQUIRED'],
    ['other_database_connect_count', 1, 'CROSS_DATABASE_CONNECT'],
    ['target_database_owner', true, 'DATABASE_OWNER'],
    ['target_database_create', true, 'DATABASE_CREATE'],
    ['target_database_temp', true, 'DATABASE_TEMP'],
    ['schema_owner_count', 1, 'SCHEMA_OWNER'],
    ['schema_create_count', 1, 'SCHEMA_CREATE'],
    ['schema_usage_count', 1, 'SCHEMA_USAGE'],
    ['relation_privilege_count', 1, 'RELATION_PRIVILEGE'],
    ['function_privilege_count', 1, 'FUNCTION_PRIVILEGE'],
    ['sequence_privilege_count', 1, 'SEQUENCE_PRIVILEGE']
  ])('maps %s to its stable violation code', async (field, unsafeValue, code) => {
    const { pool } = poolWithRow({ ...safeRow, [field]: unsafeValue });
    const audit = await auditPgNotificationRole(pool, contract);

    expect(audit.safe).toBe(false);
    expect(audit.violations).toContain(code);
    await expect(assertPgNotificationRole(
      poolWithRow({ ...safeRow, [field]: unsafeValue }).pool,
      contract
    )).rejects.toMatchObject({
      code: 'PG_NOTIFICATION_ROLE_UNSAFE',
      audit: expect.objectContaining({ violations: expect.arrayContaining([code]) })
    });
  });

  it('fails closed when the catalog audit returns no role row', async () => {
    const { pool } = poolWithRow(undefined);
    const audit = await auditPgNotificationRole(pool, contract);

    expect(audit).toMatchObject({ safe: false, violations: ['AUDIT_NO_RESULT'] });
    await expect(assertPgNotificationRole(poolWithRow(undefined).pool, contract))
      .rejects.toBeInstanceOf(UnsafePgNotificationRoleError);
  });

  it('rolls back and destroys the client when the catalog query fails', async () => {
    const failure = new Error('catalog unavailable');
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(failure)
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn()
    };
    const pool = { connect: jest.fn(async () => client) } as unknown as Pool;

    await expect(auditPgNotificationRole(pool, contract)).rejects.toBe(failure);
    expect(client.query).toHaveBeenNthCalledWith(4, 'ROLLBACK');
    expect(client.release).toHaveBeenCalledWith(true);
  });

  it('audits exact database scope, membership edges, and every prohibited ACL class', () => {
    expect(PG_NOTIFICATION_ROLE_AUDIT_SQL).toContain(
      'membership.member = r.oid OR membership.roleid = r.oid'
    );
    expect(PG_NOTIFICATION_ROLE_AUDIT_SQL).toContain(
      'database_record.datname <> $2::text'
    );
    expect(PG_NOTIFICATION_ROLE_AUDIT_SQL).toContain("'CONNECT'");
    expect(PG_NOTIFICATION_ROLE_AUDIT_SQL).toContain("'CREATE'");
    expect(PG_NOTIFICATION_ROLE_AUDIT_SQL).toContain("'TEMP'");
    expect(PG_NOTIFICATION_ROLE_AUDIT_SQL).toContain('schema_record.nspowner = r.oid');
    expect(PG_NOTIFICATION_ROLE_AUDIT_SQL).toContain("'USAGE'");
    expect(PG_NOTIFICATION_ROLE_AUDIT_SQL).toContain(
      'pg_catalog.has_table_privilege'
    );
    expect(PG_NOTIFICATION_ROLE_AUDIT_SQL).toContain(
      'pg_catalog.has_any_column_privilege'
    );
    expect(PG_NOTIFICATION_ROLE_AUDIT_SQL).toContain(
      'pg_catalog.has_function_privilege'
    );
    expect(PG_NOTIFICATION_ROLE_AUDIT_SQL).toContain(
      'pg_catalog.has_sequence_privilege'
    );
    expect(PG_NOTIFICATION_ROLE_AUDIT_SQL).toContain("n.nspname !~ '^pg_'");
  });
});

describe('notification-role fleet contract', () => {
  it('collapses exact generation duplicates and returns a deterministic frozen mapping', () => {
    const normalized = normalizePgNotificationRoleContracts([
      { role: 'notify_b', database: 'tenant_b' },
      { ...contract },
      { ...contract }
    ]);

    expect(normalized).toEqual([
      contract,
      { role: 'notify_b', database: 'tenant_b' }
    ]);
    expect(Object.isFrozen(normalized)).toBe(true);
    expect(normalized.every(Object.isFrozen)).toBe(true);
  });

  it('rejects multiple logins for one database and one login spanning databases', () => {
    expect(() => normalizePgNotificationRoleContracts([
      contract,
      { role: 'another_notification', database: contract.database }
    ])).toThrow('maps to multiple login roles');
    expect(() => normalizePgNotificationRoleContracts([
      contract,
      { role: contract.role, database: 'tenant_002' }
    ])).toThrow('maps to multiple databases');
  });

  const malformedContracts: Array<{
    contracts: readonly { role: string; database: string }[];
  }> = [
    { contracts: [] },
    { contracts: [{ role: '', database: 'tenant_001' }] },
    { contracts: [{ role: 'notify', database: '' }] },
    { contracts: [{ role: 'n'.repeat(64), database: 'tenant_001' }] },
    {
      contracts: [{
        role: 'notify',
        database: `bad${String.fromCharCode(0xd800)}`
      }]
    }
  ];

  it.each(malformedContracts)('rejects malformed contract input', ({ contracts }) => {
    expect(() => normalizePgNotificationRoleContracts(contracts))
      .toThrow(PgNotificationRoleContractError);
  });
});
