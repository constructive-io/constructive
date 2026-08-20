import { getEnvOptions } from '@constructive-io/graphql-env';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { cors, healthz, poweredBy } from '@pgpmjs/server-utils';
import { middleware as parseDomains } from '@constructive-io/url-domains';
import express, { Express, NextFunction, Request, Response } from 'express';
import type { Server as HttpServer } from 'node:http';
import {
  createGraphileInstance,
  GraphileCacheEntry,
  GraphileCacheManager,
} from 'graphile-cache';
import { makePgService, withGraphileSettingsRuntime } from 'graphile-settings';
import type { GraphileConfig } from 'graphile-config';
import { getPgPool, getPgPoolCacheKey, PgPoolCacheManager } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';

import { printDatabases, printSchemas } from './render';
import { getGraphilePreset } from './settings';

export interface GraphQLExplorerRuntimeOptions {
  onError?: (error: unknown) => void;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  /** @internal Owned resources supplied by startGraphQLExplorer. */
  cacheScope?: GraphQLExplorerCacheScope;
}

/** Cache ownership boundary for one explorer lifecycle. */
export class GraphQLExplorerCacheScope {
  readonly pgCache: PgPoolCacheManager;
  readonly graphileCache: GraphileCacheManager;

  constructor(
    environment: Readonly<Record<string, string | undefined>> = process.env
  ) {
    this.pgCache = new PgPoolCacheManager(undefined, environment);
    this.graphileCache = new GraphileCacheManager({
      pgCache: this.pgCache,
      environment,
    });
  }

  async close(): Promise<void> {
    let graphileFailure: unknown;
    try {
      await this.graphileCache.close();
    } catch (error) {
      graphileFailure = error;
    }
    try {
      await this.pgCache.close();
    } catch (error) {
      if (graphileFailure !== undefined) {
        throw new AggregateError(
          [graphileFailure, error],
          'Multiple GraphQL explorer cache resources failed to close.'
        );
      }
      throw error;
    }
    if (graphileFailure !== undefined) throw graphileFailure;
  }
}

export interface GraphQLExplorerHandle {
  app: Express;
  httpServer: HttpServer;
  url: string;
  waitForFailure(): Promise<never>;
  close(): Promise<void>;
}

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

const abortReason = (signal: AbortSignal): unknown =>
  signal.reason ??
  new DOMException('The operation was cancelled.', 'AbortError');

const formatServerUrl = (server: HttpServer, fallbackHost: string): string => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const rawHost =
    typeof address === 'object' && address?.address
      ? address.address
      : fallbackHost;
  const host =
    rawHost === '::' || rawHost === '[::]' || rawHost === '0.0.0.0'
      ? 'localhost'
      : rawHost;
  return `http://${host.includes(':') ? `[${host}]` : host}:${port}`;
};

const createRuntimeScopeMiddleware =
  (runtime: GraphQLExplorerRuntimeOptions): express.RequestHandler =>
  (_req, res, next) => {
    void withGraphileSettingsRuntime(
      { cwd: runtime.cwd, env: runtime.env },
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
        })
    ).catch((error) => {
      if (!res.headersSent) {
        next(error);
        return;
      }
      runtime.onError?.(error);
    });
  };

export const createGraphQLExplorerApp = (
  rawOpts: ConstructiveOptions = {},
  runtime: GraphQLExplorerRuntimeOptions = {}
): Express => {
  const opts = getEnvOptions(rawOpts, runtime.cwd, runtime.env);
  const environment = Object.freeze({ ...(runtime.env ?? process.env) });
  const cacheScope =
    runtime.cacheScope ?? new GraphQLExplorerCacheScope(environment);
  const graphileCache = cacheScope.graphileCache;
  const reportError =
    runtime.onError ?? ((error: unknown) => console.error(error));

  const { pg, server } = opts;

  const getGraphileInstanceObj = async (
    dbname: string,
    schemaname: string
  ): Promise<GraphileCacheEntry> => {
    const key = `${dbname}.${schemaname}`;

    const cached = graphileCache.get(key);
    if (cached) {
      return cached;
    }

    const pgConfig = getPgEnvOptions(
      {
        ...pg,
        database: dbname,
      },
      runtime.env
    );

    // Route through pg-cache so the pool is tracked and can be cleaned up
    // properly, preventing leaked connections during database teardown.
    const pool = getPgPool(pgConfig, {
      cache: cacheScope.pgCache,
      environment,
    });
    const pgPoolKey = getPgPoolCacheKey(pgConfig, { environment });

    const basePreset = getGraphilePreset(opts, runtime);
    const preset: GraphileConfig.Preset = {
      ...basePreset,
      pgServices: [makePgService({ pool, schemas: [schemaname] })],
      grafserv: {
        graphqlPath: '/graphql',
        graphiqlPath: '/graphiql',
        graphiql: true,
      },
    };

    const instance = await createGraphileInstance({
      preset,
      cacheKey: key,
      pgPoolKey,
    });
    graphileCache.set(key, instance);
    return instance;
  };

  const app = express();
  app.locals.graphqlExplorerCacheScope = cacheScope;
  app.use(createRuntimeScopeMiddleware(runtime));

  healthz(app);
  cors(app, server.origin);
  app.use(parseDomains());
  app.use(poweredBy('constructive'));

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.urlDomains?.subdomains.length === 1) {
      const [dbName] = req.urlDomains.subdomains;
      try {
        const pgPool = getPgPool(
          getPgEnvOptions(
            {
              ...opts.pg,
              database: dbName,
            },
            environment
          ),
          { cache: cacheScope.pgCache, environment }
        );

        const results = await pgPool.query(`
          SELECT s.nspname AS table_schema
          FROM pg_catalog.pg_namespace s
          WHERE s.nspname !~ '^pg_' AND s.nspname NOT IN ('information_schema');
        `);
        res.send(
          printSchemas({
            dbName,
            schemas: results.rows,
            req,
            hostname: server.host,
            port: server.port,
          })
        );
        return;
      } catch (e: any) {
        if (e.message?.match(/does not exist/)) {
          res.status(404).send('DB Not found');
          return;
        }
        reportError(e);
        res.status(500).send('Something happened...');
        return;
      }
    }
    return next();
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.urlDomains?.subdomains.length === 2) {
      const [, dbName] = req.urlDomains.subdomains;
      try {
        const pgPool = getPgPool(
          getPgEnvOptions(
            {
              ...opts.pg,
              database: dbName,
            },
            environment
          ),
          { cache: cacheScope.pgCache, environment }
        );

        await pgPool.query('SELECT 1;');
      } catch (e: any) {
        if (e.message?.match(/does not exist/)) {
          res.status(404).send('DB Not found');
          return;
        }
        reportError(e);
        res.status(500).send('Something happened...');
        return;
      }
    }
    return next();
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.urlDomains?.subdomains.length === 2) {
      const [schemaName, dbName] = req.urlDomains.subdomains;
      try {
        const instance = await getGraphileInstanceObj(dbName, schemaName);
        instance.handler(req, res, next);
        return;
      } catch (e: any) {
        reportError(e);
        res.status(500).send('Something happened...');
        return;
      }
    }
    return next();
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.urlDomains?.subdomains.length === 2 && req.url === '/flush') {
      const [schemaName, dbName] = req.urlDomains.subdomains;
      const key = `${dbName}.${schemaName}`;
      graphileCache.delete(key);
      res.status(200).send('OK');
      return;
    }
    return next();
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.urlDomains?.subdomains.length === 0) {
      try {
        const rootPgPool = getPgPool(
          getPgEnvOptions(
            {
              ...opts.pg,
              database: opts.pg.user, // is this to get postgres?
            },
            environment
          ),
          { cache: cacheScope.pgCache, environment }
        );

        const results = await rootPgPool.query(`
          SELECT * FROM pg_catalog.pg_database
          WHERE datistemplate = FALSE AND datname != 'postgres' AND datname !~ '^pg_'
        `);
        res.send(
          printDatabases({ databases: results.rows, req, port: server.port })
        );
        return;
      } catch (e: any) {
        if (e.message?.match(/does not exist/)) {
          res.status(404).send('DB Not found');
          return;
        }
        reportError(e);
        res.status(500).send('Something happened...');
        return;
      }
    }
    return next();
  });

  return app;
};

export const startGraphQLExplorer = async (
  rawOpts: ConstructiveOptions = {},
  runtime: GraphQLExplorerRuntimeOptions = {}
): Promise<GraphQLExplorerHandle> => {
  const opts = getEnvOptions(rawOpts, runtime.cwd, runtime.env);
  const environment = Object.freeze({ ...(runtime.env ?? process.env) });
  const cacheScope = new GraphQLExplorerCacheScope(environment);
  const app = createGraphQLExplorerApp(opts, {
    ...runtime,
    env: environment,
    cacheScope,
  });
  const signal = runtime.signal;

  if (signal?.aborted) {
    await cacheScope.close();
    throw abortReason(signal);
  }

  let httpServer: HttpServer;
  try {
    httpServer = await new Promise<HttpServer>((resolve, reject) => {
      const candidate = app.listen(opts.server.port, opts.server.host);
      const cleanup = () => {
        candidate.off('listening', handleListening);
        candidate.off('error', handleError);
        signal?.removeEventListener('abort', handleAbort);
      };
      const handleListening = () => {
        cleanup();
        resolve(candidate);
      };
      const handleError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const handleAbort = () => {
        cleanup();
        void closeHttpServer(candidate).then(
          () => reject(abortReason(signal!)),
          reject
        );
      };
      candidate.once('listening', handleListening);
      candidate.once('error', handleError);
      signal?.addEventListener('abort', handleAbort, { once: true });
    });
  } catch (error) {
    await cacheScope.close();
    throw error;
  }

  let resolveFailure!: (error: Error) => void;
  const failure = new Promise<Error>((resolve) => {
    resolveFailure = resolve;
  });
  const handleRuntimeError = (error: Error) => {
    runtime.onError?.(error);
    resolveFailure(error);
  };
  httpServer.on('error', handleRuntimeError);
  let closePromise: Promise<void> | null = null;

  return {
    app,
    httpServer,
    url: formatServerUrl(httpServer, opts.server.host || 'localhost'),
    async waitForFailure(): Promise<never> {
      throw await failure;
    },
    async close() {
      if (closePromise) return closePromise;
      closePromise = (async () => {
        httpServer.off('error', handleRuntimeError);
        let listenerFailure: unknown;
        try {
          await closeHttpServer(httpServer);
        } catch (error) {
          listenerFailure = error;
        }
        try {
          await cacheScope.close();
        } catch (error) {
          if (listenerFailure !== undefined) {
            throw new AggregateError(
              [listenerFailure, error],
              'Multiple GraphQL explorer resources failed to close.'
            );
          }
          throw error;
        }
        if (listenerFailure !== undefined) throw listenerFailure;
      })();
      return closePromise;
    },
  };
};

/** Dispose caches owned by an app returned from createGraphQLExplorerApp. */
export const closeGraphQLExplorerApp = async (app: Express): Promise<void> => {
  const cacheScope = app.locals.graphqlExplorerCacheScope as
    | GraphQLExplorerCacheScope
    | undefined;
  await cacheScope?.close();
};

/**
 * Backwards-compatible convenience API. New lifecycle-aware consumers should
 * use startGraphQLExplorer so readiness and shutdown are observable.
 */
export const GraphQLExplorer = (rawOpts: ConstructiveOptions = {}): Express => {
  const opts = getEnvOptions(rawOpts);
  const app = createGraphQLExplorerApp(opts);
  const httpServer = app.listen(opts.server.port, opts.server.host, () => {
    console.log(
      `app listening at http://${opts.server.host}:${opts.server.port}`
    );
  });
  httpServer.once('close', () => {
    void closeGraphQLExplorerApp(app).catch((error) => console.error(error));
  });
  return app;
};
