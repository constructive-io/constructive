import { createCsrfMiddleware } from '@constructive-io/csrf';
import {
  createContextMiddleware,
  createDefaultRegistry,
  type LoaderRegistry,
  requestIdMiddleware
} from '@constructive-io/express-context';
import { getEnvOptions } from '@constructive-io/graphql-env';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { middleware as parseDomains } from '@constructive-io/url-domains';
import { getNodeEnv } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import {
  configureSvcCache,
  healthz,
  poweredBy,
  trustProxy
} from '@pgpmjs/server-utils';
import { PgpmOptions } from '@pgpmjs/types';
import cookieParser from 'cookie-parser';
import express, { Express, NextFunction, Request, RequestHandler, Response } from 'express';
import {
  clearGraphileCache,
  closeAllCaches,
  getCacheConfig,
  startMemoryGovernor
} from 'graphile-cache';
import graphqlUpload from 'graphql-upload';
import type { Server as HttpServer } from 'http';
import { type Notification, Pool, type PoolClient } from 'pg';
import {
  acquirePgPool,
  getPgPool,
  PgPoolCapacityError,
  type PgPoolLease
} from 'pg-cache';
import requestIp from 'request-ip';

import { createAgenticRouter } from './agentic';
import { closeDebugDatabasePools } from './diagnostics/debug-db-snapshot';
import type { DebugSamplerHandle } from './diagnostics/debug-sampler';
import { startDebugSampler } from './diagnostics/debug-sampler';
import {
  getGraphqlObservabilityToken,
  isDevelopmentObservabilityMode,
  isGraphqlObservabilityEnabled,
  isGraphqlObservabilityRequested,
  isLoopbackHost
} from './diagnostics/observability';
import { clearSvcCache, createApiMiddleware } from './middleware/api';
import { createAuthenticateMiddleware } from './middleware/auth';
// Auth cookie handling is done via AuthCookiePlugin in grafserv
import {
  createCaptchaGraphqlBodyParsers,
  createCaptchaMiddleware
} from './middleware/captcha';
import { parseCookieValue, SESSION_COOKIE_NAME } from './middleware/cookie';
import { cors } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { favicon } from './middleware/favicon';
import { createFlushMiddleware, flushService } from './middleware/flush';
import { createFnRouter } from './middleware/fn';
import { graphile } from './middleware/graphile';
import {
  closeGraphileBuildCoordinator,
  getGraphileGovernorCounters,
  GRAPHILE_BUILD_STUCK_RESTART_REQUIRED_CODE,
  reopenGraphileBuildCoordinator
} from './middleware/graphile-build-governor';
import { assertInternalRequestSecret } from './middleware/internal-request';
import { multipartBridge } from './middleware/multipart-bridge';
import { createDebugDatabaseMiddleware } from './middleware/observability/debug-db';
import { debugMemory } from './middleware/observability/debug-memory';
import { localObservabilityOnly } from './middleware/observability/guard';
import { createRequestLogger } from './middleware/observability/request-logger';
import {
  addRealtimeRuntimeDependencySchema,
  resolveGraphileRealtimeSchema
} from './middleware/realtime-config';
import { getRoutingSchema } from './middleware/routing';
import { createRuntimePgResolutionStore } from './middleware/runtime-pg-config';
import {
  assertRuntimePgCredentials,
  shouldValidateRuntimeRoleSafety
} from './middleware/runtime-pg-requirements';
import { ensureRuntimeRoleSafety } from './middleware/runtime-role-safety';
import {
  createGraphileWebSocketOriginGuard,
  createGraphileWebSocketUpgradeGateway,
  type GraphileWebSocketUpgradeGateway
} from './websocket-upgrade';

const log = new Logger('server');

export const GRAPHILE_CACHE_SHUTDOWN_DRAIN_TIMEOUT_CODE =
  'GRAPHILE_CACHE_SHUTDOWN_DRAIN_TIMEOUT';
export const GRAPHILE_CACHE_SHUTDOWN_RESTART_REQUIRED_CODE =
  'GRAPHILE_CACHE_SHUTDOWN_RESTART_REQUIRED';

export class GraphileCacheShutdownError extends Error {
  constructor(
    readonly code:
      | typeof GRAPHILE_CACHE_SHUTDOWN_DRAIN_TIMEOUT_CODE
      | typeof GRAPHILE_CACHE_SHUTDOWN_RESTART_REQUIRED_CODE,
    message: string
  ) {
    super(message);
    this.name = 'GraphileCacheShutdownError';
  }
}

// A process-wide cache clear owns the process-wide build coordinator. Coalesce
// concurrent callers so no invocation can reopen admission while another is
// still disposing residents or closing their pools.
let processCacheClose: Promise<void> | null = null;
let processCacheClosePoolsRequested = false;

const once = <Args extends unknown[]>(
  callback: (...args: Args) => void
): ((...args: Args) => void) => {
  let called = false;
  return (...args: Args) => {
    if (called) return;
    called = true;
    callback(...args);
  };
};

interface ListenAttempt {
  releasePoolLease: () => void;
  client: PoolClient | null;
  releaseClient: ((error?: Error | boolean) => void) | null;
  notificationHandler: ((message: Notification) => void) | null;
  errorHandler: ((error: Error) => void) | null;
  closed: boolean;
  cleanupPromise: Promise<void> | null;
}

const PROCESS_SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'] as const;

/** @internal Process seam used by the executable shutdown boundary and its tests. */
export interface ProcessShutdownTarget {
  on(signal: NodeJS.Signals, listener: () => void): unknown;
  removeListener(signal: NodeJS.Signals, listener: () => void): unknown;
  exit(code?: number): void;
}

export interface ProcessShutdownOptions {
  timeoutMs?: number;
  processTarget?: ProcessShutdownTarget;
}

/**
 * Install process-level shutdown ownership at the executable boundary.
 * A second signal forces exit, while the first gets a bounded graceful drain.
 */
export const installProcessShutdownHandlers = (
  shutdown: () => Promise<void>,
  options: ProcessShutdownOptions = {}
): (() => void) => {
  const { timeoutMs = 30_000, processTarget = process } = options;
  let started = false;
  let finished = false;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Map<NodeJS.Signals, () => void>();

  const uninstall = (): void => {
    for (const [signal, listener] of listeners) {
      processTarget.removeListener(signal, listener);
    }
    listeners.clear();
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  const finish = (exitCode: number): void => {
    if (finished) return;
    finished = true;
    uninstall();
    processTarget.exit(exitCode);
  };

  const beginShutdown = (signal: NodeJS.Signals): void => {
    if (started) {
      log.warn(`Received ${signal} while shutdown is in progress; forcing exit`);
      finish(1);
      return;
    }
    started = true;
    log.info(`Received ${signal}; draining GraphQL server resources`);
    timeout = setTimeout(() => {
      log.error(`GraphQL server shutdown exceeded ${timeoutMs}ms; forcing exit`);
      finish(1);
    }, Math.max(1, timeoutMs));
    timeout.unref?.();

    let shutdownPromise: Promise<void>;
    try {
      shutdownPromise = shutdown();
    } catch (error) {
      shutdownPromise = Promise.reject(error);
    }
    void shutdownPromise.then(
      () => finish(0),
      (error) => {
        log.error('GraphQL server shutdown failed', error);
        finish(1);
      }
    );
  };

  for (const signal of PROCESS_SHUTDOWN_SIGNALS) {
    const listener = (): void => beginShutdown(signal);
    listeners.set(signal, listener);
    processTarget.on(signal, listener);
  }
  return uninstall;
};

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
  installProcessShutdownHandlers(() => app.close({ closeCaches: true }));
};

class Server {
  private app: Express;
  private opts: ConstructiveOptions;
  private listenAttempt: ListenAttempt | null = null;
  private listenRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly listenCleanupTasks = new Set<Promise<void>>();
  private shuttingDown = false;
  private closed = false;
  private httpServer: HttpServer | null = null;
  private debugSampler: DebugSamplerHandle | null = null;
  private stopMemoryGovernor: (() => void) | null = null;
  private websocketUpgradeGateway: GraphileWebSocketUpgradeGateway | null = null;
  private readonly moduleRegistry: LoaderRegistry;

  constructor(opts: ConstructiveOptions) {
    if (!reopenGraphileBuildCoordinator()) {
      log.warn(
        'GraphQL schema build admission remains closed because a previous generation is still draining'
      );
    }
    this.opts = getEnvOptions(opts);
    this.moduleRegistry = createDefaultRegistry();
    const effectiveOpts = this.opts;
    assertInternalRequestSecret(effectiveOpts);
    const residentGraphileCapacity = getCacheConfig().max;
    const routingCache = configureSvcCache({
      maxEntries: effectiveOpts.routingCache?.maxEntries,
      minimumEntries: residentGraphileCapacity
    });
    assertRuntimePgCredentials(effectiveOpts, getNodeEnv());
    const validateRuntimeRole = shouldValidateRuntimeRoleSafety(
      effectiveOpts,
      getNodeEnv()
    );
    const observabilityRequested = isGraphqlObservabilityRequested();
    const observabilityEnabled = isGraphqlObservabilityEnabled(effectiveOpts.server?.host);
    const runtimePgResolutions = createRuntimePgResolutionStore(effectiveOpts);

    const app = express();
    this.stopMemoryGovernor = startMemoryGovernor();
    const api = createApiMiddleware(effectiveOpts, this.moduleRegistry);
    const authenticate = createAuthenticateMiddleware(effectiveOpts);
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
      routingSchema: apiOpts.routingSchema,
      metaSchemas: apiOpts.metaSchemas?.join(',') || 'default',
      routingCacheMaxEntries: routingCache.max,
      residentGraphileCapacity,
      observabilityEnabled
    });

    if (observabilityRequested && !observabilityEnabled) {
      const reasons = [];
      if (
        !isDevelopmentObservabilityMode()
        && !getGraphqlObservabilityToken()
      ) {
        reasons.push(
          'NODE_ENV must be development or GRAPHQL_OBSERVABILITY_TOKEN must contain at least 32 bytes'
        );
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

    // Keep the generic health endpoint reusable, but fail this server's probe
    // once the build watchdog has latched. Orchestrators can then replace the
    // process; admitting a second build in-process would overlap an unknown
    // amount of retained work from the stuck generation.
    app.get('/healthz', (_req, res, next) => {
      const governor = getGraphileGovernorCounters();
      if (!governor.restartRequired) {
        next();
        return;
      }
      res.status(503).json({
        status: 'unhealthy',
        code: GRAPHILE_BUILD_STUCK_RESTART_REQUIRED_CODE
      });
    });
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
          'CORS wildcard ("*") is enabled in production; this effectively disables CORS and is not recommended. Prefer per-API CORS via meta schema.'
        );
      } else {
        log.warn(`CORS override origin set to ${fallbackOrigin} in production. Prefer per-API CORS via meta schema.`);
      }
    }

    app.use(poweredBy('constructive'));
    app.use(cookieParser());
    app.use(cors(fallbackOrigin));
    app.use('/graphql', ...createCaptchaGraphqlBodyParsers());
    app.use('/graphql', graphqlUpload.graphqlUploadExpress({
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 10
    }));

    // Rewrite Content-Type after graphql-upload so grafserv accepts the request
    app.use('/graphql', multipartBridge);
    app.use(parseDomains() as RequestHandler);
    app.use(requestIp.mw());
    app.use(requestIdMiddleware());
    app.use(requestLogger);
    app.use(api);
    // Browser WebSockets do not enforce CORS. Reject an untrusted Origin after
    // exact tenant routing but before auth or any tenant-specific module I/O.
    app.use(createGraphileWebSocketOriginGuard(fallbackOrigin));
    app.use(authenticate);
    app.use(runtimePgResolutions.middleware);
    app.use(createContextMiddleware({
      pg: effectiveOpts.pg,
      getRuntimePgResolution: runtimePgResolutions.getRuntimePgResolution,
      dependencySchemas: effectiveOpts.graphile?.introspectionDependencySchemas,
      validateRuntimePool: validateRuntimeRole
        ? (pool, resolvedApi) => {
          const realtimeSchema = resolveGraphileRealtimeSchema(
            effectiveOpts,
            resolvedApi.databaseSettings?.enableRealtime ?? false
          );
          return ensureRuntimeRoleSafety(
            pool,
            [resolvedApi.anonRole, resolvedApi.roleName],
            resolvedApi.schema,
            addRealtimeRuntimeDependencySchema(
              effectiveOpts.graphile?.introspectionDependencySchemas ?? [],
              realtimeSchema
            )
          );
        }
        : undefined,
      loaders: this.moduleRegistry,
      routingSchema: getRoutingSchema(effectiveOpts)
    }));
    app.use(createCaptchaMiddleware({
      strictAuth: effectiveOpts.server?.strictAuth
    }));

    // CSRF protection for cookie-authenticated requests
    // Skip CSRF for Bearer token auth (not vulnerable to CSRF) and anonymous requests
    const csrf = createCsrfMiddleware({
      cookieOptions: {
        httpOnly: false, // SPA clients need to read this via document.cookie
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      }
    });
    const csrfProtect: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
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
    const csrfSetToken: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
      csrf.setToken(req as any, res as any, next);
    };
    app.use(csrfSetToken); // Set CSRF token cookie on all requests
    app.use('/graphql', csrfProtect); // Enforce CSRF on GraphQL mutations

    // LLM Agent REST API — mounted before graphile so SSE streaming
    // routes are handled without going through PostGraphile
    app.use(createAgenticRouter());

    // REST function invocation routes (POST /fn/:alias, GET /fn/invocations/:id)
    app.use(createFnRouter());

    app.use(graphile(
      effectiveOpts,
      runtimePgResolutions.getRuntimePgResolution
    ));
    app.use(createFlushMiddleware(this.moduleRegistry));

    // Error handling - MUST be LAST
    app.use(notFoundHandler); // Catches unmatched routes (404)
    app.use(errorHandler); // Catches all thrown errors

    this.app = app;
    this.websocketUpgradeGateway = createGraphileWebSocketUpgradeGateway(app);
    this.debugSampler = observabilityEnabled ? startDebugSampler(effectiveOpts) : null;
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
    if (!this.websocketUpgradeGateway) {
      throw new Error('Graphile WebSocket upgrade gateway is unavailable');
    }
    httpServer.on('upgrade', this.websocketUpgradeGateway.handle);

    this.httpServer = httpServer;
    return httpServer;
  }

  async flush(databaseId: string): Promise<void> {
    await flushService(this.opts, databaseId, this.moduleRegistry);
  }

  /**
   * LISTEN delivery has no replay. Clear every local metadata publication when
   * the listener is lost and again after LISTEN succeeds, so a missed change
   * cannot extend a cached module value past reconnection. Security-sensitive
   * auth/RLS loaders are additionally uncached and do not depend on this path.
   */
  private invalidateConfigurationCaches(reason: string): void {
    clearSvcCache();
    this.moduleRegistry.invalidate();
    log.info(`Invalidated configuration caches after notification ${reason}`);
  }

  getPool(): Pool {
    return getPgPool(this.opts.pg, { purpose: 'control' });
  }

  private clearListenRetry(): void {
    if (!this.listenRetryTimer) return;
    clearTimeout(this.listenRetryTimer);
    this.listenRetryTimer = null;
  }

  private scheduleListenRetry(delayMs: number): void {
    if (this.shuttingDown || this.listenRetryTimer || this.listenAttempt) return;
    this.listenRetryTimer = setTimeout(() => {
      this.listenRetryTimer = null;
      this.addEventListener();
    }, delayMs);
    this.listenRetryTimer.unref?.();
  }

  private cleanupListenAttempt(
    attempt: ListenAttempt,
    unlisten: boolean,
    connectionError?: Error
  ): Promise<void> {
    if (attempt.cleanupPromise) return attempt.cleanupPromise;
    attempt.closed = true;
    if (this.listenAttempt === attempt) this.listenAttempt = null;

    const pending = (async () => {
      const client = attempt.client;
      if (client && attempt.notificationHandler) {
        client.removeListener('notification', attempt.notificationHandler);
      }
      if (client && attempt.errorHandler) {
        client.removeListener('error', attempt.errorHandler);
      }
      let clientReleaseError = connectionError;
      if (client && unlisten) {
        try {
          // node-postgres serializes queries on one client. This also safely
          // queues behind an in-progress LISTEN during a shutdown race.
          await client.query('UNLISTEN "schema:update"');
        } catch (error) {
          // The connection may already be unusable; release still must run.
          clientReleaseError ??= error instanceof Error
            ? error
            : new Error(String(error));
        }
      }
      let releaseError: unknown;
      try {
        attempt.releaseClient?.(clientReleaseError);
      } catch (error) {
        releaseError = error;
      }
      attempt.releaseClient = null;
      try {
        attempt.releasePoolLease();
      } catch (error) {
        releaseError ??= error;
      }
      if (releaseError) this.error('Error releasing database notify listener', releaseError);
    })();
    attempt.cleanupPromise = pending;
    this.listenCleanupTasks.add(pending);
    void pending.then(
      () => this.listenCleanupTasks.delete(pending),
      () => this.listenCleanupTasks.delete(pending)
    );
    return pending;
  }

  addEventListener(): void {
    if (this.shuttingDown || this.listenAttempt) return;
    this.clearListenRetry();
    let lease: PgPoolLease;
    try {
      // LISTEN owns a client for the process lifetime. Give it a distinct
      // identity so a one-client routing pool remains available to ordinary
      // control-plane requests instead of being permanently starved.
      lease = acquirePgPool(this.opts.pg, { purpose: 'notifications' });
    } catch (error) {
      this.error('Error acquiring pool for notify listener', error);
      if (!this.shuttingDown) {
        const retryMs = error instanceof PgPoolCapacityError
          ? error.retryAfterSeconds * 1000
          : 5000;
        this.scheduleListenRetry(retryMs);
      }
      return;
    }
    const attempt: ListenAttempt = {
      releasePoolLease: once(() => lease.release()),
      client: null,
      releaseClient: null,
      notificationHandler: null,
      errorHandler: null,
      closed: false,
      cleanupPromise: null
    };
    this.listenAttempt = attempt;
    lease.pool.connect((err, client, release) => {
      void this.listenForChanges(
        err ?? null,
        client as PoolClient | undefined,
        release as ((error?: Error | boolean) => void) | undefined,
        attempt
      ).catch(async (error) => {
        this.error('Unexpected notify listener setup failure', error);
        await this.cleanupListenAttempt(
          attempt,
          false,
          error instanceof Error ? error : new Error(String(error))
        );
        this.scheduleListenRetry(5000);
      });
    });
  }

  private async listenForChanges(
    err: Error | null,
    client: PoolClient | undefined,
    release: ((error?: Error | boolean) => void) | undefined,
    attempt: ListenAttempt
  ): Promise<void> {
    if (attempt.closed || this.listenAttempt !== attempt || this.shuttingDown) {
      release?.();
      attempt.releasePoolLease();
      return;
    }

    if (err) {
      this.error('Error connecting with notify listener', err);
      this.invalidateConfigurationCaches('connection failure');
      await this.cleanupListenAttempt(attempt, false);
      this.scheduleListenRetry(5000);
      return;
    }

    if (!client || !release) {
      this.error('Notify listener connected without a client release handle');
      this.invalidateConfigurationCaches('invalid checkout');
      await this.cleanupListenAttempt(attempt, false);
      this.scheduleListenRetry(5000);
      return;
    }

    attempt.client = client;
    attempt.releaseClient = once(release);
    attempt.notificationHandler = ({ channel, payload }) => {
      if (channel === 'schema:update' && payload) {
        log.info('schema:update', payload);
        void this.flush(payload).catch((error) => {
          this.error('Error flushing schema:update notification', error);
        });
      }
    };
    attempt.errorHandler = (error) => {
      if (attempt.closed) return;
      if (!this.shuttingDown) this.error('Error with database notify listener', error);
      this.invalidateConfigurationCaches('connection loss');
      void this.cleanupListenAttempt(attempt, false, error).then(() => {
        this.scheduleListenRetry(5000);
      });
    };
    client.on('notification', attempt.notificationHandler);
    client.on('error', attempt.errorHandler);

    try {
      await client.query('LISTEN "schema:update"');
    } catch (error) {
      this.error('Error starting database notify listener', error);
      this.invalidateConfigurationCaches('LISTEN failure');
      await this.cleanupListenAttempt(
        attempt,
        false,
        error instanceof Error ? error : new Error(String(error))
      );
      this.scheduleListenRetry(5000);
      return;
    }
    if (attempt.closed || this.listenAttempt !== attempt || this.shuttingDown) {
      await this.cleanupListenAttempt(attempt, true);
      return;
    }
    this.invalidateConfigurationCaches('reconnect');
    this.log('connected and listening for changes...');
  }

  async removeEventListener(): Promise<void> {
    this.clearListenRetry();
    const attempt = this.listenAttempt;
    if (attempt) await this.cleanupListenAttempt(attempt, true);
    if (this.listenCleanupTasks.size > 0) {
      await Promise.allSettled([...this.listenCleanupTasks]);
    }
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
    // Only process-wide cache shutdown owns the process-global build
    // coordinator. Closing one exported Server must not disable cold builds in
    // another Server instance in the same process.
    const buildDrain = closeCaches
      ? closeGraphileBuildCoordinator()
      : Promise.resolve(true);
    await this.removeEventListener();
    this.moduleRegistry.invalidate();
    if (this.debugSampler) {
      await this.debugSampler.stop();
      this.debugSampler = null;
    }
    if (this.stopMemoryGovernor) {
      this.stopMemoryGovernor();
      this.stopMemoryGovernor = null;
    }
    if (this.httpServer && this.websocketUpgradeGateway) {
      this.httpServer.off('upgrade', this.websocketUpgradeGateway.handle);
    }
    this.websocketUpgradeGateway?.close();
    if (this.httpServer?.listening) {
      await new Promise<void>((resolve) => this.httpServer!.close(() => resolve()));
    }
    const buildsDrained = await buildDrain;
    if (!buildsDrained) {
      log.warn(
        'GraphQL schema builds exceeded the shutdown drain deadline; late publication is disabled'
      );
    }
    await closeDebugDatabasePools();
    if (closeCaches) {
      await Server.closeCaches({ closePools: true });
      if (buildsDrained) reopenGraphileBuildCoordinator();
    }
  }

  static async closeCaches(opts: { closePools?: boolean } = {}): Promise<void> {
    processCacheClosePoolsRequested ||= opts.closePools === true;
    if (!processCacheClose) {
      const closeTask = (async (): Promise<void> => {
        const buildsDrained = await closeGraphileBuildCoordinator();
        if (!buildsDrained) {
          throw new GraphileCacheShutdownError(
            GRAPHILE_CACHE_SHUTDOWN_DRAIN_TIMEOUT_CODE,
            'GraphQL schema builds did not drain; caches and pools were left intact'
          );
        }

        clearSvcCache();
        let poolsClosed = false;
        if (processCacheClosePoolsRequested) {
          await closeAllCaches();
          poolsClosed = true;
        } else {
          await clearGraphileCache();
        }
        // A concurrent closeCaches({ closePools: true }) may have joined while
        // the resident-only clear was awaiting disposal. Honor that escalation
        // before build admission can reopen.
        if (processCacheClosePoolsRequested && !poolsClosed) {
          await closeAllCaches();
        }

        if (!reopenGraphileBuildCoordinator()) {
          throw new GraphileCacheShutdownError(
            GRAPHILE_CACHE_SHUTDOWN_RESTART_REQUIRED_CODE,
            'GraphQL build admission cannot reopen safely; process restart is required'
          );
        }
      })();
      const tracked = closeTask.finally(() => {
        if (processCacheClose === tracked) {
          processCacheClose = null;
          processCacheClosePoolsRequested = false;
        }
      });
      processCacheClose = tracked;
    }
    return processCacheClose!;
  }

  log(text: string): void {
    log.info(text);
  }

  error(text: string, err?: unknown): void {
    log.error(text, err);
  }
}

export { Server };
