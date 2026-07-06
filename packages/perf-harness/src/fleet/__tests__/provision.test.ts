import { classifyRetry, computeShape, retryBackoffMs, ShapeRelation, stripSchemaHashPrefix } from '../provision';

describe('stripSchemaHashPrefix', () => {
  test('strips through the first -<8 hex>- segment', () => {
    expect(stripSchemaHashPrefix('marketplace-db-tenant1-5e6b13b2-app-public')).toBe('app-public');
    expect(stripSchemaHashPrefix('factory12-aabbccdd-app-private')).toBe('app-private');
  });

  test('leaves control-plane schemas (no hash segment) unchanged', () => {
    expect(stripSchemaHashPrefix('services_public')).toBe('services_public');
    expect(stripSchemaHashPrefix('public')).toBe('public');
  });
});

describe('computeShape — shape fingerprint', () => {
  const relnames = ['categories', 'order_items', 'orders', 'products', 'reviews'];
  const rowsFor = (schema: string): ShapeRelation[] => relnames.map((relname) => ({ nspname: schema, relname }));

  test('same relnames, different schema-hash prefixes => same fingerprint', () => {
    const a = computeShape(rowsFor('factory1-aabbccdd-app-public'));
    const b = computeShape(rowsFor('factory2-11223344-app-public'));
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.pairs.length).toBe(5);
    // pairs are the logical (stripped) schema, not the physical one
    expect(a.pairs.every(([schema]) => schema === 'app-public')).toBe(true);
  });

  test('an extra relation changes the fingerprint (table drift)', () => {
    const base = computeShape(rowsFor('factory1-aabbccdd-app-public'));
    const drifted = computeShape([
      ...rowsFor('factory1-aabbccdd-app-public'),
      { nspname: 'factory1-aabbccdd-app-public', relname: 'drift_marker_g1' }
    ]);
    expect(drifted.fingerprint).not.toBe(base.fingerprint);
  });

  test('deterministic regardless of input row order', () => {
    const ordered = computeShape(rowsFor('t-aabbccdd-app-public'));
    const shuffled = computeShape([...rowsFor('t-aabbccdd-app-public')].reverse());
    expect(shuffled.fingerprint).toBe(ordered.fingerprint);
  });

  test('an empty relation set is stable and non-empty digest', () => {
    expect(computeShape([]).fingerprint).toBe(computeShape([]).fingerprint);
    expect(computeShape([]).pairs).toEqual([]);
  });
});

describe('classifyRetry — connection loss vs deadlock vs fatal', () => {
  test('connection-class codes are retriable and flagged connLost', () => {
    for (const code of ['57P01', '57P02', '57P03', '08006', '08003', '53300']) {
      expect(classifyRetry({ code })).toEqual({ connLost: true, retriable: true });
    }
  });

  test('deadlock / serialization are retriable but NOT connLost (short backoff)', () => {
    expect(classifyRetry({ code: '40P01' })).toEqual({ connLost: false, retriable: true });
    expect(classifyRetry({ code: '40001' })).toEqual({ connLost: false, retriable: true });
  });

  test('a terminated-connection message with no code is treated as connLost', () => {
    expect(classifyRetry({ message: 'server closed the connection unexpectedly' })).toEqual({
      connLost: true,
      retriable: true
    });
    expect(classifyRetry({ message: 'terminating connection due to administrator command' }).connLost).toBe(true);
  });

  test('an ordinary error (unique_violation) is not retriable', () => {
    expect(classifyRetry({ code: '23505', message: 'duplicate key value' })).toEqual({
      connLost: false,
      retriable: false
    });
  });
});

describe('retryBackoffMs', () => {
  test('connection loss backs off ~10s * attempt', () => {
    expect(retryBackoffMs(true, 1, 0)).toBe(10000);
    expect(retryBackoffMs(true, 2, 0)).toBe(20000);
    expect(retryBackoffMs(true, 3, 0)).toBe(30000);
  });

  test('deadlock backs off ~100ms * attempt', () => {
    expect(retryBackoffMs(false, 1, 0)).toBe(100);
    expect(retryBackoffMs(false, 3, 0)).toBe(300);
  });

  test('adds jitter in [0,100)', () => {
    expect(retryBackoffMs(false, 1, 0.999)).toBe(100 + 99);
    expect(retryBackoffMs(true, 1, 0.5)).toBe(10000 + 50);
  });
});
