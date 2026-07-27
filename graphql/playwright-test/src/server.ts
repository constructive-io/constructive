import { createDevServer } from '@constructive-io/graphql-dev-server';
import { Server } from '@constructive-io/graphql-server';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Server as HttpServer } from 'http';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';

import type { PlaywrightServerOptions, ServerInfo } from './types';

/**
 * Create a single-tenant dev test server for Playwright testing.
 *
 * Delegates to `@constructive-io/graphql-dev-server`, a pure-PostGraphile
 * single-tenant server (no scoped routing, no database id) that exposes the
 * configured schemas directly.
 */
export const createTestServer = async (
  opts: ConstructiveOptions,
  serverOpts: PlaywrightServerOptions = {}
): Promise<ServerInfo> => {
  const { httpServer, url, graphqlUrl, port, host, stop } = await createDevServer(
    opts,
    {
      host: serverOpts.host ?? 'localhost',
      port: serverOpts.port ?? 0
    }
  );

  return { httpServer, url, graphqlUrl, port, host, stop };
};

/**
 * Create a production scoped test server for Playwright testing.
 *
 * Uses the `Server` class from `@constructive-io/graphql-server` directly, so
 * every request is resolved through the scoped-routing plane
 * (`routing_public.resolve_route()`). Suites using this must seed
 * real routing/database records so a real database id is resolved.
 */
export const createScopedTestServer = async (
  opts: ConstructiveOptions,
  serverOpts: PlaywrightServerOptions = {}
): Promise<ServerInfo> => {
  const host = serverOpts.host ?? 'localhost';
  const port = serverOpts.port ?? 0;

  const serverConfig: ConstructiveOptions = {
    ...opts,
    server: {
      ...opts.server,
      host,
      port
    }
  };

  const server = new Server(serverConfig);
  const httpServer: HttpServer = server.listen();

  await new Promise<void>((resolve) => {
    if (httpServer.listening) {
      resolve();
    } else {
      httpServer.once('listening', () => resolve());
    }
  });

  const actualPort = (httpServer.address() as { port: number }).port;

  const stop = async (): Promise<void> => {
    await server.close({ closeCaches: true });
  };

  return {
    httpServer,
    url: `http://${host}:${actualPort}`,
    graphqlUrl: `http://${host}:${actualPort}/graphql`,
    port: actualPort,
    host,
    stop
  };
};

/**
 * Get the PostgreSQL pool for the test server
 */
export const getTestPool = (opts: ConstructiveOptions): Pool => {
  return getPgPool(opts.pg);
};
