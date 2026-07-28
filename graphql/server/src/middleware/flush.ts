import './types'; // for Request type

import { ConstructiveOptions } from '@constructive-io/graphql-types';
import type { LoaderRegistry } from '@constructive-io/express-context';
import { Logger } from '@pgpmjs/logger';
import { svcCache, type ServiceCache } from '@pgpmjs/server-utils';
import { NextFunction, Request, Response } from 'express';
import { graphileCache, type GraphileCacheManager } from 'graphile-cache';
import { getPgPool, type PgPoolCacheManager } from 'pg-cache';

import { getRoutingSchema, isValidSchemaName } from './routing';

const log = new Logger('flush');

export interface FlushRuntimeOptions {
  graphileCache?: GraphileCacheManager;
  serviceCache?: ServiceCache;
  pgCache?: PgPoolCacheManager;
  environment?: Readonly<Record<string, string | undefined>>;
  loaders?: LoaderRegistry;
}

export const createFlushMiddleware = (runtime: FlushRuntimeOptions = {}) => {
  const scopedGraphileCache = runtime.graphileCache ?? graphileCache;
  const scopedServiceCache = runtime.serviceCache ?? svcCache;
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (req.url === '/flush') {
      // TODO: check bearer for a flush / special key
      scopedGraphileCache.delete((req as any).svc_key);
      scopedServiceCache.delete((req as any).svc_key);
      if (req.databaseId) runtime.loaders?.invalidate(req.databaseId);
      res.status(200).send('OK');
      return;
    }
    return next();
  };
};

export const flush = createFlushMiddleware();

export const flushService = async (
  opts: ConstructiveOptions,
  databaseId: string,
  runtime: FlushRuntimeOptions = {}
): Promise<void> => {
  const scopedGraphileCache = runtime.graphileCache ?? graphileCache;
  const scopedServiceCache = runtime.serviceCache ?? svcCache;
  const pgPool = getPgPool(opts.pg, {
    cache: runtime.pgCache,
    environment: runtime.environment,
  });
  log.info('flushing db ' + databaseId);
  runtime.loaders?.invalidate(databaseId);

  const api = new RegExp(`^api:${databaseId}:.*`);
  const schemata = new RegExp(`^schemata:${databaseId}:.*`);
  const meta = new RegExp(`^metaschema:api:${databaseId}`);

  if (!opts.api.isPublic) {
    scopedGraphileCache.forEach((_, k: string) => {
      if (api.test(k) || schemata.test(k) || meta.test(k)) {
        scopedGraphileCache.delete(k);
        scopedServiceCache.delete(k);
      }
    });
  }

  const routingSchema = getRoutingSchema(opts);
  if (!isValidSchemaName(routingSchema)) {
    log.warn(`[flush] invalid routing schema name: ${routingSchema}`);
    return;
  }
  const svc = await pgPool.query(
    `SELECT hostname
     FROM "${routingSchema}".domains
     WHERE database_id = $1`,
    [databaseId]
  );

  if (svc.rowCount === 0) return;

  for (const row of svc.rows) {
    const key: string | undefined = row.hostname || undefined;
    if (key) {
      scopedGraphileCache.delete(key);
      scopedServiceCache.delete(key);
    }
  }
};
