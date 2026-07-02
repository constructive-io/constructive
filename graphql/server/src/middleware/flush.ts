import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import { NextFunction, Request, Response } from 'express';
import { clearMatchingEntries, graphileCache } from 'graphile-cache';
import { getPgPool } from 'pg-cache';
import './types'; // for Request type
import { isBlueprintPoolingEnabled } from './blueprint';
import { clearPoolDecisions } from './pooling-decision';

const log = new Logger('flush');

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

  // Blueprint pooling (v1): a schema change in ANY tenant can alter a shape that
  // pooled instances share, so flush ALL pooled (`bp:`) instances — rebuilds are
  // cheap — and drop cached pooling decisions so the next request re-derives the
  // fingerprint/key. Runs regardless of isPublic since pooling targets the public API.
  if (isBlueprintPoolingEnabled()) {
    const cleared = clearMatchingEntries(/^bp:/);
    clearPoolDecisions();
    if (cleared > 0) {
      log.info(`[pooling] flushed ${cleared} pooled instance(s) after change to db ${databaseId}`);
    }
  }

  const api = new RegExp(`^api:${databaseId}:.*`);
  const schemata = new RegExp(`^schemata:${databaseId}:.*`);
  const meta = new RegExp(`^metaschema:api:${databaseId}`);

  if (!opts.api.isPublic) {
    graphileCache.forEach((_, k: string) => {
      if (api.test(k) || schemata.test(k) || meta.test(k)) {
        graphileCache.delete(k);
        svcCache.delete(k);
      }
    });
  }

  const svc = await pgPool.query(
    `SELECT *
     FROM services_public.domains
     WHERE database_id = $1`,
    [databaseId]
  );

  if (svc.rowCount === 0) return;

  for (const row of svc.rows) {
    let key: string | undefined;
    if (row.domain && !row.subdomain) {
      key = row.domain;
    } else if (row.domain && row.subdomain) {
      key = `${row.subdomain}.${row.domain}`;
    }
    if (key) {
      graphileCache.delete(key);
      svcCache.delete(key);
    }
  }
};
