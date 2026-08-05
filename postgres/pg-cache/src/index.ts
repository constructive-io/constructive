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
  acquirePgNotificationBroker,
  assertValidPgNotificationTopic,
  DEFAULT_PG_NOTIFICATION_OPERATION_TIMEOUT_MS,
  getPgNotificationBrokerIdentity,
  getPgNotificationBrokerStats,
  getPgNotificationDatabaseIdentity,
  PG_NOTIFICATION_BROKER_FAILED_ERROR_CODE,
  PG_NOTIFICATION_BROKER_IDENTITY_VERSION,
  PG_NOTIFICATION_DATABASE_IDENTITY_VERSION,
  PG_NOTIFICATION_LEASE_RELEASED_ERROR_CODE,
  PG_NOTIFICATION_OPERATION_TIMEOUT_ERROR_CODE,
  PG_NOTIFICATION_QUEUE_CAPACITY,
  PG_NOTIFICATION_QUEUE_OVERFLOW_ERROR_CODE,
  PG_NOTIFICATION_TOPIC_ERROR_CODE,
  PgNotificationBrokerFailedError,
  PgNotificationLeaseReleasedError,
  PgNotificationOperationTimeoutError,
  PgNotificationQueueOverflowError,
  PgNotificationTopicError,
  teardownPgNotificationBrokers
} from './notification-broker';
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
  UnsafePgNotificationRoleError
} from './notification-role';
export {
  acquirePgPool,
  buildConnectionString,
  clearPreparedStatementBookkeeping,
  defaultPgPoolFactory,
  getPgCheckoutSanitizerStats,
  getPgPool,
  getPgPoolConfig,
  getPgPoolIdentity,
  installCheckoutSanitizer,
  sanitizePgClient
} from './pg';

// Re-export types
export type { PgPoolFactory, PgPoolFactoryOptions, QueryableClient, QueryablePool } from './driver';
export type {
  PgCacheConfig,
  PgPoolCacheStats,
  PgPoolDisposalReason,
  PgPoolLease,
  PoolCleanupCallback
} from './lru';
export type {
  AcquirePgNotificationBrokerOptions,
  PgAttestedNotificationBrokerLease,
  PgNotificationBrokerLease,
  PgNotificationBrokerStats,
  PgNotificationListenerConfig
} from './notification-broker';
export type {
  PgNotificationRoleAudit,
  PgNotificationRoleClient,
  PgNotificationRoleContract,
  PgNotificationRoleViolationCode
} from './notification-role';
export type { GetPgPoolOptions, PgCheckoutSanitizerStats } from './pg';
