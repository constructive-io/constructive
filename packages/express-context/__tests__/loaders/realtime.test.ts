import type { Pool } from 'pg';

import { realtimeLoader } from '../../src/loaders/realtime';
import type { LoaderContext } from '../../src/loaders/types';

const query = jest.fn();
const ctx = (databaseId = 'db-a'): LoaderContext => ({
  databaseId,
  routingPool: {} as Pool,
  tenantPool: { query } as unknown as Pool
});

beforeEach(() => {
  realtimeLoader.invalidate();
  query.mockReset();
});

it('discovers and caches the physical schema through the tenant-keyed login reader', async () => {
  query.mockResolvedValue({ rows: [{ runtime_schema: 'tenant_a_realtime_12' }] });
  await expect(realtimeLoader.resolve(ctx())).resolves.toEqual({ schemaName: 'tenant_a_realtime_12' });
  await realtimeLoader.resolve(ctx());
  expect(query).toHaveBeenCalledTimes(1);
  expect(query).toHaveBeenCalledWith(expect.stringContaining('function_resolution.realtime_module_registrations($1)'), ['db-a']);
  query.mockResolvedValue({ rows: [{ runtime_schema: 'tenant_b_realtime_19' }] });
  await expect(realtimeLoader.resolve(ctx('db-b'))).resolves.toEqual({ schemaName: 'tenant_b_realtime_19' });
});

it('returns undefined only when the module is absent', async () => {
  query.mockResolvedValue({ rows: [] });
  await expect(realtimeLoader.resolve(ctx())).resolves.toBeUndefined();
});

it.each([[{ runtime_schema: null }], [{ runtime_schema: 'a' }, { runtime_schema: 'b' }]])('rejects malformed registrations: %j', async (...rows) => {
  query.mockResolvedValue({ rows });
  await expect(realtimeLoader.resolve(ctx())).rejects.toThrow('Invalid realtime module registration');
});

it('propagates lookup failures instead of treating them as an absent module', async () => {
  query.mockRejectedValue(new Error('reader unavailable'));
  await expect(realtimeLoader.resolve(ctx())).rejects.toThrow('reader unavailable');
});

it('refuses unkeyed discovery', async () => {
  await expect(realtimeLoader.resolve(ctx(''))).rejects.toThrow('context carries no databaseId');
  expect(query).not.toHaveBeenCalled();
});
