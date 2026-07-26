import { getEnvOptions } from '@constructive-io/graphql-env';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import { cors, healthz, poweredBy } from '@pgpmjs/server-utils';
import express from 'express';
import { createGraphileInstance, type GraphileCacheEntry } from 'graphile-cache';
import { getPgPool } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';

import { buildDevPreset } from './preset';
import type { DevServerInfo, DevServerOptions } from './types';

const log = new Logger('dev-server');

/**
 * Create a pure-PostGraphile single-tenant dev server.
 *
 * Unlike the production `@constructive-io/graphql-server`, this server has no
 * scoped-routing plane and no database id: it points at one database, exposes
 * the configured schemas, and runs every request as a single fixed role. It is
 * intended for local development and test harnesses only — never production.
 */
export const createDevServer = async (
  rawOpts: ConstructiveOptions = {},
  serverOpts: DevServerOptions = {}
): Promise<DevServerInfo> => {
  const opts = getEnvOptions(rawOpts);

  // Bind to 127.0.0.1 by default to avoid IPv6/IPv4 mismatches with supertest.
  const host = serverOpts.host ?? '127.0.0.1';
  const port = serverOpts.port ?? 0;

  const schemas = opts.api?.exposedSchemas ?? [];
  const role =
    opts.api?.roleName ?? opts.api?.anonRole ?? opts.pg?.user ?? 'postgres';

  log.info(
    `[dev-server] starting db=${opts.pg?.database} schemas=[${schemas.join(', ')}] role=${role}`
  );

  const pool = getPgPool(getPgEnvOptions({ ...opts.pg }));
  const preset = buildDevPreset({ pool, schemas, role });
  const cacheKey = `dev:${opts.pg?.database ?? ''}:${schemas.join(',')}:${role}`;
  const instance: GraphileCacheEntry = await createGraphileInstance({
    preset,
    cacheKey
  });

  const app = express();
  healthz(app);
  cors(app, serverOpts.origin ?? opts.server?.origin);
  app.use(poweredBy('constructive'));
  app.use((req, res, next) => instance.handler(req, res, next));

  const httpServer = await new Promise<import('http').Server>((resolve, reject) => {
    const server = app.listen(port, host, () => resolve(server));
    server.on('error', reject);
  });

  const actualPort = (httpServer.address() as { port: number }).port;

  const stop = async (): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
    if (instance.httpServer?.listening) {
      await new Promise<void>((resolve) => instance.httpServer.close(() => resolve()));
    }
    await instance.pgl?.release?.();
  };

  return {
    httpServer,
    app,
    url: `http://${host}:${actualPort}`,
    graphqlUrl: `http://${host}:${actualPort}/graphql`,
    port: actualPort,
    host,
    stop
  };
};
