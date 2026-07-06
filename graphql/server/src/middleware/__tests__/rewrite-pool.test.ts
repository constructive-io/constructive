import {
  containsQuotedIdentifier,
  createRewriteCounters,
  createRewritingPool,
  getRewritePoolCounters,
  POOL_SCHEMAS_GUC,
  RewriteCounters,
  rewriteQuotedIdentifiers
} from '../rewrite-pool';

// -----------------------------------------------------------------------------
// Fixtures: physical schemas shaped `<db>-<hash8>-<rest>`; the logical name is
// everything past the first two dash segments, so a1111111/a2222222 tenants of
// the same shape collapse to the same logical name.
// -----------------------------------------------------------------------------

const logicalName = (name: string): string => name.split('-').slice(2).join('-');

const CANON_APP = 'app-11111111-app-public';
const CANON_AUTH = 'app-11111111-auth-public';
const TENANT_APP = 'app-22222222-app-public';
const TENANT_AUTH = 'app-22222222-auth-public';

const canonicalSchemas = [CANON_APP, CANON_AUTH];
const tenantSchemas = [TENANT_APP, TENANT_AUTH, 'public'];

const settingsQuery = (schemas: string[]) => ({
  text: 'select set_config(el->>0, el->>1, true) from json_array_elements($1::json) el',
  values: [JSON.stringify([['role', 'app_user'], [POOL_SCHEMAS_GUC, JSON.stringify(schemas)]])]
});

const makeClient = () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  release: jest.fn(),
  on: jest.fn(),
  escapeIdentifier: jest.fn((s: string) => `"${s}"`)
});

const makePool = (client: ReturnType<typeof makeClient>) => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  connect: jest.fn().mockResolvedValue(client),
  on: jest.fn(),
  end: jest.fn()
});

const setup = (overrides: Partial<Parameters<typeof createRewritingPool>[1]> = {}) => {
  const counters = createRewriteCounters();
  const client = makeClient();
  const pool = makePool(client);
  const wrapped = createRewritingPool(pool, {
    canonicalSchemas,
    logicalName,
    counters,
    ...overrides
  });
  return { counters, client, pool, wrapped };
};

// Text of the Nth (0-based) call to the raw client query mock.
const sentText = (client: ReturnType<typeof makeClient>, n: number): string => {
  const arg = client.query.mock.calls[n][0];
  return typeof arg === 'string' ? arg : arg.text;
};

// =============================================================================
// Pure lexer: rewriteQuotedIdentifiers
// =============================================================================

describe('rewriteQuotedIdentifiers', () => {
  const map = new Map([[CANON_APP, TENANT_APP]]);

  it('replaces every quoted occurrence, including ::cast enum refs', () => {
    const input = `select "${CANON_APP}"."t".*, x::"${CANON_APP}"."my_enum" from "${CANON_APP}"."t"`;
    const expected = `select "${TENANT_APP}"."t".*, x::"${TENANT_APP}"."my_enum" from "${TENANT_APP}"."t"`;
    expect(rewriteQuotedIdentifiers(input, map)).toBe(expected);
  });

  it('returns the input unchanged (byte-identical) when nothing matches', () => {
    const input = 'select "users"."id" from "users"';
    expect(rewriteQuotedIdentifiers(input, map)).toBe(input);
  });

  describe('never touches non-identifier regions', () => {
    const m = new Map([['canon', 'TENANT']]);

    it('single-quoted literal incl. doubled-quote escape', () => {
      const input = `select '"canon" it''s "canon"', "canon"`;
      expect(rewriteQuotedIdentifiers(input, m)).toBe(`select '"canon" it''s "canon"', "TENANT"`);
    });

    it("E-string with backslash escapes and embedded quotes", () => {
      // Actual text: E'a\'b "canon" c' || "canon"
      const input = `E'a\\'b "canon" c' || "canon"`;
      expect(rewriteQuotedIdentifiers(input, m)).toBe(`E'a\\'b "canon" c' || "TENANT"`);
    });

    it('$$ and $tag$ dollar-quoted bodies', () => {
      const input = `$$ "canon" $$ || $tag$ x "canon" y $tag$ || "canon"`;
      expect(rewriteQuotedIdentifiers(input, m)).toBe(`$$ "canon" $$ || $tag$ x "canon" y $tag$ || "TENANT"`);
    });

    it('line comments and nested block comments', () => {
      const line = `-- "canon"\n"canon"`;
      expect(rewriteQuotedIdentifiers(line, m)).toBe(`-- "canon"\n"TENANT"`);

      const block = `/* "canon" /* "canon" */ still "canon" */ "canon"`;
      expect(rewriteQuotedIdentifiers(block, m)).toBe(`/* "canon" /* "canon" */ still "canon" */ "TENANT"`);
    });
  });

  it('does not replace an identifier that merely prefixes a longer one', () => {
    const m = new Map([['canon', 'TENANT']]);
    expect(rewriteQuotedIdentifiers('"canon_extra" "canon"', m)).toBe('"canon_extra" "TENANT"');
  });

  it('matches on the unescaped value of an identifier with embedded ""', () => {
    const m = new Map([['ca"non', 'TENANT']]);
    expect(rewriteQuotedIdentifiers('"ca""non"', m)).toBe('"TENANT"');
  });

  it('escapes a " inside the replacement value', () => {
    const m = new Map([['canon', 'ten"ant']]);
    expect(rewriteQuotedIdentifiers('"canon"', m)).toBe('"ten""ant"');
  });
});

// =============================================================================
// Pure lexer: containsQuotedIdentifier
// =============================================================================

describe('containsQuotedIdentifier', () => {
  const names = new Set([CANON_APP]);

  it('true only for a complete quoted token match', () => {
    expect(containsQuotedIdentifier(`from "${CANON_APP}"."t"`, names)).toBe(true);
    expect(containsQuotedIdentifier(`from "${CANON_APP}_extra"."t"`, names)).toBe(false);
  });

  it('ignores matches inside strings and comments', () => {
    expect(containsQuotedIdentifier(`select '"${CANON_APP}"'`, names)).toBe(false);
    expect(containsQuotedIdentifier(`-- "${CANON_APP}"`, names)).toBe(false);
    expect(containsQuotedIdentifier(`$$ "${CANON_APP}" $$`, names)).toBe(false);
  });
});

// =============================================================================
// Wrapper: end-to-end
// =============================================================================

describe('createRewritingPool — settings + rewriting', () => {
  it('passes the settings query through byte-identical, then rewrites later queries', async () => {
    const { client, wrapped } = setup();
    const c = await wrapped.connect();

    const sq = settingsQuery(tenantSchemas);
    await c.query(sq);
    // Forwarded untouched (same object, identical text/values).
    expect(client.query).toHaveBeenNthCalledWith(1, sq);

    await c.query({ text: `select * from "${CANON_APP}"."users" join "${CANON_AUTH}"."roles" using (id)` });
    expect(sentText(client, 1)).toBe(
      `select * from "${TENANT_APP}"."users" join "${TENANT_AUTH}"."roles" using (id)`
    );
  });

  it('supports string and (text, values) call forms', async () => {
    const { client, wrapped } = setup();
    const c = await wrapped.connect();
    await c.query(settingsQuery(tenantSchemas));

    await c.query(`select from "${CANON_APP}"."t"`);
    expect(sentText(client, 1)).toBe(`select from "${TENANT_APP}"."t"`);

    await c.query(`select from "${CANON_APP}"."t" where x = $1`, [1]);
    expect(sentText(client, 2)).toBe(`select from "${TENANT_APP}"."t" where x = $1`);
    expect(client.query.mock.calls[2][1]).toEqual([1]);
  });

  it('does not mutate the caller-supplied query config', async () => {
    const { client, wrapped } = setup();
    const c = await wrapped.connect();
    await c.query(settingsQuery(tenantSchemas));

    const config = { text: `select from "${CANON_APP}"."t"`, name: 'p1' };
    await c.query(config);
    expect(config.text).toBe(`select from "${CANON_APP}"."t"`);
    expect(config.name).toBe('p1');
    // The forwarded object is a clone with rewritten fields.
    expect(client.query.mock.calls[1][0]).not.toBe(config);
    expect(sentText(client, 1)).toBe(`select from "${TENANT_APP}"."t"`);
  });

  it('wraps clients handed back via callback-style connect', (done) => {
    const client = makeClient();
    const pool = {
      connect: (cb: any) => cb(null, client, jest.fn()),
      query: jest.fn()
    };
    const wrapped = createRewritingPool(pool, { canonicalSchemas, logicalName });

    wrapped.connect((err: any, c: any) => {
      expect(err).toBeNull();
      c.query(settingsQuery(tenantSchemas));
      c.query({ text: `select from "${CANON_APP}"."t"` });
      expect(sentText(client, 1)).toBe(`select from "${TENANT_APP}"."t"`);
      done();
    });
  });

  it('forwards non-query members bound to the raw client', async () => {
    const { client, wrapped } = setup();
    const c = await wrapped.connect();
    expect(c.escapeIdentifier('x')).toBe('"x"');
    expect(client.escapeIdentifier).toHaveBeenCalledWith('x');
  });
});

// =============================================================================
// Wrapper: identity mode (canonical tenant querying itself)
// =============================================================================

describe('createRewritingPool — identity mode', () => {
  it('leaves text and prepared names untouched when the tenant is canonical', async () => {
    const { client, counters, wrapped } = setup();
    const c = await wrapped.connect();
    await c.query(settingsQuery([CANON_APP, CANON_AUTH, 'public']));

    await c.query({ text: `select from "${CANON_APP}"."t"`, name: 'p1' });
    expect(sentText(client, 1)).toBe(`select from "${CANON_APP}"."t"`);
    expect(client.query.mock.calls[1][0].name).toBe('p1');
    expect(counters.rewrittenQueries).toBe(0);
    expect(counters.nameRewrites).toBe(0);
  });
});

// =============================================================================
// Wrapper: prepared-statement name namespacing
// =============================================================================

describe('createRewritingPool — prepared name namespacing', () => {
  it('is deterministic per tenant and differs across tenants', async () => {
    const a = setup();
    const ca = await a.wrapped.connect();
    await ca.query(settingsQuery(tenantSchemas));
    await ca.query({ text: 'select 1', name: 'stmt' });
    await ca.query({ text: 'select 2', name: 'stmt' });
    const nameA1 = a.client.query.mock.calls[1][0].name;
    const nameA2 = a.client.query.mock.calls[2][0].name;
    expect(nameA1).toMatch(/^bp_[0-9a-f]{24}$/);
    expect(nameA2).toBe(nameA1); // same tenant + original name => same

    const b = setup();
    const cb = await b.wrapped.connect();
    await cb.query(settingsQuery(['app-33333333-app-public', 'app-33333333-auth-public', 'public']));
    await cb.query({ text: 'select 1', name: 'stmt' });
    const nameB1 = b.client.query.mock.calls[1][0].name;
    expect(nameB1).not.toBe(nameA1); // different tenant => different name
  });
});

// =============================================================================
// Wrapper: prepared-statement lifecycle (the wrapper owns eviction + DEALLOCATE)
// =============================================================================

describe('createRewritingPool — prepared-statement lifecycle', () => {
  // The `deallocate "bp_…"` statements the raw client received, in order.
  const deallocs = (client: ReturnType<typeof makeClient>): string[] =>
    client.query.mock.calls
      .map((call: any[]) => call[0])
      .filter((arg: any): arg is string => typeof arg === 'string' && arg.startsWith('deallocate'));

  it('passes DEALLOCATE text through untouched (adaptor concern, not ours)', async () => {
    const { client, wrapped } = setup();
    const c = await wrapped.connect();
    await c.query(settingsQuery(tenantSchemas));

    await c.query('deallocate stmt');
    await c.query('deallocate all');
    expect(sentText(client, 1)).toBe('deallocate stmt');
    expect(sentText(client, 2)).toBe('deallocate all');
  });

  it('evicts the oldest hashed name and deallocates it once the cap is exceeded', async () => {
    const { client, wrapped } = setup({ maxPreparedNames: 2 });
    const c = await wrapped.connect();
    await c.query(settingsQuery(tenantSchemas));

    await c.query({ text: 'select 1', name: 'a' });
    await c.query({ text: 'select 2', name: 'b' });
    const hashedA = client.query.mock.calls[1][0].name;
    expect(hashedA).toMatch(/^bp_[0-9a-f]{24}$/);

    await c.query({ text: 'select 3', name: 'c' }); // 3rd distinct name -> evict 'a'

    expect(deallocs(client)).toEqual([`deallocate "${hashedA}"`]);
  });

  it('clears node-postgres parsedStatements bookkeeping for the evicted name', async () => {
    const { client, wrapped } = setup({ maxPreparedNames: 2 });
    const c = await wrapped.connect();
    await c.query(settingsQuery(tenantSchemas));

    await c.query({ text: 'select 1', name: 'a' });
    const hashedA = client.query.mock.calls[1][0].name;
    // Simulate node-postgres having parsed/prepared under the hashed name.
    (client as any).connection = { parsedStatements: { [hashedA]: 'select 1' } };

    await c.query({ text: 'select 2', name: 'b' });
    await c.query({ text: 'select 3', name: 'c' }); // evict 'a'
    await new Promise((resolve) => setImmediate(resolve)); // flush the fire-and-forget then()

    // Without this cleanup, re-preparing 'a' would skip Parse and fail on PG
    // with "prepared statement does not exist".
    expect((client as any).connection.parsedStatements[hashedA]).toBeUndefined();
  });

  it('refreshes recency: re-touching name 1 evicts name 2 instead', async () => {
    const { client, wrapped } = setup({ maxPreparedNames: 2 });
    const c = await wrapped.connect();
    await c.query(settingsQuery(tenantSchemas));

    await c.query({ text: 'select 1', name: 'a' }); // [a]
    await c.query({ text: 'select 2', name: 'b' }); // [a, b]
    const hashedA = client.query.mock.calls[1][0].name;
    const hashedB = client.query.mock.calls[2][0].name;

    await c.query({ text: 'select 1 again', name: 'a' }); // refresh a -> [b, a]
    await c.query({ text: 'select 3', name: 'c' }); // insert c -> evict b

    expect(deallocs(client)).toEqual([`deallocate "${hashedB}"`]);
    expect(deallocs(client)).not.toContain(`deallocate "${hashedA}"`);
  });

  it('re-using the same name neither grows the LRU nor deallocates', async () => {
    const { client, wrapped } = setup({ maxPreparedNames: 2 });
    const c = await wrapped.connect();
    await c.query(settingsQuery(tenantSchemas));

    await c.query({ text: 'select 1', name: 'a' });
    await c.query({ text: 'select 1 v2', name: 'a' });
    await c.query({ text: 'select 1 v3', name: 'a' });

    expect(deallocs(client)).toEqual([]);
  });

  it('keeps the prepared-name LRU across release (it lives on the physical connection)', async () => {
    const { client, wrapped } = setup({ maxPreparedNames: 2 });

    const c1 = await wrapped.connect();
    await c1.query(settingsQuery(tenantSchemas));
    await c1.query({ text: 'select 1', name: 'a' }); // [a]
    const hashedA = client.query.mock.calls[1][0].name;
    c1.release();

    // Same physical client returns; tenant state reset, prepared-name LRU intact.
    const c2 = await wrapped.connect();
    await c2.query(settingsQuery(tenantSchemas));
    await c2.query({ text: 'select 2', name: 'b' }); // [a, b]
    await c2.query({ text: 'select 3', name: 'c' }); // evict a (survived release)

    expect(deallocs(client)).toEqual([`deallocate "${hashedA}"`]);
  });

  it('honors DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE for the default cap', async () => {
    const original = process.env.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE;
    process.env.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE = '1';
    try {
      const { client, wrapped } = setup(); // no explicit maxPreparedNames
      const c = await wrapped.connect();
      await c.query(settingsQuery(tenantSchemas));

      await c.query({ text: 'select 1', name: 'a' });
      const hashedA = client.query.mock.calls[1][0].name;
      await c.query({ text: 'select 2', name: 'b' }); // cap 1 -> evict a

      expect(deallocs(client)).toEqual([`deallocate "${hashedA}"`]);
    } finally {
      if (original === undefined) delete process.env.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE;
      else process.env.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE = original;
    }
  });
});

// =============================================================================
// Wrapper: fail-closed
// =============================================================================

describe('createRewritingPool — fail closed', () => {
  it('rejects a rewrite-needing query issued before any settings query', async () => {
    const { client, counters, wrapped } = setup();
    const c = await wrapped.connect();

    await expect(c.query({ text: `select from "${CANON_APP}"."t"` })).rejects.toThrow(
      /requires a tenant mapping but none is established/
    );
    expect(counters.failClosed).toBe(1);
    expect(client.query).not.toHaveBeenCalled();
  });

  it('passes benign non-rewrite statements through untouched', async () => {
    const { client, counters, wrapped } = setup();
    const c = await wrapped.connect();

    await c.query('begin');
    await c.query({ text: 'listen "x"' });
    await c.query({ text: 'select 1 from pg_catalog.pg_class' });
    await c.query({ text: 'select set_config($1,$2,true)', values: ['role', 'app_user'] });

    expect(counters.failClosed).toBe(0);
    expect(client.query.mock.calls.map((call: any[]) => call[0])).toEqual([
      'begin',
      { text: 'listen "x"' },
      { text: 'select 1 from pg_catalog.pg_class' },
      { text: 'select set_config($1,$2,true)', values: ['role', 'app_user'] }
    ]);
  });

  it('fails closed with a callback when called callback-style', async () => {
    const { wrapped } = setup();
    const c = await wrapped.connect();
    const err: Error = await new Promise((resolve) => {
      c.query({ text: `select from "${CANON_APP}"."t"` }, (e: Error) => resolve(e));
    });
    expect(err.message).toMatch(/requires a tenant mapping/);
  });
});

// =============================================================================
// Wrapper: settings detection keys on the adaptor statement TEXT, not on
// user-influenceable parameter contents (A1 — misclassification hardening).
// =============================================================================

describe('createRewritingPool — settings detection is text-gated', () => {
  it('does not misclassify a data query as settings when a bind value contains the GUC substring', async () => {
    const { client, counters, wrapped } = setup();
    const c = await wrapped.connect();
    await c.query(settingsQuery(tenantSchemas));
    expect(counters.settingsParses).toBe(1);

    // A genuine data query whose user-controlled bind value contains the GUC
    // string. Under parameter-only detection this was treated as the settings
    // query and forwarded UNREWRITTEN (canonical SQL on the tenant connection).
    await c.query({
      text: `select from "${CANON_APP}"."t" where x = $1`,
      values: [`${POOL_SCHEMAS_GUC} = whatever`]
    });

    // Rewritten to the tenant schema — not forwarded with canonical identifiers.
    expect(sentText(client, 1)).toBe(`select from "${TENANT_APP}"."t" where x = $1`);
    // The malicious value was NOT parsed as settings; checkout map is intact.
    expect(counters.settingsParses).toBe(1);
  });

  it('a GUC-substring bind value cannot null the established tenant map (no self-DoS)', async () => {
    const { client, counters, wrapped } = setup();
    const c = await wrapped.connect();
    await c.query(settingsQuery(tenantSchemas));

    // Malicious non-JSON value that, under parameter-only detection, would have
    // re-run applySettings and nulled tenantMap (forcing later fail-closed).
    await c.query({
      text: `select from "${CANON_APP}"."t"`,
      values: [`${POOL_SCHEMAS_GUC}: not json`]
    });
    expect(sentText(client, 1)).toBe(`select from "${TENANT_APP}"."t"`);

    // Sibling query still rewrites (map not clobbered) rather than failing closed.
    await c.query({ text: `select from "${CANON_AUTH}"."r"` });
    expect(sentText(client, 2)).toBe(`select from "${TENANT_AUTH}"."r"`);
    expect(counters.failClosed).toBe(0);
    expect(counters.settingsParses).toBe(1);
  });

  it('a crafted GUC-bearing JSON bind value cannot remap the checkout to another tenant', async () => {
    const { client, wrapped } = setup();
    const c = await wrapped.connect();
    await c.query(settingsQuery(tenantSchemas)); // maps canonical -> app-22222222

    const victim = ['app-99999999-app-public', 'app-99999999-auth-public', 'public'];
    // Same value shape the real settings query would carry, but on a DATA query.
    await c.query({
      text: `select from "${CANON_APP}"."t"`,
      values: [JSON.stringify([[POOL_SCHEMAS_GUC, JSON.stringify(victim)]])]
    });

    // Still the original tenant (22222222), never the injected victim (99999999).
    expect(sentText(client, 1)).toBe(`select from "${TENANT_APP}"."t"`);
  });

  it('fails closed (does not swallow as settings) for a pre-settings query carrying a GUC value', async () => {
    const { client, counters, wrapped } = setup();
    const c = await wrapped.connect();

    await expect(
      c.query({ text: `select from "${CANON_APP}"."t"`, values: [`${POOL_SCHEMAS_GUC} x`] })
    ).rejects.toThrow(/requires a tenant mapping/);
    expect(counters.failClosed).toBe(1);
    expect(counters.settingsParses).toBe(0);
    expect(client.query).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Wrapper: release clears state
// =============================================================================

describe('createRewritingPool — release clears state', () => {
  it('re-checkout of the same client requires a fresh settings query', async () => {
    const { client, wrapped } = setup();
    const c = await wrapped.connect();
    await c.query(settingsQuery(tenantSchemas));
    await c.query({ text: `select from "${CANON_APP}"."t"` }); // ok

    c.release();
    expect(client.release).toHaveBeenCalled();

    await expect(c.query({ text: `select from "${CANON_APP}"."t"` })).rejects.toThrow(
      /requires a tenant mapping/
    );
  });
});

// =============================================================================
// Wrapper: logical mismatch => invalid checkout
// =============================================================================

describe('createRewritingPool — logical mismatch', () => {
  it('marks the checkout invalid and fails closed with the reason', async () => {
    const { counters, wrapped } = setup();
    const c = await wrapped.connect();
    // Tenant list is missing an auth-public counterpart.
    await c.query(settingsQuery([TENANT_APP, 'public']));

    await expect(c.query({ text: `select from "${CANON_AUTH}"."t"` })).rejects.toThrow(
      /auth-public/
    );
    expect(counters.failClosed).toBe(1);
  });
});

// =============================================================================
// Wrapper: LRU memo cap
// =============================================================================

describe('createRewritingPool — LRU memo cap', () => {
  it('respects the cap while keeping every rewrite correct', async () => {
    const { client, counters, wrapped } = setup({ maxMemoEntries: 2 });
    const c = await wrapped.connect();
    await c.query(settingsQuery(tenantSchemas));

    const q1 = { text: `select from "${CANON_APP}"."a"` };
    const q2 = { text: `select from "${CANON_APP}"."b"` };
    const q3 = { text: `select from "${CANON_APP}"."c"` };

    await c.query(q1);
    await c.query(q2);
    await c.query(q3); // fills then evicts q1 (cap 2)
    expect(counters.memoHits).toBe(0);

    await c.query(q1); // q1 was evicted => miss (proves the cap held)
    expect(counters.memoHits).toBe(0);

    await c.query(q3); // q3 still cached => hit
    expect(counters.memoHits).toBe(1);

    // Every rewrite stayed correct regardless of eviction.
    expect(sentText(client, 1)).toBe(`select from "${TENANT_APP}"."a"`);
    expect(sentText(client, 3)).toBe(`select from "${TENANT_APP}"."c"`);
    expect(sentText(client, 4)).toBe(`select from "${TENANT_APP}"."a"`);
    expect(sentText(client, 5)).toBe(`select from "${TENANT_APP}"."c"`);
  });
});

// =============================================================================
// Wrapper: counters
// =============================================================================

describe('createRewritingPool — counters', () => {
  it('increments each counter exactly as specified', async () => {
    const { wrapped, counters } = setup();
    const c = await wrapped.connect();

    await c.query(settingsQuery(tenantSchemas)); // settingsParses
    await c.query({ text: `select from "${CANON_APP}"."t"` }); // rewrittenQueries (miss)
    await c.query({ text: `select from "${CANON_APP}"."t"` }); // rewrittenQueries + memoHits
    await c.query({ text: 'select 1', name: 'p1' }); // nameRewrites

    const expected: RewriteCounters = {
      settingsParses: 1,
      rewrittenQueries: 2,
      memoHits: 1,
      failClosed: 0,
      nameRewrites: 1
    };
    expect(counters).toEqual(expected);
  });

  it('shares a caller-provided counters object', async () => {
    const counters = createRewriteCounters();
    const { wrapped } = setup({ counters });
    const c = await wrapped.connect();
    await c.query(settingsQuery(tenantSchemas));
    expect(counters.settingsParses).toBe(1);
  });

  it('feeds the process-wide getRewritePoolCounters() snapshot when no counters are passed', async () => {
    const before = getRewritePoolCounters().settingsParses;
    // No explicit counters -> activity lands in the module-level sink.
    const client = makeClient();
    const wrapped = createRewritingPool(makePool(client), { canonicalSchemas, logicalName });
    const c = await wrapped.connect();
    await c.query(settingsQuery(tenantSchemas));

    expect(getRewritePoolCounters().settingsParses).toBe(before + 1);
    // Returns a snapshot copy, not the live object.
    const snap = getRewritePoolCounters();
    snap.settingsParses = -999;
    expect(getRewritePoolCounters().settingsParses).toBe(before + 1);
  });
});

// =============================================================================
// Pool-level one-shot query
// =============================================================================

describe('createRewritingPool — pool.query one-shot', () => {
  it('passes benign queries through and fails closed on rewrite-needing ones', async () => {
    const { pool, wrapped } = setup();

    await wrapped.query('select 1');
    expect(pool.query).toHaveBeenCalledWith('select 1');

    await expect(wrapped.query({ text: `select from "${CANON_APP}"."t"` })).rejects.toThrow(
      /requires a tenant mapping/
    );
  });
});
