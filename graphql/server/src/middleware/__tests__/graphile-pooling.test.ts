import type { Pool } from 'pg';

import type { ApiStructure } from '../../types';
import { isBlueprintPoolingEnabled } from '../blueprint';
import { clearPoolDecisions, computePoolDecision, resolvePoolDecision } from '../pooling-decision';

type QueryResult = { rows: Array<Record<string, unknown>> };

const makeApi = (overrides: Partial<ApiStructure> = {}): ApiStructure =>
  ({
    dbname: 'constructive',
    anonRole: 'anon',
    roleName: 'authenticated',
    schema: ['marketplace-db-tenant1-5e6b13b2-app-public'],
    apiModules: [],
    ...overrides
  } as ApiStructure);

// A mock Pool whose query() resolves queued results in call order. computePoolDecision
// issues a single shape-fingerprint query.
const makePool = (results: QueryResult[]): { pool: Pool; query: jest.Mock } => {
  const query = jest.fn();
  results.forEach((r) => query.mockResolvedValueOnce(r));
  return { pool: { query } as unknown as Pool, query };
};

describe('computePoolDecision', () => {
  afterEach(() => {
    clearPoolDecisions();
    jest.clearAllMocks();
  });

  it('falls back (pooling=false, key=svc_key) when realtime is enabled, without touching the DB', async () => {
    const { pool, query } = makePool([]);
    const api = makeApi({ databaseSettings: { enableRealtime: true } as ApiStructure['databaseSettings'] });

    const decision = await computePoolDecision('svc-1', api, pool);

    expect(decision).toEqual({ key: 'svc-1', pooling: false });
    expect(query).not.toHaveBeenCalled();
  });

  it('falls back when the API exposes no schemas, without touching the DB', async () => {
    const { pool, query } = makePool([]);
    const api = makeApi({ schema: [] });

    const decision = await computePoolDecision('svc-2', api, pool);

    expect(decision).toEqual({ key: 'svc-2', pooling: false });
    expect(query).not.toHaveBeenCalled();
  });

  it('pools a clean single-tenant shape and returns a stable bp: key', async () => {
    const rows = [
      { nspname: 'marketplace-db-tenant1-5e6b13b2-app-public', relname: 'products' },
      { nspname: 'marketplace-db-tenant1-5e6b13b2-app-public', relname: 'orders' }
    ];
    const { pool, query } = makePool([{ rows }, { rows: [] }]);
    const api = makeApi();

    const decision = await computePoolDecision('svc-3', api, pool);

    expect(decision.pooling).toBe(true);
    expect(decision.key).toMatch(/^bp:[0-9a-f]{64}$/);
    expect(query).toHaveBeenCalledTimes(1); // single catalog scan feeds the fingerprint
  });

  it('produces the SAME bp: key for two different physical tenants of the same shape', async () => {
    const shapeRows = (hash: string) => [
      { nspname: `marketplace-db-tenant-${hash}-app-public`, relname: 'orders' },
      { nspname: `marketplace-db-tenant-${hash}-app-public`, relname: 'products' }
    ];

    const t1 = makePool([{ rows: shapeRows('5e6b13b2') }, { rows: [] }]);
    const d1 = await computePoolDecision(
      'svc-t1',
      makeApi({ schema: ['marketplace-db-tenant-5e6b13b2-app-public'] }),
      t1.pool
    );

    const t2 = makePool([{ rows: shapeRows('deadbeef') }, { rows: [] }]);
    const d2 = await computePoolDecision(
      'svc-t2',
      makeApi({ schema: ['marketplace-db-tenant-deadbeef-app-public'] }),
      t2.pool
    );

    expect(d1.pooling).toBe(true);
    expect(d2.pooling).toBe(true);
    expect(d1.key).toBe(d2.key); // same logical shape → shared blueprint instance
  });

  it('threads api.logicalSchemas into the key, deriving it from physical schema only when absent', async () => {
    // Identical fingerprint rows across all three calls: only logicalSchemas varies,
    // so any key difference is attributable solely to the logicalSchemas input.
    const fpRows = [{ nspname: 'shop-5e6b13b2-app-public', relname: 'orders' }];

    // Explicit logicalSchemas that DIFFER from the stripped physical name.
    const a = makePool([{ rows: fpRows }, { rows: [] }]);
    const dExplicitDiff = await computePoolDecision(
      'svc-a',
      makeApi({ schema: ['shop-5e6b13b2-app-public'], logicalSchemas: ['custom-logical'] }),
      a.pool
    );

    // No logicalSchemas → derived from schema.map(stripSchemaHashPrefix) = ['app-public'].
    const b = makePool([{ rows: fpRows }, { rows: [] }]);
    const dDerived = await computePoolDecision(
      'svc-b',
      makeApi({ schema: ['shop-5e6b13b2-app-public'], logicalSchemas: undefined }),
      b.pool
    );

    // Explicit logicalSchemas EQUAL to the derived value.
    const c = makePool([{ rows: fpRows }, { rows: [] }]);
    const dExplicitSame = await computePoolDecision(
      'svc-c',
      makeApi({ schema: ['shop-5e6b13b2-app-public'], logicalSchemas: ['app-public'] }),
      c.pool
    );

    expect(dExplicitDiff.key).not.toBe(dDerived.key); // provided logicalSchemas is honored
    expect(dExplicitSame.key).toBe(dDerived.key); // ?? fallback derivation matches
  });

  it('relation-name collisions across schemas are poolable under qualified SQL', async () => {
    const rows = [
      { nspname: 'shop-5e6b13b2-auth-public', relname: 'identity_providers' },
      { nspname: 'shop-5e6b13b2-auth-private', relname: 'identity_providers' }
    ];
    const { pool } = makePool([{ rows }]);
    const api = makeApi({ schema: ['shop-5e6b13b2-auth-public', 'shop-5e6b13b2-auth-private'] });

    const decision = await computePoolDecision('svc-4', api, pool);

    expect(decision.pooling).toBe(true);
    expect(decision.key).toMatch(/^bp:[0-9a-f]{64}$/);
  });

  it('falls back (never throws) when a catalog probe rejects', async () => {
    const query = jest.fn().mockRejectedValue(new Error('connection reset'));
    const api = makeApi();

    const decision = await computePoolDecision('svc-5', api, { query } as unknown as Pool);

    expect(decision).toEqual({ key: 'svc-5', pooling: false, transient: true });
  });
});

describe('resolvePoolDecision caching', () => {
  afterEach(() => {
    clearPoolDecisions();
    jest.clearAllMocks();
  });

  it('memoizes the decision per svc_key (one probe pair) until cleared', async () => {
    const { pool, query } = makePool([
      { rows: [{ nspname: 'shop-5e6b13b2-app-public', relname: 'orders' }] },
      { rows: [] }
    ]);
    const api = makeApi({ schema: ['shop-5e6b13b2-app-public'] });

    const first = await resolvePoolDecision('svc-cache', api, pool);
    const second = await resolvePoolDecision('svc-cache', api, pool);

    expect(first).toBe(second); // same cached object identity
    expect(first.pooling).toBe(true);
    expect(query).toHaveBeenCalledTimes(1); // NOT 2 — second call served from cache

    // clearPoolDecisions() forces the next request to re-probe.
    clearPoolDecisions();
    query.mockResolvedValueOnce({ rows: [{ nspname: 'shop-5e6b13b2-app-public', relname: 'orders' }] });
    await resolvePoolDecision('svc-cache', api, pool);
    expect(query).toHaveBeenCalledTimes(2);
  });
});

describe('blueprint pooling flag gate (flag-off ⇒ key stays svc_key in the dispatcher)', () => {
  const original = process.env.GRAPHILE_BLUEPRINT_POOLING;

  afterEach(() => {
    if (original === undefined) delete process.env.GRAPHILE_BLUEPRINT_POOLING;
    else process.env.GRAPHILE_BLUEPRINT_POOLING = original;
  });

  it('is disabled by default — the dispatcher never runs a decision and uses req.svc_key', () => {
    delete process.env.GRAPHILE_BLUEPRINT_POOLING;
    expect(isBlueprintPoolingEnabled()).toBe(false);
  });

  it("enables only on '1' or 'true'", () => {
    process.env.GRAPHILE_BLUEPRINT_POOLING = '1';
    expect(isBlueprintPoolingEnabled()).toBe(true);
    process.env.GRAPHILE_BLUEPRINT_POOLING = 'true';
    expect(isBlueprintPoolingEnabled()).toBe(true);
    process.env.GRAPHILE_BLUEPRINT_POOLING = 'yes';
    expect(isBlueprintPoolingEnabled()).toBe(false);
  });
});

describe('transient probe failures are not memoized (W3 fix)', () => {
  afterEach(() => {
    clearPoolDecisions();
    jest.clearAllMocks();
  });

  it('re-probes on the next request after a thrown catalog probe', async () => {
    const query = jest.fn();
    query.mockRejectedValueOnce(new Error('connection reset'));
    query.mockResolvedValueOnce({
      rows: [{ nspname: 'shop-5e6b13b2-app-public', relname: 'orders' }]
    });
    const pool = { query } as unknown as Pool;
    const api = makeApi({ schema: ['shop-5e6b13b2-app-public'] });

    const first = await resolvePoolDecision('svc-transient', api, pool);
    expect(first.pooling).toBe(false);
    expect(first.transient).toBe(true);

    const second = await resolvePoolDecision('svc-transient', api, pool);
    expect(second.pooling).toBe(true); // re-probed and now poolable
    expect(query).toHaveBeenCalledTimes(2);
  });
});
