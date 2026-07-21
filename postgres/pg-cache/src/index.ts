// Main exports from pg-cache package
export {
  getActivePgPoolFactory,
  hasPgPoolFactory,
  registerPgPoolFactory
} from './driver';
export { 
  close,
  getPgCacheConfig,
  pgCache, 
  PgPoolCacheManager, 
  teardownPgPools
} from './lru';
export {
  buildConnectionString,
  defaultPgPoolFactory,
  getPgPool,
  getPgPoolConfig
} from './pg';

// Re-export types
export type { PgPoolFactory, QueryableClient, QueryablePool } from './driver';
export type { PgCacheConfig, PoolCleanupCallback } from './lru';