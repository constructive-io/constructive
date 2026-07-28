import { createCsrfMiddleware } from '@constructive-io/csrf';
import { getEnvOptions } from '@constructive-io/graphql-env';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import {
  createServiceCache,
  healthz,
  poweredBy,
  svcCache,
  trustProxy,
  type ServiceCache,
} from '@pgpmjs/server-utils';
import { PgpmOptions } from '@pgpmjs/types';
import { middleware as parseDomains } from '@constructive-io/url-domains';
import cookieParser from 'cookie-parser';
import express, {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import type { Server as HttpServer } from 'http';
import graphqlUpload from 'graphql-upload';
import { Pool, PoolClient } from 'pg';
import {
  graphileCache,
  closeAllCaches,
  GraphileCacheManager,
  type GraphileCacheEntry,
} from 'graphile-cache';
import { getPgPool, PgPoolCacheManager } from 'pg-cache';
import requestIp from 'request-ip';

import type { DebugSamplerHandle } from './diagnostics/debug-sampler';
import {
  closeDebugDatabasePools,
  createDebugDatabasePoolScope,
  type DiagnosticsPoolScope,
} from './diagnostics/debug-db-snapshot';
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
import { createFnRouter } from './middleware/fn';
import { createFlushMiddleware, flushService } from './middleware/flush';
import { graphile } from './middleware/graphile';
import { multipartBridge } from './middleware/multipart-bridge';
import { createDebugDatabaseMiddleware } from './middleware/observability/debug-db';
import { createDebugMemoryMiddleware } from './middleware/observability/debug-memory';
import { localObservabilityOnly } from './middleware/observability/guard';
import { createRequestLogger } from './middleware/observability/request-logger';
// Auth cookie handling is done via AuthCookiePlugin in grafserv
import { createCaptchaMiddleware } from './middleware/captcha';
import { parseCookieValue, SESSION_COOKIE_NAME } from './middleware/cookie';
import { createAgenticRouter } from './agentic';
import {
  createContextMiddleware,
  createDefaultRegistry,
  requestIdMiddleware,
  type LoaderRegistry,
} from '@constructive-io/express-context';
import { startDebugSampler } from './diagnostics/debug-sampler';
import {
  getServerEnvironment,
  withServerEnvironment,
} from './runtime-environment';
import { GraphileBuildStatsManager } from './middleware/observability/graphile-build-stats';
import { getRoutingSchema } from './middleware/routing';

const log = new Logger('server');

const abortReason = (signal: AbortSignal): unknown =>
  signal.reason ??
  new DOMException('The operation was cancelled.', 'AbortError');

const closeHttpServer = async (server: HttpServer): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (
        error &&
        (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING'
      ) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const createRuntimeScopeMiddleware =
  (
    environment: Readonly<Record<string, string | undefined>>,
    cwd?: string
  ): RequestHandler =>
  (_req, res, next) => {
    void withServerEnvironment(
      environment,
      () =>
        new Promise<void>((resolve, reject) => {
          let settled = false;
          const cleanup = () => {
            res.off('finish', handleComplete);
            res.off('close', handleComplete);
          };
          const handleComplete = () => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve();
          };

          res.once('finish', handleComplete);
          res.once('close', handleComplete);
          try {
            next();
          } catch (error) {
            settled = true;
            cleanup();
            reject(error);
          }
        }),
      { cwd }
    ).catch((error) => {
      if (!res.headersSent) {
        next(error);
        return;
      }
      log.error('Failed to dispose request-scoped Graphile resources', error);
    });
  };

export interface GraphQLServerRuntimeOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

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
export const GraphQLServer = (
  rawOpts: ConstructiveOptions | PgpmOptions = {}
): Server => {
  const app = new Server(rawOpts);
  void app.start().catch((error) => app.error('Server failed to start', error));
  return app;
};

class Server {
  private app: Express;
  private opts: ConstructiveOptions;
  private listenClient: PoolClient | null = null;
  private listenRelease: (() => void) | null = null;
  private shuttingDown = false;
  private closed = false;
  private closePromise: Promise<void> | null = null;
  private httpServer: HttpServer | null = null;
  private debugSampler: DebugSamplerHandle | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly failure: Promise<Error>;
  private resolveFailure!: (error: Error) => void;
  private readonly runtimeEnvironment: Readonly<
    Record<string, string | undefined>
  >;
  private readonly pgPoolCache: PgPoolCacheManager;
  private readonly graphileInstanceCache: GraphileCacheManager;
  private readonly serviceCache: ServiceCache;
  private readonly inFlight = new Map<string, Promise<GraphileCacheEntry>>();
  private readonly loaderRegistry: LoaderRegistry;
  private readonly diagnosticsPools: DiagnosticsPoolScope;
  private readonly graphileBuildStats = new GraphileBuildStatsManager();

  constructor(
    opts: ConstructiveOptions | PgpmOptions,
    runtime: GraphQLServerRuntimeOptions = {}
  ) {
    this.runtimeEnvironment = Object.freeze({
      ...(runtime.env ?? getServerEnvironment()),
    });
    this.pgPoolCache = new PgPoolCacheManager(
      undefined,
      this.runtimeEnvironment
    );
    this.graphileInstanceCache = new GraphileCacheManager({
      pgCache: this.pgPoolCache,
      environment: this.runtimeEnvironment,
    });
    this.serviceCache = createServiceCache();
    this.loaderRegistry = createDefaultRegistry();
    this.diagnosticsPools = createDebugDatabasePoolScope();
    this.opts = getEnvOptions(opts, runtime.cwd, {
      ...this.runtimeEnvironment,
    });
    this.failure = new Promise<Error>((resolve) => {
      this.resolveFailure = resolve;
    });
    const effectiveOpts = this.opts;
    const observabilityRequested = isGraphqlObservabilityRequested(
      this.runtimeEnvironment
    );
    const observabilityEnabled = isGraphqlObservabilityEnabled(
      effectiveOpts.server?.host,
      this.runtimeEnvironment
    );

    const cacheRuntime = {
      graphileCache: this.graphileInstanceCache,
      serviceCache: this.serviceCache,
      pgCache: this.pgPoolCache,
      inFlight: this.inFlight,
      environment: this.runtimeEnvironment,
      graphileBuildStats: this.graphileBuildStats,
    };

    const app = express();
    app.use(createRuntimeScopeMiddleware(this.runtimeEnvironment, runtime.cwd));
    const api = createApiMiddleware(effectiveOpts, {
      serviceCache: this.serviceCache,
      pgCache: this.pgPoolCache,
      loaders: this.loaderRegistry,
      environment: this.runtimeEnvironment,
    });
    const authenticate = createAuthenticateMiddleware(effectiveOpts, {
      pgCache: this.pgPoolCache,
      environment: this.runtimeEnvironment,
    });
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
      if (!isDevelopmentObservabilityMode(this.runtimeEnvironment)) {
        reasons.push('NODE_ENV must be development');
      }
      if (!isLoopbackHost(effectiveOpts.server?.host)) {
        reasons.push('server host must be localhost, 127.0.0.1, or ::1');
      }

      log.warn(
        `GRAPHQL_OBSERVABILITY_ENABLED was requested but observability remains disabled${
          reasons.length > 0 ? `: ${reasons.join('; ')}` : ''
        }`
      );
    }

    healthz(app);
    if (observabilityEnabled) {
      app.get(
        '/debug/memory',
        localObservabilityOnly,
        createDebugMemoryMiddleware(cacheRuntime)
      );
      app.get(
        '/debug/db',
        localObservabilityOnly,
        createDebugDatabaseMiddleware(effectiveOpts, {
          pgCache: this.pgPoolCache,
          environment: this.runtimeEnvironment,
          diagnosticsPools: this.diagnosticsPools,
        })
      );
    } else {
      app.use('/debug', (_req, res) => {
        res.status(404).send('Not found');
      });
    }
    app.use(favicon);
    trustProxy(app, effectiveOpts.server.trustProxy);
    // Warn if a global CORS override is set in production
    const fallbackOrigin = effectiveOpts.server?.origin?.trim();
    if (fallbackOrigin && this.runtimeEnvironment.NODE_ENV === 'production') {
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
    app.use(cookieParser());
    app.use(cors(fallbackOrigin));
    app.use(
      '/graphql',
      graphqlUpload.graphqlUploadExpress({
        maxFileSize: 10 * 1024 * 1024, // 10 MB
        maxFiles: 10,
      })
    );

    // Rewrite Content-Type after graphql-upload so grafserv accepts the request
    app.use('/graphql', multipartBridge);
    app.use(parseDomains() as RequestHandler);
    app.use(requestIp.mw());
    app.use(requestIdMiddleware());
    app.use(requestLogger);
    app.use(api);
    app.use(authenticate);
    app.use(
      createContextMiddleware({
        pg: effectiveOpts.pg,
        loaders: this.loaderRegistry,
        pgCache: this.pgPoolCache,
        environment: this.runtimeEnvironment,
        routingSchema: getRoutingSchema(effectiveOpts),
      })
    );
    app.use(createCaptchaMiddleware(this.runtimeEnvironment));

    // CSRF protection for cookie-authenticated requests
    // Skip CSRF for Bearer token auth (not vulnerable to CSRF) and anonymous requests
    const csrf = createCsrfMiddleware({
      cookieOptions: {
        httpOnly: false, // SPA clients need to read this via document.cookie
        secure: this.runtimeEnvironment.NODE_ENV === 'production',
        sameSite: 'lax',
      },
    });
    const csrfProtect: RequestHandler = (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      // Skip CSRF for Bearer token auth
      const auth = req.headers.authorization;
      if (auth?.toLowerCase().startsWith('bearer ')) {
        return next();
      }
      // Skip if no session cookie (anonymous requests)
      const sessionCookie = parseCookieValue(req, SESSION_COOKIE_NAME);
      if (!sessionCookie) {
        return next();
      }
      // Apply CSRF protection for cookie-authenticated requests
      csrf.protect(req as any, res as any, next);
    };
    const csrfSetToken: RequestHandler = (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      csrf.setToken(req as any, res as any, next);
    };
    app.use(csrfSetToken); // Set CSRF token cookie on all requests
    app.use('/graphql', csrfProtect); // Enforce CSRF on GraphQL mutations

    // LLM Agent REST API — mounted before graphile so SSE streaming
    // routes are handled without going through PostGraphile
    app.use(createAgenticRouter());

    // REST function invocation routes (POST /fn/:alias, GET /fn/invocations/:id)
    app.use(createFnRouter());

    app.use(
      graphile(effectiveOpts, {
        cache: this.graphileInstanceCache,
        pgCache: this.pgPoolCache,
        inFlight: this.inFlight,
        environment: this.runtimeEnvironment,
        buildStats: this.graphileBuildStats,
      })
    );
    app.use(
      createFlushMiddleware({
        graphileCache: this.graphileInstanceCache,
        serviceCache: this.serviceCache,
        loaders: this.loaderRegistry,
      })
    );

    // Error handling - MUST be LAST
    app.use(notFoundHandler); // Catches unmatched routes (404)
    app.use(errorHandler); // Catches all thrown errors

    this.app = app;
    this.debugSampler = observabilityEnabled
      ? startDebugSampler(effectiveOpts, {
          ...cacheRuntime,
          diagnosticsPools: this.diagnosticsPools,
        })
      : null;
  }

  listen(): HttpServer {
    if (this.httpServer) return this.httpServer;

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
      this.resolveFailure(err);
    });

    this.httpServer = httpServer;
    return httpServer;
  }

  /** Start the server and resolve only after the HTTP listener is ready. */
  async start(signal?: AbortSignal): Promise<HttpServer> {
    if (this.closed)
      throw new Error('The GraphQL server has already been closed.');
    if (this.httpServer?.listening) return this.httpServer;
    if (signal?.aborted) throw abortReason(signal);

    this.addEventListener();
    const httpServer = this.listen();
    if (httpServer.listening) return httpServer;

    try {
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          httpServer.off('listening', handleListening);
          httpServer.off('error', handleError);
          signal?.removeEventListener('abort', handleAbort);
        };
        const handleListening = () => {
          cleanup();
          resolve();
        };
        const handleError = (error: Error) => {
          cleanup();
          reject(error);
        };
        const handleAbort = () => {
          cleanup();
          reject(abortReason(signal!));
        };
        httpServer.once('listening', handleListening);
        httpServer.once('error', handleError);
        signal?.addEventListener('abort', handleAbort, { once: true });
      });
      return httpServer;
    } catch (error) {
      try {
        await this.close();
      } catch (cleanupError) {
        this.error(
          'Failed to clean up after server startup failure',
          cleanupError
        );
      }
      throw error;
    }
  }

  async waitForFailure(): Promise<never> {
    throw await this.failure;
  }

  async flush(databaseId: string): Promise<void> {
    await flushService(this.opts, databaseId, {
      graphileCache: this.graphileInstanceCache,
      serviceCache: this.serviceCache,
      pgCache: this.pgPoolCache,
      environment: this.runtimeEnvironment,
      loaders: this.loaderRegistry,
    });
  }

  getPool(): Pool {
    return getPgPool(this.opts.pg, {
      cache: this.pgPoolCache,
      environment: this.runtimeEnvironment,
    });
  }

  addEventListener(): void {
    if (this.shuttingDown) return;
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
      this.scheduleReconnect();
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
        void this.flush(payload).catch((error) =>
          this.error('Failed to flush the GraphQL service cache', error)
        );
      }
    });

    void client.query('LISTEN "schema:update"').catch((error) => {
      if (this.listenClient !== client) return;
      this.listenClient = null;
      this.listenRelease = null;
      client.removeAllListeners('notification');
      client.removeAllListeners('error');
      release();
      this.error(
        'Failed to initialize the schema notification listener',
        error
      );
      this.scheduleReconnect();
    });

    client.on('error', (e) => {
      if (this.shuttingDown) {
        release();
        return;
      }
      this.error('Error with database notify listener', e);
      if (this.listenClient === client) {
        this.listenClient = null;
        this.listenRelease = null;
      }
      release();
      this.scheduleReconnect();
    });

    this.log('connected and listening for changes...');
  }

  private scheduleReconnect(): void {
    if (this.shuttingDown || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.addEventListener();
    }, 5000);
    this.reconnectTimer.unref?.();
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

  async close(_opts: { closeCaches?: boolean } = {}): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.closed = true;
    this.shuttingDown = true;
    this.closePromise = (async () => {
      const failures: unknown[] = [];
      const attempt = async (cleanup: () => void | Promise<void>) => {
        try {
          await cleanup();
        } catch (error) {
          failures.push(error);
        }
      };

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      if (this.httpServer) {
        await attempt(() => closeHttpServer(this.httpServer!));
      }
      await attempt(() => this.removeEventListener());
      if (this.debugSampler) {
        const sampler = this.debugSampler;
        this.debugSampler = null;
        await attempt(() => sampler.stop());
      }
      await Promise.allSettled([...this.inFlight.values()]);
      await attempt(() => closeDebugDatabasePools(this.diagnosticsPools));
      await attempt(() => this.graphileInstanceCache.close());
      await attempt(() => this.serviceCache.clear());
      await attempt(() => this.loaderRegistry.invalidate());
      this.inFlight.clear();
      await attempt(() => this.pgPoolCache.close());

      if (failures.length === 1) throw failures[0];
      if (failures.length > 1) {
        throw new AggregateError(
          failures,
          'Multiple GraphQL server resources failed to close.'
        );
      }
    })();
    return this.closePromise;
  }

  static async closeCaches(opts: { closePools?: boolean } = {}): Promise<void> {
    const { closePools = false } = opts;
    svcCache.clear();
    // Use closeAllCaches to properly await async disposal of PostGraphile instances
    // before closing pg pools - this ensures all connections are released
    if (closePools) {
      await closeAllCaches();
    } else {
      await graphileCache.close();
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
