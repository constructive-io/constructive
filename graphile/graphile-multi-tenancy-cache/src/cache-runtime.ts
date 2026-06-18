import { Logger } from '@pgpmjs/logger';
import { LRUCache } from 'lru-cache';

import { computeBuildKey } from './build-key';
import { disposeTenant } from './lifecycle';
import { TenantIndexes } from './tenant-indexes';
import type {
  HandlerCacheConfig,
  MultiTenancyCacheConfig,
  MultiTenancyCacheStats,
  TenantConfig,
  TenantHandlerFactory,
  TenantHandlerFactoryContext,
  TenantInstance,
} from './types';

const log = new Logger('multi-tenancy-cache');

const parsePositiveIntEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const ONE_HOUR_MS = 1000 * 60 * 60;
const FIVE_MINUTES_MS = 1000 * 60 * 5;
const ONE_YEAR_MS = ONE_HOUR_MS * 24 * 366;

export const getHandlerCacheConfig = (): HandlerCacheConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return {
    max: parsePositiveIntEnv(
      process.env.GRAPHILE_MULTI_TENANCY_CACHE_MAX ?? process.env.GRAPHILE_CACHE_MAX,
      50,
    ),
    ttlMs: parsePositiveIntEnv(
      process.env.GRAPHILE_MULTI_TENANCY_CACHE_TTL_MS ?? process.env.GRAPHILE_CACHE_TTL_MS,
      isDevelopment ? FIVE_MINUTES_MS : ONE_YEAR_MS,
    ),
  };
};

export class CacheRuntime {
  private readonly cacheConfig: HandlerCacheConfig;
  private readonly handlerCache: LRUCache<string, TenantInstance>;
  private readonly indexes = new TenantIndexes();
  private readonly creatingHandlers = new Map<string, Promise<TenantInstance>>();
  private readonly svcKeyEpoch = new Map<string, number>();
  private handlerFactory: TenantHandlerFactory | null = null;

  constructor(cacheConfig: HandlerCacheConfig = getHandlerCacheConfig()) {
    this.cacheConfig = cacheConfig;
    this.handlerCache = new LRUCache<string, TenantInstance>({
      max: cacheConfig.max,
      ttl: cacheConfig.ttlMs,
      updateAgeOnGet: true,
      dispose: (handler, buildKey) => {
        this.indexes.removeBuildKey(buildKey);
        disposeTenant(handler).catch((err) => {
          log.error(`Failed to dispose handler buildKey=${buildKey}:`, err);
        });
      },
    });
  }

  configure(config: MultiTenancyCacheConfig): void {
    this.handlerFactory = config.handlerFactory;
    log.info('Multi-tenancy cache configured (buildKey-based handler caching)');
  }

  getTenantInstance(svcKey: string): TenantInstance | undefined {
    const buildKey = this.indexes.getBuildKeyForSvcKey(svcKey);
    if (!buildKey) return undefined;

    const handler = this.handlerCache.get(buildKey);
    if (handler) {
      handler.lastUsedAt = Date.now();
    }
    return handler;
  }

  getBuildKeyForSvcKey(svcKey: string): string | undefined {
    return this.indexes.getBuildKeyForSvcKey(svcKey);
  }

  async getOrCreateTenantInstance(config: TenantConfig): Promise<TenantInstance> {
    const { svcKey, pool, schemas, anonRole, roleName, databaseId, presetOptions } = config;

    if (!this.handlerFactory) {
      throw new Error('Multi-tenancy cache not configured. Call configureMultiTenancyCache() first.');
    }

    const buildKey = computeBuildKey(pool, schemas, anonRole, roleName, presetOptions);
    const epoch = (this.svcKeyEpoch.get(svcKey) ?? 0) + 1;
    this.svcKeyEpoch.set(svcKey, epoch);

    const existing = this.handlerCache.get(buildKey);
    if (existing) {
      existing.lastUsedAt = Date.now();
      if (this.svcKeyEpoch.get(svcKey) === epoch) {
        this.registerMapping(svcKey, buildKey, databaseId);
      }
      return existing;
    }

    const pending = this.creatingHandlers.get(buildKey);
    if (pending) {
      const result = await pending;
      if (this.svcKeyEpoch.get(svcKey) === epoch) {
        this.registerMapping(svcKey, buildKey, databaseId);
      }
      return result;
    }

    const promise = this.doCreateHandler({
      buildKey,
      svcKey,
      pool,
      schemas,
      anonRole,
      roleName,
      databaseId,
      presetOptions,
    });
    this.creatingHandlers.set(buildKey, promise);

    try {
      const result = await promise;
      if (this.svcKeyEpoch.get(svcKey) === epoch) {
        this.registerMapping(svcKey, buildKey, databaseId);
      } else {
        queueMicrotask(() => {
          if (this.indexes.getSvcKeysForBuildKey(buildKey).length === 0) {
            this.evictBuildKey(buildKey);
          }
        });
      }
      return result;
    } finally {
      this.creatingHandlers.delete(buildKey);
    }
  }

  flushTenantInstance(svcKey: string): void {
    const buildKey = this.indexes.getBuildKeyForSvcKey(svcKey);
    if (!buildKey) return;

    this.evictBuildKey(buildKey);
    log.debug(`Flushed via svc_key=${svcKey} → buildKey=${buildKey}`);
  }

  flushByDatabaseId(databaseId: string): void {
    const keysToEvict = this.indexes.getBuildKeysForDatabaseId(databaseId);
    if (keysToEvict.length === 0) return;

    for (const buildKey of keysToEvict) {
      this.evictBuildKey(buildKey);
    }

    this.indexes.deleteDatabaseId(databaseId);
    log.debug(`Flushed ${keysToEvict.length} handler(s) for databaseId=${databaseId}`);
  }

  getStats(): MultiTenancyCacheStats {
    return {
      handlerCacheSize: this.handlerCache.size,
      handlerCacheMax: this.cacheConfig.max,
      handlerCacheTtlMs: this.cacheConfig.ttlMs,
      svcKeyMappings: this.indexes.svcKeyMappingCount,
      databaseIdMappings: this.indexes.databaseIdMappingCount,
      inflightCreations: this.creatingHandlers.size,
      buildKeys: [...this.handlerCache.keys()],
    };
  }

  async shutdown(): Promise<void> {
    log.info('Shutting down multi-tenancy cache...');

    const disposals: Promise<void>[] = [];
    for (const handler of this.handlerCache.values()) {
      disposals.push(disposeTenant(handler));
    }
    await Promise.allSettled(disposals);

    this.handlerCache.clear();
    this.indexes.clear();
    this.creatingHandlers.clear();
    this.svcKeyEpoch.clear();
    this.handlerFactory = null;

    log.info('Multi-tenancy cache shutdown complete');
  }

  private registerMapping(svcKey: string, buildKey: string, databaseId?: string): void {
    this.indexes.registerMapping(
      svcKey,
      buildKey,
      databaseId,
      (orphanedBuildKey) => this.evictBuildKey(orphanedBuildKey),
    );
  }

  private evictBuildKey(buildKey: string): void {
    const deleted = this.handlerCache.delete(buildKey);
    if (!deleted) {
      this.indexes.removeBuildKey(buildKey);
    }

    log.debug(`Evicted buildKey=${buildKey} (handler=${deleted ? 'disposed' : 'none/orphaned'})`);
  }

  private async doCreateHandler(
    context: TenantHandlerFactoryContext,
  ): Promise<TenantInstance> {
    const { buildKey, schemas } = context;
    const schemaLabel = schemas.join(',') || 'unknown';

    log.info(`Building handler buildKey=${buildKey} schemas=${schemaLabel}`);

    const resources = await this.handlerFactory!(context);

    const tenant: TenantInstance = {
      ...resources,
      buildKey,
      schemas,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    this.handlerCache.set(buildKey, tenant);

    log.info(`Handler created buildKey=${buildKey} schemas=${schemaLabel}`);
    return tenant;
  }
}
