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

// --- Introspection cache (kept as module/test base — not required for the handler runtime) ---
export {
  getOrCreateIntrospection,
  invalidateIntrospection,
  clearIntrospectionCache,
  getIntrospectionCacheStats,
  getConnectionKey,
} from './introspection-cache';

export type {
  CachedIntrospection,
  IntrospectionCacheStats,
} from './introspection-cache';

// --- Utilities (kept as module base — not required for the handler runtime) ---
export { getSchemaFingerprint } from './utils/fingerprint';
export type { MinimalIntrospection } from './utils/fingerprint';
export { fetchIntrospection, parseIntrospection, fetchAndParseIntrospection } from './utils/introspection-query';
