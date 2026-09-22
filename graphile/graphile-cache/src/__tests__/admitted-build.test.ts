import { buildAdmittedGraphileInstance } from '../admitted-build';
import {
  clearGraphileCache,
  configureGraphileAdmission,
  getCacheStats,
  graphileCache,
  type GraphileCacheEntry
} from '../graphile-cache';

const metadata = (key: string) => ({ cacheKey: key, serviceKey: 'service', databaseId: 'database-id', poolKey: 'physical-db' });
const entry = (key: string, release = jest.fn(async (): Promise<void> => undefined)): GraphileCacheEntry => ({
  cacheKey: key,
  createdAt: Date.now(),
  pgl: { release },
  serv: {},
  handler: {},
  httpServer: { listening: false }
} as unknown as GraphileCacheEntry);

beforeAll(() => configureGraphileAdmission({ max: 1, heapMaxBytes: 1024 * 1024 * 1024, buildReserveBytes: 0 }));
afterEach(async () => {
  jest.restoreAllMocks();
  await clearGraphileCache();
});

it('waits for old services to release before invoking the next factory', async () => {
  let finishRelease!: () => void;
  const released = new Promise<void>((resolve) => { finishRelease = resolve; });
  await buildAdmittedGraphileInstance(metadata('old'), async () => entry('old', jest.fn(() => released)));
  const create = jest.fn(async () => entry('new'));
  const pending = buildAdmittedGraphileInstance(metadata('new'), create);
  await new Promise((resolve) => setImmediate(resolve));
  expect(create).not.toHaveBeenCalled();
  expect(getCacheStats()).toMatchObject({ size: 0, disposing: 1 });
  finishRelease();
  const result = await pending;
  expect(result).toMatchObject(metadata('new'));
  expect(graphileCache.get('new')).toBe(result);
  expect(getCacheStats().reserved).toBe(0);
});

it('disposes an oversized completed result instead of publishing it', async () => {
  const release = jest.fn(async (): Promise<void> => undefined);
  const memory = process.memoryUsage();
  await expect(buildAdmittedGraphileInstance(metadata('oversized'), async () => {
    jest.spyOn(process, 'memoryUsage').mockReturnValue({ ...memory, heapUsed: 2 * 1024 * 1024 * 1024 });
    return entry('oversized', release);
  })).rejects.toMatchObject({ code: 'SCHEMA_CAPACITY_EXHAUSTED' });
  expect(release).toHaveBeenCalledTimes(1);
  expect(graphileCache.has('oversized')).toBe(false);
  expect(getCacheStats().reserved).toBe(0);
});

it('returns failed-factory capacity so a subsequent build can succeed', async () => {
  const error = new Error('schema failed');
  await expect(buildAdmittedGraphileInstance(metadata('failed'), async () => { throw error; })).rejects.toBe(error);
  const result = await buildAdmittedGraphileInstance(metadata('retry'), async () => entry('retry'));
  expect(graphileCache.get('retry')).toBe(result);
  expect(getCacheStats().reserved).toBe(0);
});

it('refuses new builds after an eviction cannot release its resources', async () => {
  const failure = new Error('service release failed');
  await buildAdmittedGraphileInstance(metadata('failed-release'), async () =>
    entry('failed-release', jest.fn(async () => { throw failure; })));
  const create = jest.fn(async () => entry('replacement'));
  await expect(buildAdmittedGraphileInstance(metadata('replacement'), create)).rejects.toBe(failure);
  expect(create).not.toHaveBeenCalled();
  expect(getCacheStats()).toMatchObject({ admissionFailed: true, reserved: 0 });
  await expect(buildAdmittedGraphileInstance(metadata('later'), create)).rejects.toBe(failure);
  await expect(clearGraphileCache()).rejects.toBe(failure);
});
