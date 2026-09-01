import { createModuleLoader } from '../create-loader';
import type { LoaderContext } from '../types';

function makeContext(databaseId: string, apiId?: string): LoaderContext {
  return {
    servicesPool: {} as LoaderContext['servicesPool'],
    tenantPool: {} as LoaderContext['tenantPool'],
    databaseId,
    apiId,
    dbname: `tenant_${databaseId}`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('createModuleLoader', () => {
  it('does not refresh the TTL on cache hits by default', async () => {
    let calls = 0;
    const loader = createModuleLoader<number>({
      name: 'boundedDefault',
      ttlMs: 200,
      resolve: async () => ++calls,
    });
    const ctx = makeContext('db-1');

    await expect(loader.resolve(ctx)).resolves.toBe(1);

    await sleep(100);
    await expect(loader.resolve(ctx)).resolves.toBe(1);

    await sleep(120);
    await expect(loader.resolve(ctx)).resolves.toBe(2);
    expect(calls).toBe(2);
  });

  it('allows loaders to opt into refreshing the TTL on cache hits', async () => {
    let calls = 0;
    const loader = createModuleLoader<number>({
      name: 'slidingOverride',
      ttlMs: 200,
      updateAgeOnGet: true,
      resolve: async () => ++calls,
    });
    const ctx = makeContext('db-1');

    await expect(loader.resolve(ctx)).resolves.toBe(1);

    await sleep(100);
    await expect(loader.resolve(ctx)).resolves.toBe(1);

    await sleep(120);
    await expect(loader.resolve(ctx)).resolves.toBe(1);
    expect(calls).toBe(1);
  });

  it('invalidates both database and database:api cache keys for a database', async () => {
    let calls = 0;
    const loader = createModuleLoader<string>({
      name: 'invalidateByDatabase',
      ttlMs: 10_000,
      resolve: async (ctx) => `${ctx.databaseId}:${ctx.apiId ?? 'none'}:${++calls}`,
    });
    const dbOnlyCtx = makeContext('db-1');
    const apiCtx = makeContext('db-1', 'api-1');
    const otherDbCtx = makeContext('db-2');

    await expect(loader.resolve(dbOnlyCtx)).resolves.toBe('db-1:none:1');
    await expect(loader.resolve(apiCtx)).resolves.toBe('db-1:api-1:2');
    await expect(loader.resolve(otherDbCtx)).resolves.toBe('db-2:none:3');
    expect(loader.cacheSize).toBe(3);

    loader.invalidate('db-1');
    expect(loader.cacheSize).toBe(1);

    await expect(loader.resolve(dbOnlyCtx)).resolves.toBe('db-1:none:4');
    await expect(loader.resolve(apiCtx)).resolves.toBe('db-1:api-1:5');
    await expect(loader.resolve(otherDbCtx)).resolves.toBe('db-2:none:3');
  });
});
