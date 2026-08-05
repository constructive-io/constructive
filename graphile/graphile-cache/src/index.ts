// Main exports from graphile-cache package
export {
  BuildAdmissionDecision,
  BuildRefusalReason,
  CacheAdmissionMode,
  CacheBuildAdmissionError,
  CacheCalibrationProvenance,
  CacheCalibrationSource,
  // Cache configuration
  CacheConfig,
  // Process counters
  CacheCounters,
  // Event emitter for cache events
  CacheEventEmitter,
  cacheEvents,
  CacheEvictionEvent,
  // Cache stats
  CacheStats,
  clearGraphileCache,
  // Clear matching entries
  clearMatchingEntries,
  closeAllCaches,
  // Capacity model and measured instance cost
  computeBackingCacheMax,
  computeCapacityFromBudget,
  deleteGraphileCacheEntry,
  disposeUncachedEntry,
  evaluateBuildAdmission,
  // Eviction tracking
  EvictionReason,
  FIVE_MINUTES_MS,
  getCacheConfig,
  getCacheCounters,
  getCacheStats,
  getDrainingCount,
  getInstanceHeapEstimate,
  // Memory pressure governor
  getMemoryPressure,
  GRAPHILE_WEBSOCKET_UNAVAILABLE_CODE,
  // Cache instance and entry type
  graphileCache,
  GraphileCacheEntry,
  GraphileUpgradeHandler,
  // Request draining and build admission
  invokeEntryHandler,
  invokeEntryUpgradeHandler,
  isEntryRealtimeUnavailable,
  MemoryPressure,
  MemoryPressureLevel,
  // Time constants
  ONE_HOUR_MS,
  prepareCacheForBuild,
  raceWithClearedTimeout,
  recordBuildRefusal,
  recordInstanceHeapSample,
  resetInstanceHeapSamples,
  retireGraphileCacheEntry,
  revalidateEntryRealtimeRole,
  startMemoryGovernor,
  stopMemoryGovernor,
  waitForActiveDisposals,
  waitForEntryDisposal
} from './graphile-cache';

// Factory for creating PostGraphile v5 instances
export type { GraphileInstanceOptions } from './create-instance';
export { createGraphileInstance } from './create-instance';
export type {
  GraphileRealtimeHealth,
  GraphileRealtimeManager
} from './realtime-readiness';
export {
  createGraphileRealtimeHealth,
  createGraphileRealtimeNodeId,
  DEFAULT_GRAPHILE_REALTIME_SCHEMA,
  GRAPHILE_REALTIME_UNAVAILABLE_CODE,
  GraphileRealtimeStartupError,
  startConfiguredRealtime,
  withGraphileRealtimeFailure
} from './realtime-readiness';
export type {
  ActivateGraphileSharedRealtimeOptions,
  GraphileRealtimeRoleAttestation,
  GraphileRealtimeRoleAttestationSnapshot,
  GraphileRealtimeRoleAuditStats} from './shared-realtime';
export {
  activateGraphileSharedRealtime,
  getGraphileRealtimeRoleAuditStats,
  GRAPHILE_SHARED_REALTIME_DATABASE_CONFLICT_ERROR_CODE,
  GRAPHILE_SHARED_REALTIME_IDENTITY_ERROR_CODE,
  GraphileSharedRealtimeDatabaseConflictError,
  GraphileSharedRealtimeIdentityError
} from './shared-realtime';

// Generic module config cache for plugin lookups
export { ModuleConfigCache, ModuleConfigCacheOptions } from './module-config-cache';
