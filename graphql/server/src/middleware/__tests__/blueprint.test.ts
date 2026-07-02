import {
  computeBlueprintKey,
  quoteSearchPath,
  stripSchemaHashPrefix
} from '../blueprint';

describe('stripSchemaHashPrefix', () => {
  it('strips a hashed tenant prefix down to the logical schema', () => {
    expect(stripSchemaHashPrefix('marketplace-db-tenant1-5e6b13b2-app-public')).toBe(
      'app-public'
    );
  });

  it('returns control-plane / non-hashed schema names unchanged', () => {
    expect(stripSchemaHashPrefix('services_public')).toBe('services_public');
    expect(stripSchemaHashPrefix('metaschema_public')).toBe('metaschema_public');
    expect(stripSchemaHashPrefix('app-public')).toBe('app-public');
  });

  it('handles multi-dash database names in the prefix', () => {
    expect(stripSchemaHashPrefix('my-cool-db-name-deadbeef-auth-private')).toBe(
      'auth-private'
    );
    expect(stripSchemaHashPrefix('app-5e6b13b2-public')).toBe('public');
  });

  it('only strips through the FIRST 8-hex segment, keeping later ones intact', () => {
    expect(
      stripSchemaHashPrefix('marketplace-db-tenant1-5e6b13b2-app-deadbeef-zone')
    ).toBe('app-deadbeef-zone');
  });

  it('does not treat non-hex or wrong-length segments as a hash', () => {
    // 'tenant11' is 8 chars but not all hex; 'abcdef1' is 7 hex chars.
    expect(stripSchemaHashPrefix('marketplace-tenant11-app-public')).toBe(
      'marketplace-tenant11-app-public'
    );
    expect(stripSchemaHashPrefix('marketplace-abcdef1-app-public')).toBe(
      'marketplace-abcdef1-app-public'
    );
  });
});

describe('quoteSearchPath', () => {
  it('wraps each name in double quotes and comma-joins', () => {
    expect(quoteSearchPath(['a-b-c', 'a-b-d'])).toBe('"a-b-c", "a-b-d"');
  });

  it('quotes a single element without a trailing comma', () => {
    expect(quoteSearchPath(['app-public'])).toBe('"app-public"');
  });

  it('escapes embedded double quotes by doubling them', () => {
    expect(quoteSearchPath(['weird"name', 'x'])).toBe('"weird""name", "x"');
  });

  it('returns an empty string for an empty list', () => {
    expect(quoteSearchPath([])).toBe('');
  });
});

describe('computeBlueprintKey', () => {
  const base = {
    logicalSchemas: ['app-public', 'auth-public'],
    shapeFingerprint: 'fingerprint-a',
    flags: { a: 1, b: 2 } as Record<string, any>,
    apiName: 'customer-api',
    mode: 'domain-lookup'
  };

  it('produces a stable "bp:"-prefixed sha256 hex key', () => {
    const key = computeBlueprintKey(base);
    expect(key).toMatch(/^bp:[0-9a-f]{64}$/);
    expect(computeBlueprintKey(base)).toBe(key);
  });

  it('is stable across the key order of flags', () => {
    const key1 = computeBlueprintKey({ ...base, flags: { a: 1, b: 2 } });
    const key2 = computeBlueprintKey({ ...base, flags: { b: 2, a: 1 } });
    expect(key1).toBe(key2);
  });

  it('is stable across the order of logical schemas', () => {
    const key1 = computeBlueprintKey({
      ...base,
      logicalSchemas: ['app-public', 'auth-public']
    });
    const key2 = computeBlueprintKey({
      ...base,
      logicalSchemas: ['auth-public', 'app-public']
    });
    expect(key1).toBe(key2);
  });

  it('differs when the shape fingerprint differs', () => {
    const key1 = computeBlueprintKey({ ...base, shapeFingerprint: 'fingerprint-a' });
    const key2 = computeBlueprintKey({ ...base, shapeFingerprint: 'fingerprint-b' });
    expect(key1).not.toBe(key2);
  });

  it('differs when flag values differ', () => {
    const key1 = computeBlueprintKey({ ...base, flags: { a: 1, b: 2 } });
    const key2 = computeBlueprintKey({ ...base, flags: { a: 1, b: 3 } });
    expect(key1).not.toBe(key2);
  });

  it('treats undefined flags like an empty flag set', () => {
    const key1 = computeBlueprintKey({ ...base, flags: undefined });
    const key2 = computeBlueprintKey({ ...base, flags: {} });
    expect(key1).toBe(key2);
  });

  it('differs when the mode or api name differs', () => {
    expect(computeBlueprintKey({ ...base, mode: 'domain-lookup' })).not.toBe(
      computeBlueprintKey({ ...base, mode: 'api-name-header' })
    );
    expect(computeBlueprintKey({ ...base, apiName: 'customer-api' })).not.toBe(
      computeBlueprintKey({ ...base, apiName: 'other-api' })
    );
  });

  it('treats null and empty api name identically', () => {
    expect(computeBlueprintKey({ ...base, apiName: null })).toBe(
      computeBlueprintKey({ ...base, apiName: '' })
    );
  });
});

describe('tenantSearchPath (W3 fix: keep shared public on the path)', () => {
  const { tenantSearchPath } = require('../blueprint');

  it('appends public after the tenant schemas', () => {
    expect(tenantSearchPath(['t-5e6b13b2-app-public', 't-5e6b13b2-public'])).toBe(
      '"t-5e6b13b2-app-public", "t-5e6b13b2-public", "public"'
    );
  });

  it('does not duplicate an explicit public entry and keeps it last', () => {
    expect(tenantSearchPath(['public', 'services_public'])).toBe('"services_public", "public"');
  });
});

describe('computeBlueprintKey dbname isolation (W3 fix)', () => {
  const { computeBlueprintKey } = require('../blueprint');
  const base = {
    logicalSchemas: ['app-public'],
    shapeFingerprint: 'f'.repeat(64),
    flags: undefined as Record<string, any> | undefined,
    apiName: 'api',
    mode: 'public'
  };

  it('same-shape tenants in DIFFERENT physical databases get DIFFERENT keys', () => {
    const a = computeBlueprintKey({ ...base, dbname: 'db_a' });
    const b = computeBlueprintKey({ ...base, dbname: 'db_b' });
    expect(a).not.toBe(b);
  });

  it('same dbname yields a stable key', () => {
    expect(computeBlueprintKey({ ...base, dbname: 'db_a' })).toBe(
      computeBlueprintKey({ ...base, dbname: 'db_a' })
    );
  });
});
