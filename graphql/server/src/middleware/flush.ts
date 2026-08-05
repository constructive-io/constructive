import './types'; // for Request type

import type { LoaderRegistry } from '@constructive-io/express-context';
import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import { NextFunction, Request, Response } from 'express';
import { deleteGraphileCacheEntry, graphileCache } from 'graphile-cache';
import { acquirePgPool } from 'pg-cache';

import {
  invalidateSvcCacheForDatabase,
  invalidateSvcCacheForService,
  invalidateSvcCacheKey
} from './api';
import { invalidateInFlightBuilds } from './graphile';
import { getRoutingSchema, isValidSchemaName } from './routing';

const log = new Logger('flush');

const flushRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
  registry?: LoaderRegistry
): Promise<void> => {
  if (req.url === '/flush') {
    if (req.internalTrusted !== true) {
      res.status(403).send('Forbidden');
      return;
    }
    const serviceKey = req.svc_key;
    // Module metadata and Graphile residents are one publication boundary.
    // Retire both before acknowledging the flush; otherwise a revoked module
    // configuration can outlive the schema instance it helped configure.
    registry?.invalidate(req.databaseId);
    if (serviceKey) invalidateInFlightBuilds({ serviceKey });
    if (req.svc_cache_key) invalidateSvcCacheKey(req.svc_cache_key);
    const cacheKeys = [...graphileCache.entries()]
      .filter(([, entry]) => entry.serviceKey === serviceKey)
      .map(([key]) => key);
    await Promise.all(cacheKeys.map((key) => deleteGraphileCacheEntry(key)));
    res.status(200).send('OK');
    return;
  }
  return next();
};

export const flush = (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => flushRequest(req, res, next);

export const createFlushMiddleware = (registry: LoaderRegistry) => (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => flushRequest(req, res, next, registry);

export const flushService = async (
  opts: ConstructiveOptions,
  databaseId: string,
  registry?: LoaderRegistry
): Promise<void> => {
  log.info('flushing db ' + databaseId);
  registry?.invalidate(databaseId);
  invalidateInFlightBuilds({ databaseId });
  invalidateSvcCacheForDatabase(opts, databaseId);

  const api = new RegExp(`^api:${databaseId}:.*`);
  const schemata = new RegExp(`^schemata:${databaseId}:.*`);
  const meta = new RegExp(`^metaschema:api:${databaseId}`);

  // Evict by the authoritative database identity before consulting routing.
  // Routing is fallible and may legitimately return no domains; neither case
  // may leave a resident instance for the database being flushed.
  const databaseCacheKeys = new Set<string>();
  graphileCache.forEach((entry, key: string) => {
    if (entry.databaseId === databaseId) {
      databaseCacheKeys.add(key);
    }

    if (!opts.api.isPublic) {
      const serviceKey = entry.serviceKey;
      if (serviceKey && (api.test(serviceKey) || schemata.test(serviceKey) || meta.test(serviceKey))) {
        invalidateSvcCacheForService(opts, serviceKey);
      }
    }
  });
  await Promise.all([...databaseCacheKeys].map((key) => deleteGraphileCacheEntry(key)));

  const routingSchema = getRoutingSchema(opts);
  if (!isValidSchemaName(routingSchema)) {
    log.warn(`[flush] invalid routing schema name: ${routingSchema}`);
    return;
  }
  const poolLease = acquirePgPool(opts.pg, {
    purpose: 'routing-request-control',
    sanitizeOnCheckout: true
  });
  try {
    const svc = await poolLease.pool.query(
      `SELECT hostname
       FROM "${routingSchema}".domains
       WHERE database_id = $1`,
      [databaseId]
    );

    if (svc.rowCount === 0) return;

    for (const row of svc.rows) {
      const key: string | undefined = row.hostname || undefined;
      if (key) {
        const graphileKeys = new Set<string>();
        graphileCache.forEach((entry, cacheKey) => {
          if (entry.serviceKey === key || entry.databaseId === databaseId) {
            graphileKeys.add(cacheKey);
          }
        });
        await Promise.all([...graphileKeys].map((cacheKey) => deleteGraphileCacheEntry(cacheKey)));
        invalidateSvcCacheForService(opts, key);
      }
    }
  } finally {
    poolLease.release();
  }
};
