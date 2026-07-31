import express from 'express';

import { createRouter } from './router';
import type { AgenticServerOptions } from './types';

export interface AgenticServerStartOptions extends AgenticServerOptions {
  port?: number;
}

/** Identity headers trusted only when isPublic === false (private network). */
const IDENTITY_HEADERS = [
  'x-database-id',
  'x-entity-id',
  'x-actor-id'
] as const;

/**
 * Create a standalone Express app for the agentic server.
 * Used by both standalone mode and integration tests.
 */
export const createAgenticServer = (options: AgenticServerStartOptions): express.Express => {
  const app = express();
  app.use(express.json());

  // When isPublic === true, strip identity headers from all incoming requests.
  // Public deployments cannot trust client-supplied tenant context.
  // When isPublic === false (default), the server is on a private network
  // and trusts identity headers directly — same pattern as the GraphQL server
  // with API_IS_PUBLIC=false.
  if (options.isPublic) {
    app.use((req: any, _res: any, next: any) => {
      for (const header of IDENTITY_HEADERS) {
        req.headers[header] = undefined;
      }
      next();
    });
  }

  app.use(createRouter(options));

  return app;
};
