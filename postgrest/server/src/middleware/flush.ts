import { PgpmOptions } from '@pgpmjs/types';
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import { NextFunction, Request, Response } from 'express';
import { getPgPool } from 'pg-cache';
import { postgrestCache } from './postgrest';
import './types';

const log = new Logger('postgrest-flush');

export const flush = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.url === '/flush') {
    const key = (req as any).svc_key;
    if (key) {
      postgrestCache.delete(key);
      svcCache.delete(key);
    }
    res.status(200).send('OK');
    return;
  }
  return next();
};

export const flushService = async (opts: PgpmOptions, databaseId: string): Promise<void> => {
  const pgPool = getPgPool(opts.pg);
  log.info('flushing db ' + databaseId);

  const api = new RegExp(`^postgrest:api:${databaseId}:.*`);
  const schemata = new RegExp(`^postgrest:schemata:${databaseId}:.*`);
  const meta = new RegExp(`^postgrest:metaschema:api:${databaseId}`);

  postgrestCache.forEach((_, k: string) => {
    if (api.test(k) || schemata.test(k) || meta.test(k)) {
      postgrestCache.delete(k);
      svcCache.delete(k);
    }
  });

  const svc = await pgPool.query(
    `SELECT *
     FROM meta_public.domains
     WHERE database_id = $1`,
    [databaseId]
  );

  if (svc.rowCount === 0) return;

  for (const row of svc.rows) {
    let key: string | undefined;
    if (row.domain && !row.subdomain) {
      key = 'postgrest:' + row.domain;
    } else if (row.domain && row.subdomain) {
      key = `postgrest:${row.subdomain}.${row.domain}`;
    }
    if (key) {
      postgrestCache.delete(key);
      svcCache.delete(key);
    }
  }
};
