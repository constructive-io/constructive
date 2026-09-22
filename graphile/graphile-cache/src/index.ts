// Main exports from graphile-cache package
export {
  // Cache configuration
  CacheConfig,
  // Event emitter for cache events
  CacheEventEmitter,
  cacheEvents,
  CacheEvictionEvent,
  // Cache stats
  CacheStats,
  clearGraphileCache,
  clearGraphileEntriesForDatabase,
  clearGraphileEntriesForPool,
  clearGraphileEntriesForService,
  // Clear matching entries
  clearMatchingEntries,
  closeAllCaches,
  configureGraphileAdmission,
  disposeUncachedEntry,
  // Eviction tracking
  EvictionReason,
  FIVE_MINUTES_MS,
  getCacheConfig,
  getCacheStats,
  // Cache instance and entry type
  graphileCache,
  GraphileCacheEntry,
  GraphileCacheConfiguration,
  // Time constants
  ONE_HOUR_MS,
  waitForActiveDisposals,
  waitForEntryDisposal} from './graphile-cache';

export {
  createGraphileBuildCacheKey,
  referenceGraphileBuildValue,
  snapshotGraphileBuildValue
} from './build-identity';
export type { GraphileBuildReference } from './build-identity';

// Factory for creating PostGraphile v5 instances
export { createGraphileInstance } from './create-instance';
export { buildAdmittedGraphileInstance, type GraphileBuildMetadata } from './admitted-build';
export type { GraphileAdmissionOptions } from './admission';

// Generic module config cache for plugin lookups
export { ModuleConfigCache, ModuleConfigCacheOptions } from './module-config-cache';
