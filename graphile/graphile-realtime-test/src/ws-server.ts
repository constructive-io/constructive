import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { subscribe as grafastSubscribe } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import type { ExecutionResult, GraphQLSchema } from 'graphql';
import { type Client as GqlWsClient,createClient } from 'graphql-ws';
import { useServer } from 'graphql-ws/use/ws';
import { WebSocket,WebSocketServer } from 'ws';

export interface WsTestServerInput {
  schema: GraphQLSchema;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  pgSubscriber: unknown;
  pgSubscriberKey?: string;
  buildPgSettings?: (
    connectionParams: Record<string, string>,
  ) => Record<string, string> | undefined;
}

export interface WsTestServer {
  serverUrl: string;
  httpServer: HttpServer;
  wss: WebSocketServer;
  createClient(connectionParams?: Record<string, unknown>): GqlWsClient;
  dispose(): Promise<void>;
}

export async function createWsTestServer(
  input: WsTestServerInput,
): Promise<WsTestServer> {
  const {
    schema,
    resolvedPreset,
    pgSubscriber,
    pgSubscriberKey = 'pgSubscriber',
    buildPgSettings,
  } = input;

  const httpServer = createServer();
  const wss = new WebSocketServer({ server: httpServer, path: '/graphql' });

  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => ({
        connectionParams: ctx.connectionParams,
      }),
      subscribe: async (args) => {
        const params = (
          args.contextValue as Record<string, unknown>
        )?.connectionParams as Record<string, string> | undefined;

        const contextValue: Record<string, unknown> = {
          [pgSubscriberKey]: pgSubscriber,
          ...(typeof args.contextValue === 'object' && args.contextValue !== null
            ? (args.contextValue as Record<string, unknown>)
            : {}),
        };

        if (buildPgSettings && params) {
          const pgSettings = buildPgSettings(params);
          if (pgSettings) {
            contextValue['pgSettings'] = pgSettings;
          }
        }

        const result = await grafastSubscribe({
          schema: args.schema,
          document: args.document,
          variableValues: args.variableValues as
            | Record<string, unknown>
            | undefined,
          contextValue,
          resolvedPreset,
        });
        return result as AsyncIterableIterator<ExecutionResult> | ExecutionResult;
      },
    },
    wss,
  );

  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => resolve());
  });

  const addr = httpServer.address() as AddressInfo;
  const serverUrl = `ws://127.0.0.1:${addr.port}/graphql`;

  const clients: GqlWsClient[] = [];

  return {
    serverUrl,
    httpServer,
    wss,

    createClient(connectionParams?: Record<string, unknown>): GqlWsClient {
      const client = createClient({
        url: serverUrl,
        webSocketImpl: WebSocket,
        retryAttempts: 0,
        connectionParams,
      });
      clients.push(client);
      return client;
    },

    async dispose() {
      for (const client of clients) {
        try {
          await client.dispose();
        } catch { /* ignore */ }
      }
      await serverCleanup.dispose();
      wss.close();
      if (httpServer.listening) {
        await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      }
    },
  };
}
