// Main exports from graphile-cache package
export {
  cacheEvents,
  CacheEvents,
  clearMatchingEntries,
  closeAllCaches,
  EvictionReason,
  getCacheInvalidationService,
  getCacheStats,
  GraphileCache,
  GraphileCacheEntry,
  graphileCache,
  initCrossNodeInvalidation,
  invalidateCacheKey,
  invalidateCachePattern,
  markAllManualEvictions,
  markManualEviction,
  stopCrossNodeInvalidation,
} from './graphile-cache';

// Cache invalidation service for cross-node coordination
export {
  CacheInvalidationConfig,
  CacheInvalidationPayload,
  CacheInvalidationService,
  createCacheInvalidationService,
  InvalidationHandler,
  PatternInvalidationHandler,
} from './cache-invalidation';
