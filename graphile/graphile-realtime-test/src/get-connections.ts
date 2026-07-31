import { makeSchema } from 'graphile-build';
import { defaultPreset as graphileBuildDefaultPreset } from 'graphile-build';
import { defaultPreset as graphileBuildPgDefaultPreset } from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import { createRealtimeSubscriptionsPlugin } from 'graphile-realtime-subscriptions';
import type { GraphQLSchema } from 'graphql';
import type { Client as GqlWsClient } from 'graphql-ws';
import type { Pool } from 'pg';
import type { GetConnectionOpts, GetConnectionResult } from 'pgsql-test';
import { getConnections as getPgConnections } from 'pgsql-test';
import type { SeedAdapter } from 'pgsql-test/seed/types';
import type { PgTestClient } from 'pgsql-test/test-client';
import { makePgService } from 'postgraphile/adaptors/pg';

import { notify, notifyChange, notifyInvalidate } from './notify.js';
import { makeRealtimeSmartTagsPlugin } from './smart-tags.js';
import { collectWsEvents, delay,nextEvent } from './ws-helpers.js';
import type { WsTestServer } from './ws-server.js';
import { createWsTestServer } from './ws-server.js';

// --- Types ---

const MinimalPreset: GraphileConfig.Preset = {
  extends: [graphileBuildDefaultPreset, graphileBuildPgDefaultPreset],
  disablePlugins: ['NodePlugin'],
};

export interface GetConnectionsInput extends GetConnectionOpts {
  schemas: string[];
  authRole?: string;
  useRoot?: boolean;
  preset?: GraphileConfig.Preset;
  smartTags?: Record<string, Record<string, unknown>>;
  realtimeTables?: string[];
  realtimeOptions?: { overflowThreshold?: number };
  buildPgSettings?: (
    connectionParams: Record<string, string>,
  ) => Record<string, string> | undefined;
}

export interface WsHandle {
  serverUrl: string;
  createClient(connectionParams?: Record<string, unknown>): GqlWsClient;
  nextEvent<T = Record<string, unknown>>(
    client: GqlWsClient,
    query: string,
    variables?: Record<string, unknown>,
    timeoutMs?: number,
  ): Promise<T>;
  collectEvents<T = Record<string, unknown>>(
    client: GqlWsClient,
    query: string,
    variables?: Record<string, unknown>,
  ): { events: T[]; unsubscribe: () => void };
  dispose(): Promise<void>;
}

export interface GetConnectionsResult {
  pg: PgTestClient;
  db: PgTestClient;
  schema: GraphQLSchema;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  pgPool: Pool;
  pgService: ReturnType<typeof makePgService>;
  pgSubscriber: unknown;
  ws: WsHandle;
  notifyChange(
    table: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    rowIds: string[],
    schema?: string,
  ): Promise<void>;
  notifyInvalidate(table: string, schema?: string): Promise<void>;
  notify(table: string, payload: string, schema?: string): Promise<void>;
  teardown(): Promise<void>;
}


// --- Implementation ---

export async function getConnections(
  input: GetConnectionsInput,
  seedAdapters?: SeedAdapter[],
): Promise<GetConnectionsResult> {
  const {
    schemas,
    preset: userPreset,
    smartTags,
    realtimeTables,
    realtimeOptions,
    buildPgSettings,
  } = input;

  // 1. Database connections (pgsql-test layer)
  const conn: GetConnectionResult = await getPgConnections(input, seedAdapters);
  const { pg, db, teardown: dbTeardown } = conn;
  const pgPool = conn.manager.getPool(conn.pg.config);

  // 2. Smart tags
  const smartTagsMap: Record<string, Record<string, unknown>> = {
    ...(smartTags ?? {}),
  };
  for (const table of realtimeTables ?? []) {
    if (!smartTagsMap[table]) {
      smartTagsMap[table] = {};
    }
    smartTagsMap[table].realtime = true;
  }

  const smartTagsPlugin = makeRealtimeSmartTagsPlugin(smartTagsMap);
  const realtimePlugin = createRealtimeSubscriptionsPlugin(realtimeOptions);

  // 3. Graphile schema (graphile-test layer)
  const pgService = makePgService({
    pool: pgPool,
    schemas,
  });

  const completePreset: GraphileConfig.Preset = {
    extends: [
      MinimalPreset,
      ...(userPreset?.extends ?? []),
    ],
    ...(userPreset?.disablePlugins && { disablePlugins: userPreset.disablePlugins }),
    plugins: [
      ...(userPreset?.plugins ?? []),
      smartTagsPlugin,
      realtimePlugin,
    ],
    ...(userPreset?.schema && { schema: userPreset.schema }),
    ...(userPreset?.grafast && { grafast: userPreset.grafast }),
    pgServices: [pgService],
  };

  const result = await makeSchema(completePreset);
  const schema = result.schema;
  const resolvedPreset = result.resolvedPreset;

  const pgSubscriber = (pgService as any).pgSubscriber;
  const pgSubscriberKey: string =
    (pgService as any).pgSubscriberKey ?? 'pgSubscriber';

  // 4. WebSocket server (realtime layer)
  const wsServer: WsTestServer = await createWsTestServer({
    schema,
    resolvedPreset,
    pgSubscriber,
    pgSubscriberKey,
    buildPgSettings,
  });

  await delay(300);

  // 5. WS handle
  const ws: WsHandle = {
    serverUrl: wsServer.serverUrl,
    createClient: (connectionParams) => wsServer.createClient(connectionParams),
    nextEvent: <T = Record<string, unknown>>(
      client: GqlWsClient,
      query: string,
      variables?: Record<string, unknown>,
      timeoutMs?: number,
    ) => nextEvent<T>(client, query, variables, timeoutMs),
    collectEvents: <T = Record<string, unknown>>(
      client: GqlWsClient,
      query: string,
      variables?: Record<string, unknown>,
    ) => collectWsEvents<T>(client, query, variables),
    dispose: () => wsServer.dispose(),
  };

  // 6. Notify helpers
  const defaultSchema = schemas[0] ?? 'public';
  const notifyClient = pg.client;

  // 7. Teardown (idempotent)
  let tornDown = false;
  const teardown = async () => {
    if (tornDown) return;
    tornDown = true;
    // Order: clients -> server -> subscriber -> service -> pool -> db
    await wsServer.dispose();
    if (pgSubscriber && typeof pgSubscriber.release === 'function') {
      await pgSubscriber.release();
    }
    if (pgService && typeof pgService.release === 'function') {
      await pgService.release();
    }
    await dbTeardown();
  };

  return {
    pg,
    db,
    schema,
    resolvedPreset,
    pgPool,
    pgService,
    pgSubscriber,
    ws,

    async notifyChange(
      table: string,
      operation: 'INSERT' | 'UPDATE' | 'DELETE',
      rowIds: string[],
      tableSchema?: string,
    ) {
      await notifyChange(
        notifyClient,
        tableSchema ?? defaultSchema,
        table,
        operation,
        rowIds,
      );
    },

    async notifyInvalidate(table: string, tableSchema?: string) {
      await notifyInvalidate(
        notifyClient,
        tableSchema ?? defaultSchema,
        table,
      );
    },

    async notify(table: string, payload: string, tableSchema?: string) {
      await notify(
        notifyClient,
        tableSchema ?? defaultSchema,
        table,
        payload,
      );
    },

    teardown,
  };
}
