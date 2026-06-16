// --- Orchestrator (primary API) ---
export {
  configureMultiTenancyCache,
  getOrCreateTenantInstance,
  getTenantInstance,
  flushTenantInstance,
  flushByDatabaseId,
  getMultiTenancyCacheStats,
  shutdownMultiTenancyCache,
  computeBuildKey,
  getBuildKeyForSvcKey,
} from './multi-tenancy-cache';

export type {
  TenantConfig,
  TenantInstance,
  MultiTenancyCacheStats,
  MultiTenancyCacheConfig,
} from './multi-tenancy-cache';
