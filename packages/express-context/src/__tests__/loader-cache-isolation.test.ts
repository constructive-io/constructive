import type { Pool } from 'pg';

import { createModuleLoader } from '../loaders/create-loader';
import type { LoaderContext } from '../loaders/types';

const context = (
  routingPool: Pool,
  tenantPool: Pool,
  suffix: string
): LoaderContext => ({
  routingPool,
  routingPoolIdentity: `routing:${suffix}`,
  tenantPool,
  tenantPoolIdentity: `tenant:${suffix}`,
  databaseId: 'cloned-database-id',
  apiId: 'cloned-api-id',
  dbname: 'cloned_database'
});

describe('module loader physical cache isolation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not share one logical database/API entry across physical pool contracts', async () => {
    const routingA = {} as Pool;
    const routingB = {} as Pool;
    const tenantA = {} as Pool;
    const tenantB = {} as Pool;
    const ctxA = context(routingA, tenantA, 'a');
    const ctxB = context(routingB, tenantB, 'b');
    const resolve = jest.fn(async (ctx: LoaderContext) =>
      ctx.tenantPoolIdentity === 'tenant:a' ? 'config-a' : 'config-b'
    );
    const loader = createModuleLoader({ name: 'physical-isolation', resolve });

    await expect(loader.resolve(ctxA)).resolves.toBe('config-a');
    await expect(loader.resolve(ctxB)).resolves.toBe('config-b');
    await expect(loader.resolve(ctxA)).resolves.toBe('config-a');
    await expect(loader.resolve(ctxB)).resolves.toBe('config-b');

    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('can invalidate one physical contract without evicting its logical twin', async () => {
    const ctxA = context({} as Pool, {} as Pool, 'a');
    const ctxB = context({} as Pool, {} as Pool, 'b');
    let generation = 0;
    const resolve = jest.fn(async (ctx: LoaderContext) =>
      `${ctx.tenantPoolIdentity}:${++generation}`
    );
    const loader = createModuleLoader({ name: 'physical-invalidation', resolve });

    const firstA = await loader.resolve(ctxA);
    const firstB = await loader.resolve(ctxB);
    loader.invalidate(ctxA.databaseId, ctxA);

    await expect(loader.resolve(ctxB)).resolves.toBe(firstB);
    await expect(loader.resolve(ctxA)).resolves.not.toBe(firstA);
    expect(resolve).toHaveBeenCalledTimes(3);
  });

  it('falls back to pool object identity for generic callers without opaque identities', async () => {
    const routingPool = {} as Pool;
    const tenantA = {} as Pool;
    const tenantB = {} as Pool;
    const base = {
      routingPool,
      databaseId: 'cloned-database-id',
      apiId: 'cloned-api-id',
      dbname: 'cloned_database'
    };
    const resolve = jest.fn(async (ctx: LoaderContext) =>
      ctx.tenantPool === tenantA ? 'config-a' : 'config-b'
    );
    const loader = createModuleLoader({ name: 'object-isolation', resolve });

    await expect(loader.resolve({ ...base, tenantPool: tenantA })).resolves.toBe('config-a');
    await expect(loader.resolve({ ...base, tenantPool: tenantB })).resolves.toBe('config-b');
    await expect(loader.resolve({ ...base, tenantPool: tenantA })).resolves.toBe('config-a');

    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('isolates routing schemas even when the physical pools and logical IDs match', async () => {
    const base = context({} as Pool, {} as Pool, 'shared');
    const resolve = jest.fn(async (ctx: LoaderContext) => ctx.routingSchema);
    const loader = createModuleLoader({ name: 'routing-schema-isolation', resolve });

    await expect(loader.resolve({ ...base, routingSchema: 'routing_a' }))
      .resolves.toBe('routing_a');
    await expect(loader.resolve({ ...base, routingSchema: 'routing_b' }))
      .resolves.toBe('routing_b');
    await expect(loader.resolve({ ...base, routingSchema: 'routing_a' }))
      .resolves.toBe('routing_a');

    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent misses for one exact build contract', async () => {
    const ctx = context({} as Pool, {} as Pool, 'shared');
    const resolve = jest.fn(async () => 'shared-config');
    const loader = createModuleLoader({ name: 'concurrent-coalescing', resolve });

    await expect(Promise.all([
      loader.resolve(ctx),
      loader.resolve(ctx),
      loader.resolve(ctx)
    ])).resolves.toEqual(['shared-config', 'shared-config', 'shared-config']);
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('does not publish a resolution invalidated while its query is in flight', async () => {
    const ctx = context({} as Pool, {} as Pool, 'shared');
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

  it('uses a hard TTL that cache hits cannot extend indefinitely', async () => {
    let now = 1;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    const ctx = context({} as Pool, {} as Pool, 'shared');
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

  it('does not cache or coalesce authoritative loader reads', async () => {
    const ctx = context({} as Pool, {} as Pool, 'shared');
    let generation = 0;
    const resolve = jest.fn(async () => `config-${++generation}`);
    const loader = createModuleLoader({
      name: 'authoritative',
      cache: false,
      resolve
    });

    await expect(Promise.all([
      loader.resolve(ctx),
      loader.resolve(ctx)
    ])).resolves.toEqual(['config-1', 'config-2']);
    await expect(loader.resolve(ctx)).resolves.toBe('config-3');
    expect(resolve).toHaveBeenCalledTimes(3);
    expect(loader.cacheSize).toBe(0);
  });
});
