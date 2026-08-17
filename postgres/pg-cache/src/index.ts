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
  assertPgNotificationRole,
  assertPgNotificationRoleClient,
  auditPgNotificationRole,
  auditPgNotificationRoleClient,
  normalizePgNotificationRoleContracts,
  PG_NOTIFICATION_ROLE_AUDIT_SQL,
  PG_NOTIFICATION_ROLE_AUDIT_VERSION,
  PG_NOTIFICATION_ROLE_CONTRACT_ERROR_CODE,
  PG_NOTIFICATION_ROLE_UNSAFE_ERROR_CODE,
  PgNotificationRoleContractError,
  UnsafePgNotificationRoleError,
} from './notification-role';
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
export type {
  PgNotificationRoleAudit,
  PgNotificationRoleClient,
  PgNotificationRoleContract,
  PgNotificationRoleViolationCode,
} from './notification-role';
export type { GetPgPoolOptions } from './pg';
