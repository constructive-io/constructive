import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import { NextFunction, Request, Response } from 'express';
import { clearMatchingEntries, graphileCache } from 'graphile-cache';
import { getPgPool } from 'pg-cache';
import './types'; // for Request type
import { isBlueprintPoolingEnabled } from './blueprint';
import { clearPoolDecisions, clearPoolDecisionsForDatabase } from './pooling-decision';

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
    // Under pooling the serving instance is stored under a `bp:` key, which the
    // svc_key delete above cannot reach — mirror flushService's v1 semantics.
    if (isBlueprintPoolingEnabled()) {
      clearMatchingEntries(/^bp:/);
      clearPoolDecisions();
    }
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

  // Blueprint pooling: invalidate ONLY the changed database's decisions and the
  // blueprint instance it was attached to. Fleet-wide `bp:` flushes on every
  // schema:update turned each tenant PROVISION into a cold restart of every
  // pooled instance — and the immediate rebuild raced the evicted instances'
  // drain (~GB still live until release), which OOMed the 24h soak. New tenants
  // have no memoized decisions, so provisioning is a no-op here (instances are
  // shape-generic; a same-shape tenant attaches without any rebuild).
  if (isBlueprintPoolingEnabled()) {
    const bpKeys = clearPoolDecisionsForDatabase(databaseId);
    for (const key of bpKeys) {
      graphileCache.delete(key);
    }
    if (bpKeys.length > 0) {
      log.info(`[pooling] flushed ${bpKeys.length} blueprint(s) for db ${databaseId}: ${bpKeys.join(', ')}`);
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
