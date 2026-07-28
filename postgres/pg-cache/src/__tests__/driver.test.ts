// Locks the pool-factory seam: getPgPool must use a registered factory when
// present, and fall back to the default pg.Pool builder otherwise. This is what
// lets an alternate backend (e.g. PGlite) plug in without any change to pgpm /
// pgsql-* — and guarantees the default path is untouched when nothing registers.

import { randomUUID } from 'crypto';
import pg from 'pg';

import {
  defaultPgPoolFactory,
  getActivePgPoolFactory,
  getPgPool,
  getPgPoolCacheKey,
  hasPgPoolFactory,
  PgPoolCacheManager,
  PgPoolFactory,
  registerPgPoolFactory,
} from '../index';

const createMockPool = (): pg.Pool =>
  ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(async () => {}),
  }) as unknown as pg.Pool;

const freshConfig = () => {
  const database = `seam_${randomUUID()}`;
  return {
    database,
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'x',
  };
};

describe('pg-cache pool-factory seam', () => {
  const ownedCaches: PgPoolCacheManager[] = [];
  const createCache = (): PgPoolCacheManager => {
    const cache = new PgPoolCacheManager(undefined, {});
    ownedCaches.push(cache);
    return cache;
  };

  afterEach(async () => {
    registerPgPoolFactory(undefined);
    await Promise.all(ownedCaches.splice(0).map((cache) => cache.close()));
  });

  it('defaults to no registered factory', () => {
    expect(hasPgPoolFactory()).toBe(false);
    expect(getActivePgPoolFactory()).toBeUndefined();
  });

  it('register/reset toggles the active factory', () => {
    const factory: PgPoolFactory = () => createMockPool();
    registerPgPoolFactory(factory);
    expect(hasPgPoolFactory()).toBe(true);
    expect(getActivePgPoolFactory()).toBe(factory);

    registerPgPoolFactory(undefined);
    expect(hasPgPoolFactory()).toBe(false);
  });

  it('getPgPool builds via the registered factory (no real pg connection)', () => {
    const cfg = freshConfig();
    const mock = createMockPool();
    const factory = jest.fn<pg.Pool, [any]>(() => mock);
    const cache = createCache();
    registerPgPoolFactory(factory);

    const pool = getPgPool(cfg, { cache, environment: {} });

    expect(factory).toHaveBeenCalledTimes(1);
    expect(pool).toBe(mock);
  });

  it('caches by complete connection identity', () => {
    const cfg = freshConfig();
    const factory = jest.fn<pg.Pool, [any]>(() => createMockPool());
    const cache = createCache();
    registerPgPoolFactory(factory);

    const first = getPgPool(cfg, { cache, environment: {} });
    const second = getPgPool(cfg, { cache, environment: {} });

    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('does not collide when database names match but credentials differ', () => {
    const cfg = freshConfig();
    const factory = jest.fn<pg.Pool, [any]>(() => createMockPool());
    const cache = createCache();
    registerPgPoolFactory(factory);

    const first = getPgPool(cfg, { cache, environment: {} });
    const second = getPgPool(
      { ...cfg, host: 'db.internal', password: 'different-secret' },
      { cache, environment: {} }
    );

    expect(first).not.toBe(second);
    expect(factory).toHaveBeenCalledTimes(2);
    expect([...cache.keys()]).toHaveLength(2);
    expect([...cache.keys()].join(' ')).not.toContain('different-secret');
    expect(getPgPoolCacheKey(cfg, { environment: {} })).not.toContain(
      cfg.password
    );
  });

  it('falls back to defaultPgPoolFactory when nothing is registered', () => {
    const cfg = freshConfig();
    const cache = createCache();
    // defaultPgPoolFactory builds a real pg.Pool but does NOT connect until a
    // query runs, so this is safe without a live server.
    const pool = getPgPool(cfg, { cache, environment: {} });
    expect(pool).toBeInstanceOf(pg.Pool);
  });

  it('defaultPgPoolFactory returns a pg.Pool', () => {
    const pool = defaultPgPoolFactory(freshConfig());
    expect(pool).toBeInstanceOf(pg.Pool);
    return pool.end();
  });
});
