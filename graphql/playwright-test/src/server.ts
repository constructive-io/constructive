import {
  createApiMiddleware,
  createAuthenticateMiddleware,
  cors,
  graphile
} from '@constructive-io/graphql-server';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import express from 'express';
import { Server as HttpServer, createServer } from 'http';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';

import type { ServerInfo, PlaywrightServerOptions } from './types';

/**
 * Find an available port starting from the given port
 */
const findAvailablePort = async (startPort: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(startPort, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : startPort;
      server.close(() => resolve(port));
    });
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
};

/**
 * Create a test server for Playwright testing
 * 
 * This creates an Express server with the Constructive GraphQL middleware
 * configured with enableServicesApi: false to bypass domain routing.
 */
export const createTestServer = async (
  opts: ConstructiveOptions,
  serverOpts: PlaywrightServerOptions = {}
): Promise<ServerInfo> => {
  const host = serverOpts.host ?? 'localhost';
  const requestedPort = serverOpts.port ?? 0;
  const port = requestedPort === 0 ? await findAvailablePort(5555) : requestedPort;

  const app = express();

  // Create middleware with enableServicesApi: false to bypass domain routing
  const api = createApiMiddleware(opts);
  const authenticate = createAuthenticateMiddleware(opts);

  // Basic middleware setup
  app.use(cors('*'));
  app.use(api);
  app.use(authenticate);
  app.use(graphile(opts));

  // Create HTTP server
  const httpServer: HttpServer = await new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      resolve(server);
    });
    server.on('error', reject);
  });

  const actualPort = (httpServer.address() as { port: number }).port;

  const stop = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
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
