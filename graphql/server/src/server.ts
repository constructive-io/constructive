import { getEnvOptions } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import { healthz, poweredBy, trustProxy } from '@pgpmjs/server-utils';
import { PgpmOptions } from '@pgpmjs/types';
import { middleware as parseDomains } from '@constructive-io/url-domains';
import express, { Express, RequestHandler } from 'express';
import type { Server as HttpServer } from 'http';
// @ts-ignore
import graphqlUpload from 'graphql-upload';
import { Pool, PoolClient } from 'pg';
import { getPgPool } from 'pg-cache';
import requestIp from 'request-ip';

import { createApiMiddleware } from './middleware/api';
import { createAuthenticateMiddleware } from './middleware/auth';
import { cors } from './middleware/cors';
import { flush, flushService } from './middleware/flush';
import { graphile } from './middleware/graphile';

const log = new Logger('server');

export const GraphQLServer = (rawOpts: PgpmOptions = {}) => {
  const envOptions = getEnvOptions(rawOpts);
  const app = new Server(envOptions);
  app.addEventListener();
  app.listen();
};

class Server {
  private app: Express;
  private opts: PgpmOptions;
  private listenClient: PoolClient | null = null;
  private listenRelease: (() => void) | null = null;

  constructor(opts: PgpmOptions) {
    this.opts = getEnvOptions(opts);

    const app = express();
    const api = createApiMiddleware(opts);
    const authenticate = createAuthenticateMiddleware(opts);

    healthz(app);
    trustProxy(app, opts.server.trustProxy);
    // Warn if a global CORS override is set in production
    const fallbackOrigin = opts.server?.origin?.trim();
    if (fallbackOrigin && process.env.NODE_ENV === 'production') {
      if (fallbackOrigin === '*') {
        log.warn('CORS wildcard ("*") is enabled in production; this effectively disables CORS and is not recommended. Prefer per-API CORS via meta schema.');
      } else {
        log.warn(`CORS override origin set to ${fallbackOrigin} in production. Prefer per-API CORS via meta schema.`);
      }
    }
    
    app.use(poweredBy('constructive'));
    app.use(cors(fallbackOrigin));
    app.use(graphqlUpload.graphqlUploadExpress());
    app.use(parseDomains() as RequestHandler);
    app.use(requestIp.mw());
    app.use(api);
    app.use(authenticate);
    app.use(graphile(opts));
    app.use(flush);

    this.app = app;
  }

  listen(): HttpServer {
    const { server } = this.opts;
    const httpServer = this.app.listen(server?.port, server?.host, () =>
      log.info(`listening at http://${server?.host}:${server?.port}`)
    );

    httpServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        this.error(
          `Port ${server?.port ?? 'unknown'} is already in use`,
          err
        );
      } else {
        this.error('Server failed to start', err);
      }
      throw err;
    });

    return httpServer;
  }

  async flush(databaseId: string): Promise<void> {
    await flushService(this.opts, databaseId);
  }

  getPool(): Pool {
    return getPgPool(this.opts.pg);
  }

  addEventListener(): void {
    const pgPool = this.getPool();
    pgPool.connect(this.listenForChanges.bind(this));
  }

  listenForChanges(
    err: Error | null,
    client: PoolClient,
    release: () => void
  ): void {
    if (err) {
      this.error('Error connecting with notify listener', err);
      setTimeout(() => this.addEventListener(), 5000);
      return;
    }

    this.listenClient = client;
    this.listenRelease = release;

    client.on('notification', ({ channel, payload }) => {
      if (channel === 'schema:update' && payload) {
        log.info('schema:update', payload);
        this.flush(payload);
      }
    });

    client.query('LISTEN "schema:update"');

    client.on('error', (e) => {
      this.error('Error with database notify listener', e);
      release();
      this.addEventListener();
    });

    this.log('connected and listening for changes...');
  }

  async removeEventListener(): Promise<void> {
    if (!this.listenClient || !this.listenRelease) {
      return;
    }

    const client = this.listenClient;
    const release = this.listenRelease;
    this.listenClient = null;
    this.listenRelease = null;

    client.removeAllListeners('notification');
    client.removeAllListeners('error');

    try {
      await client.query('UNLISTEN "schema:update"');
    } catch {
      // Ignore listener cleanup errors during shutdown.
    }

    release();
  }

  log(text: string): void {
    log.info(text);
  }

  error(text: string, err?: unknown): void {
    log.error(text, err);
  }
}

export { Server };
