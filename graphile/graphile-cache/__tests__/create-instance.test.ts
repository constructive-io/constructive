import { RealtimeManager } from 'graphile-realtime-subscriptions';
import { postgraphile } from 'postgraphile';

import { createGraphileInstance } from '../src/create-instance';

jest.mock('postgraphile', () => ({ postgraphile: jest.fn() }));
jest.mock('graphile-realtime-subscriptions', () => ({ RealtimeManager: jest.fn() }));

const release = jest.fn();
const start = jest.fn();
const stop = jest.fn();
const pool = { query: jest.fn() };
const pgSubscriber = {};
const preset = { pgServices: [{ adaptorSettings: { pool }, pgSubscriber }] } as any;

beforeEach(() => {
  jest.clearAllMocks();
  release.mockResolvedValue(undefined);
  start.mockResolvedValue(undefined);
  (postgraphile as jest.Mock).mockImplementation((resolvedPreset) => ({
    createServ: () => ({ addTo: jest.fn(), ready: jest.fn() }),
    getSchema: async () => ({}),
    getResolvedPreset: () => resolvedPreset,
    release
  }));
  (RealtimeManager as jest.Mock).mockImplementation(() => ({ start, stop }));
});

it('passes the registered physical schema to the manager', async () => {
  const entry = await createGraphileInstance({ preset, cacheKey: 'tenant', enableRealtime: true, realtimeSchema: 'rt_tenant_123' });
  expect(RealtimeManager).toHaveBeenCalledWith(expect.objectContaining({ schema: 'rt_tenant_123', pool, pgSubscriber }));
  expect(start).toHaveBeenCalledTimes(1);
  expect(entry.realtimeManager).toEqual({ start, stop });
});

it.each([
  { enableRealtime: true },
  { enableRealtime: false, realtimeSchema: 'rt_tenant_123' }
])('does not start a manager without an enabled installed module: %j', async (options) => {
  const entry = await createGraphileInstance({ preset, cacheKey: 'tenant', ...options });
  expect(RealtimeManager).not.toHaveBeenCalled();
  expect(entry.realtimeManager).toBeUndefined();
});

it('propagates startup failures and releases the graphile instance', async () => {
  const error = new Error('listener startup failed');
  start.mockRejectedValue(error);
  await expect(createGraphileInstance({ preset, cacheKey: 'tenant', enableRealtime: true, realtimeSchema: 'rt_tenant_123' })).rejects.toBe(error);
  expect(release).toHaveBeenCalledTimes(1);
});

it('preserves both startup and cleanup failures', async () => {
  const error = new Error('listener startup failed');
  const cleanup = new Error('release failed');
  start.mockRejectedValue(error);
  release.mockRejectedValue(cleanup);
  await expect(createGraphileInstance({ preset, cacheKey: 'tenant', enableRealtime: true, realtimeSchema: 'rt_tenant_123' }))
    .rejects.toMatchObject({ errors: [error, cleanup] });
});

it('fails closed if an installed realtime module has no subscriber service', async () => {
  await expect(createGraphileInstance({ preset: { pgServices: [] }, cacheKey: 'tenant', enableRealtime: true, realtimeSchema: 'rt_tenant_123' }))
    .rejects.toThrow('no pgSubscriber');
  expect(release).toHaveBeenCalledTimes(1);
});
