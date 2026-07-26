import type { Express } from 'express';
import type { Server as HttpServer } from 'http';

/** Options controlling how the dev server binds its HTTP listener. */
export interface DevServerOptions {
  /** Host to bind. Defaults to 127.0.0.1. */
  host?: string;
  /** Port to bind. Defaults to 0 (OS-assigned). */
  port?: number;
  /** CORS origin. Defaults to permissive (reflect request origin). */
  origin?: string;
}

/** Handle returned by {@link createDevServer}. */
export interface DevServerInfo {
  httpServer: HttpServer;
  app: Express;
  url: string;
  graphqlUrl: string;
  port: number;
  host: string;
  stop: () => Promise<void>;
}
