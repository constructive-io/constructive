import type { Pool, PoolClient } from 'pg';
import type { DocumentNode } from 'graphql';
import pgModule from 'pg';

import { GraphQLTest } from './graphile-test.js';
import type {
  GetConnectionsInput,
  GraphQLQueryOptions,
  GraphQLResponse,
  GraphQLTestContext,
} from './types.js';

// Re-export seed adapters
export * from './seed/index.js';

const unwrap = <T>(res: GraphQLResponse<T>): T => {
  if (res.errors?.length) {
    throw new Error(JSON.stringify(res.errors, null, 2));
  }
  if (!res.data) {
    throw new Error('No data returned from GraphQL query');
  }
  return res.data;
};

export interface PgTestClient {
  pool: Pool;
  client: PoolClient;
  beforeEach: () => Promise<void>;
  afterEach: () => Promise<void>;
  query: <T = unknown>(sql: string, params?: unknown[]) => Promise<T>;
  setContext: (settings: Record<string, string>) => Promise<void>;
}

const createPgTestClient = (pool: Pool, client: PoolClient): PgTestClient => {
  let transactionStarted = false;

  return {
    pool,
    client,
    beforeEach: async () => {
      if (!transactionStarted) {
        await client.query('BEGIN');
        transactionStarted = true;
      }
      await client.query('SAVEPOINT test_savepoint');
    },
    afterEach: async () => {
      await client.query('ROLLBACK TO SAVEPOINT test_savepoint');
    },
    query: async <T = unknown>(sql: string, params?: unknown[]): Promise<T> => {
      const result = await client.query(sql, params);
      return result.rows as T;
    },
    setContext: async (settings: Record<string, string>) => {
      for (const [key, value] of Object.entries(settings)) {
        if (key === 'role') {
          await client.query(`SET ROLE ${value}`);
        } else {
          await client.query(`SELECT set_config($1, $2, true)`, [key, String(value)]);
        }
      }
    },
  };
};

export interface ConnectionResult {
  pg: PgTestClient;
  db: PgTestClient;
  teardown: () => Promise<void>;
  gqlContext: GraphQLTestContext;
}

type QueryFn = <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  opts: GraphQLQueryOptions<TVariables>
) => Promise<GraphQLResponse<TResult>>;

type QueryFnPositional = <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  query: string | DocumentNode,
  variables?: TVariables,
  commit?: boolean,
  reqOptions?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

type QueryFnUnwrapped = <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  opts: GraphQLQueryOptions<TVariables>
) => Promise<TResult>;

type QueryFnPositionalUnwrapped = <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  query: string | DocumentNode,
  variables?: TVariables,
  commit?: boolean,
  reqOptions?: Record<string, unknown>
) => Promise<TResult>;

// Import seed types and adapters
import { seed } from './seed/index.js';
import type { SeedAdapter } from './seed/types.js';

const createConnectionsBase = async (
  input: GetConnectionsInput,
  seedAdapters: SeedAdapter[] = []
): Promise<ConnectionResult & { baseQuery: QueryFn; baseQueryPositional: QueryFnPositional }> => {
  const connectionString =
    process.env.DATABASE_URL ||
    `postgres://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || ''}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'postgres'}`;

  const pool = new pgModule.Pool({ connectionString });
  const rootClient = await pool.connect();
  const userClient = await pool.connect();

  const pg = createPgTestClient(pool, rootClient);
  const db = createPgTestClient(pool, userClient);

  // Run seed adapters BEFORE building the GraphQL schema
  // This allows creating extensions, tables, etc. that the schema needs to introspect
  if (seedAdapters.length > 0) {
    await seed.compose(seedAdapters).seed({ pool, client: rootClient });
  }

  const gqlContext = GraphQLTest({
    input,
    pgPool: pool,
    pgClient: input.useRoot ? rootClient : userClient,
  });
  await gqlContext.setup();

  const teardown = async () => {
    await gqlContext.teardown();
    rootClient.release();
    userClient.release();
    await pool.end();
  };

  const baseQuery: QueryFn = async <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    opts: GraphQLQueryOptions<TVariables>
  ): Promise<GraphQLResponse<TResult>> => {
    const result = await gqlContext.query<TResult, TVariables>(opts);
    return result as GraphQLResponse<TResult>;
  };

  const baseQueryPositional: QueryFnPositional = async <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    query: string | DocumentNode,
    variables?: TVariables,
    commit?: boolean,
    reqOptions?: Record<string, unknown>
  ): Promise<GraphQLResponse<TResult>> => {
    const result = await gqlContext.query<TResult, TVariables>({ query, variables, commit, reqOptions });
    return result as GraphQLResponse<TResult>;
  };

  return {
    pg,
    db,
    teardown,
    baseQuery,
    baseQueryPositional,
    gqlContext,
  };
};

export const getConnectionsObject = async (
  input: GetConnectionsInput,
  seedAdapters: SeedAdapter[] = []
): Promise<{
  pg: PgTestClient;
  db: PgTestClient;
  teardown: () => Promise<void>;
  query: QueryFn;
  gqlContext: GraphQLTestContext;
}> => {
  const { pg, db, teardown, baseQuery, gqlContext } = await createConnectionsBase(input, seedAdapters);

  return {
    pg,
    db,
    teardown,
    query: baseQuery,
    gqlContext,
  };
};

export const getConnectionsObjectUnwrapped = async (
  input: GetConnectionsInput,
  seedAdapters: SeedAdapter[] = []
): Promise<{
  pg: PgTestClient;
  db: PgTestClient;
  teardown: () => Promise<void>;
  query: QueryFnUnwrapped;
}> => {
  const { pg, db, teardown, baseQuery } = await createConnectionsBase(input, seedAdapters);

  const query: QueryFnUnwrapped = async <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    opts: GraphQLQueryOptions<TVariables>
  ): Promise<TResult> => {
    const result = await baseQuery<TResult, TVariables>(opts);
    return unwrap(result);
  };

  return {
    pg,
    db,
    teardown,
    query,
  };
};

export const getConnectionsObjectWithLogging = async (
  input: GetConnectionsInput,
  seedAdapters: SeedAdapter[] = []
): Promise<{
  pg: PgTestClient;
  db: PgTestClient;
  teardown: () => Promise<void>;
  query: QueryFn;
}> => {
  const { pg, db, teardown, baseQuery } = await createConnectionsBase(input, seedAdapters);

  const query: QueryFn = async <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    opts: GraphQLQueryOptions<TVariables>
  ): Promise<GraphQLResponse<TResult>> => {
    console.log('Executing GraphQL query:', opts.query);
    const result = await baseQuery<TResult, TVariables>(opts);
    console.log('GraphQL result:', result);
    return result;
  };

  return {
    pg,
    db,
    teardown,
    query,
  };
};

export const getConnectionsObjectWithTiming = async (
  input: GetConnectionsInput,
  seedAdapters: SeedAdapter[] = []
): Promise<{
  pg: PgTestClient;
  db: PgTestClient;
  teardown: () => Promise<void>;
  query: QueryFn;
}> => {
  const { pg, db, teardown, baseQuery } = await createConnectionsBase(input, seedAdapters);

  const query: QueryFn = async <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    opts: GraphQLQueryOptions<TVariables>
  ): Promise<GraphQLResponse<TResult>> => {
    const start = Date.now();
    const result = await baseQuery<TResult, TVariables>(opts);
    const duration = Date.now() - start;
    console.log(`GraphQL query took ${duration}ms`);
    return result;
  };

  return {
    pg,
    db,
    teardown,
    query,
  };
};

export const getConnections = async (
  input: GetConnectionsInput,
  seedAdapters: SeedAdapter[] = []
): Promise<{
  pg: PgTestClient;
  db: PgTestClient;
  teardown: () => Promise<void>;
  query: QueryFnPositional;
}> => {
  const { pg, db, teardown, baseQueryPositional } = await createConnectionsBase(input, seedAdapters);

  return {
    pg,
    db,
    teardown,
    query: baseQueryPositional,
  };
};

export const getConnectionsUnwrapped = async (
  input: GetConnectionsInput,
  seedAdapters: SeedAdapter[] = []
): Promise<{
  pg: PgTestClient;
  db: PgTestClient;
  teardown: () => Promise<void>;
  query: QueryFnPositionalUnwrapped;
}> => {
  const { pg, db, teardown, baseQueryPositional } = await createConnectionsBase(input, seedAdapters);

  const query: QueryFnPositionalUnwrapped = async <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    q: string | DocumentNode,
    variables?: TVariables,
    commit?: boolean,
    reqOptions?: Record<string, unknown>
  ): Promise<TResult> => {
    const result = await baseQueryPositional<TResult, TVariables>(q, variables, commit, reqOptions);
    return unwrap(result);
  };

  return {
    pg,
    db,
    teardown,
    query,
  };
};

export const getConnectionsWithLogging = async (
  input: GetConnectionsInput,
  seedAdapters: SeedAdapter[] = []
): Promise<{
  pg: PgTestClient;
  db: PgTestClient;
  teardown: () => Promise<void>;
  query: QueryFnPositional;
}> => {
  const { pg, db, teardown, baseQueryPositional } = await createConnectionsBase(input, seedAdapters);

  const query: QueryFnPositional = async <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    q: string | DocumentNode,
    variables?: TVariables,
    commit?: boolean,
    reqOptions?: Record<string, unknown>
  ): Promise<GraphQLResponse<TResult>> => {
    console.log('Executing positional GraphQL query:', q);
    const result = await baseQueryPositional<TResult, TVariables>(q, variables, commit, reqOptions);
    console.log('GraphQL result:', result);
    return result;
  };

  return {
    pg,
    db,
    teardown,
    query,
  };
};

export const getConnectionsWithTiming = async (
  input: GetConnectionsInput,
  seedAdapters: SeedAdapter[] = []
): Promise<{
  pg: PgTestClient;
  db: PgTestClient;
  teardown: () => Promise<void>;
  query: QueryFnPositional;
}> => {
  const { pg, db, teardown, baseQueryPositional } = await createConnectionsBase(input, seedAdapters);

  const query: QueryFnPositional = async <TResult = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
    q: string | DocumentNode,
    variables?: TVariables,
    commit?: boolean,
    reqOptions?: Record<string, unknown>
  ): Promise<GraphQLResponse<TResult>> => {
    const start = Date.now();
    const result = await baseQueryPositional<TResult, TVariables>(q, variables, commit, reqOptions);
    const duration = Date.now() - start;
    console.log(`Positional GraphQL query took ${duration}ms`);
    return result;
  };

  return {
    pg,
    db,
    teardown,
    query,
  };
};
