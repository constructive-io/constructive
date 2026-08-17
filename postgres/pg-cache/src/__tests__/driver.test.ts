// Locks the pool-factory seam: getPgPool must use a registered factory when
// present, and fall back to the default pg.Pool builder otherwise. This is what
// lets an alternate backend (e.g. PGlite) plug in without any change to pgpm /
// pgsql-* — and guarantees the default path is untouched when nothing registers.

import { createHash, randomUUID } from 'crypto';
import pg from 'pg';

import {
  acquirePgPool,
  defaultPgPoolFactory,
  getActivePgPoolFactory,
  getPgPool,
  getPgPoolConfig,
  getPgPoolDriverIdentity,
  getPgPoolIdentity,
  hasPgPoolFactory,
  PgPoolFactory,
  registerPgPoolFactory,
} from '../index';
import { pgCache } from '../lru';

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
    const alternateConnect = mock.connect;
    const factory = jest.fn<pg.Pool, [any]>(() => mock);
    registerPgPoolFactory(factory);

    const pool = getPgPool(cfg);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(pool).toBe(mock);
    expect(pool.connect).toBe(alternateConnect);

    pgCache.delete(getPgPoolIdentity(cfg));
  });

  it('caches by exact identity: an identical call reuses the pool', () => {
    const cfg = freshConfig();
    const factory = jest.fn<pg.Pool, [any]>(() => createMockPool());
    registerPgPoolFactory(factory);

    const first = getPgPool(cfg);
    const second = getPgPool(cfg);

    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);

    pgCache.delete(getPgPoolIdentity(cfg));
  });

  it('leases the exact identity with idempotent release', () => {
    const cfg = freshConfig();
    const mock = createMockPool();
    const factory = jest.fn<pg.Pool, [any]>(() => mock);
    registerPgPoolFactory(factory);

    const first = acquirePgPool(cfg, { purpose: 'runtime' });
    const second = acquirePgPool(cfg, { purpose: 'runtime' });

    expect(first.identity).toBe(getPgPoolIdentity(cfg, { purpose: 'runtime' }));
    expect(first.pool).toBe(mock);
    expect(second.pool).toBe(mock);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(pgCache.getStats().activeLeases).toBeGreaterThanOrEqual(2);

    first.release();
    first.release();
    second.release();
    pgCache.delete(first.identity);
  });

  it('separates credentials and purpose for one physical database', () => {
    const cfg = freshConfig();
    const factory = jest.fn<pg.Pool, [any, any]>(() => createMockPool());
    registerPgPoolFactory(factory);

    const control = getPgPool(cfg, { purpose: 'control' });
    const runtime = getPgPool(
      { ...cfg, user: 'runtime', password: 'runtime-secret' },
      { purpose: 'runtime' }
    );
    const notification = getPgPool(
      { ...cfg, user: 'runtime', password: 'runtime-secret' },
      { purpose: 'notification' }
    );

    expect(control).not.toBe(runtime);
    expect(runtime).not.toBe(notification);
    expect(factory).toHaveBeenCalledTimes(3);

    pgCache.delete(getPgPoolIdentity(cfg, { purpose: 'control' }));
    pgCache.delete(
      getPgPoolIdentity(
        { ...cfg, user: 'runtime', password: 'runtime-secret' },
        { purpose: 'runtime' }
      )
    );
    pgCache.delete(
      getPgPoolIdentity(
        { ...cfg, user: 'runtime', password: 'runtime-secret' },
        { purpose: 'notification' }
      )
    );
  });

  it('normalizes maxUses into the exact pool identity', () => {
    const cfg = freshConfig();
    const unlimited = getPgPoolIdentity(cfg);
    const explicitUnlimited = getPgPoolIdentity({
      ...cfg,
      pool: { maxUses: 0 },
    });
    const singleUse = getPgPoolIdentity({ ...cfg, pool: { maxUses: 1 } });

    expect(explicitUnlimited).toBe(unlimited);
    expect(singleUse).not.toBe(unlimited);
  });

  it('uses a process-keyed identity instead of an offline password verifier', () => {
    const cfg = {
      ...freshConfig(),
      pool: {
        max: 3,
        idleTimeoutMillis: 1234,
        connectionTimeoutMillis: 5678,
        allowExitOnIdle: true,
      },
    };
    const identity = getPgPoolIdentity(cfg, { purpose: 'runtime' });
    const unkeyedInput = JSON.stringify({
      version: 1,
      driver: getPgPoolDriverIdentity(),
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      ssl: null,
      pool: {
        max: 3,
        maxUses: null,
        idleTimeoutMillis: 1234,
        connectionTimeoutMillis: 5678,
        allowExitOnIdle: true,
      },
      purpose: 'runtime',
      checkout: 'registered-factory-owned-v1',
    });
    const offlineDigest = `pg:v1:${createHash('sha256')
      .update(unkeyedInput)
      .digest('hex')}`;

    expect(getPgPoolIdentity(cfg, { purpose: 'runtime' })).toBe(identity);
    expect(identity).toMatch(/^pg:v1:[a-f0-9]{64}$/);
    expect(identity).not.toBe(offlineDigest);
  });

  it('rejects credential callbacks and noncanonical identity inputs', () => {
    const cfg = freshConfig();
    const accessorSsl = {} as Record<string, unknown>;
    Object.defineProperty(accessorSsl, 'ca', { get: () => 'dynamic-ca' });

    expect(() =>
      getPgPoolIdentity({
        ...cfg,
        password: (async () => 'secret') as unknown as string,
      })
    ).toThrow('pg.password must be a string');
    expect(() =>
      getPgPoolIdentity({
        ...cfg,
        port: '5432' as unknown as number,
      })
    ).toThrow('pg.port must be a safe integer');
    expect(() =>
      getPgPoolIdentity(cfg, {
        purpose: {} as unknown as string,
      })
    ).toThrow('pg pool purpose must be a non-empty string');
    expect(() =>
      getPgPoolIdentity({
        ...cfg,
        ssl: accessorSsl as never,
      })
    ).toThrow('pg.ssl.ca must be a data property');
  });

  it('canonicalizes TLS data but separates distinct trust contracts', () => {
    const cfg = freshConfig();
    const verified = getPgPoolIdentity({
      ...cfg,
      ssl: {
        ca: 'tenant-ca',
        rejectUnauthorized: true,
        servername: 'db.internal',
      },
    });
    const reordered = getPgPoolIdentity({
      ...cfg,
      ssl: {
        servername: 'db.internal',
        rejectUnauthorized: true,
        ca: 'tenant-ca',
      },
    });
    const insecure = getPgPoolIdentity({
      ...cfg,
      ssl: {
        ca: 'tenant-ca',
        rejectUnauthorized: false,
        servername: 'db.internal',
      },
    });

    expect(reordered).toBe(verified);
    expect(insecure).not.toBe(verified);
    expect(() =>
      getPgPoolIdentity({
        ...cfg,
        ssl: { checkServerIdentity: (): undefined => undefined } as any,
      })
    ).toThrow('must contain only deterministic data values');
  });

  it('never discloses credentials in an identity', () => {
    const cfg = { ...freshConfig(), password: 'top-secret-password' };
    const identity = getPgPoolIdentity(cfg, { purpose: 'runtime' });

    expect(identity).toMatch(/^pg:v1:[a-f0-9]{64}$/);
    expect(identity).not.toContain(cfg.user);
    expect(identity).not.toContain(cfg.password);
  });

  it('parses and validates maxUses before constructing a pool', () => {
    const previous = process.env.PG_POOL_MAX_USES;
    try {
      process.env.PG_POOL_MAX_USES = '0';
      expect(getPgPoolConfig().maxUses).toBeUndefined();
      process.env.PG_POOL_MAX_USES = '17';
      expect(getPgPoolConfig().maxUses).toBe(17);
      process.env.PG_POOL_MAX_USES = '1e2';
      expect(() => getPgPoolConfig()).toThrow(
        'PG_POOL_MAX_USES must be 0 or a positive safe integer'
      );
      expect(() => getPgPoolConfig({ maxUses: -1 })).toThrow(
        'pool.maxUses must be 0 or a positive safe integer'
      );
    } finally {
      if (previous === undefined) delete process.env.PG_POOL_MAX_USES;
      else process.env.PG_POOL_MAX_USES = previous;
    }
  });

  it('falls back to defaultPgPoolFactory when nothing is registered', () => {
    const cfg = freshConfig();
    // defaultPgPoolFactory builds a real pg.Pool but does NOT connect until a
    // query runs, so this is safe without a live server.
    const pool = getPgPool(cfg);
    expect(pool).toBeInstanceOf(pg.Pool);
    pgCache.delete(getPgPoolIdentity(cfg));
  });

  it('defaultPgPoolFactory returns a pg.Pool', () => {
    const pool = defaultPgPoolFactory(freshConfig());
    expect(pool).toBeInstanceOf(pg.Pool);
    return pool.end();
  });

  it('passes exact credentials, pool limits, and TLS fields to node-postgres', async () => {
    const ssl = {
      ca: 'tenant-ca',
      cert: 'runtime-cert',
      key: 'runtime-key',
      rejectUnauthorized: true,
      servername: 'db.internal',
      minVersion: 'TLSv1.2' as const,
    };
    const cfg = {
      ...freshConfig(),
      user: 'runtime@tenant',
      password: 'x@evil.example/other?sslmode=require',
      database: 'tenant/database',
      ssl,
      pool: { maxUses: 1 },
    };
    const pool = defaultPgPoolFactory(cfg);
    const options = (pool as pg.Pool & { options: pg.PoolConfig }).options;

    expect(options).toMatchObject({
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      maxUses: 1,
      ssl,
    });
    await pool.end();
  });
});
