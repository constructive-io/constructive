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

  it('invalidates every database when called without a database ID', async () => {
    const ctxA = context();
    const ctxB = context({ databaseId: 'database-b' });
    let generation = 0;
    const resolve = jest.fn(async () => ++generation);
    const loader = createModuleLoader({ name: 'global-invalidation', resolve });

    const firstA = await loader.resolve(ctxA);
    const firstB = await loader.resolve(ctxB);
    loader.invalidate();

    expect(loader.cacheSize).toBe(0);
    await expect(loader.resolve(ctxA)).resolves.not.toBe(firstA);
    await expect(loader.resolve(ctxB)).resolves.not.toBe(firstB);
    expect(resolve).toHaveBeenCalledTimes(4);
  });

  it('invalidates all pools, schemas, and APIs for one database only', async () => {
    const ctxA = context();
    const contexts = [
      ctxA,
      context(),
      context({ ...ctxA, routingSchema: 'routing_shadow' }),
      context({ ...ctxA, apiId: 'api-b' })
    ];
    const otherDatabase = context({ ...ctxA, databaseId: 'database-b' });
    let generation = 0;
    const resolve = jest.fn(async () => ++generation);
    const loader = createModuleLoader({ name: 'logical-invalidation', resolve });

    const previous = await Promise.all(contexts.map((ctx) => loader.resolve(ctx)));
    const otherValue = await loader.resolve(otherDatabase);
    loader.invalidate('database-a');

    expect(loader.cacheSize).toBe(1);
    await expect(loader.resolve(otherDatabase)).resolves.toBe(otherValue);
    for (let index = 0; index < contexts.length; index++) {
      await expect(loader.resolve(contexts[index])).resolves.not.toBe(previous[index]);
    }
    expect(resolve).toHaveBeenCalledTimes(contexts.length * 2 + 1);
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

  it.each(['database', 'global'])(
    'does not republish an old result after %s invalidation and a fresh result',
    async (scope) => {
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
      await Promise.resolve();
      loader.invalidate(scope === 'database' ? ctx.databaseId : undefined);
      const fresh = loader.resolve(ctx);
      await expect(fresh).resolves.toBe('fresh-config');
      complete('stale-config');
      await expect(stale).resolves.toBe('stale-config');
      await expect(loader.resolve(ctx)).resolves.toBe('fresh-config');
      expect(resolve).toHaveBeenCalledTimes(2);
    }
  );

  it.each(['database', 'global'])(
    'keeps the new query pending when an old result finishes after %s invalidation',
    async (scope) => {
      const ctx = context();
      let completeOld!: (value: string) => void;
      let completeFresh!: (value: string) => void;
      const oldResult = new Promise<string>((resolve) => {
        completeOld = resolve;
      });
      const freshResult = new Promise<string>((resolve) => {
        completeFresh = resolve;
      });
      const resolve = jest.fn()
        .mockImplementationOnce(() => oldResult)
        .mockImplementationOnce(() => freshResult);
      const loader = createModuleLoader<string>({
        name: 'pending-invalidation',
        resolve
      });

      const stale = loader.resolve(ctx);
      await Promise.resolve();
      loader.invalidate(scope === 'database' ? ctx.databaseId : undefined);
      const fresh = loader.resolve(ctx);

      completeOld('stale-config');
      await expect(stale).resolves.toBe('stale-config');
      expect(loader.cacheSize).toBe(0);
      const coalesced = loader.resolve(ctx);
      completeFresh('fresh-config');

      await expect(Promise.all([fresh, coalesced])).resolves.toEqual([
        'fresh-config',
        'fresh-config'
      ]);
      await expect(loader.resolve(ctx)).resolves.toBe('fresh-config');
      expect(resolve).toHaveBeenCalledTimes(2);
    }
  );

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

  it('discovers newly available config after an uncached undefined result', async () => {
    const resolve = jest.fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce('new-config');
    const loader = createModuleLoader({ name: 'absent-module', resolve });
    const ctx = context();

    await expect(loader.resolve(ctx)).resolves.toBeUndefined();
    expect(loader.cacheSize).toBe(0);
    await expect(loader.resolve(ctx)).resolves.toBe('new-config');
    await expect(loader.resolve(ctx)).resolves.toBe('new-config');

    expect(resolve).toHaveBeenCalledTimes(2);
    expect(loader.cacheSize).toBe(1);
  });

  it('retries PostgreSQL undefined_table on the next call without invalidation', async () => {
    const error = Object.assign(new Error('module table absent'), {
      code: '42P01'
    });
    const resolve = jest.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('new-config');
    const loader = createModuleLoader({ name: 'missing-table', resolve });
    const ctx = context();

    await expect(loader.resolve(ctx)).resolves.toBeUndefined();
    expect(loader.cacheSize).toBe(0);
    await expect(loader.resolve(ctx)).resolves.toBe('new-config');
    await expect(loader.resolve(ctx)).resolves.toBe('new-config');

    expect(resolve).toHaveBeenCalledTimes(2);
    expect(loader.cacheSize).toBe(1);
  });

  it('coalesces concurrent absence checks without caching their result', async () => {
    const resolve = jest.fn(async (): Promise<undefined> => undefined);
    const loader = createModuleLoader({ name: 'absent-coalescing', resolve });
    const ctx = context();

    await expect(Promise.all([
      loader.resolve(ctx),
      loader.resolve(ctx),
      loader.resolve(ctx)
    ])).resolves.toEqual([undefined, undefined, undefined]);
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(loader.cacheSize).toBe(0);

    await expect(loader.resolve(ctx)).resolves.toBeUndefined();
    expect(resolve).toHaveBeenCalledTimes(2);
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

  it.each([undefined, 'database-a'])(
    'forwards database ID %s through registry invalidation',
    (databaseId) => {
      const invalidate = jest.fn();
      const loader = {
        name: 'registered',
        resolve: jest.fn(),
        invalidate,
        cacheSize: 0
      } as ModuleLoader;
      const registry = createLoaderRegistry();
      registry.register(loader);

      registry.invalidate(databaseId);

      expect(invalidate).toHaveBeenCalledWith(databaseId);
    }
  );
});
