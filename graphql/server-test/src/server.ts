import { Server } from '@constructive-io/graphql-server';
import { PgpmOptions } from '@pgpmjs/types';
import { Server as HttpServer, createServer } from 'http';

import type { ServerInfo, ServerOptions } from './types';

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
 * Create a test server for SuperTest testing
 * 
 * This uses the Server class from @constructive-io/graphql-server directly,
 * which includes all the standard middleware (CORS, authentication, GraphQL, etc.)
 */
export const createTestServer = async (
  opts: PgpmOptions,
  serverOpts: ServerOptions = {}
): Promise<ServerInfo> => {
  const host = serverOpts.host ?? 'localhost';
  const requestedPort = serverOpts.port ?? 0;
  const port = requestedPort === 0 ? await findAvailablePort(5555) : requestedPort;

  // Merge server options into the PgpmOptions
  const serverConfig: PgpmOptions = {
    ...opts,
    server: {
      ...opts.server,
      host,
      port
    }
  };

  // Create the server using @constructive-io/graphql-server
  const server = new Server(serverConfig);
  
  // Start listening and get the HTTP server
  const httpServer: HttpServer = server.listen();
  
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
