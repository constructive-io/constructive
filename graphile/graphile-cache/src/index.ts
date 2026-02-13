// Main exports from graphile-cache package
export {
  // Cache instance and entry type
  graphileCache,
  GraphileCacheEntry,
  closeAllCaches,

  // Time constants
  ONE_HOUR_MS,
  FIVE_MINUTES_MS,

  // Eviction tracking
  EvictionReason,

  // Event emitter for cache events
  CacheEventEmitter,
  CacheEvictionEvent,
  cacheEvents,

  // Cache configuration
  CacheConfig,
  getCacheConfig,

  // Cache stats
  CacheStats,
  getCacheStats,

  // Clear matching entries
  clearMatchingEntries
} from './graphile-cache';

// Factory for creating PostGraphile v5 instances
export { createGraphileInstance } from './create-instance';
