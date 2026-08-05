import type { GraphileCacheEntry } from 'graphile-cache';
import type { PgPoolLease } from 'pg-cache';

import {
  GraphileBuildPoolLeaseOwner,
  GraphileBuildPublicationError,
  publishGraphileBuild
} from '../graphile';

const lease = (identity = 'pg:runtime') => {
  const release = jest.fn();
  return {
    value: {
      identity,
      pool: {} as PgPoolLease['pool'],
      release
    } as PgPoolLease,
    release
  };
};

const entry = (
  cacheKey: string,
  overrides: Partial<GraphileCacheEntry> = {}
): GraphileCacheEntry => ({
  cacheKey,
  poolIdentity: overrides.poolLease?.identity,
  createdAt: Date.now(),
  ...overrides
} as GraphileCacheEntry);

describe('Graphile build PostgreSQL pool-lease publication', () => {
  it('keeps the lease with the build until a matching entry accepts ownership', () => {
    const retained = lease();
    const owner = new GraphileBuildPoolLeaseOwner(retained.value);
    const candidate = entry('build-a', {
      poolLease: retained.value,
      poolIdentity: retained.value.identity
    });

    owner.transferTo(candidate);
    owner.release();
    owner.release();

    expect(retained.release).not.toHaveBeenCalled();
    candidate.poolLease?.release();
    expect(retained.release).toHaveBeenCalledTimes(1);
  });

  it('releases an untransferred build lease exactly once', () => {
    const retained = lease();
    const owner = new GraphileBuildPoolLeaseOwner(retained.value);

    expect(() => owner.transferTo(entry('build-a'))).toThrow(
      'did not retain the build pool lease'
    );
    owner.release();
    owner.release();

    expect(retained.release).toHaveBeenCalledTimes(1);
  });

  it('leaves identity-mismatch cleanup to the entry that received the lease', () => {
    const retained = lease();
    const owner = new GraphileBuildPoolLeaseOwner(retained.value);
    const candidate = entry('build-a', {
      poolLease: retained.value,
      poolIdentity: 'pg:wrong'
    });

    expect(() => owner.transferTo(candidate)).toThrow('unexpected pool identity');
    owner.release();
    expect(retained.release).not.toHaveBeenCalled();
    candidate.poolLease?.release();
    expect(retained.release).toHaveBeenCalledTimes(1);
  });

  it('publishes one candidate without disposing its retained lease', async () => {
    const values = new Map<string, GraphileCacheEntry>();
    const cache = {
      get: jest.fn((key: string) => values.get(key)),
      set: jest.fn((key: string, value: GraphileCacheEntry) => values.set(key, value)),
      delete: jest.fn((key: string) => values.delete(key))
    };
    const dispose = jest.fn(async (): Promise<void> => undefined);
    const candidate = entry('build-a');

    await expect(publishGraphileBuild('build-a', candidate, false, {
      cache,
      dispose
    })).resolves.toBe(candidate);
    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(dispose).not.toHaveBeenCalled();
  });

  it('disposes a candidate when cache publication throws', async () => {
    const candidate = entry('build-a');
    const dispose = jest.fn(async (): Promise<void> => undefined);
    const cache = {
      get: jest.fn((): GraphileCacheEntry | undefined => undefined),
      set: jest.fn(() => {
        throw new Error('set failed');
      }),
      delete: jest.fn(() => false)
    };

    await expect(publishGraphileBuild('build-a', candidate, false, {
      cache,
      dispose
    })).rejects.toMatchObject({
      code: 'GRAPHILE_BUILD_PUBLICATION_FAILED'
    } satisfies Partial<GraphileBuildPublicationError>);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes an unexpected duplicate and returns the authoritative resident', async () => {
    const candidate = entry('build-a');
    const resident = entry('build-a');
    const dispose = jest.fn(async (): Promise<void> => undefined);
    const cache = {
      get: jest.fn(() => resident),
      set: jest.fn(),
      delete: jest.fn(() => false)
    };

    await expect(publishGraphileBuild('build-a', candidate, false, {
      cache,
      dispose
    })).resolves.toBe(resident);
    expect(cache.set).not.toHaveBeenCalled();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes a candidate replaced during publication and returns the stable replacement', async () => {
    const candidate = entry('build-a');
    const resident = entry('build-a');
    const dispose = jest.fn(async (): Promise<void> => undefined);
    let reads = 0;
    const cache = {
      get: jest.fn((): GraphileCacheEntry | undefined => {
        reads++;
        return reads === 1 ? undefined : resident;
      }),
      set: jest.fn(),
      delete: jest.fn(() => false)
    };

    await expect(publishGraphileBuild('build-a', candidate, false, {
      cache,
      dispose
    })).resolves.toBe(resident);
    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes an invalidated candidate before rejecting the build', async () => {
    const candidate = entry('build-a');
    const dispose = jest.fn(async (): Promise<void> => undefined);

    await expect(publishGraphileBuild('build-a', candidate, true, {
      cache: { get: jest.fn(), set: jest.fn(), delete: jest.fn() },
      dispose
    })).rejects.toMatchObject({ code: 'GRAPHILE_BUILD_INVALIDATED' });
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('rejects a candidate that failed before publication', async () => {
    const candidate = entry('build-a', {
      disposing: true,
      realtimeHealth: {
        status: 'failed',
        failureCode: 'INSUFFICIENT_PRIVILEGE',
        failedAt: Date.now()
      }
    });
    const dispose = jest.fn(async (): Promise<void> => undefined);
    const cache = {
      get: jest.fn((): GraphileCacheEntry | undefined => undefined),
      set: jest.fn(),
      delete: jest.fn(() => false)
    };

    await expect(publishGraphileBuild('build-a', candidate, false, {
      cache,
      dispose
    })).rejects.toMatchObject({
      code: 'GRAPHILE_BUILD_PUBLICATION_FAILED'
    });
    expect(cache.set).not.toHaveBeenCalled();
    expect(cache.delete).not.toHaveBeenCalled();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('removes and disposes a candidate that fails during publication', async () => {
    const candidate = entry('build-a');
    const values = new Map<string, GraphileCacheEntry>();
    const dispose = jest.fn(async (): Promise<void> => undefined);
    const cache = {
      get: jest.fn((key: string) => values.get(key)),
      set: jest.fn((key: string, value: GraphileCacheEntry) => {
        values.set(key, value);
        value.realtimeHealth = {
          status: 'failed',
          failureCode: 'INSUFFICIENT_PRIVILEGE',
          failedAt: Date.now()
        };
      }),
      delete: jest.fn((key: string) => values.delete(key))
    };

    await expect(publishGraphileBuild('build-a', candidate, false, {
      cache,
      dispose
    })).rejects.toMatchObject({
      code: 'GRAPHILE_BUILD_PUBLICATION_FAILED'
    });
    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(cache.delete).toHaveBeenCalledWith('build-a');
    expect(values.has('build-a')).toBe(false);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
