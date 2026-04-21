/**
 * Multi-tenancy cache orchestrator.
 *
 * Caches one independent PostGraphile handler per **buildKey** (derived from
 * the inputs that materially affect Graphile handler construction).
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

import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { Logger } from '@pgpmjs/logger';
import express from 'express';
import { postgraphile } from 'postgraphile';
import { grafserv } from 'grafserv/express/v4';
import type { Pool } from 'pg';
import type { GraphileConfig } from 'graphile-config';

const log = new Logger('multi-tenancy-cache');

// --- Types ---

export interface TenantConfig {
  svcKey: string;
  pool: Pool;
  schemas: string[];
  anonRole: string;
  roleName: string;
  databaseId?: string;
}

export interface TenantInstance {
  buildKey: string;
  handler: import('express').Express;
  schemas: string[];
  pgl: import('postgraphile').PostGraphileInstance;
  httpServer: import('http').Server;
  createdAt: number;
  lastUsedAt: number;
}

export interface MultiTenancyCacheStats {
  handlerCacheSize: number;
  svcKeyMappings: number;
  databaseIdMappings: number;
  inflightCreations: number;
}

// --- Internal state ---

/** buildKey → TenantInstance (the real handler cache) */
const handlerCache = new Map<string, TenantInstance>();

/** svc_key → buildKey (routing index) */
const svcKeyToBuildKey = new Map<string, string>();

/** databaseId → Set<buildKey> (flush-by-database index) */
const databaseIdToBuildKeys = new Map<string, Set<string>>();

/** buildKey → Promise<TenantInstance> (single-flight coalescing) */
const creatingHandlers = new Map<string, Promise<TenantInstance>>();

/**
 * Per-svc_key monotonic epoch.
 *
 * Each call to getOrCreateTenantInstance increments the epoch for its
 * svc_key.  After handler creation completes, the caller only registers
 * a mapping if its captured epoch still matches the current value.
 *
 * This prevents a stale (older, slower) build from overwriting a
 * newer binding that completed earlier.
 */
const svcKeyEpoch = new Map<string, number>();

/** The preset builder, set once by configureMultiTenancyCache(). */
let presetBuilder: ((
  pool: Pool,
  schemas: string[],
  anonRole: string,
  roleName: string,
) => GraphileConfig.Preset) | null = null;

// --- Configuration ---

export interface MultiTenancyCacheConfig {
  basePresetBuilder: (
    pool: Pool,
    schemas: string[],
    anonRole: string,
    roleName: string,
  ) => GraphileConfig.Preset;
}

/**
 * One-time package bootstrap. Stores the preset builder.
 * Must be called before any getOrCreateTenantInstance() calls.
 */
export function configureMultiTenancyCache(config: MultiTenancyCacheConfig): void {
  presetBuilder = config.basePresetBuilder;
  log.info('Multi-tenancy cache configured (buildKey-based handler caching)');
}

// --- BuildKey computation ---

/**
 * Derive the pool connection identity from a pg.Pool instance.
 *
 * Real pg.Pool instances created via `new Pool({ connectionString })` store
 * only `{ connectionString }` in `pool.options` — the individual fields
 * (host, port, database, user) are NOT parsed onto the options object.
 *
 * This function handles both shapes:
 *   1. connectionString-based (production — via pg-cache's getPgPool)
 *   2. individual fields (fallback for pools created with explicit fields)
 */
function getPoolIdentity(pool: Pool): string {
  const opts = (pool as unknown as { options: Record<string, unknown> }).options || {};

  // Primary path: parse connectionString (matches real pg-cache pool shape)
  if (typeof opts.connectionString === 'string') {
    try {
      const url = new URL(opts.connectionString);
      const host = url.hostname || 'localhost';
      const port = url.port || '5432';
      const database = url.pathname.slice(1) || '';
      const user = decodeURIComponent(url.username || '');
      return `${host}:${port}/${database}@${user}`;
    } catch {
      // If URL parsing fails, use the raw connectionString (will be hashed anyway)
      return opts.connectionString;
    }
  }

  // Fallback: individual fields (for pools created with explicit host/database/user)
  if (opts.host || opts.database || opts.user) {
    return `${opts.host || 'localhost'}:${opts.port || 5432}/${opts.database || ''}@${opts.user || ''}`;
  }

  // Last resort: no identity available — log a warning
  log.warn('Pool has no connectionString or individual connection fields — buildKey may not be unique');
  return 'unknown-pool';
}

/**
 * Compute the buildKey from the inputs that materially affect
 * Graphile handler construction.
 *
 * Includes:
 *   - connection identity (host:port/database@user)
 *   - schemas (order preserved — NOT sorted)
 *   - anonRole
 *   - roleName
 *
 * Does NOT include:
 *   - svc_key (routing-only)
 *   - databaseId (metadata-only)
 *   - token data, host/domain, transient headers
 */
export function computeBuildKey(
  pool: Pool,
  schemas: string[],
  anonRole: string,
  roleName: string,
): string {
  const input = JSON.stringify({
    conn: getPoolIdentity(pool),
    schemas,
    anonRole,
    roleName,
  });
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

// --- Index management ---

/**
 * Register a svc_key → buildKey mapping and update the databaseId index.
 *
 * If the svc_key was previously mapped to a different buildKey, the old
 * mapping is cleaned up first.  If no other svc_keys still reference the
 * old buildKey, it is evicted (handler disposed, indexes purged).
 */
function registerMapping(svcKey: string, buildKey: string, databaseId?: string): void {
  const oldBuildKey = svcKeyToBuildKey.get(svcKey);

  if (oldBuildKey && oldBuildKey !== buildKey) {
    // Rebinding — detach this svc_key from the old buildKey first
    svcKeyToBuildKey.delete(svcKey);

    // If old buildKey has no remaining svc_key references, evict it
    if (getSvcKeysForBuildKey(oldBuildKey).length === 0) {
      evictBuildKey(oldBuildKey);
    }
  }

  svcKeyToBuildKey.set(svcKey, buildKey);
  if (databaseId) {
    let keys = databaseIdToBuildKeys.get(databaseId);
    if (!keys) {
      keys = new Set();
      databaseIdToBuildKeys.set(databaseId, keys);
    }
    keys.add(buildKey);
  }
}

/**
 * Collect all svc_keys that map to a given buildKey.
 */
function getSvcKeysForBuildKey(buildKey: string): string[] {
  const result: string[] = [];
  for (const [svcKey, bk] of svcKeyToBuildKey) {
    if (bk === buildKey) result.push(svcKey);
  }
  return result;
}

/**
 * Remove a buildKey from all indexes and dispose the handler (if present).
 *
 * Also cleans orphaned indexes — if handler creation failed, the handler
 * won't be in handlerCache but the svc_key and databaseId indexes may
 * still reference the buildKey. This function cleans those too.
 */
function evictBuildKey(buildKey: string): void {
  const handler = handlerCache.get(buildKey);

  // Always clean indexes, even if handler isn't cached (handles orphaned indexes)
  handlerCache.delete(buildKey);

  // Remove all svc_key → buildKey mappings pointing to this buildKey
  for (const svcKey of getSvcKeysForBuildKey(buildKey)) {
    svcKeyToBuildKey.delete(svcKey);
  }

  // Remove from databaseId index
  for (const [dbId, keys] of databaseIdToBuildKeys) {
    keys.delete(buildKey);
    if (keys.size === 0) databaseIdToBuildKeys.delete(dbId);
  }

  if (handler) {
    disposeTenant(handler).catch((err) => {
      log.error(`Failed to dispose handler buildKey=${buildKey}:`, err);
    });
  }

  log.debug(`Evicted buildKey=${buildKey} (handler=${handler ? 'disposed' : 'none/orphaned'})`);
}

// --- Core API ---

/**
 * Fast-path lookup: svc_key → buildKey → handler.
 */
export function getTenantInstance(svcKey: string): TenantInstance | undefined {
  const buildKey = svcKeyToBuildKey.get(svcKey);
  if (!buildKey) return undefined;

  const handler = handlerCache.get(buildKey);
  if (handler) {
    handler.lastUsedAt = Date.now();
  }
  return handler;
}

/**
 * Resolve the buildKey for a given svc_key (for diagnostics / external use).
 */
export function getBuildKeyForSvcKey(svcKey: string): string | undefined {
  return svcKeyToBuildKey.get(svcKey);
}

/**
 * Resolve or create a tenant handler.
 *
 * Flow:
 * 1. Compute buildKey from config's build inputs
 * 2. Check handlerCache (fast path) → register mapping, return
 * 3. Check creatingHandlers (single-flight coalesce) → await, register on success
 * 4. Create a new independent PostGraphile instance keyed by buildKey
 * 5. On success: register mapping, store in handlerCache, return
 *
 * Registration is deferred until AFTER handler creation succeeds.  This
 * ensures that if the shared in-flight promise rejects, NO participating
 * svc_key leaves orphaned mappings — creator or follower alike.
 */
export async function getOrCreateTenantInstance(
  config: TenantConfig,
): Promise<TenantInstance> {
  const { svcKey, pool, schemas, anonRole, roleName, databaseId } = config;

  if (!presetBuilder) {
    throw new Error('Multi-tenancy cache not configured. Call configureMultiTenancyCache() first.');
  }

  const buildKey = computeBuildKey(pool, schemas, anonRole, roleName);

  // Capture a monotonically increasing epoch for this svc_key.
  // Only the request holding the latest epoch is allowed to register.
  const epoch = (svcKeyEpoch.get(svcKey) ?? 0) + 1;
  svcKeyEpoch.set(svcKey, epoch);

  // Step 1: Fast path — handler already cached
  const existing = handlerCache.get(buildKey);
  if (existing) {
    existing.lastUsedAt = Date.now();
    if (svcKeyEpoch.get(svcKey) === epoch) {
      registerMapping(svcKey, buildKey, databaseId);
    }
    return existing;
  }

  // Step 2: Single-flight coalesce — handler being created by another request
  const pending = creatingHandlers.get(buildKey);
  if (pending) {
    // Await the shared promise; register only on success
    const result = await pending;
    if (svcKeyEpoch.get(svcKey) === epoch) {
      registerMapping(svcKey, buildKey, databaseId);
    }
    return result;
  }

  // Step 3: Creator path — build a new handler
  const promise = doCreateHandler(buildKey, pool, schemas, anonRole, roleName);
  creatingHandlers.set(buildKey, promise);

  try {
    const result = await promise;
    if (svcKeyEpoch.get(svcKey) === epoch) {
      registerMapping(svcKey, buildKey, databaseId);
    } else {
      // Stale completion — a newer request for this svc_key superseded us.
      // Defer the orphan check so coalesced followers from OTHER svc_keys
      // have a chance to register before we decide the buildKey is orphaned.
      queueMicrotask(() => {
        if (getSvcKeysForBuildKey(buildKey).length === 0) {
          evictBuildKey(buildKey);
        }
      });
    }
    return result;
  } finally {
    creatingHandlers.delete(buildKey);
  }
}

async function doCreateHandler(
  buildKey: string,
  pool: Pool,
  schemas: string[],
  anonRole: string,
  roleName: string,
): Promise<TenantInstance> {
  const schemaLabel = schemas.join(',') || 'unknown';

  log.info(`Building handler buildKey=${buildKey} schemas=${schemaLabel}`);

  const preset = presetBuilder!(pool, schemas, anonRole, roleName);
  const pgl = postgraphile(preset);
  const serv = pgl.createServ(grafserv);

  const handler = express();
  const httpServer = createServer(handler);
  await serv.addTo(handler, httpServer);
  await serv.ready();

  const tenant: TenantInstance = {
    buildKey,
    handler,
    schemas,
    pgl,
    httpServer,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
  };

  handlerCache.set(buildKey, tenant);

  log.info(`Handler created buildKey=${buildKey} schemas=${schemaLabel}`);
  return tenant;
}

/**
 * Flush by svc_key: resolve to buildKey, evict the handler.
 *
 * This removes the handler AND all svc_key mappings pointing to
 * the same buildKey. Other svc_keys that shared the handler will
 * re-create it on next request.
 */
export function flushTenantInstance(svcKey: string): void {
  const buildKey = svcKeyToBuildKey.get(svcKey);
  if (!buildKey) return;

  evictBuildKey(buildKey);
  log.debug(`Flushed via svc_key=${svcKey} → buildKey=${buildKey}`);
}

/**
 * Flush all handlers associated with a databaseId.
 */
export function flushByDatabaseId(databaseId: string): void {
  const buildKeys = databaseIdToBuildKeys.get(databaseId);
  if (!buildKeys || buildKeys.size === 0) return;

  // Copy to avoid mutation during iteration
  const keysToEvict = [...buildKeys];
  for (const buildKey of keysToEvict) {
    evictBuildKey(buildKey);
  }

  // Clean up the databaseId entry (evictBuildKey already removes individual keys)
  databaseIdToBuildKeys.delete(databaseId);

  log.debug(`Flushed ${keysToEvict.length} handler(s) for databaseId=${databaseId}`);
}

async function disposeTenant(tenant: TenantInstance): Promise<void> {
  try {
    if (tenant.httpServer?.listening) {
      await new Promise<void>((resolve) => {
        tenant.httpServer.close(() => resolve());
      });
    }
    if (tenant.pgl) {
      await tenant.pgl.release();
    }
  } catch (err) {
    log.error(`Error disposing handler buildKey=${tenant.buildKey}:`, err);
  }
}

/**
 * Get diagnostic stats for the multi-tenancy cache system.
 */
export function getMultiTenancyCacheStats(): MultiTenancyCacheStats {
  return {
    handlerCacheSize: handlerCache.size,
    svcKeyMappings: svcKeyToBuildKey.size,
    databaseIdMappings: databaseIdToBuildKeys.size,
    inflightCreations: creatingHandlers.size,
  };
}

/**
 * Release all resources — handler cache, indexes, and in-flight trackers.
 */
export async function shutdownMultiTenancyCache(): Promise<void> {
  log.info('Shutting down multi-tenancy cache...');

  // Dispose all cached handlers
  const disposals: Promise<void>[] = [];
  for (const handler of handlerCache.values()) {
    disposals.push(disposeTenant(handler));
  }
  await Promise.allSettled(disposals);

  // Clear all state
  handlerCache.clear();
  svcKeyToBuildKey.clear();
  databaseIdToBuildKeys.clear();
  creatingHandlers.clear();
  svcKeyEpoch.clear();
  presetBuilder = null;

  log.info('Multi-tenancy cache shutdown complete');
}
