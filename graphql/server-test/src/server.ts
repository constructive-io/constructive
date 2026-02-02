import { Server } from '@constructive-io/graphql-server';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Server as HttpServer, createServer } from 'http';

import type { ServerInfo, ServerOptions } from './types';

/**
 * Find an available port starting from the given port
 * Uses 127.0.0.1 explicitly to avoid IPv6/IPv4 mismatch issues with supertest
 */
const findAvailablePort = async (startPort: number, host: string = '127.0.0.1'): Promise<number> => {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(startPort, host, () => {
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
  opts: ConstructiveOptions,
  serverOpts: ServerOptions = {}
): Promise<ServerInfo> => {
  // Use 127.0.0.1 by default to avoid IPv6/IPv4 mismatch issues with supertest
  // On some systems, 'localhost' resolves to ::1 (IPv6) but supertest connects to 127.0.0.1 (IPv4)
  const host = serverOpts.host ?? '127.0.0.1';
  const requestedPort = serverOpts.port ?? 0;
  const port = requestedPort === 0 ? await findAvailablePort(5555, host) : requestedPort;

  // Merge server options into the ConstructiveOptions
  const serverConfig: ConstructiveOptions = {
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
  
  // Wait for the server to actually be listening before getting the address
  // The listen() call is async - it returns immediately but the server isn't ready yet
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
