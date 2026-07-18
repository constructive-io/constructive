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
  hasPgPoolFactory,
  PgPoolFactory,
  registerPgPoolFactory
} from '../index';
import { pgCache } from '../lru';

const createMockPool = (): pg.Pool =>
  ({ query: jest.fn(), connect: jest.fn(), end: jest.fn(async () => {}) } as unknown as pg.Pool);

const freshConfig = () => {
  const database = `seam_${randomUUID()}`;
  return { database, host: 'localhost', port: 5432, user: 'postgres', password: 'x' };
};

describe('pg-cache pool-factory seam', () => {
  afterEach(() => {
    registerPgPoolFactory(undefined);
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
    registerPgPoolFactory(factory);

    const pool = getPgPool(cfg);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(pool).toBe(mock);

    pgCache.delete(cfg.database);
  });

  it('caches by database: a second call reuses the pool and does not re-invoke the factory', () => {
    const cfg = freshConfig();
    const factory = jest.fn<pg.Pool, [any]>(() => createMockPool());
    registerPgPoolFactory(factory);

    const first = getPgPool(cfg);
    const second = getPgPool(cfg);

    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);

    pgCache.delete(cfg.database);
  });

  it('falls back to defaultPgPoolFactory when nothing is registered', () => {
    const cfg = freshConfig();
    // defaultPgPoolFactory builds a real pg.Pool but does NOT connect until a
    // query runs, so this is safe without a live server.
    const pool = getPgPool(cfg);
    expect(pool).toBeInstanceOf(pg.Pool);
    pgCache.delete(cfg.database);
  });

  it('defaultPgPoolFactory returns a pg.Pool', () => {
    const pool = defaultPgPoolFactory(freshConfig());
    expect(pool).toBeInstanceOf(pg.Pool);
    return pool.end();
  });
});
