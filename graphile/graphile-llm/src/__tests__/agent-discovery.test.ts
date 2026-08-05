import { clearAgentDiscoveryCache, getAgentDiscovery } from '../plugins/agent-discovery-plugin';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

function makePool(schemaPrefix = 'tenant') {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  const rows: Record<string, any> = {
    [TENANT_A]: {
      schema_name: `${schemaPrefix}_a_agent`,
      thread_table_name: 'agent_thread',
      message_table_name: 'agent_message',
      task_table_name: 'agent_task'
    },
    [TENANT_B]: {
      schema_name: `${schemaPrefix}_b_agent`,
      thread_table_name: 'agent_thread',
      message_table_name: 'agent_message',
      task_table_name: 'agent_task'
    }
  };
  return {
    calls,
    query: async (text: string, values?: unknown[]) => {
      calls.push({ text, values });
      const row = rows[String(values?.[0])];
      return { rows: row ? [row] : [] };
    }
  };
}

describe('agent discovery tenant isolation', () => {
  beforeEach(() => clearAgentDiscoveryCache());

  it('filters and caches discovery by database id', async () => {
    const pool = makePool();
    const a = await getAgentDiscovery(pool as any, TENANT_A);
    const cachedA = await getAgentDiscovery(pool as any, TENANT_A);
    const b = await getAgentDiscovery(pool as any, TENANT_B);

    expect(pool.calls).toHaveLength(2);
    expect(pool.calls[0].text).toContain('WHERE acm.database_id = $1');
    expect(pool.calls.map((call) => call.values)).toEqual([[TENANT_A], [TENANT_B]]);
    expect(a).toEqual(cachedA);
    expect(a?.thread?.schemaName).toBe('tenant_a_agent');
    expect(b?.thread?.schemaName).toBe('tenant_b_agent');
  });

  it('fails closed when database id is absent', async () => {
    const pool = makePool();
    await expect(getAgentDiscovery(pool as any, '')).rejects.toThrow(/databaseId is required/);
    expect(pool.calls).toHaveLength(0);
  });

  it('does not share discovery across different physical pool identities', async () => {
    const poolA = makePool('physical_a');
    const poolB = makePool('physical_b');

    const a = await getAgentDiscovery(poolA as any, TENANT_A);
    const b = await getAgentDiscovery(poolB as any, TENANT_A);

    expect(a?.thread?.schemaName).toBe('physical_a_a_agent');
    expect(b?.thread?.schemaName).toBe('physical_b_a_agent');
    expect(poolA.calls).toHaveLength(1);
    expect(poolB.calls).toHaveLength(1);
  });
});
