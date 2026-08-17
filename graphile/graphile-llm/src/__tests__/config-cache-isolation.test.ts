import {
  getLlmBillingCacheStats,
  getLlmBillingConfig,
  invalidateLlmBillingConfig,
} from '../config-cache';

function makeClient(privateSchema: string) {
  const query = jest.fn(async (text: string) => {
    if (text.includes('information_schema.schemata'))
      return { rows: [{ exists: 1 }] };
    if (text.includes('billing_module')) {
      return {
        rows: [
          {
            public_schema: `${privateSchema}_public`,
            private_schema: privateSchema,
            record_usage_function: 'record_usage',
          },
        ],
      };
    }
    if (text.includes('inference_log_module')) {
      return {
        rows: [{ schema: privateSchema, table_name: 'usage_log_inference' }],
      };
    }
    throw new Error('unexpected SQL');
  });
  return { query };
}

describe('LLM config cache ownership', () => {
  beforeEach(() => invalidateLlmBillingConfig());

  it('isolates the same database UUID by exact build identity', async () => {
    const databaseId = '11111111-1111-1111-1111-111111111111';
    const buildA = {};
    const buildB = {};
    const clientA = makeClient('tenant_a_private');
    const clientB = makeClient('tenant_b_private');

    const firstA = await getLlmBillingConfig(clientA, databaseId, buildA);
    const cachedA = await getLlmBillingConfig(clientA, databaseId, buildA);
    const firstB = await getLlmBillingConfig(clientB, databaseId, buildB);

    expect(firstA).toBe(cachedA);
    expect(firstA.billing?.privateSchema).toBe('tenant_a_private');
    expect(firstB.billing?.privateSchema).toBe('tenant_b_private');
    expect(clientA.query).toHaveBeenCalledTimes(4);
    expect(clientB.query).toHaveBeenCalledTimes(4);
    expect(getLlmBillingCacheStats(buildA).size).toBe(1);
    expect(getLlmBillingCacheStats(buildB).size).toBe(1);
  });

  it('requires an explicit cache owner', async () => {
    await expect(
      getLlmBillingConfig(
        makeClient('tenant_private'),
        'database-a',
        null as any
      )
    ).rejects.toThrow('LLM_CONFIG_CACHE_SCOPE_UNAVAILABLE');
  });
});
