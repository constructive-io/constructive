import pg from 'pg';
import { getPgEnvOptions, PgConfig } from 'pg-env';
import { Logger } from '@pgpmjs/logger';

import { pgCache } from './lru';

const log = new Logger('pg-cache');

const getDbString = (
  user: string,
  password: string,
  host: string,
  port: string | number,
  database: string
): string =>
  `postgres://${user}:${password}@${host}:${port}/${database}`;

export const getPgPool = (pgConfig: Partial<PgConfig>): pg.Pool => {
  const config = getPgEnvOptions(pgConfig);
  const { user, password, host, port, database, } = config;
  if (pgCache.has(database)) {
    const cached = pgCache.get(database);
    if (cached) return cached;
  }
  const connectionString = getDbString(user, password, host, port, database);
  const pgPool = new pg.Pool({ connectionString });
  
  // Add error handler to prevent unhandled 'error' events from crashing Node.js
  // This commonly happens when connections are terminated during database cleanup
  pgPool.on('error', (err: Error & { code?: string }) => {
    // 57P01 = admin_shutdown (terminating connection due to administrator command)
    // This is expected during database cleanup/teardown
    if (err.code === '57P01') {
      log.debug(`Pool ${database} connection terminated (expected during cleanup): ${err.message}`);
    } else {
      log.error(`Pool ${database} error: ${err.message}`);
    }
  });
  
  pgCache.set(database, pgPool);
  return pgPool;
};
