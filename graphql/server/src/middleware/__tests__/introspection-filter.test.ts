import { makeIntrospectionQuery } from 'pg-introspection';

import {
  buildFilteredIntrospectionQuery,
  createIntrospectionFilterCounters,
  createIntrospectionFilterPool,
  createIntrospectionInterceptor,
  getIntrospectionFilterCounters,
  isIntrospectionFilterEnabled,
  isIntrospectionQuery
} from '../introspection-filter';
import {
  createRewriteCounters,
  createRewritingPool,
  POOL_SCHEMAS_GUC
} from '../rewrite-pool';

// The exact runtime gate substring (single backslash before the underscore).
// Derived here so tests fail loudly if the installed package ever drifts.
const GATE_SUBSTRING =
  "in (select namespaces._id from namespaces where nspname <> 'information_schema' and nspname not like 'pg\\_%')";

const STOCK = makeIntrospectionQuery();

const countOccurrences = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;

const originalEnv = { ...process.env };
afterEach(() => {
  process.env = { ...originalEnv };
});

// =============================================================================
// Env flag
// =============================================================================

describe('isIntrospectionFilterEnabled', () => {
  it("is true only for '1' or 'true'", () => {
    process.env.GRAPHILE_INTROSPECTION_FILTER = '1';
    expect(isIntrospectionFilterEnabled()).toBe(true);
    process.env.GRAPHILE_INTROSPECTION_FILTER = 'true';
    expect(isIntrospectionFilterEnabled()).toBe(true);
    process.env.GRAPHILE_INTROSPECTION_FILTER = '0';
    expect(isIntrospectionFilterEnabled()).toBe(false);
    delete process.env.GRAPHILE_INTROSPECTION_FILTER;
    expect(isIntrospectionFilterEnabled()).toBe(false);
  });
});

// =============================================================================
// 1. THE PINNING TEST
// =============================================================================

describe('buildFilteredIntrospectionQuery — pinned against installed pg-introspection', () => {
  it('recognizes the stock query', () => {
    expect(isIntrospectionQuery(STOCK)).toBe(true);
    // The stock text carries the gate exactly four times.
    expect(countOccurrences(STOCK, GATE_SUBSTRING)).toBe(4);
  });

  it('rewrites all four gates and preserves the pg_catalog type branch', () => {
    const filtered = buildFilteredIntrospectionQuery(STOCK, ['t1-aaaa-app_public', 'public']);
    expect(filtered).not.toBeNull();
    // The injected `= any (array[...])` gate appears exactly four times...
    expect(countOccurrences(filtered as string, 'nspname = any (array[')).toBe(4);
    // ...and zero stock gates remain.
    expect(countOccurrences(filtered as string, GATE_SUBSTRING)).toBe(0);
    // pg_catalog types survive via the intact OR branch.
    expect((filtered as string).includes("'pg_catalog'::regnamespace")).toBe(true);
    // Sorted, escaped literals present.
    expect((filtered as string).includes("array['public', 't1-aaaa-app_public']::text[]")).toBe(true);
  });
});

// =============================================================================
// 2. Gate mismatch
// =============================================================================

describe('buildFilteredIntrospectionQuery — gate mismatch', () => {
  it('returns null when the gate does not appear exactly four times', () => {
    // Remove one of the four gate occurrences -> three remain.
    const doctored = STOCK.replace(GATE_SUBSTRING, 'in (select namespaces._id from namespaces where true)');
    expect(countOccurrences(doctored, GATE_SUBSTRING)).toBe(3);
    expect(buildFilteredIntrospectionQuery(doctored, ['public'])).toBeNull();
  });
});

// =============================================================================
// 3. Literal escaping / defensive drops
// =============================================================================

describe('buildFilteredIntrospectionQuery — literal escaping', () => {
  it("doubles single quotes and drops pg_ / information_schema names", () => {
    const filtered = buildFilteredIntrospectionQuery(STOCK, [
      "o'brien",
      'pg_temp_1',
      'information_schema',
      'public'
    ]);
    expect(filtered).not.toBeNull();
    const text = filtered as string;
    expect(text.includes("'o''brien'")).toBe(true);
    expect(text.includes("'public'")).toBe(true);
    expect(text.includes("'pg_temp_1'")).toBe(false);
    // 'information_schema' appears in the stock text elsewhere, but never as an
    // injected array literal.
    expect(text.includes("array['information_schema'")).toBe(false);
    expect(text.includes(", 'information_schema'")).toBe(false);
  });
});

// =============================================================================
// 4. isIntrospectionQuery negatives
// =============================================================================

describe('isIntrospectionQuery — negatives', () => {
  it('rejects the adaptor settings query, DEALLOCATE, and a plain SELECT', () => {
    const settings =
      'select set_config(el->>0, el->>1, true) from json_array_elements($1::json) el';
    expect(isIntrospectionQuery(settings)).toBe(false);
    expect(isIntrospectionQuery('deallocate all')).toBe(false);
    expect(isIntrospectionQuery('select introspection_version from t')).toBe(false);
  });

  it('rejects a long query that merely mentions introspection_version', () => {
    const long = 'select ' + 'a,'.repeat(3000) + " 'introspection_version' from t";
    expect(long.length).toBeGreaterThan(5000);
    expect(isIntrospectionQuery(long)).toBe(false);
  });
});

// =============================================================================
// 5. Closure loop + interceptor
// =============================================================================

const scriptedClient = (rounds: any[][]) => {
  let i = 0;
  return {
    query: jest.fn((_sql: string, _values?: any[]) => {
      const rows = rounds[i] ?? [];
      i += 1;
      return Promise.resolve({ rows });
    })
  };
};

describe('createIntrospectionInterceptor — closure loop', () => {
  beforeEach(() => {
    process.env.GRAPHILE_INTROSPECTION_FILTER = '1';
  });

  it('accumulates served ∪ public ∪ discovered, then filters', async () => {
    const counters = createIntrospectionFilterCounters();
    const interceptor = createIntrospectionInterceptor({ servedSchemas: ['t1'], counters });
    // Round 1 discovers services_public; round 2 discovers nothing.
    const client = scriptedClient([[{ nspname: 'services_public' }], []]);

    const swapped = await (interceptor(STOCK, client) as Promise<string>);

    // keep set = public, t1, services_public
    expect(swapped.includes("'public'")).toBe(true);
    expect(swapped.includes("'t1'")).toBe(true);
    expect(swapped.includes("'services_public'")).toBe(true);
    expect(countOccurrences(swapped, GATE_SUBSTRING)).toBe(0);

    expect(counters.discoveries).toBe(1);
    expect(counters.swaps).toBe(1);
    expect(counters.closureTruncations).toBe(0);
    expect(counters.keepNamespaceCount).toBe(3);
    // Two closure rounds ran (the second returned nothing, ending the loop).
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('memoizes: a second call reuses the first discovery', async () => {
    const counters = createIntrospectionFilterCounters();
    const interceptor = createIntrospectionInterceptor({ servedSchemas: ['t1'], counters });
    const client = scriptedClient([[], []]);

    const a = await (interceptor(STOCK, client) as Promise<string>);
    const b = await (interceptor(STOCK, client) as Promise<string>);
    expect(a).toBe(b);
    expect(counters.discoveries).toBe(1);
    expect(client.query).toHaveBeenCalledTimes(1); // one round (empty) only
  });

  it('rejects when the discovery query throws', async () => {
    const counters = createIntrospectionFilterCounters();
    const interceptor = createIntrospectionInterceptor({ servedSchemas: ['t1'], counters });
    const client = {
      query: jest.fn(() => Promise.reject(new Error('boom')))
    };
    await expect(interceptor(STOCK, client) as Promise<string>).rejects.toThrow('boom');
    expect(counters.discoveries).toBe(1);
    expect(counters.swaps).toBe(0);
  });

  it('returns null when disabled, served-empty, or non-introspection', () => {
    const client = scriptedClient([[]]);
    // disabled
    process.env.GRAPHILE_INTROSPECTION_FILTER = '0';
    expect(createIntrospectionInterceptor({ servedSchemas: ['t1'] })(STOCK, client)).toBeNull();
    // enabled again
    process.env.GRAPHILE_INTROSPECTION_FILTER = '1';
    // no served schemas
    expect(createIntrospectionInterceptor({ servedSchemas: [] })(STOCK, client)).toBeNull();
    // non-introspection text
    expect(createIntrospectionInterceptor({ servedSchemas: ['t1'] })('select 1', client)).toBeNull();
  });
});

// =============================================================================
// 6. createIntrospectionFilterPool (dedicated)
// =============================================================================

const introspectingClient = (rounds: any[][]) => {
  let round = 0;
  const query = jest.fn((arg: any, _values?: any[]) => {
    if (typeof arg === 'string' && arg.includes('kept as')) {
      const rows = rounds[round] ?? [];
      round += 1;
      return Promise.resolve({ rows });
    }
    return Promise.resolve({ rows: [] });
  });
  return { query, release: jest.fn(), on: jest.fn() };
};

const sentConfigTexts = (client: { query: jest.Mock }): string[] =>
  client.query.mock.calls.map((c: any[]) => (typeof c[0] === 'string' ? c[0] : c[0]?.text));

describe('createIntrospectionFilterPool — dedicated wrapper', () => {
  beforeEach(() => {
    process.env.GRAPHILE_INTROSPECTION_FILTER = '1';
  });

  it('swaps the introspection query and leaves other queries untouched', async () => {
    const counters = createIntrospectionFilterCounters();
    const client = introspectingClient([[], []]);
    const pool = { connect: jest.fn().mockResolvedValue(client) };
    const wrapped = createIntrospectionFilterPool(pool, { servedSchemas: ['t1'], counters });

    const c = await wrapped.connect();

    // A normal query passes straight through.
    await c.query('select 1 from t');
    expect(client.query).toHaveBeenCalledWith('select 1 from t');

    // Introspection is discovered + swapped.
    await c.query({ text: STOCK });
    const introspectionCall = client.query.mock.calls.find(
      (call: any[]) => call[0] && typeof call[0] === 'object' && typeof call[0].text === 'string' &&
        call[0].text.includes('as introspection')
    );
    expect(introspectionCall).toBeDefined();
    const swapped = introspectionCall[0].text as string;
    expect(countOccurrences(swapped, 'nspname = any (array[')).toBe(4);
    expect(swapped.includes("'t1'")).toBe(true);
    expect(counters.swaps).toBe(1);
  });

  it('wraps clients handed back via callback-style connect', (done) => {
    const client = introspectingClient([[]]);
    const pool = {
      connect: (cb: any) => cb(null, client, jest.fn())
    };
    const wrapped = createIntrospectionFilterPool(pool, { servedSchemas: ['t1'] });

    wrapped.connect((err: any, c: any) => {
      expect(err).toBeNull();
      c.query('select 1')
        .then(() => {
          expect(client.query).toHaveBeenCalledWith('select 1');
          done();
        })
        .catch(done);
    });
  });
});

// =============================================================================
// 7. rewrite-pool integration
// =============================================================================

const logicalName = (name: string): string => name.split('-').slice(2).join('-');
const CANON_APP = 'app-11111111-app-public';
const TENANT_APP = 'app-22222222-app-public';

const settingsQuery = (schemas: string[]) => ({
  text: 'select set_config(el->>0, el->>1, true) from json_array_elements($1::json) el',
  values: [JSON.stringify([['role', 'app_user'], [POOL_SCHEMAS_GUC, JSON.stringify(schemas)]])]
});

describe('createRewritingPool — introspection filter integration', () => {
  beforeEach(() => {
    process.env.GRAPHILE_INTROSPECTION_FILTER = '1';
  });

  it('applies settings, swaps introspection (not identifier-rewritten), still rewrites tenant SQL', async () => {
    const client = introspectingClient([[], []]);
    const pool = { connect: jest.fn().mockResolvedValue(client), query: jest.fn(), on: jest.fn() };
    const counters = createRewriteCounters();
    const wrapped = createRewritingPool(pool, {
      canonicalSchemas: [CANON_APP],
      logicalName,
      counters,
      introspectionFilter: { servedSchemas: [CANON_APP] }
    });

    const c = await wrapped.connect();

    // Settings establish the tenant map.
    await c.query(settingsQuery([TENANT_APP, 'public']));
    expect(counters.settingsParses).toBe(1);

    // Introspection: swapped, NOT identifier-rewritten, no fail-closed.
    await c.query({ text: STOCK });
    const introspectionCall = client.query.mock.calls.find(
      (call: any[]) => call[0] && typeof call[0] === 'object' &&
        typeof call[0].text === 'string' && call[0].text.includes('as introspection')
    );
    expect(introspectionCall).toBeDefined();
    const swapped = introspectionCall[0].text as string;
    expect(countOccurrences(swapped, 'nspname = any (array[')).toBe(4);
    expect(countOccurrences(swapped, GATE_SUBSTRING)).toBe(0);
    // Introspection was not treated as a rewrite target.
    expect(counters.failClosed).toBe(0);

    // A normal tenant query is still identifier-rewritten as before.
    await c.query({ text: `select from "${CANON_APP}"."t"` });
    const rewritten = sentConfigTexts(client).find((t) => t && t.includes(TENANT_APP));
    expect(rewritten).toBe(`select from "${TENANT_APP}"."t"`);
    expect(counters.rewrittenQueries).toBeGreaterThanOrEqual(1);
  });

  it('feeds the process-wide introspection-filter counters', async () => {
    const before = getIntrospectionFilterCounters().swaps;
    const client = introspectingClient([[]]);
    const pool = { connect: jest.fn().mockResolvedValue(client), query: jest.fn(), on: jest.fn() };
    const wrapped = createRewritingPool(pool, {
      canonicalSchemas: [CANON_APP],
      logicalName,
      introspectionFilter: { servedSchemas: [CANON_APP] }
    });
    const c = await wrapped.connect();
    await c.query(settingsQuery([TENANT_APP, 'public']));
    await c.query({ text: STOCK });
    expect(getIntrospectionFilterCounters().swaps).toBe(before + 1);
  });
});
