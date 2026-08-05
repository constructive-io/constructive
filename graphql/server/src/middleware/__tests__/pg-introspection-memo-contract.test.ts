import { parseIntrospectionResults } from 'pg-introspection';

function makeIntrospectionText(): string {
  return JSON.stringify({
    database: {
      _id: '1',
      oid: '1',
      datname: 'memo_contract',
      datdba: '10',
      datacl: null
    },
    namespaces: [{
      _id: '2200',
      oid: '2200',
      nspname: 'tenant_api',
      nspowner: '10',
      nspacl: null
    }],
    classes: [],
    attributes: [],
    constraints: [],
    procs: [],
    roles: [{
      _id: '10',
      oid: '10',
      rolname: 'runtime_role',
      rolsuper: false,
      rolinherit: false,
      rolcreaterole: false,
      rolcreatedb: false,
      rolcanlogin: true,
      rolreplication: false,
      rolconnlimit: -1,
      rolpassword: null,
      rolvaliduntil: null,
      rolbypassrls: false,
      rolconfig: null
    }],
    auth_members: [],
    types: [],
    enums: [],
    extensions: [],
    indexes: [],
    inherits: [],
    languages: [],
    policies: [],
    ranges: [],
    depends: [],
    descriptions: [],
    am: [],
    catalog_by_oid: {
      1247: 'pg_type',
      1255: 'pg_proc',
      1259: 'pg_class',
      2606: 'pg_constraint',
      2615: 'pg_namespace',
      3079: 'pg_extension'
    },
    current_user: 'runtime_role',
    pg_version: 'PostgreSQL test',
    introspection_version: 1
  });
}

const parseFixture = (): any => parseIntrospectionResults(makeIntrospectionText());

describe('pg-introspection memo helper contract', () => {
  it('installs memoized helpers as ordinary own data-function properties', () => {
    const introspection = parseFixture();
    const namespace = introspection.namespaces[0];
    const getOwner = namespace.getOwner;
    const descriptor = Object.getOwnPropertyDescriptor(namespace, 'getOwner');

    expect(descriptor).toMatchObject({
      value: getOwner,
      enumerable: true,
      writable: true,
      configurable: true
    });
    expect(descriptor).not.toHaveProperty('get');
    expect(Object.keys(namespace)).toContain('getOwner');
    expect(getOwner.length).toBe(0);
    expect(getOwner()).toBe(introspection.roles[0]);
    expect(getOwner()).toBe(introspection.roles[0]);
    expect(getOwner.call({ unrelated: true })).toBe(introspection.roles[0]);
    expect(namespace.getOwner).toBe(getOwner);
    expect(() => Reflect.construct(getOwner, [])).toThrow(TypeError);

    const spread = { ...namespace };
    expect(spread.getOwner).toBe(getOwner);
    expect(JSON.parse(JSON.stringify(namespace))).toMatchObject({
      _id: '2200',
      nspname: 'tenant_api'
    });
    expect(JSON.stringify(namespace)).not.toContain('getOwner');
  });

  it('preserves assignment, deletion, and post-freeze memoization', () => {
    const mutable = parseFixture().namespaces[0];
    const replacement = jest.fn(() => 'replacement');

    mutable.getOwner = replacement;
    expect(mutable.getOwner()).toBe('replacement');
    expect(Reflect.deleteProperty(mutable, 'getOwner')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(mutable, 'getOwner')).toBe(false);

    const frozen = parseFixture().namespaces[0];
    const getTags = frozen.getTags;
    Object.freeze(frozen);
    const first = getTags();

    expect(getTags()).toBe(first);
    expect(frozen.getTags).toBe(getTags);
    expect(Object.isFrozen(frozen)).toBe(true);
  });

  it('preserves lazy helper identity and memoization on non-extensible entities', () => {
    for (const lock of [Object.preventExtensions, Object.seal, Object.freeze]) {
      const introspection = parseFixture();
      const namespace = introspection.namespaces[0];
      lock(namespace);

      const getOwner = namespace.getOwner;
      expect(namespace.getOwner).toBe(getOwner);
      expect(getOwner()).toBe(introspection.roles[0]);
      expect(getOwner()).toBe(introspection.roles[0]);
      expect(getOwner.call({ unrelated: true })).toBe(introspection.roles[0]);
    }
  });

  it('keeps memo state isolated between parsed builds', () => {
    const first = parseFixture();
    const second = parseFixture();

    expect(first.namespaces[0].getOwner).not.toBe(second.namespaces[0].getOwner);
    expect(first.namespaces[0].getOwner()).toBe(first.roles[0]);
    expect(second.namespaces[0].getOwner()).toBe(second.roles[0]);
    expect(first.roles[0]).not.toBe(second.roles[0]);
  });
});
