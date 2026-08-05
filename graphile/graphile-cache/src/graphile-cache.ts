import type { Duplex } from 'node:stream';
import { getHeapStatistics } from 'node:v8';

import { Logger } from '@pgpmjs/logger';
import { EventEmitter } from 'events';
import type { NextFunction, Request, Response, Router } from 'express';
import type { GrafservBase } from 'grafserv';
import type { IncomingMessage, Server as HttpServer } from 'http';
import { LRUCache } from 'lru-cache';
import { pgCache, type PgPoolLease } from 'pg-cache';
import type { PostGraphileInstance } from 'postgraphile';

import {
  GRAPHILE_REALTIME_UNAVAILABLE_CODE,
  type GraphileRealtimeHealth,
  withGraphileRealtimeFailure
} from './realtime-readiness';
import {
  getGraphileRealtimeRoleAuditStats,
  type GraphileRealtimeRoleAttestation
} from './shared-realtime';

const log = new Logger('graphile-cache');

export const GRAPHILE_WEBSOCKET_UNAVAILABLE_CODE =
  'GRAPHILE_WEBSOCKET_UNAVAILABLE';

export type GraphileUpgradeHandler = (
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer
) => void;

// --- Time Constants ---
export const ONE_HOUR_MS = 1000 * 60 * 60;
export const FIVE_MINUTES_MS = 1000 * 60 * 5;
const ONE_DAY = ONE_HOUR_MS * 24;
const SIX_HOURS_MS = ONE_DAY / 4;

// --- Eviction Types ---
export type EvictionReason =
  | 'lru'
  | 'ttl'
  | 'manual'
  | 'governor'
  | 'admission'
  | 'realtime';

export interface CacheCounters {
  /** Transient HTTP requests admitted to an exact resident handler. */
  httpRequestsStarted: number;
  /** Admitted HTTP requests that reached a terminal response state. */
  httpRequestsCompleted: number;
  /** WebSocket upgrades admitted to an exact resident upgrade handler. */
  websocketUpgradesStarted: number;
  /** Admitted WebSocket lifecycles that closed or errored. */
  websocketUpgradesCompleted: number;
  evictions: Record<EvictionReason, number>;
  disposalsStarted: number;
  disposalsCompleted: number;
  disposalFailures: number;
  drainTimeouts: number;
  disposalTimeouts: number;
  buildRefusals: Record<BuildRefusalReason, number>;
}

const cacheCounters: CacheCounters = {
  httpRequestsStarted: 0,
  httpRequestsCompleted: 0,
  websocketUpgradesStarted: 0,
  websocketUpgradesCompleted: 0,
  evictions: {
    lru: 0,
    ttl: 0,
    manual: 0,
    governor: 0,
    admission: 0,
    realtime: 0
  },
  disposalsStarted: 0,
  disposalsCompleted: 0,
  disposalFailures: 0,
  drainTimeouts: 0,
  disposalTimeouts: 0,
  buildRefusals: {
    critical_pressure: 0,
    insufficient_budget: 0,
    rss_budget_exceeded: 0,
    disposal_timeout: 0,
    resident_busy: 0,
    resident_capacity: 0,
    disposal_failed: 0
  }
};

export const getCacheCounters = (): CacheCounters => ({
  httpRequestsStarted: cacheCounters.httpRequestsStarted,
  httpRequestsCompleted: cacheCounters.httpRequestsCompleted,
  websocketUpgradesStarted: cacheCounters.websocketUpgradesStarted,
  websocketUpgradesCompleted: cacheCounters.websocketUpgradesCompleted,
  evictions: { ...cacheCounters.evictions },
  disposalsStarted: cacheCounters.disposalsStarted,
  disposalsCompleted: cacheCounters.disposalsCompleted,
  disposalFailures: cacheCounters.disposalFailures,
  drainTimeouts: cacheCounters.drainTimeouts,
  disposalTimeouts: cacheCounters.disposalTimeouts,
  buildRefusals: { ...cacheCounters.buildRefusals }
});

// --- Cache Event Emitter ---
export interface CacheEvictionEvent {
  key: string;
  reason: EvictionReason;
  entry: GraphileCacheEntry;
}

export class CacheEventEmitter extends EventEmitter {
  emitEviction(event: CacheEvictionEvent): void {
    this.emit('eviction', event);
  }

  onEviction(handler: (event: CacheEvictionEvent) => void): void {
    this.on('eviction', handler);
  }
}

export const cacheEvents = new CacheEventEmitter();

// --- Cache Configuration ---
export interface CacheConfig {
  max: number;
  ttl: number;
  admissionMode: CacheAdmissionMode;
  heapLimitBytes: number;
  /** Explicit process-RSS ceiling. Null leaves RSS observable but unbounded. */
  rssLimitBytes: number | null;
  instanceHeapBytes: number;
  serverReserveBytes: number;
  buildReserveBytes: number;
  /** Transient RSS reserved before admitting one serialized build. */
  rssBuildReserveBytes: number;
  budgetCapacity: number;
  calibration: CacheCalibrationProvenance;
}

export type CacheAdmissionMode = 'evict-idle' | 'preserve-resident';

export type CacheCalibrationSource =
  | 'default'
  | 'environment'
  | 'runtime-safety-floor';

export interface CacheCalibrationProvenance {
  id: string | null;
  instanceHeapSource: CacheCalibrationSource;
  instanceHeapSampleCount: number;
  serverReserveSource: Exclude<CacheCalibrationSource, 'runtime-safety-floor'>;
  buildReserveSource: Exclude<CacheCalibrationSource, 'runtime-safety-floor'>;
}

const DEFAULT_INSTANCE_HEAP_BYTES = 512 * 1024 * 1024;
const DEFAULT_SERVER_RESERVE_BYTES = 256 * 1024 * 1024;
const DEFAULT_BUILD_RESERVE_BYTES = 768 * 1024 * 1024;
const DEFAULT_RSS_BUILD_RESERVE_BYTES = DEFAULT_BUILD_RESERVE_BYTES;
const MIN_BACKING_CACHE_ENTRIES = 1024;
const MAX_BACKING_CACHE_ENTRIES = 65_536;
// This is only a sparse-LRU allocation budget, never an estimate of a real
// Graphile instance. Keep it comfortably below every measured instance cost so
// the backing data structure cannot become the density limit before heap
// admission does.
const BACKING_CACHE_BYTES_PER_ENTRY = 256 * 1024;

export const computeBackingCacheMax = (heapLimitBytes: number): number => {
  if (!Number.isFinite(heapLimitBytes) || heapLimitBytes <= 0) {
    return MIN_BACKING_CACHE_ENTRIES;
  }
  return Math.max(
    MIN_BACKING_CACHE_ENTRIES,
    Math.min(
      MAX_BACKING_CACHE_ENTRIES,
      Math.floor(heapLimitBytes / BACKING_CACHE_BYTES_PER_ENTRY)
    )
  );
};

const BACKING_CACHE_MAX = computeBackingCacheMax(
  getHeapStatistics().heap_size_limit
);

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseExplicitPositiveInt = (
  name: string,
  value: string | undefined
): number | undefined => {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return parsed;
};

const parseAdmissionMode = (value: string | undefined): CacheAdmissionMode => {
  if (value === undefined || value === 'evict-idle') return 'evict-idle';
  if (value === 'preserve-resident') return 'preserve-resident';
  throw new Error(
    'GRAPHILE_CACHE_ADMISSION_MODE must be evict-idle or preserve-resident'
  );
};

const resolveCalibrationValue = (
  name: string,
  fallback: number
): { bytes: number; source: 'default' | 'environment' } => {
  const configured = parseExplicitPositiveInt(name, process.env[name]);
  return configured === undefined
    ? { bytes: fallback, source: 'default' }
    : { bytes: configured, source: 'environment' };
};

const measuredInstanceSamples: number[] = [];

/** Record a retained-heap sample from a validated warm instance. */
export const recordInstanceHeapSample = (bytes: number): void => {
  if (!Number.isFinite(bytes) || bytes <= 0) return;
  measuredInstanceSamples.push(Math.round(bytes));
  if (measuredInstanceSamples.length > 31) measuredInstanceSamples.shift();
};

export const resetInstanceHeapSamples = (): void => {
  measuredInstanceSamples.length = 0;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const resolveInstanceHeapEstimate = (): {
  bytes: number;
  source: CacheCalibrationSource;
} => {
  const configured = resolveCalibrationValue(
    'GRAPHILE_CACHE_INSTANCE_HEAP_BYTES',
    DEFAULT_INSTANCE_HEAP_BYTES
  );
  if (measuredInstanceSamples.length === 0) return configured;
  const measuredWithReserve = Math.ceil(median(measuredInstanceSamples) * 1.2);
  if (measuredWithReserve <= configured.bytes) return configured;
  return { bytes: measuredWithReserve, source: 'runtime-safety-floor' };
};

export const getInstanceHeapEstimate = (): number =>
  resolveInstanceHeapEstimate().bytes;

/**
 * Return the number of resident instances for which both steady-state and
 * one-build-transient budgets fit. Zero means a build cannot be admitted.
 */
export const computeCapacityFromBudget = (
  heapLimitBytes: number,
  instanceHeapBytes: number,
  serverReserveBytes = DEFAULT_SERVER_RESERVE_BYTES,
  buildReserveBytes = DEFAULT_BUILD_RESERVE_BYTES
): number => {
  if (
    heapLimitBytes <= 0 ||
    instanceHeapBytes <= 0 ||
    serverReserveBytes + buildReserveBytes > heapLimitBytes
  ) {
    return 0;
  }
  const byResidency = Math.floor(
    (heapLimitBytes - serverReserveBytes) / instanceHeapBytes
  );
  const byRebuild = Math.floor(
    (heapLimitBytes - serverReserveBytes - buildReserveBytes) / instanceHeapBytes
  ) + 1;
  return Math.max(
    0,
    Math.min(computeBackingCacheMax(heapLimitBytes), byResidency, byRebuild)
  );
};

/**
 * Get cache configuration from environment variables
 *
 * Supports:
 * - GRAPHILE_CACHE_MAX: Operator ceiling (default: heap-budget-derived)
 * - GRAPHILE_CACHE_ADMISSION_MODE: evict-idle (default) or preserve-resident
 * - GRAPHILE_CACHE_RSS_LIMIT_BYTES: Optional absolute process-RSS ceiling
 * - GRAPHILE_CACHE_RSS_BUILD_RESERVE_BYTES: RSS reserved for one build
 * - GRAPHILE_CACHE_TTL_MS: TTL in milliseconds
 *   - Production default: ONE_YEAR
 *   - Development default: FIVE_MINUTES_MS
 *
 * Resident instances protect their exact runtime pools with `PgPoolLease`, so
 * pool capacity and Graphile heap capacity are independent limits. Pool
 * exhaustion fails closed when every registry identity is leased.
 */
export function getCacheConfig(): CacheConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const heapLimitBytes = getHeapStatistics().heap_size_limit;
  const instanceHeap = resolveInstanceHeapEstimate();
  const serverReserve = resolveCalibrationValue(
    'GRAPHILE_CACHE_SERVER_RESERVE_BYTES',
    DEFAULT_SERVER_RESERVE_BYTES
  );
  const buildReserve = resolveCalibrationValue(
    'GRAPHILE_CACHE_BUILD_RESERVE_BYTES',
    DEFAULT_BUILD_RESERVE_BYTES
  );
  const rssLimitBytes = parseExplicitPositiveInt(
    'GRAPHILE_CACHE_RSS_LIMIT_BYTES',
    process.env.GRAPHILE_CACHE_RSS_LIMIT_BYTES
  ) ?? null;
  const rssBuildReserveBytes = parseExplicitPositiveInt(
    'GRAPHILE_CACHE_RSS_BUILD_RESERVE_BYTES',
    process.env.GRAPHILE_CACHE_RSS_BUILD_RESERVE_BYTES
  ) ?? DEFAULT_RSS_BUILD_RESERVE_BYTES;
  const instanceHeapBytes = instanceHeap.bytes;
  const serverReserveBytes = serverReserve.bytes;
  const buildReserveBytes = buildReserve.bytes;
  const budgetCapacity = computeCapacityFromBudget(
    heapLimitBytes,
    instanceHeapBytes,
    serverReserveBytes,
    buildReserveBytes
  );
  const requestedMax = parseExplicitPositiveInt(
    'GRAPHILE_CACHE_MAX',
    process.env.GRAPHILE_CACHE_MAX
  ) ?? (budgetCapacity || 1);
  if (requestedMax > BACKING_CACHE_MAX) {
    throw new Error(
      `GRAPHILE_CACHE_MAX exceeds heap-scaled backing ceiling ${BACKING_CACHE_MAX}`
    );
  }
  // The backing LRU requires at least one slot. Admission still fails closed
  // when budgetCapacity is zero, so the synthetic slot is never built into.
  const max = Math.max(1, Math.min(requestedMax, budgetCapacity || 1));
  const ttl = parsePositiveInt(
    process.env.GRAPHILE_CACHE_TTL_MS,
    isDevelopment ? FIVE_MINUTES_MS : SIX_HOURS_MS
  );

  return {
    max,
    ttl,
    admissionMode: parseAdmissionMode(process.env.GRAPHILE_CACHE_ADMISSION_MODE),
    heapLimitBytes,
    rssLimitBytes,
    instanceHeapBytes,
    serverReserveBytes,
    buildReserveBytes,
    rssBuildReserveBytes,
    budgetCapacity,
    calibration: {
      id: process.env.GRAPHILE_CACHE_CALIBRATION_ID?.trim() || null,
      instanceHeapSource: instanceHeap.source,
      instanceHeapSampleCount: measuredInstanceSamples.length,
      serverReserveSource: serverReserve.source,
      buildReserveSource: buildReserve.source
    }
  };
}

/**
 * Cache entry for PostGraphile v5 instances
 *
 * Each entry contains:
 * - pgl: The PostGraphile instance (manages schema, plugins, etc.)
 * - serv: The Grafserv server instance (handles HTTP/WS)
 * - handler: Lean Express router for routing requests
 * - httpServer: Optional legacy/custom server; cached instances use the shared
 *   outer server and leave this null
 * - cacheKey: Unique identifier for this entry
 * - createdAt: Timestamp when this entry was created
 */
export interface GraphileCacheEntry {
  pgl: PostGraphileInstance;
  serv: GrafservBase;
  handler: Router;
  /** No-server Grafserv handler selected only after exact tenant routing. */
  upgradeHandler?: GraphileUpgradeHandler | null;
  /** Raw sockets retained so disposal can terminate long-lived subscriptions. */
  websocketSockets?: Set<Duplex>;
  httpServer: HttpServer | null;
  cacheKey: string;
  /** Opaque pg-cache identity used by this instance. */
  poolIdentity?: string;
  /**
   * Runtime pool ownership transferred from `createGraphileInstance()`.
   * Disposal releases it only after requests and long-lived resources drain.
   */
  poolLease?: PgPoolLease;
  /** Idempotent release for pgServices owned by this exact preset generation. */
  releasePresetServices?: () => Promise<void>;
  /** Routing label for diagnostics and targeted invalidation only. */
  serviceKey?: string;
  /** Tenant database id for targeted invalidation. */
  databaseId?: string | null;
  createdAt: number;
  /** Optional RealtimeManager for cursor-tracked subscription delivery */
  realtimeManager?: { stop(): Promise<void> } | null;
  /** Caller-provided shared subscriber; preset services do not own it. */
  realtimeSubscriber?: { release(): Promise<void> } | null;
  /** Credential-free role-audit provenance plus coalesced TTL refresh. */
  realtimeRoleAttestation?: GraphileRealtimeRoleAttestation;
  /** Fatal delivery failures latch this generation unavailable until rebuilt. */
  realtimeHealth?: GraphileRealtimeHealth;
  /** Requests currently executing through this exact instance. */
  inflight?: number;
  /** Once true, no new request may enter this instance. */
  disposing?: boolean;
  /** Optional retained-heap measurement supplied by the validation harness. */
  retainedHeapBytes?: number;
}

const disposalPromises = new WeakMap<GraphileCacheEntry, Promise<void>>();
const activeDisposals = new Set<Promise<void>>();
let failedDisposalCount = 0;
const drainWaiters = new WeakMap<GraphileCacheEntry, Set<() => void>>();
const pendingEvictionReasons = new Map<string, EvictionReason>();

export const getDrainingCount = (): number => activeDisposals.size;

const notifyDrained = (entry: GraphileCacheEntry): void => {
  if ((entry.inflight ?? 0) > 0) return;
  const waiters = drainWaiters.get(entry);
  if (!waiters) return;
  drainWaiters.delete(entry);
  for (const resolve of waiters) resolve();
};

const waitForEntryDrain = (entry: GraphileCacheEntry): Promise<void> => {
  if ((entry.inflight ?? 0) === 0) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const waiters = drainWaiters.get(entry) ?? new Set<() => void>();
    waiters.add(resolve);
    drainWaiters.set(entry, waiters);
  });
};

export const raceWithClearedTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<{ timedOut: false; value: T } | { timedOut: true }> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ timedOut: true }>((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
    timer.unref?.();
  });
  try {
    return await Promise.race([
      promise.then((value) => ({ timedOut: false as const, value })),
      timeout
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Dispose a PostGraphile v5 cache entry
 *
 * Properly releases resources by:
 * 1. Waiting for resident requests to drain
 * 2. Closing the HTTP server and releasing PostGraphile/Grafserv
 * 3. Releasing the generation's preset services and PgSubscriber checkout
 * 4. Stopping cursor-tracked realtime delivery
 * 4. Releasing the retained runtime-pool lease
 *
 * The promise is keyed by entry identity, so two generations with the same
 * cache key both release exactly once and duplicate teardown is coalesced.
 */
const scheduleDisposal = (entry: GraphileCacheEntry, key: string): Promise<void> => {
  const existing = disposalPromises.get(entry);
  if (existing) return existing;

  entry.disposing = true;
  // WebSocket subscriptions are deliberately long-lived. Waiting for clients
  // to leave voluntarily would make LRU eviction and shutdown unbounded, so a
  // retiring generation terminates only its own exact sockets before draining.
  for (const socket of entry.websocketSockets ?? []) socket.destroy();
  cacheCounters.disposalsStarted++;
  const pending = (async () => {
    const drainTimeoutMs = parsePositiveInt(
      process.env.GRAPHILE_CACHE_DRAIN_TIMEOUT_MS,
      30_000
    );
    const initialDrain = await raceWithClearedTimeout(waitForEntryDrain(entry), drainTimeoutMs);
    if (initialDrain.timedOut) {
      cacheCounters.drainTimeouts++;
      log.warn(
        `PostGraphile[${key}] still has ${entry.inflight ?? 0} request(s) after ` +
        `${drainTimeoutMs}ms; teardown remains deferred until they finish`
      );
      // Correctness wins over reclaim speed: never release an instance while a
      // resident request is still executing through it.
      await waitForEntryDrain(entry);
    }

    log.debug(`Disposing PostGraphile[${key}]`);
    let firstError: unknown;
    try {
      if (entry.httpServer) {
        await new Promise<void>((resolve) => entry.httpServer.close(() => resolve()));
      }
    } catch (error) {
      firstError = error;
    }
    try {
      await entry.pgl.release();
    } catch (error) {
      firstError ??= error;
    }
    try {
      await entry.releasePresetServices?.();
    } catch (error) {
      firstError ??= error;
    }
    try {
      // A live GraphQL subscription may hold the PgSubscriber checkout while
      // cursor tracking uses the other slot in the minimum max=2 runtime pool.
      // Release Grafserv and the preset services first so cursor cleanup cannot
      // deadlock waiting for a checkout that only PgSubscriber teardown returns.
      if (entry.realtimeManager) await entry.realtimeManager.stop();
    } catch (error) {
      firstError ??= error;
    }
    try {
      entry.realtimeRoleAttestation?.release();
    } catch (error) {
      firstError ??= error;
    }
    try {
      await entry.realtimeSubscriber?.release();
    } catch (error) {
      firstError ??= error;
    }
    try {
      entry.poolLease?.release();
    } catch (error) {
      firstError ??= error;
    }
    if (firstError) throw firstError;
    cacheCounters.disposalsCompleted++;
  })();

  disposalPromises.set(entry, pending);
  activeDisposals.add(pending);
  void pending
    .catch((error) => {
      failedDisposalCount++;
      cacheCounters.disposalFailures++;
      log.error(`Failed to dispose PostGraphile[${key}]:`, error);
    })
    .finally(() => activeDisposals.delete(pending));
  return pending;
};

/** Dispose an instance that finished building after its contract was invalidated. */
export const disposeUncachedEntry = (
  entry: GraphileCacheEntry,
  key = entry.cacheKey
): Promise<void> => scheduleDisposal(entry, key);

export const waitForEntryDisposal = async (
  entry: GraphileCacheEntry,
  timeoutMs = 20_000
): Promise<boolean> => {
  const pending = disposalPromises.get(entry);
  if (!pending) return true;
  const result = await raceWithClearedTimeout(pending, timeoutMs);
  if (result.timedOut) cacheCounters.disposalTimeouts++;
  return !result.timedOut;
};

export const waitForActiveDisposals = async (timeoutMs = 20_000): Promise<boolean> => {
  if (activeDisposals.size === 0) return true;
  const result = await raceWithClearedTimeout(
    Promise.allSettled([...activeDisposals]),
    timeoutMs
  );
  if (result.timedOut) cacheCounters.disposalTimeouts++;
  return !result.timedOut;
};

/**
 * Determine the eviction reason for a cache entry
 */
const getEvictionReason = (key: string, entry: GraphileCacheEntry): EvictionReason => {
  const explicit = pendingEvictionReasons.get(key);
  if (explicit) {
    pendingEvictionReasons.delete(key);
    return explicit;
  }

  // Check if TTL expired
  const age = Date.now() - entry.createdAt;
  const config = getCacheConfig();
  if (age >= config.ttl) {
    return 'ttl';
  }

  return 'lru';
};

// Get initial cache configuration
const initialConfig = getCacheConfig();

// --- Graphile Cache ---
export const graphileCache = new LRUCache<string, GraphileCacheEntry>({
  // Admission enforces the dynamic heap-derived maximum. Keep the backing LRU
  // at the hard ceiling so validated lower per-instance measurements can raise
  // density without reconstructing the cache object.
  max: BACKING_CACHE_MAX,
  ttl: initialConfig.ttl,
  updateAgeOnGet: true,
  dispose: (entry, key) => {
    const reason = getEvictionReason(key, entry);
    cacheCounters.evictions[reason]++;

    // Emit eviction event
    cacheEvents.emitEviction({ key, reason, entry });

    log.debug(`Evicting PostGraphile[${key}] (reason: ${reason})`);

    scheduleDisposal(entry, key);
  }
});

/**
 * The server normally refreshes an expired role attestation before invoking a
 * resident entry. Keep the cache boundary fail-closed too: direct consumers
 * and synchronous WebSocket upgrades must not serve through an expired or
 * failed listener-role proof.
 */
export const isEntryRealtimeUnavailable = (entry: GraphileCacheEntry): boolean => {
  if (entry.realtimeHealth?.status === 'failed') return true;
  const attestation = entry.realtimeRoleAttestation?.snapshot();
  return Boolean(
    attestation
    && (attestation.status === 'failed' || Date.now() >= attestation.validUntil)
  );
};

/**
 * Permanently retire one exact generation after a fail-closed safety check.
 * Marking the entry unavailable happens before cache removal so no concurrent
 * HTTP request or WebSocket operation can enter between the failure and the
 * disposal callback. Only the same resident object may be evicted; a healthy
 * replacement with the same deterministic contract key is never touched.
 */
export const retireGraphileCacheEntry = (
  entry: GraphileCacheEntry,
  error: unknown,
  reason: EvictionReason = 'realtime'
): boolean => {
  entry.realtimeHealth = withGraphileRealtimeFailure(
    entry.realtimeHealth ?? { status: 'healthy' },
    error
  );
  const resident = graphileCache.peek(entry.cacheKey, { allowStale: true });
  if (resident === entry) {
    entry.disposing = true;
    pendingEvictionReasons.set(entry.cacheKey, reason);
    graphileCache.delete(entry.cacheKey);
    return true;
  }

  // An unpublished failed candidate must be rejected by publication. A stale
  // object racing a healthy replacement is already detached and must not alter
  // that replacement's lifecycle or masquerade as its disposal.
  if (!resident) entry.disposing = true;

  // Cache removal normally destroys these through scheduleDisposal(). Keep the
  // boundary fail-closed for an entry racing publication/removal as well.
  for (const socket of entry.websocketSockets ?? []) socket.destroy();
  return false;
};

/** Enter an instance only while it is resident and not being torn down. */
export const invokeEntryHandler = (
  entry: GraphileCacheEntry,
  req: Request,
  res: Response,
  next: NextFunction
): boolean => {
  const requestEnded = (): boolean =>
    Boolean(
      req.aborted
      || req.socket?.destroyed
      || res.destroyed
      || res.writableEnded
    );
  if (requestEnded()) return false;
  if (isEntryRealtimeUnavailable(entry)) {
    // Retire only this exact resident generation. A delayed fatal callback or
    // stale in-flight waiter must never evict a healthy replacement that uses
    // the same deterministic build-contract key.
    retireGraphileCacheEntry(
      entry,
      new Error('Graphile realtime generation is unavailable')
    );
    if (!res.headersSent) {
      res.setHeader('Retry-After', '15');
      res.status(503).json({
        error: {
          code: GRAPHILE_REALTIME_UNAVAILABLE_CODE,
          message: 'Realtime delivery is unavailable for this GraphQL instance'
        }
      });
    }
    return true;
  }
  if (entry.disposing) return false;
  cacheCounters.httpRequestsStarted++;
  entry.inflight = (entry.inflight ?? 0) + 1;
  let released = false;
  const release = (): void => {
    if (released) return;
    released = true;
    cacheCounters.httpRequestsCompleted++;
    entry.inflight = Math.max(0, (entry.inflight ?? 1) - 1);
    notifyDrained(entry);
  };
  res.once('finish', release);
  res.once('close', release);
  // The response can close between the initial check and listener attachment.
  // Rechecking after attachment turns that race into an ordinary release.
  if (requestEnded()) {
    res.removeListener('finish', release);
    res.removeListener('close', release);
    release();
    return false;
  }
  try {
    entry.handler(req, res, next);
  } catch (error) {
    release();
    throw error;
  }
  return true;
};

/**
 * Refresh an expired shared-listener role audit before serving through a
 * resident generation. A failed refresh latches realtimeHealth via the
 * activation observer, so the normal invocation boundary returns 503.
 */
export const revalidateEntryRealtimeRole = async (
  entry: GraphileCacheEntry
): Promise<boolean> => {
  if (!entry.realtimeRoleAttestation) return true;
  return entry.realtimeRoleAttestation.revalidateIfDue();
};

export interface GraphileUpgradeInvocationOptions {
  /** Transfer the outer transport after this exact generation is retained. */
  onAccepted?: () => void;
  /** Retire outer admission state before a stable cache-level rejection. */
  onRejected?: () => void;
}

const writeUpgradeError = (
  socket: Duplex,
  status: number,
  code: string,
  retryAfter?: number
): void => {
  if (socket.destroyed) return;
  const body = JSON.stringify({ error: { code } });
  const headers = [
    `HTTP/1.1 ${status} Service Unavailable`,
    'Connection: close',
    'Content-Type: application/json; charset=utf-8',
    `Content-Length: ${Buffer.byteLength(body)}`,
    ...(retryAfter == null ? [] : [`Retry-After: ${retryAfter}`]),
    '',
    body
  ].join('\r\n');
  try {
    socket.end(headers);
  } catch {
    socket.destroy();
  }
};

/**
 * Route one already-authorized WebSocket upgrade into an exact cache entry.
 * The outer server owns host/path/API selection; this function owns generation
 * health, drain accounting, and bounded teardown of the accepted socket.
 */
export const invokeEntryUpgradeHandler = (
  entry: GraphileCacheEntry,
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  options: GraphileUpgradeInvocationOptions = {}
): boolean => {
  if (request.aborted || socket.destroyed) return false;
  if (isEntryRealtimeUnavailable(entry)) {
    retireGraphileCacheEntry(
      entry,
      new Error('Graphile realtime generation is unavailable')
    );
    try {
      options.onRejected?.();
      writeUpgradeError(socket, 503, GRAPHILE_REALTIME_UNAVAILABLE_CODE, 15);
    } catch (error) {
      socket.destroy();
      throw error;
    }
    return true;
  }
  if (entry.disposing) return false;
  if (!entry.upgradeHandler) {
    try {
      options.onRejected?.();
      writeUpgradeError(socket, 503, GRAPHILE_WEBSOCKET_UNAVAILABLE_CODE, 15);
    } catch (error) {
      socket.destroy();
      throw error;
    }
    return true;
  }

  cacheCounters.websocketUpgradesStarted++;
  entry.inflight = (entry.inflight ?? 0) + 1;
  const sockets = entry.websocketSockets ?? new Set<Duplex>();
  entry.websocketSockets = sockets;
  sockets.add(socket);
  let released = false;
  const release = (): void => {
    if (released) return;
    released = true;
    cacheCounters.websocketUpgradesCompleted++;
    socket.removeListener('close', release);
    socket.removeListener('error', release);
    sockets.delete(socket);
    entry.inflight = Math.max(0, (entry.inflight ?? 1) - 1);
    notifyDrained(entry);
  };
  socket.once('close', release);
  socket.once('error', release);
  if (request.aborted || socket.destroyed || entry.disposing) {
    release();
    return false;
  }
  try {
    // The outer router may own a synthetic HTTP response while it runs tenant
    // routing, authentication, and build admission. Transfer that transport
    // only after this exact generation has passed every fail-closed check and
    // is already accounted as in-flight.
    options.onAccepted?.();
    entry.upgradeHandler(request, socket, head);
  } catch (error) {
    release();
    socket.destroy();
    throw error;
  }
  return true;
};

export type MemoryPressureLevel = 'ok' | 'elevated' | 'critical';

export interface MemoryPressure {
  level: MemoryPressureLevel;
  heapLevel: MemoryPressureLevel;
  rssLevel: MemoryPressureLevel | 'unbounded';
  heapUsed: number;
  heapLimit: number;
  available: number;
  ratio: number;
  rssBytes: number;
  rssLimitBytes: number | null;
  rssRatio: number | null;
}

const parseFraction = (value: string | undefined, fallback: number): number => {
  const parsed = value ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 && parsed < 1 ? parsed : fallback;
};

const pressureLevel = (
  ratio: number,
  elevatedAt: number,
  criticalAt: number
): MemoryPressureLevel => ratio >= criticalAt
  ? 'critical'
  : ratio >= elevatedAt
    ? 'elevated'
    : 'ok';

export const getMemoryPressure = (): MemoryPressure => {
  const stats = getHeapStatistics();
  const memory = process.memoryUsage();
  const heapUsed = memory.heapUsed;
  const available = stats.total_available_size ?? Math.max(0, stats.heap_size_limit - heapUsed);
  const exhaustible = heapUsed + available;
  const ratio = exhaustible > 0 ? heapUsed / exhaustible : 0;
  const elevatedAt = parseFraction(
    process.env.GRAPHILE_MEMORY_GOVERNOR_ELEVATED,
    0.85
  );
  const criticalAt = parseFraction(
    process.env.GRAPHILE_MEMORY_GOVERNOR_CRITICAL,
    0.92
  );
  const heapLevel = pressureLevel(ratio, elevatedAt, criticalAt);
  const rssLimitBytes = getCacheConfig().rssLimitBytes;
  const rssRatio = rssLimitBytes == null ? null : memory.rss / rssLimitBytes;
  const rssLevel = rssRatio == null
    ? 'unbounded' as const
    : pressureLevel(rssRatio, elevatedAt, criticalAt);
  const level: MemoryPressureLevel = heapLevel === 'critical' || rssLevel === 'critical'
    ? 'critical'
    : heapLevel === 'elevated' || rssLevel === 'elevated'
      ? 'elevated'
      : 'ok';
  return {
    level,
    heapLevel,
    rssLevel,
    heapUsed,
    heapLimit: stats.heap_size_limit,
    available,
    ratio,
    rssBytes: memory.rss,
    rssLimitBytes,
    rssRatio
  };
};

export type BuildRefusalReason =
  | 'critical_pressure'
  | 'insufficient_budget'
  | 'rss_budget_exceeded'
  | 'disposal_timeout'
  | 'resident_busy'
  | 'resident_capacity'
  | 'disposal_failed';

export interface BuildAdmissionDecision {
  admit: boolean;
  reason?: BuildRefusalReason;
  pressure: MemoryPressure;
  projectedBytes: number;
  heapLimitBytes: number;
  projectedRssBytes: number;
  rssLimitBytes: number | null;
}

export const evaluateBuildAdmission = (
  residentCount = graphileCache.size
): BuildAdmissionDecision => {
  const config = getCacheConfig();
  const pressure = getMemoryPressure();
  const projectedBytes =
    config.serverReserveBytes +
    residentCount * config.instanceHeapBytes +
    config.buildReserveBytes;
  const projectedRssBytes = pressure.rssBytes + config.rssBuildReserveBytes;
  if (pressure.level === 'critical') {
    return {
      admit: false,
      reason: 'critical_pressure',
      pressure,
      projectedBytes,
      heapLimitBytes: config.heapLimitBytes,
      projectedRssBytes,
      rssLimitBytes: config.rssLimitBytes
    };
  }
  if (failedDisposalCount > 0) {
    return {
      admit: false,
      reason: 'disposal_failed',
      pressure,
      projectedBytes,
      heapLimitBytes: config.heapLimitBytes,
      projectedRssBytes,
      rssLimitBytes: config.rssLimitBytes
    };
  }
  // The preserve-resident mode turns the calibrated ceiling into a hard
  // admission boundary. Check it before the transient-build calculation: the
  // default mode deliberately evaluates a full cache, evicts one idle entry,
  // and then evaluates the transient budget again.
  if (config.admissionMode === 'preserve-resident' && residentCount >= config.max) {
    return {
      admit: false,
      reason: 'resident_capacity',
      pressure,
      projectedBytes,
      heapLimitBytes: config.heapLimitBytes,
      projectedRssBytes,
      rssLimitBytes: config.rssLimitBytes
    };
  }
  if (config.budgetCapacity === 0 || projectedBytes > config.heapLimitBytes) {
    return {
      admit: false,
      reason: 'insufficient_budget',
      pressure,
      projectedBytes,
      heapLimitBytes: config.heapLimitBytes,
      projectedRssBytes,
      rssLimitBytes: config.rssLimitBytes
    };
  }
  if (
    config.rssLimitBytes != null
    && projectedRssBytes > config.rssLimitBytes
  ) {
    return {
      admit: false,
      reason: 'rss_budget_exceeded',
      pressure,
      projectedBytes,
      heapLimitBytes: config.heapLimitBytes,
      projectedRssBytes,
      rssLimitBytes: config.rssLimitBytes
    };
  }
  return {
    admit: true,
    pressure,
    projectedBytes,
    heapLimitBytes: config.heapLimitBytes,
    projectedRssBytes,
    rssLimitBytes: config.rssLimitBytes
  };
};

export const recordBuildRefusal = (reason: BuildRefusalReason): void => {
  cacheCounters.buildRefusals[reason]++;
};

export class CacheBuildAdmissionError extends Error {
  readonly retryAfterSeconds = 15;

  constructor(readonly reason: BuildRefusalReason) {
    super(`Graphile build admission refused: ${reason}`);
    this.name = 'CacheBuildAdmissionError';
  }
}

const evictEntry = (
  key: string,
  reason: EvictionReason
): GraphileCacheEntry | undefined => {
  const entry = graphileCache.peek(key);
  if (!entry) return undefined;
  pendingEvictionReasons.set(key, reason);
  graphileCache.delete(key);
  return entry;
};

export const deleteGraphileCacheEntry = async (
  key: string,
  reason: EvictionReason = 'manual'
): Promise<boolean> => {
  const entry = evictEntry(key, reason);
  if (!entry) return false;
  await (disposalPromises.get(entry) ?? Promise.resolve());
  return true;
};

/**
 * Make one build slot and wait until every evicted instance has truly released.
 * This runs inside the global build coordinator, so the size check and eviction
 * cannot race another large build.
 */
export const prepareCacheForBuild = async (
  timeoutMs = 20_000
): Promise<{ evicted: number; decision: BuildAdmissionDecision }> => {
  const initial = evaluateBuildAdmission();
  if (
    !initial.admit &&
    (initial.reason === 'critical_pressure'
      || initial.reason === 'disposal_failed'
      || initial.reason === 'resident_capacity')
  ) {
    recordBuildRefusal(initial.reason);
    throw new CacheBuildAdmissionError(initial.reason);
  }

  const startedAt = Date.now();
  if (!await waitForActiveDisposals(timeoutMs)) {
    recordBuildRefusal('disposal_timeout');
    throw new CacheBuildAdmissionError('disposal_timeout');
  }
  const targetSize = Math.max(0, getCacheConfig().max - 1);
  let evicted = 0;
  while (graphileCache.size > targetSize) {
    const keys = [...graphileCache.rkeys()];
    const idleKey = keys.find((key) => {
      const entry = graphileCache.peek(key);
      return entry && !entry.disposing && (entry.inflight ?? 0) === 0;
    });
    if (!idleKey) {
      recordBuildRefusal('resident_busy');
      throw new CacheBuildAdmissionError('resident_busy');
    }
    const victimKey = idleKey;
    const entry = evictEntry(victimKey, 'admission');
    if (!entry) continue;
    evicted++;

    const remainingMs = Math.max(1, timeoutMs - (Date.now() - startedAt));
    let disposed = false;
    try {
      disposed = await waitForEntryDisposal(entry, remainingMs);
    } catch (error) {
      log.error(`PostGraphile[${victimKey}] disposal failed during build admission`, error);
    }
    if (!disposed) {
      recordBuildRefusal('disposal_timeout');
      throw new CacheBuildAdmissionError('disposal_timeout');
    }
  }

  const decision = evaluateBuildAdmission(graphileCache.size);
  if (!decision.admit && decision.reason) {
    recordBuildRefusal(decision.reason);
    throw new CacheBuildAdmissionError(decision.reason);
  }
  return { evicted, decision };
};

let governorTimer: ReturnType<typeof setInterval> | null = null;
let governorUsers = 0;

export const startMemoryGovernor = (intervalMs = 10_000): (() => void) => {
  if (process.env.GRAPHILE_MEMORY_GOVERNOR === '0') return () => {};
  governorUsers++;
  if (!governorTimer) {
    governorTimer = setInterval(() => {
      const pressure = getMemoryPressure();
      if (pressure.level === 'ok') return;
      for (const key of graphileCache.rkeys()) {
        const entry = graphileCache.peek(key);
        // A pressure governor must not interrupt a resident request.
        if (entry && !entry.disposing && (entry.inflight ?? 0) === 0) {
          log.warn(
            `Memory governor evicting PostGraphile[${key}] at ${pressure.level} pressure`
          );
          evictEntry(key, 'governor');
          break;
        }
      }
    }, intervalMs);
    governorTimer.unref?.();
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    governorUsers = Math.max(0, governorUsers - 1);
    if (governorUsers === 0 && governorTimer) {
      clearInterval(governorTimer);
      governorTimer = null;
    }
  };
};

export const stopMemoryGovernor = (): void => {
  governorUsers = 0;
  if (!governorTimer) return;
  clearInterval(governorTimer);
  governorTimer = null;
};

// --- Cache Stats ---
export interface CacheStats {
  size: number;
  max: number;
  ttl: number;
  admissionMode: CacheAdmissionMode;
  keys: string[];
  realtimeUnhealthy: number;
  realtimeRoleAttestations: {
    generations: number;
    identities: number;
    healthy: number;
    failed: number;
    stale: number;
    activeIdentityAuditAttempts: number;
    catalogAuditAttempts: number;
    catalogAuditFailures: number;
    activeDatabaseTargets: number;
    databaseConfigurationConflicts: number;
    oldestLastAttestedAt: number | null;
  };
  draining: number;
  budgetCapacity: number;
  instanceHeapBytes: number;
  heapLimitBytes: number;
  rssLimitBytes: number | null;
  rssBuildReserveBytes: number;
  calibration: CacheCalibrationProvenance;
  pressure: MemoryPressure;
}

/**
 * Get current cache statistics
 */
export function getCacheStats(): CacheStats {
  const config = getCacheConfig();
  const realtimeRoleAttestationGenerations = [...graphileCache.values()]
    .filter((entry) => Boolean(entry.realtimeRoleAttestation)).length;
  const realtimeRoleAuditStats = getGraphileRealtimeRoleAuditStats();
  return {
    size: graphileCache.size,
    max: config.max,
    ttl: config.ttl,
    admissionMode: config.admissionMode,
    keys: [...graphileCache.keys()],
    realtimeUnhealthy: [...graphileCache.values()].filter(
      (entry) => entry.realtimeHealth?.status === 'failed'
    ).length,
    realtimeRoleAttestations: {
      generations: realtimeRoleAttestationGenerations,
      ...realtimeRoleAuditStats
    },
    draining: getDrainingCount(),
    budgetCapacity: config.budgetCapacity,
    instanceHeapBytes: config.instanceHeapBytes,
    heapLimitBytes: config.heapLimitBytes,
    rssLimitBytes: config.rssLimitBytes,
    rssBuildReserveBytes: config.rssBuildReserveBytes,
    calibration: config.calibration,
    pressure: getMemoryPressure()
  };
}

// --- Clear Matching Entries ---
/**
 * Clear cache entries matching a regex pattern
 *
 * @param pattern - RegExp to match against cache keys
 * @returns Number of entries cleared
 */
export function clearMatchingEntries(pattern: RegExp): number {
  let cleared = 0;

  for (const key of graphileCache.keys()) {
    if (pattern.test(key)) {
      pendingEvictionReasons.set(key, 'manual');
      graphileCache.delete(key);
      cleared++;
    }
  }

  return cleared;
}

// A retained lease prevents ordinary pg-cache eviction while an entry is
// resident. This callback remains a fail-safe for legacy unleased entries and
// explicit process-wide pg-cache shutdown, which is allowed to override leases.
pgCache.registerCleanupCallback((pgPoolKey: string) => {
  log.debug(`pgPool[${pgPoolKey}] disposed - checking graphile entries`);

  // Remove graphile entries that reference this pool key
  graphileCache.forEach((entry, k) => {
    if (entry.poolIdentity === pgPoolKey) {
      log.debug(`Removing graphileCache[${k}] due to pgPool[${pgPoolKey}] disposal`);
      pendingEvictionReasons.set(k, 'manual');
      graphileCache.delete(k);
    }
  });
});

// Enhanced close function that handles all caches
const closePromise: { promise: Promise<void> | null } = { promise: null };

export const clearGraphileCache = async (): Promise<void> => {
  const entries = [...graphileCache.entries()];
  for (const [key] of entries) pendingEvictionReasons.set(key, 'manual');
  graphileCache.clear();
  const disposePromises = entries.map(([, entry]) => disposalPromises.get(entry));
  await Promise.allSettled([
    ...disposePromises.filter((promise): promise is Promise<void> => Boolean(promise)),
    ...activeDisposals
  ]);
  pendingEvictionReasons.clear();
};

/**
 * Close all caches and release resources
 *
 * This function:
 * 1. Disposes all PostGraphile v5 instances (async)
 * 2. Clears the graphile cache
 * 3. Closes all pg pools via pgCache
 *
 * The function is idempotent - calling it multiple times
 * returns the same promise.
 */
export const closeAllCaches = async (verbose = false): Promise<void> => {
  if (closePromise.promise) return closePromise.promise;

  closePromise.promise = (async () => {
    try {
      if (verbose) log.info('Closing all server caches...');
      stopMemoryGovernor();

      await clearGraphileCache();

      // Close pg pools
      await pgCache.close();

      if (verbose) log.success('All caches disposed.');
    } finally {
      closePromise.promise = null;
    }
  })();

  return closePromise.promise;
};
