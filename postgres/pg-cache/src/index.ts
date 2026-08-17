// Main exports from pg-cache package
export {
  getActivePgPoolFactory,
  getPgPoolDriverIdentity,
  hasPgPoolFactory,
  registerPgPoolFactory
} from './driver';
export { 
  close,
  DEFAULT_PG_CACHE_MAX,
  getPgCacheConfig,
  getPgCacheStats,
  PG_CACHE_GRAPHILE_CONTRACT_CAPACITY,
  PG_CACHE_OPERATIONAL_RESERVE,
  PG_POOL_CAPACITY_ERROR_CODE,
  pgCache,
  PgPoolCacheManager,
  PgPoolCapacityError,
  teardownPgPools
} from './lru';
export {
  acquirePgPool,
  buildConnectionString,
  defaultPgPoolFactory,
  getPgDatabaseTargetIdentity,
  getPgPool,
  getPgPoolConfig,
  getPgPoolIdentity
} from './pg';
// Re-export types
export type { PgPoolFactory, PgPoolFactoryOptions, QueryableClient, QueryablePool } from './driver';
export type {
  PgCacheConfig,
  PgPoolCacheStats,
  PgPoolDisposalReason,
  PgPoolLease,
  PoolCleanupCallback,
} from './lru';
export type { GetPgPoolOptions } from './pg';
