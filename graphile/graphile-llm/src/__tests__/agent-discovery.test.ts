/**
 * Agent discovery tenant-isolation tests (pure, no DB required).
 *
 * Verifies the cross-tenant bleed fix: discovery is filtered by the requesting
 * tenant's database id (resolved from jwt.claims.database_id in pgSettings and
 * passed as $1), and the per-database cache is keyed by that id — never by
 * dbname alone — so a shared/pooled instance cannot return another tenant's
 * agent config.
 */

import { clearAgentDiscoveryCache, getAgentDiscovery } from '../plugins/agent-discovery-plugin';

// ─── Fake pool ───────────────────────────────────────────────────────────────

interface QueryCall {
  sql: string;
  values: unknown[] | undefined;
}

/**
 * A fake pg Pool whose `query` scopes rows by the $1 database id — mirroring how
 * the real (shared) control-plane metaschema tables behave once the WHERE
 * clause is applied. Records every call for assertions.
 */
function makeFakePool(rowsByDatabaseId: Record<string, any>) {
  const calls: QueryCall[] = [];
  const pool = {
    calls,
    query: async (sql: string, values?: unknown[]) => {
      calls.push({ sql, values });
      const id = values?.[0] as string | null;
      const row = id != null ? rowsByDatabaseId[id] : undefined;
      return { rows: row ? [row] : [] };
    }
  };
  return pool;
}

const TENANT_1 = '11111111-1111-1111-1111-111111111111';
const TENANT_2 = '22222222-2222-2222-2222-222222222222';

const ROWS = {
  [TENANT_1]: {
    schema_name: 'tenant1_agent',
    thread_table_name: 'agent_thread',
    message_table_name: 'agent_message',
    task_table_name: 'agent_task'
  },
  [TENANT_2]: {
    schema_name: 'tenant2_agent',
    thread_table_name: 't2_thread',
    message_table_name: 't2_message',
    task_table_name: 't2_task'
  }
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('getAgentDiscovery — tenant isolation', () => {
  beforeEach(() => {
    clearAgentDiscoveryCache();
  });

  it('filters by the tenant database id from pgSettings, passed as $1', async () => {
    const pool = makeFakePool(ROWS);

    const result = await getAgentDiscovery(pool as any, 'shared-db', {
      'jwt.claims.database_id': TENANT_1
    });

    expect(pool.calls).toHaveLength(1);
    expect(pool.calls[0].sql).toContain('WHERE s.database_id = $1');
    expect(pool.calls[0].values).toEqual([TENANT_1]);

    expect(result).not.toBeNull();
    expect(result!.thread).toEqual({ schemaName: 'tenant1_agent', tableName: 'agent_thread' });
    expect(result!.message).toEqual({ schemaName: 'tenant1_agent', tableName: 'agent_message' });
    expect(result!.task).toEqual({ schemaName: 'tenant1_agent', tableName: 'agent_task' });
  });

  it('does NOT bleed across tenants sharing one instance/dbname', async () => {
    const pool = makeFakePool(ROWS);

    const t1 = await getAgentDiscovery(pool as any, 'shared-db', {
      'jwt.claims.database_id': TENANT_1
    });
    const t2 = await getAgentDiscovery(pool as any, 'shared-db', {
      'jwt.claims.database_id': TENANT_2
    });

    // Each tenant gets its own config despite the same dbname.
    expect(t1!.thread!.schemaName).toBe('tenant1_agent');
    expect(t2!.thread!.schemaName).toBe('tenant2_agent');

    // Two distinct database ids ⇒ two separate cache entries ⇒ two queries.
    expect(pool.calls.map((c) => c.values)).toEqual([[TENANT_1], [TENANT_2]]);
  });

  it('caches by database id (same id ⇒ a single query)', async () => {
    const pool = makeFakePool(ROWS);

    const a = await getAgentDiscovery(pool as any, 'shared-db', {
      'jwt.claims.database_id': TENANT_1
    });
    const b = await getAgentDiscovery(pool as any, 'shared-db', {
      'jwt.claims.database_id': TENANT_1
    });

    expect(pool.calls).toHaveLength(1);
    expect(a).toEqual(b);
  });

  it('fails closed when database id is absent — passes null as $1, keys under <dbname>:nodb', async () => {
    const pool = makeFakePool(ROWS);

    // No pgSettings at all.
    const r1 = await getAgentDiscovery(pool as any, 'shared-db');
    // Empty pgSettings (no jwt.claims.database_id).
    const r2 = await getAgentDiscovery(pool as any, 'shared-db', {});

    expect(r1).toBeNull();
    expect(r2).toBeNull();

    // First call queries with null $1; second is served from the ':nodb' cache.
    expect(pool.calls).toHaveLength(1);
    expect(pool.calls[0].values).toEqual([null]);

    // A different dbname without an id uses a different ':nodb' key ⇒ new query.
    await getAgentDiscovery(pool as any, 'other-db');
    expect(pool.calls).toHaveLength(2);
  });

  it('caches null (unprovisioned tenant) without re-querying', async () => {
    // Pool returns no rows for this (valid) tenant id ⇒ discovery is null.
    const pool = makeFakePool({});

    const first = await getAgentDiscovery(pool as any, 'shared-db', {
      'jwt.claims.database_id': TENANT_1
    });
    const second = await getAgentDiscovery(pool as any, 'shared-db', {
      'jwt.claims.database_id': TENANT_1
    });

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(pool.calls).toHaveLength(1);
  });
});
