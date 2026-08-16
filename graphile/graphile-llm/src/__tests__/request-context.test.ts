import { buildPgSettings } from '@constructive-io/express-context';

import {
  getLlmBillingConfig,
  invalidateLlmBillingConfig,
} from '../config-cache';
import { buildMeteringContext } from '../plugins/metering-plugin';
import { withGraphileRequestPgClient } from '../request-context';

const api = {
  apiId: 'api-1',
  databaseId: 'database-1',
  dbname: 'tenant_db',
  anonRole: 'anonymous_runtime',
  roleName: 'authenticated_runtime',
  schema: ['app_public'],
};

const pgSettings = buildPgSettings({
  api,
  token: { user_id: 'user-1' },
  requestId: 'request-1',
});

describe('graphile-llm request context', () => {
  afterEach(() => invalidateLlmBillingConfig());

  it('passes complete settings unchanged and uses a native PgClient callback', async () => {
    const original = { ...pgSettings };
    const query = jest.fn(async () => ({ rows: [{ ok: true }], rowCount: 1 }));
    const withPgClient = jest.fn(async (settings, callback) =>
      callback({ query })
    );

    await expect(
      withGraphileRequestPgClient(
        withPgClient,
        pgSettings,
        async (client) =>
          client.query({ text: 'SELECT $1::text', values: ['ok'] }),
        'RAG'
      )
    ).resolves.toMatchObject({ rows: [{ ok: true }] });

    expect(withPgClient).toHaveBeenCalledWith(pgSettings, expect.any(Function));
    expect(query).toHaveBeenCalledWith({
      text: 'SELECT $1::text',
      values: ['ok'],
    });
    expect(pgSettings).toEqual(original);
  });

  it.each([
    [
      'missing withPgClient',
      undefined,
      pgSettings,
      'RAG_PG_CLIENT_CONTEXT_UNAVAILABLE',
    ],
    ['missing pgSettings', jest.fn(), undefined, 'RAG pgSettings'],
    [
      'incomplete pgSettings',
      jest.fn(),
      { role: 'anonymous_runtime' },
      'RAG pgSettings',
    ],
  ])('fails closed for %s', async (_label, withPgClient, settings, message) => {
    await expect(
      withGraphileRequestPgClient(
        withPgClient,
        settings,
        async (): Promise<void> => undefined,
        'RAG'
      )
    ).rejects.toThrow(message);
  });

  it('uses native query configs for metering metadata resolution', async () => {
    const query = jest.fn(async ({ text }: { text: string }) => {
      if (text.includes('to_regclass')) {
        return { rows: [{ relation: 'provisioned' }], rowCount: 1 };
      }
      if (text.includes('billing_module')) {
        return {
          rows: [
            {
              public_schema: 'billing_public',
              private_schema: 'billing_private',
              record_usage_function: 'record_usage',
            },
          ],
          rowCount: 1,
        };
      }
      return {
        rows: [{ schema: 'log_private', table_name: 'usage_log_inference' }],
        rowCount: 1,
      };
    });

    await expect(
      getLlmBillingConfig({ query } as never, 'database-native-contract')
    ).resolves.toMatchObject({
      billing: { recordUsageFunction: 'record_usage' },
      inferenceLog: { tableName: 'usage_log_inference' },
    });

    expect(query).toHaveBeenCalledTimes(4);
    for (const [queryConfig] of query.mock.calls) {
      expect(queryConfig).toEqual({
        text: expect.any(String),
        values: expect.any(Array),
      });
    }
  });

  it('preserves metering metadata query failures', async () => {
    const original = new Error('metadata query failed');
    const query = jest.fn(async () => {
      throw original;
    });

    await expect(
      getLlmBillingConfig({ query } as never, 'database-error-contract')
    ).rejects.toBe(original);
  });

  it('treats absent optional module relations as unprovisioned', async () => {
    const query = jest.fn(async () => ({
      rows: [{ relation: null as string | null }],
      rowCount: 1,
    }));

    await expect(
      getLlmBillingConfig({ query } as never, 'database-unprovisioned-contract')
    ).resolves.toEqual({ billing: null, inferenceLog: null });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('fails closed for invalid metering context but stays optional without identity', async () => {
    await expect(
      buildMeteringContext(
        { pgSettings },
        (settings) => settings['jwt.claims.user_id'] || null
      )
    ).rejects.toThrow('LLM_METERING_PG_CLIENT_CONTEXT_UNAVAILABLE');

    await expect(
      buildMeteringContext(
        { pgSettings: { role: 'anonymous_runtime' }, withPgClient: jest.fn() },
        () => null
      )
    ).rejects.toThrow('LLM_METERING pgSettings');

    const anonymousSettings = buildPgSettings({
      api,
      token: null,
      requestId: 'request-anonymous',
    });
    const withPgClient = jest.fn();
    await expect(
      buildMeteringContext(
        { pgSettings: anonymousSettings, withPgClient },
        (settings) => settings['jwt.claims.user_id'] || null
      )
    ).resolves.toBeNull();
    expect(withPgClient).not.toHaveBeenCalled();
  });
});
