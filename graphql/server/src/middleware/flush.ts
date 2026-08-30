import './types'; // for Request type

import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import { NextFunction, Request, Response } from 'express';
import { graphileCache } from 'graphile-cache';
import { getPgPool } from 'pg-cache';

import { getRoutingSchema, isValidSchemaName } from './routing';

const log = new Logger('flush');

const evictMatchingCaches = (matches: (key: string) => boolean): void => {
  for (const key of graphileCache.keys()) {
    if (matches(key)) graphileCache.delete(key);
  }
  for (const key of svcCache.keys()) {
    if (matches(key)) svcCache.delete(key);
  }
};

const isScopedDatabaseIdentityKey = (key: string, databaseId: string): boolean => {
  const marker = ':database:';
  const markerIndex = key.indexOf(marker);
  if (markerIndex <= 0) return false;
  if (!/^[a-z0-9.-]+$/i.test(key.slice(0, markerIndex))) return false;

  const identity = key.slice(markerIndex + marker.length);
  const apiIndex = identity.indexOf(':api:');
  if (apiIndex === -1) return identity === databaseId;
  return identity.slice(0, apiIndex) === databaseId &&
    identity.length > apiIndex + ':api:'.length;
};

export const flush = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.url === '/flush') {
    // TODO: check bearer for a flush / special key
    graphileCache.delete((req as any).svc_key);
    svcCache.delete((req as any).svc_key);
    res.status(200).send('OK');
    return;
  }
  return next();
};

export const flushService = async (
  opts: ConstructiveOptions,
  databaseId: string
): Promise<void> => {
  const pgPool = getPgPool(opts.pg);
  log.info('flushing db ' + databaseId);

  const api = new RegExp(`^api:${databaseId}:.*`);
  const schemata = new RegExp(`^schemata:${databaseId}:.*`);
  const meta = new RegExp(`^metaschema:api:${databaseId}`);

  if (opts.api?.isPublic === false) {
    evictMatchingCaches((key) => api.test(key) || schemata.test(key) || meta.test(key));
  }

  // Scoped-route handlers are keyed by the concrete request host, which may
  // be a child of a wildcard route. The database segment is the stable part.
  evictMatchingCaches((key) => isScopedDatabaseIdentityKey(key, databaseId));

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
      // Legacy policy-unset routes remain cached by their configured hostname.
      evictMatchingCaches((candidate) => candidate === key);
    }
  }
};
