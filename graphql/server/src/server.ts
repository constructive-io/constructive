import { Logger } from '@pgpmjs/logger';
import { healthz, poweredBy, svcCache, trustProxy } from '@pgpmjs/server-utils';
import { PgpmOptions } from '@pgpmjs/types';
import { middleware as parseDomains } from '@constructive-io/url-domains';
import { randomUUID } from 'crypto';
import express, { Express, RequestHandler } from 'express';
import type { Server as HttpServer } from 'http';
// @ts-ignore
import graphqlUpload from 'graphql-upload';
import { Pool, PoolClient } from 'pg';
import { graphileCache } from 'graphile-cache';
import { getPgPool, pgCache } from 'pg-cache';
import requestIp from 'request-ip';

import { createApiMiddleware } from './middleware/api';
import { createAuthenticateMiddleware } from './middleware/auth';
import { cors } from './middleware/cors';
import { flush, flushService } from './middleware/flush';
import { graphile } from './middleware/graphile';
import {
  normalizeGraphqlConfigInput,
  resolveGraphqlConfig,
  resolveNodeEnvConfig,
  type GraphqlRuntimeConfigOptions,
  type NodeEnv
} from './config';

const log = new Logger('server');
export const GraphQLServer = (
  rawOpts: PgpmOptions | GraphqlRuntimeConfigOptions = {}
) => {
  const normalized = normalizeGraphqlConfigInput(rawOpts);
  const envOptions = resolveGraphqlConfig(normalized);
  const app = new Server(envOptions, {
    envConfig: normalized.envConfig,
    resolved: true
  });
  app.addEventListener();
  app.listen();
};

export class Server {
  private app: Express;
  private opts: PgpmOptions;
  private nodeEnv: NodeEnv;
  private listenClient: PoolClient | null = null;
  private listenRelease: (() => void) | null = null;
  private shuttingDown = false;
  private closed = false;
  private httpServer: HttpServer | null = null;

  constructor(
    opts: PgpmOptions,
    {
      envConfig,
      cwd,
      resolved
    }: { envConfig?: NodeJS.ProcessEnv; cwd?: string; resolved?: boolean } = {}
  ) {
    this.nodeEnv = resolveNodeEnvConfig(envConfig);
    this.opts = resolved
      ? opts
      : resolveGraphqlConfig({ graphqlConfig: opts, envConfig, cwd });
    const effectiveOpts = this.opts;

    const app = express();
    const api = createApiMiddleware(effectiveOpts, this.nodeEnv);
    const authenticate = createAuthenticateMiddleware(
      effectiveOpts,
      this.nodeEnv
    );
    const requestLogger: RequestHandler = (req, res, next) => {
      const headerRequestId = req.header('x-request-id');
      const reqId = headerRequestId || randomUUID();
      const start = process.hrtime.bigint();

      req.requestId = reqId;

      const host = req.hostname || req.headers.host || 'unknown';
      const ip = req.clientIp || req.ip;

      log.debug(
        `[${reqId}] -> ${req.method} ${req.originalUrl} host=${host} ip=${ip}`
      );

      res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        const apiInfo = req.api
          ? `db=${req.api.dbname} schemas=${req.api.schema?.join(',') || 'none'}`
          : 'api=unresolved';
        const authInfo = req.token ? 'auth=token' : 'auth=anon';
        const svcInfo = req.svc_key ? `svc=${req.svc_key}` : 'svc=unset';

        log.debug(
          `[${reqId}] <- ${res.statusCode} ${req.method} ${req.originalUrl} (${durationMs.toFixed(
            1
          )} ms) ${apiInfo} ${svcInfo} ${authInfo}`
        );
      });

      next();
    };

    // Log startup config in dev mode
    if (this.nodeEnv === 'development') {
      log.debug(
        `Database: ${effectiveOpts.pg?.database}@${effectiveOpts.pg?.host}:${effectiveOpts.pg?.port}`
      );
      log.debug(
        `Meta schemas: ${(effectiveOpts as any).api?.metaSchemas?.join(', ') || 'default'}`
      );
    }

    healthz(app);
    trustProxy(app, effectiveOpts.server.trustProxy);
    // Warn if a global CORS override is set in production
    const fallbackOrigin = effectiveOpts.server?.origin?.trim();
    if (fallbackOrigin && this.nodeEnv === 'production') {
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
    app.use(graphqlUpload.graphqlUploadExpress());
    app.use(parseDomains() as RequestHandler);
    app.use(requestIp.mw());
    app.use(requestLogger);
    app.use(api);
    app.use(authenticate);
    app.use(graphile(effectiveOpts));
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
