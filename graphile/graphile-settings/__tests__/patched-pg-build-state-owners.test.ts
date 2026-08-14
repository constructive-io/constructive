import {
  PgBasicsPlugin,
  PgCodecsPlugin,
  PgPolymorphismPlugin,
} from 'graphile-build-pg';
import { GraphQLList, GraphQLNonNull } from 'graphql';

type Disposer = () => void;

const buildHook = (plugin: GraphileConfig.Plugin): ((build: any) => any) =>
  plugin.schema!.hooks!.build as (build: any) => any;

const disposerRegistration = () => {
  let disposer: Disposer | undefined;
  return {
    registerBuildStateDisposer(callback: Disposer) {
      disposer = callback;
    },
    dispose() {
      expect(disposer).toBeDefined();
      disposer!();
    },
  };
};

describe('patched graphile-build-pg state owners', () => {
  it('PgBasics clears codec metadata and table-resource caches', () => {
    const lifecycle = disposerRegistration();
    const executor = {};
    const codec = { executor, name: 'account' };
    const resource = {
      name: 'accounts',
      codec,
      executor,
      getRelations: () => Object.create(null),
      isUnique: false,
      isVirtual: false,
    };
    const build: any = {
      ...lifecycle,
      extend(target: object, extra: object) {
        return Object.assign(target, extra);
      },
      graphql: { GraphQLList, GraphQLNonNull },
      input: {
        pgRegistry: {
          pgCodecs: { account: codec },
          pgExecutors: { main: resource.executor },
          pgRelations: Object.create(null),
          pgResources: { accounts: resource },
        },
      },
      lib: {
        dataplanJson: { version: 'test' },
        dataplanPg: { version: 'test' },
        sql: {},
      },
      versions: Object.create(null),
    };

    const result = buildHook(PgBasicsPlugin)(build);
    expect(result.pgCodecMetaLookup.size).toBe(1);
    expect(result.pgTableResource(codec)).toBe(resource);

    result.pgResources = Object.create(null);
    lifecycle.dispose();

    expect(result.pgCodecMetaLookup.size).toBe(0);
    expect(result.pgTableResource(codec)).toBeNull();
  });

  it('PgCodecs clears the codec set and database-name lookup', () => {
    const lifecycle = disposerRegistration();
    const codec = {
      name: 'account',
      extensions: {
        pg: { name: 'account', schemaName: 'app_public', serviceName: 'main' },
      },
    };
    const build: any = {
      ...lifecycle,
      input: {
        pgRegistry: {
          pgResources: { accounts: { codec } },
        },
      },
    };

    const result = buildHook(PgCodecsPlugin)(build);
    expect(result.allPgCodecs).toEqual(new Set([codec]));
    expect(
      result.getPgCodecByDatabaseName('main', 'app_public', 'account')
    ).toBe(codec);

    lifecycle.dispose();

    expect(result.allPgCodecs.size).toBe(0);
    expect(() =>
      result.getPgCodecByDatabaseName('main', 'app_public', 'account')
    ).toThrow('Failed to find codec');
  });

  it('PgPolymorphism clears resource and union-codec indexes', () => {
    const lifecycle = disposerRegistration();
    const implementedCodec = {
      name: 'account',
      extensions: { tags: { implements: 'Entity' } },
    };
    const unionCodec = {
      name: 'search_result',
      polymorphism: { mode: 'union' },
    };
    const build: any = {
      ...lifecycle,
      extend(target: object, extra: object) {
        return Object.assign(target, extra);
      },
      inflection: { tableType: () => 'SearchResult' },
      input: {
        pgRegistry: {
          pgCodecs: { searchResult: unionCodec },
          pgResources: {
            accounts: {
              codec: implementedCodec,
              from: 'app_public.accounts',
            },
          },
        },
      },
    };

    const result = buildHook(PgPolymorphismPlugin)(build);
    expect(Object.keys(result.pgResourcesByPolymorphicTypeName).sort()).toEqual(
      ['Entity', 'SearchResult']
    );
    expect(Object.keys(result.pgCodecByPolymorphicUnionModeTypeName)).toEqual([
      'SearchResult',
    ]);

    lifecycle.dispose();

    expect(Object.keys(result.pgResourcesByPolymorphicTypeName)).toEqual([]);
    expect(Object.keys(result.pgCodecByPolymorphicUnionModeTypeName)).toEqual(
      []
    );
  });
});
