/**
 * Multi-tenancy cache orchestrator.
 *
 * Caches one independent PostGraphile handler per **buildKey** (a canonical
 * string derived from the inputs that materially affect Graphile handler
 * construction).
 *
 * Multiple svc_key values with identical build inputs share the same handler.
 * svc_key remains the request routing key and flush targeting key.
 *
 * No template sharing, no SQL rewrite, no fingerprinting.
 *
 * Index structures:
 *   handlerCache:          buildKey  → TenantInstance
 *   svcKeyToBuildKey:      svc_key   → buildKey
 *   databaseIdToBuildKeys: databaseId → Set<buildKey>
 */

import { computeBuildKey } from './build-key';
import { CacheRuntime } from './cache-runtime';
import type {
  MultiTenancyCacheConfig,
  MultiTenancyCacheStats,
  TenantConfig,
  TenantInstance,
} from './types';

const store = new CacheRuntime();

/**
 * One-time package bootstrap. Stores the handler factory.
 * Must be called before any getOrCreateTenantInstance() calls.
 */
export function configureMultiTenancyCache(config: MultiTenancyCacheConfig): void {
  store.configure(config);
}

/**
 * Fast-path lookup: svc_key → buildKey → handler.
 */
export function getTenantInstance(svcKey: string): TenantInstance | undefined {
  return store.getTenantInstance(svcKey);
}

/**
 * Resolve the buildKey for a given svc_key (for diagnostics / external use).
 */
export function getBuildKeyForSvcKey(svcKey: string): string | undefined {
  return store.getBuildKeyForSvcKey(svcKey);
}

/**
 * Resolve or create a tenant handler.
 */
export function getOrCreateTenantInstance(config: TenantConfig): Promise<TenantInstance> {
  return store.getOrCreateTenantInstance(config);
}

/**
 * Flush by svc_key: resolve to buildKey, evict the handler.
 *
 * This removes the handler AND all svc_key mappings pointing to
 * the same buildKey. Other svc_keys that shared the handler will
 * re-create it on next request.
 */
export function flushTenantInstance(svcKey: string): void {
  store.flushTenantInstance(svcKey);
}

/**
 * Flush all handlers associated with a databaseId.
 */
export function flushByDatabaseId(databaseId: string): void {
  store.flushByDatabaseId(databaseId);
}

/**
 * Get diagnostic stats for the multi-tenancy cache system.
 */
export function getMultiTenancyCacheStats(): MultiTenancyCacheStats {
  return store.getStats();
}

/**
 * Release all resources — handler cache, indexes, and in-flight trackers.
 */
export function shutdownMultiTenancyCache(): Promise<void> {
  return store.shutdown();
}

export { computeBuildKey };

export type {
  HandlerCacheConfig,
  MultiTenancyCacheConfig,
  MultiTenancyCacheStats,
  TenantConfig,
  TenantHandlerFactory,
  TenantHandlerFactoryContext,
  TenantHandlerResources,
  TenantInstance,
} from './types';
