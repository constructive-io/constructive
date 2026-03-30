import { getEnvOptions } from '@constructive-io/graphql-env';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import { healthz, poweredBy, svcCache, trustProxy } from '@pgpmjs/server-utils';
import { PgpmOptions } from '@pgpmjs/types';
import { middleware as parseDomains } from '@constructive-io/url-domains';
import express, { Express, RequestHandler } from 'express';
import type { Server as HttpServer } from 'http';
import graphqlUpload from 'graphql-upload';
import { Pool, PoolClient } from 'pg';
import { graphileCache, closeAllCaches } from 'graphile-cache';
import { getPgPool } from 'pg-cache';
import requestIp from 'request-ip';

import type { DebugSamplerHandle } from './diagnostics/debug-sampler';
import { closeDebugDatabasePools } from './diagnostics/debug-db-snapshot';
import {
  isDevelopmentObservabilityMode,
  isGraphqlObservabilityEnabled,
  isGraphqlObservabilityRequested,
  isLoopbackHost,
} from './diagnostics/observability';
import { createApiMiddleware } from './middleware/api';
import { createAuthenticateMiddleware } from './middleware/auth';
import { cors } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { favicon } from './middleware/favicon';
import { flush, flushService } from './middleware/flush';
import { graphile } from './middleware/graphile';
import { multipartBridge } from './middleware/multipart-bridge';
import { createDebugDatabaseMiddleware } from './middleware/observability/debug-db';
import { debugMemory } from './middleware/observability/debug-memory';
import { localObservabilityOnly } from './middleware/observability/guard';
import { createRequestLogger } from './middleware/observability/request-logger';
import { createUploadAuthenticateMiddleware, uploadRoute } from './middleware/upload';
import { startDebugSampler } from './diagnostics/debug-sampler';

const log = new Logger('server');

/**
 * Creates and starts a GraphQL server instance
 *
 * Accepts ConstructiveOptions or PgpmOptions.
 * Options are normalized using normalizeServerOptions to apply defaults.
 *
 * @param rawOpts - Server configuration options
 * @returns void (server runs until shutdown)
 *
 * @example
 * ```typescript
 * // Using ConstructiveOptions (recommended)
 * GraphQLServer({
 *   pg: { database: 'myapp' },
 *   server: { port: 4000 }
 * });
 *
 * // Using PgpmOptions
 * GraphQLServer(pgpmOptions);
 * ```
 */
export const GraphQLServer = (rawOpts: ConstructiveOptions | PgpmOptions = {}) => {
  const opts = getEnvOptions(rawOpts);
  const app = new Server(opts);
  app.addEventListener();
  app.listen();
};

class Server {
  private app: Express;
  private opts: ConstructiveOptions;
  private listenClient: PoolClient | null = null;
  private listenRelease: (() => void) | null = null;
  private shuttingDown = false;
  private closed = false;
  private httpServer: HttpServer | null = null;
  private debugSampler: DebugSamplerHandle | null = null;

  constructor(opts: ConstructiveOptions) {
    this.opts = getEnvOptions(opts);
    const effectiveOpts = this.opts;
    const observabilityRequested = isGraphqlObservabilityRequested();
    const observabilityEnabled = isGraphqlObservabilityEnabled(effectiveOpts.server?.host);

    const app = express();
    const api = createApiMiddleware(effectiveOpts);
    const authenticate = createAuthenticateMiddleware(effectiveOpts);
    const uploadAuthenticate = createUploadAuthenticateMiddleware(effectiveOpts);
    const requestLogger = createRequestLogger({ observabilityEnabled });

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
      roleName: apiOpts.roleName,
      observabilityEnabled,
    });

    if (observabilityRequested && !observabilityEnabled) {
      const reasons = [];
      if (!isDevelopmentObservabilityMode()) {
        reasons.push('NODE_ENV must be development');
      }
      if (!isLoopbackHost(effectiveOpts.server?.host)) {
        reasons.push('server host must be localhost, 127.0.0.1, or ::1');
      }

      log.warn(
        `GRAPHQL_OBSERVABILITY_ENABLED was requested but observability remains disabled${
          reasons.length > 0 ? `: ${reasons.join('; ')}` : ''
        }`,
      );
    }

    healthz(app);
    if (observabilityEnabled) {
      app.get('/debug/memory', localObservabilityOnly, debugMemory);
      app.get('/debug/db', localObservabilityOnly, createDebugDatabaseMiddleware(effectiveOpts));
    } else {
      app.use('/debug', (_req, res) => {
        res.status(404).send('Not found');
      });
    }
    app.use(favicon);
    trustProxy(app, effectiveOpts.server.trustProxy);
    // Warn if a global CORS override is set in production
    const fallbackOrigin = effectiveOpts.server?.origin?.trim();
    if (fallbackOrigin && process.env.NODE_ENV === 'production') {
      if (fallbackOrigin === '*') {
        log.warn(
          'CORS wildcard ("*") is enabled in production; this effectively disables CORS and is not recommended. Prefer per-API CORS via meta schema.',
        );
      } else {
        log.warn(`CORS override origin set to ${fallbackOrigin} in production. Prefer per-API CORS via meta schema.`);
      }
    }

    app.use(poweredBy('constructive'));
    app.use(cors(fallbackOrigin));
    app.use('/graphql', graphqlUpload.graphqlUploadExpress({
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 10,
    }));

    // Rewrite Content-Type after graphql-upload so grafserv accepts the request
    app.use('/graphql', multipartBridge);
    app.use(parseDomains() as RequestHandler);
    app.use(requestIp.mw());
    app.use(requestLogger);
    app.use(api);
    app.post('/upload', uploadAuthenticate, ...uploadRoute);
    app.use(authenticate);
    app.use(graphile(effectiveOpts));
    app.use(flush);

    // Error handling - MUST be LAST
    app.use(notFoundHandler); // Catches unmatched routes (404)
    app.use(errorHandler); // Catches all thrown errors

    this.app = app;
    this.debugSampler = observabilityEnabled ? startDebugSampler(effectiveOpts) : null;
  }

  listen(): HttpServer {
    const { server } = this.opts;
    const httpServer = this.app.listen(server?.port, server?.host, () =>
      log.info(`listening at http://${server?.host}:${server?.port}`),
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
  }

  listenForChanges(err: Error | null, client: PoolClient, release: () => void): void {
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
    if (this.debugSampler) {
      await this.debugSampler.stop();
      this.debugSampler = null;
    }
    if (this.httpServer?.listening) {
      await new Promise<void>((resolve) => this.httpServer!.close(() => resolve()));
    }
    await closeDebugDatabasePools();
    if (closeCaches) {
      await Server.closeCaches({ closePools: true });
    }
  }

  static async closeCaches(opts: { closePools?: boolean } = {}): Promise<void> {
    const { closePools = false } = opts;
    svcCache.clear();
    // Use closeAllCaches to properly await async disposal of PostGraphile instances
    // before closing pg pools - this ensures all connections are released
    if (closePools) {
      await closeAllCaches();
    } else {
      graphileCache.clear();
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
