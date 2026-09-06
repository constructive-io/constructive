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

    pgCache.delete(getPgPoolIdentity(cfg));
  });

  it('caches by exact pool identity: an identical call reuses the pool', () => {
    const cfg = freshConfig();
    const factory = jest.fn<pg.Pool, [any]>(() => createMockPool());
    registerPgPoolFactory(factory);

    const first = getPgPool(cfg);
    const second = getPgPool(cfg);

    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);

    pgCache.delete(getPgPoolIdentity(cfg));
  });

  it('acquires an idempotently releasable lease for the exact pool identity', () => {
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

    first.release();
    first.release();
    second.release();
    pgCache.delete(first.identity);
  });

  it('separates credentials, purpose, and sanitation mode for the same database', () => {
    const cfg = freshConfig();
    const factory = jest.fn<pg.Pool, [any, any]>(() => createMockPool());
    registerPgPoolFactory(factory);

    const control = getPgPool(cfg, { purpose: 'control' });
    const runtime = getPgPool({ ...cfg, user: 'runtime' }, {
      purpose: 'runtime',
      sanitizeOnCheckout: true
    });
    const unsanitizedRuntime = getPgPool({ ...cfg, user: 'runtime' }, {
      purpose: 'runtime'
    });

    expect(control).not.toBe(runtime);
    expect(runtime).not.toBe(unsanitizedRuntime);
    expect(factory).toHaveBeenCalledTimes(3);

    pgCache.delete(getPgPoolIdentity(cfg, { purpose: 'control' }));
    pgCache.delete(getPgPoolIdentity({ ...cfg, user: 'runtime' }, {
      purpose: 'runtime',
      sanitizeOnCheckout: true
    }));
    pgCache.delete(getPgPoolIdentity({ ...cfg, user: 'runtime' }, { purpose: 'runtime' }));
  });

  it('normalizes maxUses into the exact pool identity', () => {
    const cfg = freshConfig();
    const unlimited = getPgPoolIdentity(cfg);
    const explicitUnlimited = getPgPoolIdentity({ ...cfg, pool: { maxUses: 0 } });
    const singleUse = getPgPoolIdentity({ ...cfg, pool: { maxUses: 1 } });
    const doubleUse = getPgPoolIdentity({ ...cfg, pool: { maxUses: 2 } });

    expect(explicitUnlimited).toBe(unlimited);
    expect(singleUse).not.toBe(unlimited);
    expect(doubleUse).not.toBe(singleUse);
  });

  it('uses a process-keyed identity instead of an offline password verifier', () => {
    const cfg = {
      ...freshConfig(),
      pool: {
        max: 3,
        idleTimeoutMillis: 1234,
        connectionTimeoutMillis: 5678,
        allowExitOnIdle: true
      }
    };
    const identity = getPgPoolIdentity(cfg, {
      purpose: 'runtime',
      sanitizeOnCheckout: true
    });
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
        allowExitOnIdle: true
      },
      purpose: 'runtime',
      sanitizeOnCheckout: true
    });
    const offlineDigest = `pg:v1:${createHash('sha256')
      .update(unkeyedInput)
      .digest('hex')}`;

    expect(getPgPoolIdentity(cfg, {
      purpose: 'runtime',
      sanitizeOnCheckout: true
    })).toBe(identity);
    expect(identity).toMatch(/^pg:v1:[a-f0-9]{64}$/);
    expect(identity).not.toBe(offlineDigest);
  });

  it('rejects password callbacks before they can alias a pool identity', () => {
    const cfg = freshConfig();
    const first = async () => 'first-secret';
    const second = async () => 'second-secret';
    const factory = jest.fn<pg.Pool, [any]>(() => createMockPool());
    registerPgPoolFactory(factory);

    for (const password of [first, second]) {
      const invalid = {
        ...cfg,
        password: password as unknown as string
      };
      expect(() => getPgPoolIdentity(invalid)).toThrow(
        'pg.password must be a string'
      );
      expect(() => getPgPool(invalid)).toThrow(
        'pg.password must be a string'
      );
    }
    expect(factory).not.toHaveBeenCalled();
  });

  it('rejects noncanonical exact-identity inputs', () => {
    const cfg = freshConfig();
    const accessorSsl = {} as Record<string, unknown>;
    Object.defineProperty(accessorSsl, 'ca', { get: () => 'dynamic-ca' });
    const symbolSsl = { ca: 'tenant-ca' } as Record<PropertyKey, unknown>;
    symbolSsl[Symbol('hidden')] = 'untracked';
    const sparseCa = new Array<string>(2);
    sparseCa[1] = 'tenant-ca';
    const undefinedSsl: { ca: undefined } = { ca: undefined };

    expect(() => getPgPoolIdentity({
      ...cfg,
      port: '5432' as unknown as number
    })).toThrow('pg.port must be a safe integer');
    expect(() => getPgPoolIdentity({
      ...cfg,
      pool: { max: '2' as unknown as number }
    })).toThrow('pool.max must be a safe integer');
    expect(() => getPgPoolIdentity(cfg, {
      purpose: {} as unknown as string
    })).toThrow('pg pool purpose must be a non-empty string');
    expect(() => getPgPoolIdentity(cfg, {
      sanitizeOnCheckout: 'false' as unknown as boolean
    })).toThrow('pg pool sanitizeOnCheckout must be a boolean');
    expect(() => getPgPoolIdentity({
      ...cfg,
      ssl: accessorSsl as never
    })).toThrow('pg.ssl.ca must be a data property');
    expect(() => getPgPoolIdentity({
      ...cfg,
      ssl: symbolSsl as never
    })).toThrow('pg.ssl must not contain symbol properties');
    expect(() => getPgPoolIdentity({
      ...cfg,
      ssl: { ca: sparseCa } as never
    })).toThrow('pg.ssl.ca must be a dense array without custom properties');
    expect(() => getPgPoolIdentity({
      ...cfg,
      ssl: undefinedSsl as never
    })).toThrow('pg.ssl.ca must not be undefined');
  });

  it('parses PG_POOL_MAX_USES as an unlimited sentinel or positive safe integer', () => {
    const previous = process.env.PG_POOL_MAX_USES;
    try {
      process.env.PG_POOL_MAX_USES = '0';
      expect(getPgPoolConfig().maxUses).toBeUndefined();

      process.env.PG_POOL_MAX_USES = '17';
      expect(getPgPoolConfig().maxUses).toBe(17);

      for (const invalid of [
        '-1',
        '1.5',
        '01',
        '1e2',
        '0x10',
        ' 1',
        '1 ',
        ' ',
        'not-a-number',
        '9007199254740992'
      ]) {
        process.env.PG_POOL_MAX_USES = invalid;
        expect(() => getPgPoolConfig()).toThrow(
          'PG_POOL_MAX_USES must be 0 or a positive safe integer'
        );
      }
    } finally {
      if (previous === undefined) delete process.env.PG_POOL_MAX_USES;
      else process.env.PG_POOL_MAX_USES = previous;
    }
  });

  it('validates explicit maxUses overrides before constructing an identity or pool', () => {
    expect(getPgPoolConfig({ maxUses: 0 }).maxUses).toBeUndefined();
    expect(getPgPoolConfig({ maxUses: 23 }).maxUses).toBe(23);

    for (const invalid of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 9007199254740992]) {
      expect(() => getPgPoolConfig({ maxUses: invalid })).toThrow(
        'pool.maxUses must be 0 or a positive safe integer'
      );
    }
    for (const invalid of [true, null, {}]) {
      expect(() => getPgPoolConfig({
        maxUses: invalid as unknown as number
      })).toThrow('pool.maxUses must be 0 or a positive safe integer');
    }
  });

  it('replaces a sanitized custom factory query that bypasses connect', async () => {
    const cfg = freshConfig();
    const queryResult = { rows: [{ value: 42 }] };
    const client = {
      query: jest.fn(async (text: string) => text === 'SELECT $1::int AS value'
        ? queryResult
        : { rows: [] }),
      release: jest.fn()
    };
    const bypassingQuery = jest.fn(async () => ({ rows: [{ value: -1 }] }));
    const connect = jest.fn(async () => client);
    const pool = {
      query: bypassingQuery,
      connect,
      end: jest.fn(async (): Promise<void> => undefined)
    } as unknown as pg.Pool;
    const factory = jest.fn(() => pool);
    registerPgPoolFactory(factory);
    const options = { purpose: 'runtime', sanitizeOnCheckout: true } as const;
    const identity = getPgPoolIdentity(cfg, options);

    try {
      const sanitizedPool = getPgPool(cfg, options);

      await expect(sanitizedPool.query(
        'SELECT $1::int AS value',
        [42]
      )).resolves.toBe(queryResult);
      expect(bypassingQuery).not.toHaveBeenCalled();
      expect(connect).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenNthCalledWith(1, 'DISCARD ALL');
      expect(client.query).toHaveBeenNthCalledWith(
        2,
        'SET search_path TO pg_catalog; SET row_security TO on; SET jit_optimize_above_cost TO -1'
      );
      expect(client.query).toHaveBeenNthCalledWith(3, 'SELECT $1::int AS value', [42]);
      expect(client.release).toHaveBeenCalledTimes(1);
      expect(client.release).toHaveBeenCalledWith();
    } finally {
      pgCache.delete(identity);
      await pgCache.waitForDisposals();
    }
  });

  it('separates TLS trust contracts for the same database and role', () => {
    const cfg = freshConfig();

    const verified = getPgPoolIdentity({
      ...cfg,
      ssl: { ca: 'tenant-ca', rejectUnauthorized: true, servername: 'db.internal' }
    });
    const insecure = getPgPoolIdentity({
      ...cfg,
      ssl: { ca: 'tenant-ca', rejectUnauthorized: false, servername: 'db.internal' }
    });
    const plaintext = getPgPoolIdentity(cfg);

    expect(verified).not.toBe(insecure);
    expect(verified).not.toBe(plaintext);
    expect(insecure).not.toBe(plaintext);
  });

  it('canonicalizes TLS data and rejects identity inputs JSON would omit', () => {
    const cfg = freshConfig();
    const first = getPgPoolIdentity({
      ...cfg,
      ssl: { ca: 'tenant-ca', rejectUnauthorized: true }
    });
    const second = getPgPoolIdentity({
      ...cfg,
      ssl: { rejectUnauthorized: true, ca: 'tenant-ca' }
    });

    expect(first).toBe(second);
    expect(() => getPgPoolIdentity({
      ...cfg,
      ssl: { checkServerIdentity: (): undefined => undefined } as any
    })).toThrow('pg.ssl.checkServerIdentity must contain only deterministic data values');

    const bufferIdentity = getPgPoolIdentity({
      ...cfg,
      ssl: { ca: Buffer.from('tenant-ca') }
    });
    const mimickedBufferIdentity = getPgPoolIdentity({
      ...cfg,
      ssl: {
        ca: {
          bufferSha256: 'b60c1883ea3c4bf71a5959468ac16f36e2aa4f5c8702ca157fbbae61415f2f10'
        }
      } as any
    });
    expect(bufferIdentity).not.toBe(mimickedBufferIdentity);
  });

  it('uses opaque identities that never disclose credentials', () => {
    const cfg = { ...freshConfig(), password: 'top-secret-password' };
    const identity = getPgPoolIdentity(cfg, { purpose: 'runtime' });
    expect(identity).toMatch(/^pg:v1:[a-f0-9]{64}$/);
    expect(identity).not.toContain(cfg.user);
    expect(identity).not.toContain(cfg.password);
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

  it('passes credentials as discrete fields instead of reparsing them as a URI', async () => {
    const cfg = {
      ...freshConfig(),
      user: 'runtime@tenant',
      password: 'x@evil.example/other?sslmode=require',
      database: 'tenant/database'
    };
    const pool = defaultPgPoolFactory(cfg);
    const options = (pool as pg.Pool & { options: pg.PoolConfig }).options;

    expect(options.host).toBe(cfg.host);
    expect(options.port).toBe(cfg.port);
    expect(options.database).toBe(cfg.database);
    expect(options.user).toBe(cfg.user);
    expect(options.password).toBe(cfg.password);
    await pool.end();
  });

  it('passes maxUses to the native pg.Pool driver', async () => {
    const pool = defaultPgPoolFactory({ ...freshConfig(), pool: { maxUses: 1 } });
    const options = (pool as pg.Pool & { options: pg.PoolConfig }).options;

    expect(options.maxUses).toBe(1);
    await pool.end();
  });

  it('passes the exact TLS contract to node-postgres', async () => {
    const ssl = {
      ca: 'tenant-ca',
      cert: 'runtime-cert',
      key: 'runtime-key',
      rejectUnauthorized: true,
      servername: 'db.internal',
      minVersion: 'TLSv1.2' as const
    };
    const pool = defaultPgPoolFactory({ ...freshConfig(), ssl });
    const options = (pool as pg.Pool & { options: pg.PoolConfig }).options;

    expect(options.ssl).toEqual(ssl);
    await pool.end();
  });

  it('pins the trusted baseline in sanitized node-postgres startup options', async () => {
    const pool = defaultPgPoolFactory(freshConfig(), {
      purpose: 'runtime',
      sanitizeOnCheckout: true
    });
    const options = (pool as pg.Pool & { options: pg.PoolConfig }).options;

    expect(options.options).toContain('-c search_path=pg_catalog');
    expect(options.options).toContain('-c row_security=on');
    expect(options.options).toContain('-c jit_optimize_above_cost=-1');
    expect(pool.query).toBe(pg.Pool.prototype.query);
    await pool.end();
  });
});
