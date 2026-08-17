import type { Pool } from 'pg';

import { createModuleLoader } from '../../src/loaders/create-loader';
import { createLoaderRegistry } from '../../src/loaders/registry';
import type {
  LoaderContext,
  ModuleLoader
} from '../../src/loaders/types';

const pool = (): Pool => ({} as Pool);

const context = (
  overrides: Partial<LoaderContext> = {}
): LoaderContext => ({
  routingPool: pool(),
  routingSchema: 'routing_public',
  tenantPool: pool(),
  databaseId: 'database-a',
  apiId: 'api-a',
  dbname: 'tenant_a',
  ...overrides
});

describe('module loader cache lifecycle', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('isolates identical logical IDs across physical pools and routing schemas', async () => {
    const routingA = pool();
    const routingB = pool();
    const tenantA = pool();
    const tenantB = pool();
    const ctxA = context({ routingPool: routingA, tenantPool: tenantA });
    const ctxB = context({ routingPool: routingB, tenantPool: tenantA });
    const ctxC = context({ routingPool: routingA, tenantPool: tenantB });
    const ctxD = context({
      routingPool: routingA,
      routingSchema: 'routing_shadow',
      tenantPool: tenantA
    });
    const resolve = jest.fn(async (ctx: LoaderContext) => {
      if (ctx.routingSchema === 'routing_shadow') return 'schema-d';
      if (ctx.routingPool === routingB) return 'routing-b';
      if (ctx.tenantPool === tenantB) return 'tenant-c';
      return 'contract-a';
    });
    const loader = createModuleLoader({ name: 'isolation', resolve });

    await expect(loader.resolve(ctxA)).resolves.toBe('contract-a');
    await expect(loader.resolve(ctxB)).resolves.toBe('routing-b');
    await expect(loader.resolve(ctxC)).resolves.toBe('tenant-c');
    await expect(loader.resolve(ctxD)).resolves.toBe('schema-d');
    await expect(loader.resolve(ctxA)).resolves.toBe('contract-a');

    expect(resolve).toHaveBeenCalledTimes(4);
    expect(loader.cacheSize).toBe(4);
  });

  it('invalidates one physical contract without evicting its logical twin', async () => {
    const ctxA = context();
    const ctxB = context();
    let generation = 0;
    const resolve = jest.fn(async () => ++generation);
    const loader = createModuleLoader({ name: 'exact-invalidation', resolve });

    const firstA = await loader.resolve(ctxA);
    const firstB = await loader.resolve(ctxB);
    loader.invalidate(ctxA.databaseId, ctxA);

    await expect(loader.resolve(ctxB)).resolves.toBe(firstB);
    await expect(loader.resolve(ctxA)).resolves.not.toBe(firstA);
    expect(resolve).toHaveBeenCalledTimes(3);
  });

  it('invalidates a logical database across every physical contract', async () => {
    const ctxA = context();
    const ctxB = context();
    let generation = 0;
    const resolve = jest.fn(async () => ++generation);
    const loader = createModuleLoader({ name: 'logical-invalidation', resolve });

    await loader.resolve(ctxA);
    await loader.resolve(ctxB);
    loader.invalidate('database-a');
    await loader.resolve(ctxA);
    await loader.resolve(ctxB);

    expect(resolve).toHaveBeenCalledTimes(4);
  });

  it('coalesces concurrent misses for one exact contract', async () => {
    const ctx = context();
    const resolve = jest.fn(async () => 'shared-config');
    const loader = createModuleLoader({ name: 'coalescing', resolve });

    await expect(
      Promise.all([
        loader.resolve(ctx),
        loader.resolve(ctx),
        loader.resolve(ctx)
      ])
    ).resolves.toEqual(['shared-config', 'shared-config', 'shared-config']);
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('does not publish a resolution invalidated while it is in flight', async () => {
    const ctx = context();
    let complete!: (value: string) => void;
    const first = new Promise<string>((resolve) => {
      complete = resolve;
    });
    const resolve = jest.fn()
      .mockImplementationOnce(() => first)
      .mockResolvedValueOnce('fresh-config');
    const loader = createModuleLoader<string>({
      name: 'inflight-invalidation',
      resolve
    });

    const stale = loader.resolve(ctx);
    loader.invalidate(ctx.databaseId, ctx);
    const fresh = loader.resolve(ctx);
    await expect(fresh).resolves.toBe('fresh-config');
    complete('stale-config');
    await expect(stale).resolves.toBe('stale-config');
    await expect(loader.resolve(ctx)).resolves.toBe('fresh-config');
    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('uses a hard TTL that cache hits cannot extend', async () => {
    let now = 1;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    const ctx = context();
    let generation = 0;
    const resolve = jest.fn(async () => `config-${++generation}`);
    const loader = createModuleLoader({
      name: 'hard-expiry',
      ttlMs: 100,
      resolve
    });

    await expect(loader.resolve(ctx)).resolves.toBe('config-1');
    now = 76;
    await expect(loader.resolve(ctx)).resolves.toBe('config-1');
    now = 106;
    await expect(loader.resolve(ctx)).resolves.toBe('config-2');
    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('keeps the default cache bounded to 100 completed contracts', async () => {
    const routingPool = pool();
    const tenantPool = pool();
    const resolve = jest.fn(async (ctx: LoaderContext) => ctx.databaseId);
    const loader = createModuleLoader({ name: 'bounded-default', resolve });

    for (let index = 0; index <= 100; index++) {
      await loader.resolve(context({
        routingPool,
        tenantPool,
        databaseId: `database-${index}`
      }));
    }

    expect(loader.cacheSize).toBe(100);
    await loader.resolve(context({
      routingPool,
      tenantPool,
      databaseId: 'database-0'
    }));
    expect(resolve).toHaveBeenCalledTimes(102);
  });

  it('caches undefined results without confusing them for misses', async () => {
    const resolve = jest.fn(async (): Promise<undefined> => undefined);
    const loader = createModuleLoader({ name: 'absent-module', resolve });
    const ctx = context();

    await expect(loader.resolve(ctx)).resolves.toBeUndefined();
    await expect(loader.resolve(ctx)).resolves.toBeUndefined();

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(loader.cacheSize).toBe(1);
  });

  it('caches an absent module reported by PostgreSQL undefined_table', async () => {
    const error = Object.assign(new Error('module table absent'), {
      code: '42P01'
    });
    const resolve = jest.fn().mockRejectedValue(error);
    const loader = createModuleLoader({ name: 'missing-table', resolve });
    const ctx = context();

    await expect(loader.resolve(ctx)).resolves.toBeUndefined();
    await expect(loader.resolve(ctx)).resolves.toBeUndefined();

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(loader.cacheSize).toBe(1);
  });

  it('preserves other resolution errors and never caches them', async () => {
    const error = new Error('routing query failed');
    const resolve = jest.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('recovered');
    const loader = createModuleLoader({ name: 'failed-query', resolve });
    const ctx = context();

    await expect(loader.resolve(ctx)).rejects.toBe(error);
    await expect(loader.resolve(ctx)).resolves.toBe('recovered');

    expect(resolve).toHaveBeenCalledTimes(2);
    expect(loader.cacheSize).toBe(1);
  });

  it('forwards exact invalidation context through the registry', () => {
    const ctx = context();
    const invalidate = jest.fn();
    const loader = {
      name: 'registered',
      resolve: jest.fn(),
      invalidate,
      cacheSize: 0
    } as ModuleLoader;
    const registry = createLoaderRegistry();
    registry.register(loader);

    registry.invalidate(ctx.databaseId, ctx);

    expect(invalidate).toHaveBeenCalledWith(ctx.databaseId, ctx);
  });
});
