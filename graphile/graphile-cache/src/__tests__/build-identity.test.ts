import {
  createGraphileBuildCacheKey,
  referenceGraphileBuildValue,
  snapshotGraphileBuildValue
} from '../build-identity';

const makeIdentity = (overrides: Record<string, unknown> = {}) => ({
  owner: Symbol.for('server-owner'),
  serviceKey: 'api:db-1:public-api',
  pool: referenceGraphileBuildValue({}),
  pgConfig: { host: 'db.internal', database: 'tenant_one', password: 'secret-value' },
  databaseName: 'tenant_one',
  databaseId: 'db-1',
  apiId: 'api-1',
  schemas: ['app', 'auth'],
  authRoles: { anon: 'app_anon', served: 'app_user', introspection: 'app_reader' },
  featureFlags: { enableSearch: true, enableRealtime: false },
  compute: [{ schemaName: 'compute', bindingsTableName: 'bindings' }],
  explain: false,
  surface: { graphqlPath: '/graphql', graphiql: true },
  callback: (): void => {},
  ...overrides
});

describe('Graphile build identity', () => {
  it('canonicalizes plain object keys without depending on insertion order', () => {
    expect(createGraphileBuildCacheKey('server', { a: 1, b: 2 }))
      .toBe(createGraphileBuildCacheKey('server', { b: 2, a: 1 }));
  });

  it('preserves array order and distinguishes undefined from null', () => {
    expect(createGraphileBuildCacheKey('server', ['app', 'auth']))
      .not.toBe(createGraphileBuildCacheKey('server', ['auth', 'app']));
    expect(createGraphileBuildCacheKey('server', { role: undefined }))
      .not.toBe(createGraphileBuildCacheKey('server', { role: null }));
  });

  it.each([
    ['configuration owner', 'owner', Symbol.for('other-owner')],
    ['service key', 'serviceKey', 'api:db-2:public-api'],
    ['PostgreSQL config', 'pgConfig', { host: 'db.internal', database: 'tenant_two', password: 'secret-value' }],
    ['database name', 'databaseName', 'tenant_two'],
    ['database id', 'databaseId', 'db-2'],
    ['API id', 'apiId', 'api-2'],
    ['schema order', 'schemas', ['auth', 'app']],
    ['served role', 'authRoles', { anon: 'app_anon', served: 'app_admin', introspection: 'app_reader' }],
    ['introspection role', 'authRoles', { anon: 'app_anon', served: 'app_user', introspection: 'app_introspector' }],
    ['plugin flags', 'featureFlags', { enableSearch: false, enableRealtime: false }],
    ['compute bindings', 'compute', [{ schemaName: 'compute', bindingsTableName: 'other_bindings' }]],
    ['explain', 'explain', true],
    ['effective surface', 'surface', { graphqlPath: '/api/graphql', graphiql: true }]
  ])('changes the key when %s changes', (_label, key, value) => {
    const base = makeIdentity();
    const changed = { ...base, [key as string]: value };
    expect(createGraphileBuildCacheKey('server', changed))
      .not.toBe(createGraphileBuildCacheKey('server', base));
  });

  it('uses function, symbol, opaque object, and explicit plain-object identity', () => {
    const callback = (): void => {};
    class OpaqueInstance {}
    const opaque = new OpaqueInstance();
    const plainPool = {};
    const same = {
      callback,
      symbol: Symbol.for('stable-symbol'),
      opaque,
      pool: referenceGraphileBuildValue(plainPool)
    };
    const equivalent = {
      callback,
      symbol: Symbol.for('stable-symbol'),
      opaque,
      pool: referenceGraphileBuildValue(plainPool)
    };
    expect(createGraphileBuildCacheKey('server', same))
      .toBe(createGraphileBuildCacheKey('server', equivalent));
    expect(createGraphileBuildCacheKey('server', { ...same, callback: (): void => {} }))
      .not.toBe(createGraphileBuildCacheKey('server', same));
    expect(createGraphileBuildCacheKey('server', { ...same, symbol: Symbol('stable-symbol') }))
      .not.toBe(createGraphileBuildCacheKey('server', same));
    expect(createGraphileBuildCacheKey('server', { ...same, opaque: new OpaqueInstance() }))
      .not.toBe(createGraphileBuildCacheKey('server', same));
    expect(createGraphileBuildCacheKey('server', {
      ...same,
      pool: referenceGraphileBuildValue({})
    })).not.toBe(createGraphileBuildCacheKey('server', same));
  });

  it('separates artifact domains and type-tagged adversarial values', () => {
    const date = new Date('2025-01-01T00:00:00.000Z');
    const spoofedDate = { [Symbol.toStringTag]: 'Date', value: date.getTime() };
    const identity = makeIdentity();
    expect(createGraphileBuildCacheKey('server', identity))
      .not.toBe(createGraphileBuildCacheKey('explorer', identity));
    expect(createGraphileBuildCacheKey('server', date))
      .not.toBe(createGraphileBuildCacheKey('server', spoofedDate));
    expect(createGraphileBuildCacheKey('server', NaN))
      .not.toBe(createGraphileBuildCacheKey('server', 'NaN'));
    expect(createGraphileBuildCacheKey('server', 0))
      .not.toBe(createGraphileBuildCacheKey('server', '0'));
    expect(createGraphileBuildCacheKey('server', [, undefined]))
      .not.toBe(createGraphileBuildCacheKey('server', [undefined, undefined]));
  });

  it('returns secret-free fingerprints and rejects cyclic or accessor data safely', () => {
    const secret = 'unique-password-sentinel';
    const key = createGraphileBuildCacheKey('server', { password: secret });
    expect(key).not.toContain(secret);
    expect(() => {
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;
      createGraphileBuildCacheKey('server', cyclic);
    }).toThrow('Invalid Graphile build identity');
    expect(() => createGraphileBuildCacheKey('server', {
      get password() {
        throw new Error('getter should not run');
      }
    })).toThrow('Invalid Graphile build identity');
  });

  it('uses the immutable snapshot for both the key and consumed build input', () => {
    const source = { pg: { ssl: { rejectUnauthorized: false } }, schemas: ['app'] };
    const snapshot = snapshotGraphileBuildValue(source);
    const before = createGraphileBuildCacheKey('server', snapshot);

    source.pg.ssl.rejectUnauthorized = true;
    source.schemas.push('private');

    expect(createGraphileBuildCacheKey('server', snapshot)).toBe(before);
    expect(snapshot.pg.ssl.rejectUnauthorized).toBe(false);
    expect(snapshot.schemas).toEqual(['app']);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.pg)).toBe(true);
    expect(Object.isFrozen(snapshot.pg.ssl)).toBe(true);
    expect(Object.isFrozen(snapshot.schemas)).toBe(true);
  });
});
