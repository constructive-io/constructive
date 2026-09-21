import assert from 'node:assert/strict';

import { GraphQLSchema } from 'graphql';

import type { JsonValue, MemorySnapshot } from '../../types';

export type CacheLimits = Pick<
  NonNullable<GraphQLSchema['extensions']['grafast']>,
  | 'queryCacheMaxLength'
  | 'operationsCacheMaxLength'
  | 'operationOperationPlansCacheMaxLength'
>;

// Benchmark inputs use Grafast's public settings. CNC parsing/preset wiring
// remains covered by the owning packages' correctness tests.
export function applyCacheLimits(
  schema: GraphQLSchema,
  limits?: CacheLimits
): GraphQLSchema {
  if (limits === undefined) return schema;
  const config = schema.toConfig();
  return new GraphQLSchema({
    ...config,
    extensions: {
      ...config.extensions,
      grafast: { ...config.extensions?.grafast, ...limits },
    },
  });
}

export function assertIndependent(): void {
  const forbidden = Object.keys(require.cache).filter((path) =>
    /[/\\](?:graphile-settings|ts-node)(?:[/\\@])/.test(path)
  );
  assert.deepEqual(
    forbidden,
    [],
    'cache benchmark loaded application configuration or TypeScript tooling'
  );
}

export function objectConfig(value: JsonValue): Record<string, JsonValue> {
  assert(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'worker config must be an object'
  );
  return value;
}

export function errorText(error: unknown): string {
  return error instanceof Error
    ? (error.stack ?? error.message)
    : String(error);
}

// Mapped object type also remains serializable as worker metadata.
type Snapshot = { [K in keyof MemorySnapshot]: MemorySnapshot[K] };
export function memory(): Snapshot {
  assert.equal(
    typeof global.gc,
    'function',
    'benchmark worker requires Node --expose-gc'
  );
  global.gc();
  global.gc();
  global.gc();
  return process.memoryUsage();
}

export function difference(after: Snapshot, before: Snapshot): Snapshot {
  return {
    rss: after.rss - before.rss,
    heapTotal: after.heapTotal - before.heapTotal,
    heapUsed: after.heapUsed - before.heapUsed,
    external: after.external - before.external,
    arrayBuffers: after.arrayBuffers - before.arrayBuffers,
  };
}

type InspectedCache = {
  readonly length: number;
  readonly m: number;
  readonly c: ReadonlyMap<unknown, unknown>;
};

// Read-only, version-specific inspection: fail if pinned Grafast's shape changes.
export function inspectCache(
  schema: GraphQLSchema,
  name: 'queryCache' | 'cacheByOperation'
): InspectedCache {
  const ext = schema.extensions.grafast;
  const symbol = Object.getOwnPropertySymbols(ext).find(
    (key) => key.description === name
  );
  assert(symbol, `Grafast 1.1.2 cache symbol missing: ${name}`);
  const cache = (ext as Record<symbol, unknown>)[
    symbol
  ] as Partial<InspectedCache>;
  assert(
    cache &&
      cache.c instanceof Map &&
      typeof cache.length === 'number' &&
      typeof cache.m === 'number',
    'Grafast 1.1.2 inspection contract changed'
  );
  return cache as InspectedCache;
}

export function cacheState(schema: GraphQLSchema) {
  const query = inspectCache(schema, 'queryCache');
  const operation = inspectCache(schema, 'cacheByOperation');
  return {
    queryCache: { length: query.length, limit: query.m },
    cacheByOperation: { length: operation.length, limit: operation.m },
  };
}

export function countOperationPlans(cache: InspectedCache): number {
  const entry = [...cache.c.values()][0] as {
    v?: { possibleOperationPlans?: unknown };
  };
  assert(
    entry?.v && 'possibleOperationPlans' in entry.v,
    'Grafast operation plan list missing'
  );
  let node = entry.v.possibleOperationPlans;
  let count = 0;
  while (node) {
    assert(
      typeof node === 'object' && 'next' in node,
      'Grafast operation plan node changed'
    );
    count++;
    node = node.next;
  }
  return count;
}
