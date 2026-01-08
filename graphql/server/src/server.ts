import { getEnvOptions, getNodeEnv } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import { healthz, poweredBy, trustProxy } from '@pgpmjs/server-utils';
import { PgpmOptions } from '@pgpmjs/types';
import { middleware as parseDomains } from '@constructive-io/url-domains';
import { randomUUID } from 'crypto';
import express, { Express, RequestHandler } from 'express';
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
const isDev = () => getNodeEnv() === 'development';

export const GraphQLServer = (rawOpts: PgpmOptions = {}) => {
  const envOptions = getEnvOptions(rawOpts);
  const app = new Server(envOptions);
  app.addEventListener();
  app.listen();
};

class Server {
  private app: Express;
  private opts: PgpmOptions;

  constructor(opts: PgpmOptions) {
    this.opts = getEnvOptions(opts);

    const app = express();
    const api = createApiMiddleware(opts);
    const authenticate = createAuthenticateMiddleware(opts);
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
    if (isDev()) {
      log.debug(
        `Database: ${opts.pg?.database}@${opts.pg?.host}:${opts.pg?.port}`
      );
      log.debug(
        `Meta schemas: ${(opts as any).api?.metaSchemas?.join(', ') || 'default'}`
      );
    }

    healthz(app);
    trustProxy(app, opts.server.trustProxy);
    // Warn if a global CORS override is set in production
    const fallbackOrigin = opts.server?.origin?.trim();
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
    app.use(graphqlUpload.graphqlUploadExpress());
    app.use(parseDomains() as RequestHandler);
    app.use(requestIp.mw());
    app.use(requestLogger);
    app.use(api);
    app.use(authenticate);
    app.use(graphile(opts));
    app.use(flush);

    this.app = app;
  }

  listen(): void {
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

  log(text: string): void {
    log.info(text);
  }

  error(text: string, err?: unknown): void {
    log.error(text, err);
  }
}

export { Server };
