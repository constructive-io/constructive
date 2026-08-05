import { makeSchema } from 'graphile-build';
import { MinimalPreset } from '../src/plugins';

const { makePgService: makePostGraphilePgService } = require('postgraphile/adaptors/pg') as {
  makePgService(options: Record<string, unknown>): Record<string, unknown>;
};

describe('schema-scoped introspection runtime integration', () => {
  it.each([
    ['all catalog types by default', undefined, true],
    ['dependency-closure catalog types', 'dependency-closure', false]
  ] as const)('executes the parameterized scoped query with %s', async (
    _label,
    scopedCatalogTypes,
    retainsAllCatalogTypes
  ) => {
    const marker = new Error('captured introspection query');
    let captured: { text: string; values?: unknown[] } | null = null;
    const client = {
      query: jest.fn(async (query: string | { text: string; values?: unknown[] }) => {
        if (typeof query === 'string') return { rows: [] as unknown[] };
        captured = query;
        throw marker;
      }),
      release: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn()
    };
    const pool = {
      connect: jest.fn().mockResolvedValue(client)
    };

    await expect(makeSchema({
      extends: [MinimalPreset],
      pgServices: [Object.assign(makePostGraphilePgService({
        pool: pool as never,
        schemas: ['tenant_a']
      }), {
        introspectionMode: 'scoped-required',
        introspectionCapabilityExtensions: ['pg_trgm'],
        ...(scopedCatalogTypes === undefined
          ? {}
          : { introspectionScopedCatalogTypes: scopedCatalogTypes })
      }) as never]
    })).rejects.toBe(marker);

    expect(captured).not.toBeNull();
    expect(captured!.text).toContain('requested_schema_names');
    expect(captured!.text).not.toBe('select introspection');
    expect(captured!.values).toEqual([['tenant_a'], ['pg_trgm']]);
    expect(captured!.text.includes(
      "or pg_type.typnamespace = 'pg_catalog'::regnamespace"
    )).toBe(retainsAllCatalogTypes);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('fails closed when a retained entity references a missing type', async () => {
    const introspection = JSON.stringify({
      database: {},
      namespaces: [{
        _id: '100',
        nspname: 'tenant_a',
        nspowner: '10',
        nspacl: null
      }],
      classes: [{
        _id: '200',
        relname: 'broken_items',
        relnamespace: '100',
        reltype: '999',
        reloftype: null
      }],
      attributes: [],
      constraints: [],
      procs: [],
      roles: [],
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
        1255: 'pg_proc',
        1247: 'pg_type',
        1259: 'pg_class',
        2606: 'pg_constraint',
        2615: 'pg_namespace',
        3079: 'pg_extension'
      },
      current_user: 'runtime_role',
      pg_version: 'PostgreSQL test fixture',
      introspection_version: 1
    });
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [{ introspection }] }),
      release: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn()
    };
    const pool = {
      connect: jest.fn().mockResolvedValue(client)
    };

    await expect(makeSchema({
      extends: [MinimalPreset],
      pgServices: [Object.assign(makePostGraphilePgService({
        pool: pool as never,
        schemas: ['tenant_a']
      }), {
        introspectionMode: 'scoped-required',
        introspectionScopedCatalogTypes: 'dependency-closure'
      }) as never]
    })).rejects.toThrow(
      /service '.+' retained pg_class 'broken_items \(200\)' field 'reltype' referencing missing pg_type OID '999'/
    );
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
