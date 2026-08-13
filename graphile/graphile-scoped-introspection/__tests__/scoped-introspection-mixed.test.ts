import '@dataplan/pg/adaptors/pg';

import {
  defaultPreset as graphileBuildPreset,
  gather,
  makeSchema,
} from 'graphile-build';
import {
  defaultPreset as graphileBuildPgPreset,
  PgIntrospectionPlugin,
} from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import { execute, lexicographicSortSchema, parse, printSchema } from 'graphql';

import {
  ConstructivePgIntrospectionPlugin,
  ScopedIntrospectionPreset,
} from '../src';

const introspectionText = (schema: string): string =>
  JSON.stringify({
    database: { datdba: '10', datacl: null },
    namespaces: [
      {
        _id: schema === 'stock_schema' ? '2200' : '2201',
        oid: schema === 'stock_schema' ? '2200' : '2201',
        nspname: schema,
        nspowner: '10',
        nspacl: null,
      },
    ],
    classes: [],
    attributes: [],
    constraints: [],
    procs: [],
    roles: [
      {
        _id: '10',
        oid: '10',
        rolname: 'postgres',
        rolsuper: true,
        rolinherit: true,
        rolcreaterole: true,
        rolcreatedb: true,
        rolcanlogin: true,
        rolreplication: true,
        rolconnlimit: -1,
        rolpassword: null,
        rolvaliduntil: null,
        rolbypassrls: true,
        rolconfig: null,
      },
    ],
    auth_members: [],
    types: [],
    enums: [],
    extensions: [],
    indexes: [],
    languages: [],
    ranges: [],
    depends: [],
    descriptions: [],
    inherits: [],
    am: [],
    catalog_by_oid: {
      2615: 'pg_namespace',
      1259: 'pg_class',
      1255: 'pg_proc',
      1247: 'pg_type',
      2606: 'pg_constraint',
      3079: 'pg_extension',
    },
    current_user: 'postgres',
    server_version_num: 180004,
  });

const makeService = (
  name: string,
  schema: string,
  mode: 'stock' | 'scoped-required',
  queries: Array<{ text: string; values?: unknown[] }>
): never => {
  const query = jest.fn(async (input: { text: string; values?: unknown[] }) => {
    queries.push(input);
    return { rows: [{ introspection: introspectionText(schema) }] };
  });
  const withPgClient = Object.assign(
    async (
      _settings: Record<string, string> | null,
      callback: (client: { query: typeof query }) => unknown
    ) => callback({ query }),
    { release: jest.fn() }
  );
  return {
    name,
    schemas: [schema],
    introspectionMode: mode,
    introspectionAllowedDependencySchemas: [],
    adaptor: {
      createWithPgClient: jest.fn(async () => withPgClient),
    },
    adaptorSettings: {},
    withPgClientKey: `${name}WithPgClient`,
    pgSettingsKey: `${name}PgSettings`,
  } as never;
};

describe('mixed stock/scoped introspection services', () => {
  it('selects each service query independently and announces each once', async () => {
    const queries: Array<{ text: string; values?: unknown[] }> = [];
    const observer = {
      name: 'MixedIntrospectionObserverPlugin',
      gather: {
        namespace: 'mixedIntrospectionObserver',
        async main(output: Record<string, unknown>, info: any) {
          const first = info.helpers.pgIntrospection.getIntrospection();
          const second = info.helpers.pgIntrospection.getIntrospection();
          expect(second).toBe(first);
          const [results, sharedResults] = await Promise.all([first, second]);
          expect(sharedResults).toBe(results);
          output.services = results.map((result: any) => ({
            name: result.pgService.name,
            namespaces: result.introspection.namespaces.map(
              (namespace: any) => namespace.nspname
            ),
          }));
        },
      },
    } as unknown as GraphileConfig.Plugin;

    const output = await gather({
      plugins: [ConstructivePgIntrospectionPlugin, observer],
      pgServices: [
        makeService('stock', 'stock_schema', 'stock', queries),
        makeService('scoped', 'scoped_schema', 'scoped-required', queries),
      ],
    });

    expect(output).toMatchObject({
      services: [
        { name: 'stock', namespaces: ['stock_schema'] },
        { name: 'scoped', namespaces: ['scoped_schema'] },
      ],
    });
    expect(queries).toHaveLength(2);
    const stock = queries.find(
      (query) => !query.text.includes('requested_schema_names')
    );
    const scoped = queries.find((query) =>
      query.text.includes('requested_schema_names')
    );
    expect(stock).toBeDefined();
    expect(stock?.values).toBeUndefined();
    expect(scoped?.values).toEqual([['scoped_schema'], []]);
  });

  it('keeps replacement stock gather, schema, and runtime equivalent to upstream', async () => {
    const makeObserver = (name: string) =>
      ({
        name,
        gather: {
          namespace: `${name}Namespace`,
          async main(output: Record<string, unknown>, info: any) {
            const [result] =
              await info.helpers.pgIntrospection.getIntrospection();
            output.entityCounts = Object.fromEntries(
              [
                'namespaces',
                'classes',
                'attributes',
                'constraints',
                'procs',
                'roles',
                'types',
                'ranges',
              ].map((key) => [key, result.introspection[key].length])
            );
          },
        },
      }) as unknown as GraphileConfig.Plugin;
    const upstreamQueries: Array<{ text: string; values?: unknown[] }> = [];
    const replacementQueries: Array<{ text: string; values?: unknown[] }> = [];
    const upstreamPreset = {
      extends: [graphileBuildPreset, graphileBuildPgPreset],
      plugins: [makeObserver('UpstreamStockObserverPlugin')],
      pgServices: [
        makeService('main', 'stock_schema', 'stock', upstreamQueries),
      ],
    };
    const replacementPreset = {
      extends: [
        graphileBuildPreset,
        graphileBuildPgPreset,
        ScopedIntrospectionPreset,
      ],
      plugins: [makeObserver('ReplacementStockObserverPlugin')],
      pgServices: [
        makeService('main', 'stock_schema', 'stock', replacementQueries),
      ],
    };

    const [upstreamGather, replacementGather] = await Promise.all([
      gather(upstreamPreset),
      gather(replacementPreset),
    ]);
    expect((replacementGather as any).entityCounts).toEqual(
      (upstreamGather as any).entityCounts
    );
    expect(upstreamQueries).toHaveLength(1);
    expect(replacementQueries).toHaveLength(1);
    expect(replacementQueries[0].text).toBe(upstreamQueries[0].text);

    const [upstream, replacement] = await Promise.all([
      makeSchema({
        extends: [graphileBuildPreset, graphileBuildPgPreset],
        pgServices: [
          makeService('main', 'stock_schema', 'stock', upstreamQueries),
        ],
      }),
      makeSchema({
        extends: [
          graphileBuildPreset,
          graphileBuildPgPreset,
          ScopedIntrospectionPreset,
        ],
        pgServices: [
          makeService('main', 'stock_schema', 'stock', replacementQueries),
        ],
      }),
    ]);
    expect(printSchema(lexicographicSortSchema(replacement.schema))).toEqual(
      printSchema(lexicographicSortSchema(upstream.schema))
    );
    const query = parse('{ __typename }');
    expect(
      await execute({ schema: replacement.schema, document: query })
    ).toEqual(await execute({ schema: upstream.schema, document: query }));
    expect(PgIntrospectionPlugin.name).toBe('PgIntrospectionPlugin');
  });
});
