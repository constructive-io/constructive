import { getEnvOptions, getNodeEnv } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import { healthz, poweredBy, svcCache, trustProxy } from '@pgpmjs/server-utils';
import { PgpmOptions } from '@pgpmjs/types';
import { middleware as parseDomains } from '@constructive-io/url-domains';
import express, { Express, RequestHandler } from 'express';
import type { Server as HttpServer } from 'http';
// @ts-ignore
import graphqlUpload from 'graphql-upload';
import { Pool, PoolClient } from 'pg';
import {
  graphileCache,
  initCrossNodeInvalidation,
  stopCrossNodeInvalidation,
} from 'graphile-cache';
import { getPgPool, pgCache } from 'pg-cache';
import requestIp from 'request-ip';

import { createApiMiddleware } from './middleware/api';
import { createAuthenticateMiddleware } from './middleware/auth';
import { cors } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { flush, flushService } from './middleware/flush';
import { graphile } from './middleware/graphile';
import { metricsRouter, requestMetricsMiddleware, initMetricsEventListeners } from './middleware/metrics';
import { structuredLogger } from './middleware/structured-logger';
import { GraphqlServerOptions, normalizeServerOptions, ConstructiveOptions } from './options';

const log = new Logger('server');
const isDev = () => getNodeEnv() === 'development';

/**
 * Creates and starts the GraphQL server.
 *
 * Accepts either GraphqlServerOptions or ConstructiveOptions (legacy) for backward compatibility.
 * Options are normalized and merged with defaults before server creation.
 *
 * @param rawOpts - Server configuration options
 * @returns The Server instance
 */
export const GraphQLServer = (rawOpts: GraphqlServerOptions | ConstructiveOptions | PgpmOptions = {}) => {
  // Normalize to GraphqlServerOptions for type consistency
  const serverOpts = normalizeServerOptions(rawOpts as GraphqlServerOptions | ConstructiveOptions);
  // Apply environment overrides
  const envOptions = getEnvOptions(serverOpts as PgpmOptions);
  const app = new Server(envOptions);
  app.addEventListener();
  app.listen();
  return app;
};

class Server {
  private app: Express;
  private opts: PgpmOptions;
  private listenClient: PoolClient | null = null;
  private listenRelease: (() => void) | null = null;
  private shuttingDown = false;
  private closed = false;
  private httpServer: HttpServer | null = null;
  private cacheInvalidationInitialized = false;

  constructor(opts: PgpmOptions) {
    this.opts = getEnvOptions(opts);
    const effectiveOpts = this.opts;

    const app = express();
    const api = createApiMiddleware(effectiveOpts);
    const authenticate = createAuthenticateMiddleware(effectiveOpts);

    // Log startup configuration (non-sensitive values only)
    const apiOpts = (effectiveOpts as any).api || {};
    log.info('[server] Starting with config:', {
      database: effectiveOpts.pg?.database,
      host: effectiveOpts.pg?.host,
      port: effectiveOpts.pg?.port,
      serverHost: effectiveOpts.server?.host,
      serverPort: effectiveOpts.server?.port,
      apiIsPublic: apiOpts.isPublic,
      enableServicesApi: apiOpts.enableServicesApi,
      metaSchemas: apiOpts.metaSchemas?.join(',') || 'default',
      exposedSchemas: apiOpts.exposedSchemas?.join(',') || 'none',
      anonRole: apiOpts.anonRole,
      roleName: apiOpts.roleName
    });

    healthz(app);
    app.use(metricsRouter()); // Prometheus metrics endpoint at /metrics
    trustProxy(app, effectiveOpts.server.trustProxy);
    // Warn if a global CORS override is set in production
    const fallbackOrigin = effectiveOpts.server?.origin?.trim();
    if (fallbackOrigin && process.env.NODE_ENV === 'production') {
      if (fallbackOrigin === '*') {
        log.warn(
          'CORS wildcard ("*") is enabled in production; this effectively disables CORS and is not recommended. Prefer per-API CORS via meta schema.'
        );
      } else {
        log.warn(
          `CORS override origin set to ${fallbackOrigin} in production. Prefer per-API CORS via meta schema.`
        );
      }
    }

    app.use(poweredBy('constructive'));
    app.use(cors(fallbackOrigin));
    app.use(requestMetricsMiddleware()); // Request metrics tracking
    app.use(express.json()); // Parse JSON body for GraphQL operation extraction
    app.use(graphqlUpload.graphqlUploadExpress());
    app.use(parseDomains() as RequestHandler);
    app.use(requestIp.mw());
    app.use(structuredLogger()); // Structured JSON logging middleware
    app.use(api);
    app.use(authenticate);
    app.use(graphile(effectiveOpts));
    app.use(flush);

    // Error handling middleware - must be LAST in the chain
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Initialize metrics event listeners for cache eviction tracking
    initMetricsEventListeners();

    this.app = app;
  }

  listen(): HttpServer {
    const { server } = this.opts;
    const httpServer = this.app.listen(server?.port, server?.host, () =>
      log.info(`listening at http://${server?.host}:${server?.port}`)
    );

    httpServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        this.error(`Port ${server?.port ?? 'unknown'} is already in use`, err);
      } else {
        this.error('Server failed to start', err);
      }
      throw err;
    });

    this.httpServer = httpServer;
    return httpServer;
  }

  async flush(databaseId: string): Promise<void> {
    await flushService(this.opts, databaseId);
  }

  getPool(): Pool {
    return getPgPool(this.opts.pg);
  }

  addEventListener(): void {
    if (this.shuttingDown) return;
    const pgPool = this.getPool();
    pgPool.connect(this.listenForChanges.bind(this));

    // Initialize cross-node cache invalidation (if not already done)
    if (!this.cacheInvalidationInitialized) {
      this.cacheInvalidationInitialized = true;
      initCrossNodeInvalidation(pgPool).catch((err) => {
        this.error('Failed to initialize cross-node cache invalidation', err);
      });
    }
  }

  listenForChanges(
    err: Error | null,
    client: PoolClient,
    release: () => void
  ): void {
    if (err) {
      this.error('Error connecting with notify listener', err);
      if (!this.shuttingDown) {
        setTimeout(() => this.addEventListener(), 5000);
      }
      return;
    }

    if (this.shuttingDown) {
      release();
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
      if (this.shuttingDown) {
        release();
        return;
      }
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

  async close(opts: { closeCaches?: boolean } = {}): Promise<void> {
    const { closeCaches = false } = opts;
    if (this.closed) {
      if (closeCaches) {
        await Server.closeCaches({ closePools: true });
      }
      return;
    }
    this.closed = true;
    this.shuttingDown = true;
    await this.removeEventListener();
    if (this.httpServer?.listening) {
      await new Promise<void>((resolve) =>
        this.httpServer!.close(() => resolve())
      );
    }
    if (closeCaches) {
      await Server.closeCaches({ closePools: true });
    }
  }

  static async closeCaches(
    opts: { closePools?: boolean } = {}
  ): Promise<void> {
    const { closePools = false } = opts;
    // Stop cross-node cache invalidation first
    await stopCrossNodeInvalidation();
    svcCache.clear();
    graphileCache.clear();
    if (closePools) {
      await pgCache.close();
    }
  }

  log(text: string): void {
    log.info(text);
  }

  error(text: string, err?: unknown): void {
    log.error(text, err);
  }
}

export { Server };
