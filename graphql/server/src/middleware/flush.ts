import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import { NextFunction, Request, Response } from 'express';
import { graphileCache } from 'graphile-cache';
import { getPgPool } from 'pg-cache';
import './types'; // for Request type

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

/**
 * Admin-only endpoint to flush auth settings from the svcCache.
 *
 * Requires:
 *  - Admin role (role === 'administrator')
 *  - Step-up authentication (access_level === 'password_or_mfa')
 *
 * Clears both svcCache and graphileCache entries for the current tenant
 * so the next request re-queries auth settings from the tenant DB.
 */
export const flushAuthSettingsCache = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const token = req.token;

  // Require authentication
  if (!token?.role) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Require admin role (database-level superuser, not org-level)
  if (token.role !== 'administrator') {
    log.warn(`[flush-auth-settings] Denied: role=${token.role}, expected administrator`);
    res.status(403).json({ error: 'Administrator role required' });
    return;
  }

  // Require step-up authentication
  if (token.access_level !== 'password_or_mfa') {
    log.warn(`[flush-auth-settings] Denied: access_level=${token.access_level}, expected password_or_mfa`);
    res.status(403).json({
      error: 'Step-up authentication required (access_level must be password_or_mfa)',
    });
    return;
  }

  const svcKey = req.svc_key;
  if (!svcKey) {
    log.warn('[flush-auth-settings] No svc_key on request, nothing to flush');
    res.status(400).json({ error: 'Could not determine tenant cache key' });
    return;
  }

  graphileCache.delete(svcKey);
  svcCache.delete(svcKey);
  log.info(`[flush-auth-settings] Flushed cache for key=${svcKey} (requested by user_id=${token.user_id})`);

  res.status(200).json({ flushed: true, cacheKey: svcKey });
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
