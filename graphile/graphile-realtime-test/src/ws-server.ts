import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { subscribe as grafastSubscribe } from 'grafast';
import type { GraphQLSchema, ExecutionResult } from 'graphql';
import type { GraphileConfig } from 'graphile-config';
import { createClient, type Client as GqlWsClient } from 'graphql-ws';
import { useServer } from 'graphql-ws/use/ws';
import { WebSocketServer, WebSocket } from 'ws';

/**
 * Input for creating a WebSocket test server.
 */
export interface WsTestServerInput {
  schema: GraphQLSchema;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  pgSubscriber: unknown;
  pgSubscriberKey?: string;

  /**
   * Optional hook to build pgSettings from the WebSocket connectionParams.
   * Return a pgSettings object to inject into the grafast context,
   * or undefined to skip pgSettings injection.
   *
   * Example (constructive auth):
   * ```ts
   * buildPgSettings: (params) => ({
   *   role: 'authenticated',
   *   'jwt.claims.user_id': params.userId,
   * })
   * ```
   */
  buildPgSettings?: (
    connectionParams: Record<string, string>,
  ) => Record<string, string> | undefined;
}

/**
 * A running WebSocket test server with helpers.
 */
export interface WsTestServer {
  /** The ws:// URL clients can connect to */
  serverUrl: string;

  /** The underlying HTTP server */
  httpServer: HttpServer;

  /** The underlying WebSocketServer */
  wss: WebSocketServer;

  /**
   * Create a graphql-ws client connected to this server.
   *
   * @param connectionParams - Optional params passed to the server on connect
   * @returns A graphql-ws Client instance
   */
  createClient(connectionParams?: Record<string, unknown>): GqlWsClient;

  /**
   * Dispose the server: close all WebSocket connections, stop listening,
   * and clean up the graphql-ws server transport.
   */
  dispose(): Promise<void>;
}

/**
 * Create a WebSocket test server backed by graphql-ws + grafast.
 *
 * Bundles the HTTP server, WebSocketServer, and graphql-ws `useServer` wiring
 * into a single helper. The server listens on a random port on 127.0.0.1.
 *
 * @param input - Server configuration
 * @returns A `WsTestServer` with `serverUrl`, `createClient()`, and `dispose()`
 */
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
