import type { Pool } from 'pg';

import {
  assertRuntimeRoleSafety,
  DEFAULT_RUNTIME_ROLE_SAFETY_MAX_AGE_MS,
  ensureRuntimeRoleSafety,
  getRuntimeRoleSafetyStats,
  invalidateRuntimeRoleSafety,
  MAX_RUNTIME_ROLE_SAFETY_MAX_AGE_MS,
  refreshRuntimeRoleSafety,
  RUNTIME_ROLE_SAFETY_SQL,
  UnsafeRuntimeRoleError
} from '../runtime-role-safety';

const poolWithRow = (row: Record<string, unknown>) => {
  const client = {
    query: jest.fn(async (query: string) => query === RUNTIME_ROLE_SAFETY_SQL
      ? { rows: [row] }
      : { rows: [] }),
    release: jest.fn()
  };
  return {
    pool: { connect: jest.fn(async () => client) } as unknown as Pool,
    client
  };
};

const safeRow = {
  login_role: 'graphql_runtime',
  login_role_violations: [] as Array<{ capabilities: string[] }>,
  inherited_role_violations: [] as Array<{ rolname: string }>,
  unexpected_set_role_violations: [] as Array<{ rolname: string }>,
  request_role_reachability_violations: [] as Array<{
    request_role: string;
    reachable_role: string;
    via_usage: boolean;
    via_set: boolean;
  }>,
  role_violations: [] as Array<{ rolname: string; capabilities: string[] }>,
  database_violations: [] as Array<{
    rolname: string;
    datname: string;
    capability: string;
  }>,
  cross_database_violations: [] as Array<{
    rolname: string;
    datname: string;
  }>,
  schema_violations: [] as Array<{ rolname: string; nspname: string; capability: string }>,
  cross_schema_violations: [] as Array<{
    rolname: string;
    nspname: string;
    capabilities: string[];
  }>,
  object_owner_violations: [] as Array<{
    rolname: string;
    nspname: string;
    object_name: string;
    object_kind: string;
  }>,
  privileged_object_violations: [] as Array<{
    nspname: string;
    object_name: string;
    reason: string;
  }>,
  stored_dependency_violations: [] as Array<{
    nspname: string;
    object_name: string;
    reason: string;
    dependency: string;
  }>,
  missing_roles: [] as string[],
  inaccessible_roles: [] as string[],
  missing_schemas: [] as string[]
};

describe('runtime role safety', () => {
  it('accepts a least-privilege login and parameterizes roles and schemas', async () => {
    const { pool, client } = poolWithRow(safeRow);
    await expect(assertRuntimeRoleSafety(
      pool,
      ['tenant_anon', 'tenant_user'],
      ['tenant_public'],
      ['extensions']
    )).resolves.toBeUndefined();

    expect(client.query).toHaveBeenNthCalledWith(2, RUNTIME_ROLE_SAFETY_SQL, [
      ['tenant_anon', 'tenant_user'],
      ['tenant_public'],
      ['extensions']
    ]);
    expect(client.query).toHaveBeenNthCalledWith(
      1,
      'BEGIN READ ONLY; SET LOCAL jit TO off'
    );
    expect(client.query).toHaveBeenNthCalledWith(3, 'COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it.each(['SUPERUSER', 'BYPASSRLS', 'CREATEROLE', 'CREATEDB', 'REPLICATION'])(
    'rejects %s',
    async (capability) => {
      const { pool } = poolWithRow({
        ...safeRow,
        role_violations: [{ rolname: 'graphql_runtime', capabilities: [capability] }]
      });
      await expect(assertRuntimeRoleSafety(pool, [], [])).rejects.toBeInstanceOf(
        UnsafeRuntimeRoleError
      );
    }
  );

  it('requires the runtime login to be NOINHERIT', async () => {
    const { pool } = poolWithRow({
      ...safeRow,
      login_role_violations: [{ capabilities: ['INHERIT'] }]
    });
    await expect(assertRuntimeRoleSafety(pool, [], [])).rejects.toThrow(
      'graphql_runtime has INHERIT'
    );
  });

  it('rejects privileges inherited through a membership-level INHERIT grant', async () => {
    const { pool } = poolWithRow({
      ...safeRow,
      inherited_role_violations: [{ rolname: 'cross_tenant_reader' }]
    });
    await expect(assertRuntimeRoleSafety(pool, [], [])).rejects.toThrow(
      'graphql_runtime inherits privileges from role cross_tenant_reader'
    );
  });

  it('rejects SET-able roles outside the exact configured request-role set', async () => {
    const { pool } = poolWithRow({
      ...safeRow,
      unexpected_set_role_violations: [{ rolname: 'tenant_admin' }]
    });
    await expect(assertRuntimeRoleSafety(
      pool,
      ['tenant_anon', 'tenant_user'],
      ['tenant_public']
    )).rejects.toThrow(
      'graphql_runtime can SET ROLE to unconfigured role tenant_admin'
    );
  });

  it('rejects roles reachable only after SET ROLE to a configured request role', async () => {
    const { pool } = poolWithRow({
      ...safeRow,
      request_role_reachability_violations: [{
        request_role: 'tenant_user',
        reachable_role: 'tenant_owner',
        via_usage: true,
        via_set: false
      }]
    });
    await expect(assertRuntimeRoleSafety(
      pool,
      ['tenant_user'],
      ['tenant_public']
    )).rejects.toThrow(
      'tenant_user can reach role tenant_owner after SET ROLE (USAGE=true,SET=false)'
    );
  });

  it.each(['OWNER', 'CREATE'])('rejects schema %s capability', async (capability) => {
    const { pool } = poolWithRow({
      ...safeRow,
      schema_violations: [{
        rolname: 'graphql_runtime',
        nspname: 'tenant_public',
        capability
      }]
    });
    await expect(assertRuntimeRoleSafety(pool, [], ['tenant_public'])).rejects.toThrow(
      `has ${capability} on schema tenant_public`
    );
  });

  it.each(['OWNER', 'CREATE', 'TEMP'])('rejects database %s capability', async (capability) => {
    const { pool } = poolWithRow({
      ...safeRow,
      database_violations: [{
        rolname: 'graphql_runtime',
        datname: 'tenant_database',
        capability
      }]
    });
    await expect(assertRuntimeRoleSafety(pool, [], ['tenant_public'])).rejects.toThrow(
      `graphql_runtime has ${capability} on database tenant_database`
    );
  });

  it('rejects CONNECT to a non-target database', async () => {
    const { pool } = poolWithRow({
      ...safeRow,
      cross_database_violations: [{
        rolname: 'tenant_user',
        datname: 'tenant_b'
      }]
    });
    await expect(assertRuntimeRoleSafety(
      pool,
      ['tenant_user'],
      ['tenant_public']
    )).rejects.toThrow(
      'tenant_user has CONNECT on non-target database tenant_b'
    );
  });

  it.each([
    'login_role_violations',
    'inherited_role_violations',
    'database_violations',
    'cross_database_violations',
    'unexpected_set_role_violations',
    'request_role_reachability_violations',
    'role_violations',
    'schema_violations',
    'cross_schema_violations',
    'object_owner_violations',
    'privileged_object_violations',
    'stored_dependency_violations'
  ])(
    'fails closed when the safety query omits %s',
    async (column) => {
      const row = { ...safeRow } as Record<string, unknown>;
      delete row[column];
      const { pool } = poolWithRow(row);

      await expect(assertRuntimeRoleSafety(pool, [], ['tenant_public'])).rejects.toThrow(
        `safety query did not return ${column} as a JSON array`
      );
    }
  );

  it.each(['missing_roles', 'inaccessible_roles', 'missing_schemas'])(
    'fails closed when the safety query omits %s',
    async (column) => {
      const row = { ...safeRow } as Record<string, unknown>;
      delete row[column];
      const { pool } = poolWithRow(row);

      await expect(assertRuntimeRoleSafety(pool, [], ['tenant_public'])).rejects.toThrow(
        `safety query did not return ${column} as a text array`
      );
    }
  );

  it('fails closed when the safety query omits the login role', async () => {
    const { pool } = poolWithRow({ ...safeRow, login_role: null });
    await expect(assertRuntimeRoleSafety(pool, [], ['tenant_public'])).rejects.toThrow(
      'safety query did not return a non-empty login_role'
    );
  });

  it('rejects effective object access to an unapproved tenant schema', async () => {
    const { pool } = poolWithRow({
      ...safeRow,
      cross_schema_violations: [{
        rolname: 'graphql_runtime',
        nspname: 'tenant_b',
        capabilities: ['RELATION', 'FUNCTION']
      }]
    });
    await expect(assertRuntimeRoleSafety(pool, [], ['tenant_a'])).rejects.toThrow(
      'graphql_runtime has RELATION,FUNCTION on unapproved schema tenant_b'
    );
  });

  it.each([
    'SECURITY DEFINER FUNCTION',
    'OWNER-RIGHTS VIEW',
    'FOREIGN TABLE',
    'MATERIALIZED VIEW'
  ])('rejects approved-scope %s paths that can escape invoker privileges', async (reason) => {
    const { pool } = poolWithRow({
      ...safeRow,
      privileged_object_violations: [{
        nspname: 'tenant_public',
        object_name: 'unsafe_path',
        reason
      }]
    });
    await expect(assertRuntimeRoleSafety(pool, [], ['tenant_public'])).rejects.toThrow(
      `${reason} tenant_public.unsafe_path is not allowed in the approved GraphQL schema scope`
    );
  });

  it('walks tracked dependencies transitively from every stored-expression class', () => {
    expect(RUNTIME_ROLE_SAFETY_SQL).toContain('WITH RECURSIVE');
    expect(RUNTIME_ROLE_SAFETY_SQL).toContain(
      "pg_catalog.pg_has_role(current_user, r.oid, 'SET')"
    );
    expect(RUNTIME_ROLE_SAFETY_SQL).toContain(
      "pg_catalog.pg_has_role(current_user, r.oid, 'USAGE')"
    );
    expect(RUNTIME_ROLE_SAFETY_SQL).not.toContain(
      "pg_catalog.pg_has_role(current_user, r.oid, 'MEMBER')"
    );
    expect(RUNTIME_ROLE_SAFETY_SQL).toContain('pg_catalog.current_database()');
    expect(RUNTIME_ROLE_SAFETY_SQL).toContain(
      "pg_catalog.has_database_privilege(r.rolname, d.oid, 'CREATE')"
    );
    expect(RUNTIME_ROLE_SAFETY_SQL).toContain(
      "pg_catalog.has_database_privilege(r.rolname, d.oid, 'TEMP')"
    );
    expect(RUNTIME_ROLE_SAFETY_SQL).toContain(
      'd.oid <> current_database.oid'
    );
    expect(RUNTIME_ROLE_SAFETY_SQL).toContain(
      "pg_catalog.has_database_privilege(r.rolname, d.oid, 'CONNECT')"
    );
    expect(RUNTIME_ROLE_SAFETY_SQL).toContain("'pg_catalog.pg_constraint'::regclass::oid");
    expect(RUNTIME_ROLE_SAFETY_SQL).toContain("index_class.relkind IN ('i', 'I')");
    expect(RUNTIME_ROLE_SAFETY_SQL).toContain('FROM stored_dependency_closure closure');
  });

  it.each(['RELATION', 'SEQUENCE', 'FUNCTION', 'TYPE'])('rejects %s ownership', async (objectKind) => {
    const { pool } = poolWithRow({
      ...safeRow,
      object_owner_violations: [{
        rolname: 'tenant_user',
        nspname: 'tenant_public',
        object_name: 'owned_object',
        object_kind: objectKind
      }]
    });
    await expect(assertRuntimeRoleSafety(pool, ['tenant_user'], ['tenant_public'])).rejects.toThrow(
      `tenant_user owns ${objectKind} tenant_public.owned_object`
    );
  });

  it('rejects stored expressions that reach a privileged helper', async () => {
    const { pool } = poolWithRow({
      ...safeRow,
      stored_dependency_violations: [{
        nspname: 'tenant_public',
        object_name: 'documents:stamp_owner',
        reason: 'STORED EXPRESSION CALLS SECURITY DEFINER',
        dependency: 'hidden_private.lookup_owner'
      }]
    });
    await expect(assertRuntimeRoleSafety(pool, [], ['tenant_public'])).rejects.toThrow(
      'STORED EXPRESSION CALLS SECURITY DEFINER from tenant_public.documents:stamp_owner to hidden_private.lookup_owner'
    );
  });

  it('rejects missing roles and schemas instead of silently weakening the check', async () => {
    const { pool } = poolWithRow({
      ...safeRow,
      missing_roles: ['tenant_user'],
      missing_schemas: ['tenant_public']
    });
    await expect(assertRuntimeRoleSafety(pool, ['tenant_user'], ['tenant_public'])).rejects.toThrow(
      'request role tenant_user does not exist'
    );
  });

  it('coalesces concurrent checks and bounds successful-result reuse from completion', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const reuseOptions = { maxSuccessAgeMs: MAX_RUNTIME_ROLE_SAFETY_MAX_AGE_MS };
    let releaseFirst!: () => void;
    const first = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const query = jest.fn()
      .mockImplementationOnce(async () => {
        await first;
        return { rows: [safeRow] };
      })
      .mockResolvedValue({ rows: [safeRow] });
    const client = {
      query: jest.fn(async (sql: string) => sql === RUNTIME_ROLE_SAFETY_SQL
        ? query()
        : { rows: [] }),
      release: jest.fn()
    };
    const pool = { connect: jest.fn(async () => client) } as unknown as Pool;

    const one = ensureRuntimeRoleSafety(pool, [], ['tenant_public'], [], reuseOptions);
    const concurrent = ensureRuntimeRoleSafety(
      pool,
      [],
      ['tenant_public'],
      [],
      reuseOptions
    );
    expect(pool.connect).toHaveBeenCalledTimes(1);
    now.mockReturnValue(1_200);
    releaseFirst();
    await Promise.all([one, concurrent]);
    expect(query).toHaveBeenCalledTimes(1);

    now.mockReturnValue(1_200 + MAX_RUNTIME_ROLE_SAFETY_MAX_AGE_MS - 1);
    await ensureRuntimeRoleSafety(pool, [], ['tenant_public'], [], reuseOptions);
    expect(query).toHaveBeenCalledTimes(1);

    now.mockReturnValue(1_200 + MAX_RUNTIME_ROLE_SAFETY_MAX_AGE_MS);
    await ensureRuntimeRoleSafety(pool, [], ['tenant_public'], [], reuseOptions);
    expect(query).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });

  it('defaults to a zero-age policy and supports explicit invalidation', async () => {
    const client = {
      query: jest.fn(async (sql: string) => sql === RUNTIME_ROLE_SAFETY_SQL
        ? { rows: [safeRow] }
        : { rows: [] }),
      release: jest.fn()
    };
    const pool = { connect: jest.fn(async () => client) } as unknown as Pool;

    expect(DEFAULT_RUNTIME_ROLE_SAFETY_MAX_AGE_MS).toBe(0);
    await ensureRuntimeRoleSafety(pool, [], ['tenant_public']);
    await ensureRuntimeRoleSafety(pool, [], ['tenant_public']);
    expect(pool.connect).toHaveBeenCalledTimes(2);

    await ensureRuntimeRoleSafety(
      pool,
      [],
      ['tenant_public'],
      [],
      { maxSuccessAgeMs: MAX_RUNTIME_ROLE_SAFETY_MAX_AGE_MS }
    );
    expect(pool.connect).toHaveBeenCalledTimes(2);
    invalidateRuntimeRoleSafety(pool);
    await ensureRuntimeRoleSafety(pool, [], ['tenant_public']);
    expect(pool.connect).toHaveBeenCalledTimes(3);

    await refreshRuntimeRoleSafety(pool, [], ['tenant_public']);
    expect(pool.connect).toHaveBeenCalledTimes(4);
  });

  it('never caches a failed catalog audit', async () => {
    let auditAttempts = 0;
    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql !== RUNTIME_ROLE_SAFETY_SQL) return { rows: [] };
        auditAttempts += 1;
        if (auditAttempts === 1) throw new Error('catalog unavailable');
        return { rows: [safeRow] };
      }),
      release: jest.fn()
    };
    const pool = { connect: jest.fn(async () => client) } as unknown as Pool;

    await expect(
      ensureRuntimeRoleSafety(pool, [], ['tenant_public'])
    ).rejects.toThrow('catalog unavailable');
    await expect(
      ensureRuntimeRoleSafety(pool, [], ['tenant_public'])
    ).resolves.toBeUndefined();

    expect(auditAttempts).toBe(2);
    expect(pool.connect).toHaveBeenCalledTimes(2);
    expect(client.release).toHaveBeenNthCalledWith(1, true);
  });

  it('reports actual checks separately from coalesced and reused callers', async () => {
    const before = getRuntimeRoleSafetyStats();
    const reuseOptions = { maxSuccessAgeMs: MAX_RUNTIME_ROLE_SAFETY_MAX_AGE_MS };
    let resolveAudit!: () => void;
    const auditBlocked = new Promise<void>((resolve) => {
      resolveAudit = resolve;
    });
    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql !== RUNTIME_ROLE_SAFETY_SQL) return { rows: [] };
        await auditBlocked;
        return { rows: [safeRow] };
      }),
      release: jest.fn()
    };
    const pool = { connect: jest.fn(async () => client) } as unknown as Pool;

    const first = ensureRuntimeRoleSafety(
      pool,
      [],
      ['tenant_public'],
      [],
      reuseOptions
    );
    const coalesced = ensureRuntimeRoleSafety(
      pool,
      [],
      ['tenant_public'],
      [],
      reuseOptions
    );
    resolveAudit();
    await Promise.all([first, coalesced]);
    await ensureRuntimeRoleSafety(pool, [], ['tenant_public'], [], reuseOptions);

    const after = getRuntimeRoleSafetyStats();
    expect(after.checksStarted - before.checksStarted).toBe(1);
    expect(after.checksSucceeded - before.checksSucceeded).toBe(1);
    expect(after.checksFailed - before.checksFailed).toBe(0);
    expect(after.inFlightCoalesces - before.inFlightCoalesces).toBe(1);
    expect(after.successfulResultReuses - before.successfulResultReuses).toBe(1);
    expect(after.durationMsTotal).toBeGreaterThanOrEqual(before.durationMsTotal);
  });

  it('rejects attempts to extend the successful-audit freshness bound', () => {
    const { pool } = poolWithRow(safeRow);
    expect(() => ensureRuntimeRoleSafety(
      pool,
      [],
      ['tenant_public'],
      [],
      { maxSuccessAgeMs: MAX_RUNTIME_ROLE_SAFETY_MAX_AGE_MS + 1 }
    )).toThrow('maxSuccessAgeMs must be an integer between 0 and');
  });
});
