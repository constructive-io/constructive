import { watchGather } from 'graphile-build';
import { PgIntrospectionPlugin } from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';

const SCHEMA = 'tenant_a';

const introspectionText = JSON.stringify({
  database: { datdba: '10', datacl: null },
  namespaces: [{
    _id: '2200',
    oid: '2200',
    nspname: SCHEMA,
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
    rolconfig: null
  }],
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
    3079: 'pg_extension'
  },
  current_user: 'postgres',
  server_version_num: 180004
});
const missingSchemaIntrospectionText = JSON.stringify({
  ...JSON.parse(introspectionText),
  namespaces: []
});

interface GatherResult {
  input: Record<string, unknown> | null;
  error?: Error;
}

function makeResultQueue() {
  const queued: GatherResult[] = [];
  const waiters: Array<(result: GatherResult) => void> = [];

  return {
    push(result: GatherResult) {
      const waiter = waiters.shift();
      if (waiter) waiter(result);
      else queued.push(result);
    },
    next(): Promise<GatherResult> {
      const result = queued.shift();
      if (result) return Promise.resolve(result);
      return new Promise((resolve) => waiters.push(resolve));
    }
  };
}

describe('scoped introspection raw-text lifecycle', () => {
  it('releases raw text, re-queries fresh data, and fails closed on regather errors', async () => {
    let cache: { introspectionResultsPromise: Promise<unknown> | null } | null = null;
    let triggerRegather: (() => void) | null = null;
    let queryError: Error | null = null;
    let nextIntrospectionText = introspectionText;
    const seenNamespaceNames: string[] = [];
    const query = jest.fn(async () => {
      if (queryError) {
        const error = queryError;
        queryError = null;
        throw error;
      }
      return { rows: [{ introspection: nextIntrospectionText }] };
    });
    const withPgClient = Object.assign(
      async (
        _settings: Record<string, string> | null,
        callback: (client: { query: typeof query }) => unknown
      ) => callback({ query }),
      { release: jest.fn() }
    );
    const adaptor = {
      createWithPgClient: jest.fn(async () => withPgClient)
    };

    const originalGather = PgIntrospectionPlugin.gather!;
    const capturingIntrospectionPlugin = {
      ...PgIntrospectionPlugin,
      gather: {
        ...originalGather,
        initialCache(info: never) {
          cache = originalGather.initialCache!(info) as typeof cache;
          return cache;
        },
        // A deterministic test trigger drives the same persistent gather cache
        // without needing a live LISTEN/NOTIFY subscriber.
        watch: undefined
      }
    } as unknown as GraphileConfig.Plugin;
    const observerPlugin = {
      name: 'ScopedIntrospectionCacheObserverPlugin',
      gather: {
        namespace: 'scopedIntrospectionCacheObserver',
        async main(output: Record<string, unknown>, info: any) {
          const [result] = await info.helpers.pgIntrospection.getIntrospection();
          const namespace = result.introspection.namespaces[0];
          seenNamespaceNames.push(namespace.nspname);
          output.namespaceName = namespace.nspname;
          // Graphile plugins may mutate their gather-local parsed graph. A later
          // gather must never observe this mutation.
          namespace.nspname = 'mutated_by_plugin';
        },
        watch(_info: never, callback: () => void) {
          triggerRegather = callback;
          return (): void => undefined;
        }
      }
    } as unknown as GraphileConfig.Plugin;
    const pgService = {
      name: 'main',
      schemas: [SCHEMA],
      introspectionMode: 'scoped-required',
      introspectionAllowedDependencySchemas: [] as readonly string[],
      adaptor,
      adaptorSettings: {},
      withPgClientKey: 'withPgClient',
      pgSettingsKey: 'pgSettings'
    };
    const results = makeResultQueue();

    const stopWatching = await watchGather({
      plugins: [capturingIntrospectionPlugin, observerPlugin],
      pgServices: [pgService as never]
    }, undefined, (input, error) => {
      results.push({
        input: input as unknown as Record<string, unknown> | null,
        error: error as Error | undefined
      });
    });

    try {
      const first = await results.next();
      expect(first.error).toBeUndefined();
      expect(first.input).toMatchObject({ namespaceName: SCHEMA });
      expect(query).toHaveBeenCalledTimes(1);
      expect(cache!.introspectionResultsPromise).toBeNull();

      triggerRegather!();
      const second = await results.next();
      expect(second.error).toBeUndefined();
      expect(second.input).toMatchObject({ namespaceName: SCHEMA });
      expect(query).toHaveBeenCalledTimes(2);
      expect(seenNamespaceNames).toEqual([SCHEMA, SCHEMA]);
      expect(cache!.introspectionResultsPromise).toBeNull();

      nextIntrospectionText = missingSchemaIntrospectionText;
      triggerRegather!();
      const invalid = await results.next();
      expect(invalid.input).toBeNull();
      expect(invalid.error?.message).toContain(
        `did not find required schema(s): ${SCHEMA}`
      );
      expect(query).toHaveBeenCalledTimes(3);
      expect(cache!.introspectionResultsPromise).toBeNull();

      nextIntrospectionText = introspectionText;
      triggerRegather!();
      const recovered = await results.next();
      expect(recovered.error).toBeUndefined();
      expect(recovered.input).toMatchObject({ namespaceName: SCHEMA });
      expect(query).toHaveBeenCalledTimes(4);

      const marker = new Error('scoped introspection re-query failed');
      queryError = marker;
      triggerRegather!();
      const failed = await results.next();
      expect(failed.input).toBeNull();
      expect(failed.error).toBe(marker);
      expect(query).toHaveBeenCalledTimes(5);
      expect(cache!.introspectionResultsPromise).toBeNull();
    } finally {
      stopWatching();
    }
  });
});
