import { Logger } from '@pgpmjs/logger';
import { parseEnvNumber } from '12factor-env';
import pg from 'pg';

const log = new Logger('pg-cache');

const ONE_HOUR_IN_MS = 1000 * 60 * 60;
const ONE_DAY = ONE_HOUR_IN_MS * 24;
const ONE_YEAR = ONE_DAY * 366;

// One runtime and one control identity per database-per-tenant Graphile
// contract, plus room for routing, diagnostics, listeners, and build overlap.
export const PG_CACHE_GRAPHILE_CONTRACT_CAPACITY = 1024;
export const PG_CACHE_OPERATIONAL_RESERVE = 16;
export const DEFAULT_PG_CACHE_MAX =
  PG_CACHE_GRAPHILE_CONTRACT_CAPACITY * 2 + PG_CACHE_OPERATIONAL_RESERVE;

type PgPoolKey = string;
type PoolFactory = () => pg.Pool;

export type PgPoolDisposalReason =
  'capacity' | 'ttl' | 'delete' | 'clear' | 'close' | 'replace';

// Called only when an identity is actually removed from the registry.
export type PoolCleanupCallback = (pgPoolKey: string) => void;

export interface PgPoolLease {
  pool: pg.Pool;
  identity: string;
  /** Idempotently release this exact ownership claim. */
  release(): void;
}

export interface PgCacheConfig {
  /** Maximum number of lazy pool identities retained by this process. */
  max: number;
  /** Idle identity TTL in milliseconds. Leased identities never expire. */
  ttl: number;
}

export interface PgPoolCacheStats {
  size: number;
  max: number;
  ttl: number;
  leasedPools: number;
  idlePools: number;
  activeLeases: number;
  reservations: number;
  pendingDisposals: number;
  hits: number;
  misses: number;
  poolsCreated: number;
  leasesAcquired: number;
  leasesReleased: number;
  capacityEvictions: number;
  ttlExpirations: number;
  capacityRefusals: number;
  disposalsStarted: number;
  disposalsCompleted: number;
  disposalFailures: number;
}

interface PgPoolCacheCounters {
  hits: number;
  misses: number;
  poolsCreated: number;
  leasesAcquired: number;
  leasesReleased: number;
  capacityEvictions: number;
  ttlExpirations: number;
  capacityRefusals: number;
  disposalsStarted: number;
  disposalsCompleted: number;
  disposalFailures: number;
}

interface SlotReservation {
  key: PgPoolKey;
  victims: ManagedPgPool[];
}

export const PG_POOL_CAPACITY_ERROR_CODE = 'PG_POOL_CAPACITY';

/** Fail-closed pool admission error suitable for a stable HTTP 503 mapping. */
export class PgPoolCapacityError extends Error {
  readonly code = PG_POOL_CAPACITY_ERROR_CODE;
  readonly retryAfterSeconds = 15;

  constructor(
    readonly max: number,
    readonly size: number,
    readonly leased: number
  ) {
    super(
      `PostgreSQL pool capacity exhausted: ${size}/${max} identities are retained ` +
        `and ${leased} are leased`
    );
    this.name = 'PgPoolCapacityError';
  }
}

/** Read cache configuration without allocating any pools or connections. */
export function getPgCacheConfig(): PgCacheConfig {
  return {
    max: parseEnvNumber(process.env.PG_CACHE_MAX) ?? DEFAULT_PG_CACHE_MAX,
    ttl: parseEnvNumber(process.env.PG_CACHE_TTL_MS) ?? ONE_YEAR,
  };
}

class ManagedPgPool {
  public isDisposed = false;
  public leaseCount = 0;
  public lastAccessOrder = 0;
  public expiresAt = 0;
  private disposePromise: Promise<void> | null = null;

  constructor(
    public readonly pool: pg.Pool,
    public readonly key: string
  ) {}

  touch(order: number, now: number, ttl: number): void {
    this.lastAccessOrder = order;
    this.expiresAt = now + ttl;
  }

  isExpired(now: number): boolean {
    return now >= this.expiresAt;
  }

  async dispose(): Promise<void> {
    if (this.isDisposed) return this.disposePromise;

    this.isDisposed = true;
    this.disposePromise = (async () => {
      if (!this.pool.ended) {
        await this.pool.end();
        log.success(`pg.Pool ${this.key} ended.`);
      } else {
        log.info(`pg.Pool ${this.key} already ended.`);
      }
    })();

    return this.disposePromise;
  }
}

/**
 * A lease-aware, lazy pool registry.
 *
 * JavaScript executes acquisition synchronously, including slot reservation and
 * factory invocation. Two callers therefore cannot both claim the final slot.
 * Pools may finish ending asynchronously after a zero-lease identity is removed.
 */
export class PgPoolCacheManager {
  private readonly records = new Map<PgPoolKey, ManagedPgPool>();
  private readonly cleanupTasks = new Set<Promise<void>>();
  private readonly cleanupCallbacks = new Set<PoolCleanupCallback>();
  private readonly aliasKeys = new Map<string, Set<PgPoolKey>>();
  private readonly keyAliases = new Map<PgPoolKey, Set<string>>();
  private readonly reservedKeys = new Set<PgPoolKey>();
  private reservations = 0;
  private accessOrder = 0;
  private closed = false;
  private closePromise: Promise<void> | null = null;
  readonly config: PgCacheConfig;

  private readonly counters: PgPoolCacheCounters = {
    hits: 0,
    misses: 0,
    poolsCreated: 0,
    leasesAcquired: 0,
    leasesReleased: 0,
    capacityEvictions: 0,
    ttlExpirations: 0,
    capacityRefusals: 0,
    disposalsStarted: 0,
    disposalsCompleted: 0,
    disposalFailures: 0,
  };

  constructor(config?: Partial<PgCacheConfig>) {
    const defaults = getPgCacheConfig();
    this.config = { ...defaults, ...config };
    if (!Number.isSafeInteger(this.config.max) || this.config.max <= 0) {
      throw new Error('pg-cache max must be a positive safe integer');
    }
    if (!Number.isFinite(this.config.ttl) || this.config.ttl <= 0) {
      throw new Error('pg-cache ttl must be a positive number');
    }
  }

  get size(): number {
    return this.records.size;
  }

  registerCleanupCallback(callback: PoolCleanupCallback): () => void {
    this.cleanupCallbacks.add(callback);
    return () => this.cleanupCallbacks.delete(callback);
  }

  /** Preserve database-name cleanup for callers migrating to opaque keys. */
  registerAlias(alias: string, key: PgPoolKey): void {
    if (!this.records.has(key)) return;
    let keys = this.aliasKeys.get(alias);
    if (!keys) {
      keys = new Set();
      this.aliasKeys.set(alias, keys);
    }
    keys.add(key);
    let aliases = this.keyAliases.get(key);
    if (!aliases) {
      aliases = new Set();
      this.keyAliases.set(key, aliases);
    }
    aliases.add(alias);
  }

  get(key: PgPoolKey): pg.Pool | undefined {
    if (this.closed) {
      log.warn(`Cache is closed, ignoring get(${key})`);
      return undefined;
    }
    const managedPool = this.getLiveRecord(key, true);
    if (!managedPool) {
      this.counters.misses++;
      return undefined;
    }
    this.counters.hits++;
    return managedPool.pool;
  }

  has(key: PgPoolKey): boolean {
    if (this.closed) return false;
    return Boolean(this.getLiveRecord(key, false));
  }

  /**
   * Legacy direct insertion. Prefer getOrCreate/acquire so capacity is checked
   * before the caller constructs a pool.
   */
  set(key: PgPoolKey, pool: pg.Pool): void {
    this.assertOpen(key);
    const existing = this.records.get(key);
    if (existing?.pool === pool) {
      this.touch(existing);
      return;
    }
    if (existing?.leaseCount) {
      throw new Error(`Cannot replace leased pg pool identity ${key}`);
    }
    if (existing) this.removeRecord(existing, 'replace');

    const reservation = this.reserveSlot(key);
    this.commitReservation(reservation, pool, 0);
  }

  /** Atomically capacity-check, synchronously construct, and cache an idle pool. */
  getOrCreate(key: PgPoolKey, factory: PoolFactory): pg.Pool {
    this.assertOpen(key);
    const existing = this.getLiveRecord(key, true);
    if (existing) {
      this.counters.hits++;
      return existing.pool;
    }

    this.counters.misses++;
    return this.createWithReservation(key, factory, 0).pool;
  }

  /**
   * Atomically get/create and lease an exact identity. A leased identity cannot
   * be selected by capacity or TTL eviction until every lease is released.
   */
  acquire(key: PgPoolKey, factory: PoolFactory): PgPoolLease {
    this.assertOpen(key);
    let managedPool = this.getLiveRecord(key, true);
    if (managedPool) {
      this.counters.hits++;
      managedPool.leaseCount++;
    } else {
      this.counters.misses++;
      managedPool = this.createWithReservation(key, factory, 1);
    }
    this.counters.leasesAcquired++;
    return this.makeLease(managedPool);
  }

  /** Explicit deletion never interrupts a lease; callers may retry after release. */
  delete(key: PgPoolKey): void {
    const managedPool = this.records.get(key);
    if (managedPool) {
      if (managedPool.leaseCount === 0)
        this.removeRecord(managedPool, 'delete');
      return;
    }
    for (const aliasedKey of [...(this.aliasKeys.get(key) ?? [])]) {
      const aliasedPool = this.records.get(aliasedKey);
      if (aliasedPool && aliasedPool.leaseCount === 0) {
        this.removeRecord(aliasedPool, 'delete');
      }
    }
  }

  /** Clear every currently unleased identity. */
  clear(): void {
    for (const managedPool of [...this.records.values()]) {
      if (managedPool.leaseCount === 0) this.removeRecord(managedPool, 'clear');
    }
  }

  async close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.closed = true;
    this.closePromise = (async () => {
      try {
        // Explicit process teardown is the only operation that may override leases.
        for (const managedPool of [...this.records.values()]) {
          this.removeRecord(managedPool, 'close');
        }
        await this.waitForDisposals();
      } finally {
        // Preserve the established restart/provisioning behavior.
        this.closed = false;
        this.closePromise = null;
      }
    })();
    return this.closePromise;
  }

  async waitForDisposals(): Promise<void> {
    while (this.cleanupTasks.size > 0) {
      await Promise.allSettled([...this.cleanupTasks]);
    }
  }

  getStats(): PgPoolCacheStats {
    let leasedPools = 0;
    let activeLeases = 0;
    for (const managedPool of this.records.values()) {
      if (managedPool.leaseCount > 0) leasedPools++;
      activeLeases += managedPool.leaseCount;
    }
    return {
      size: this.records.size,
      max: this.config.max,
      ttl: this.config.ttl,
      leasedPools,
      idlePools: this.records.size - leasedPools,
      activeLeases,
      reservations: this.reservations,
      pendingDisposals: this.cleanupTasks.size,
      ...this.counters,
    };
  }

  private assertOpen(key: PgPoolKey): void {
    if (this.closed) {
      throw new Error(
        `Cannot access pg cache while it is closed (key: ${key})`
      );
    }
  }

  private touch(managedPool: ManagedPgPool): void {
    managedPool.touch(++this.accessOrder, Date.now(), this.config.ttl);
  }

  private getLiveRecord(
    key: PgPoolKey,
    updateAge: boolean
  ): ManagedPgPool | undefined {
    const managedPool = this.records.get(key);
    if (!managedPool) return undefined;
    if (managedPool.leaseCount === 0 && managedPool.isExpired(Date.now())) {
      this.removeRecord(managedPool, 'ttl');
      return undefined;
    }
    if (updateAge) this.touch(managedPool);
    return managedPool;
  }

  private idleRecordsByAge(): ManagedPgPool[] {
    return [...this.records.values()]
      .filter((managedPool) => managedPool.leaseCount === 0)
      .sort((a, b) => a.lastAccessOrder - b.lastAccessOrder);
  }

  private reserveSlot(key: PgPoolKey): SlotReservation {
    if (this.reservedKeys.has(key)) {
      throw new Error(`Re-entrant pg pool acquisition for identity ${key}`);
    }

    const overflow = Math.max(
      0,
      this.records.size + this.reservations + 1 - this.config.max
    );
    const candidates = this.idleRecordsByAge();
    if (candidates.length < overflow) {
      this.counters.capacityRefusals++;
      throw new PgPoolCapacityError(
        this.config.max,
        this.records.size + this.reservations,
        this.countLeasedPools()
      );
    }

    const victims = candidates.slice(0, overflow);
    for (const victim of victims) this.records.delete(victim.key);
    this.reservations++;
    this.reservedKeys.add(key);
    return { key, victims };
  }

  private rollbackReservation(reservation: SlotReservation): void {
    this.reservations = Math.max(0, this.reservations - 1);
    this.reservedKeys.delete(reservation.key);
    for (const victim of reservation.victims) {
      this.records.set(victim.key, victim);
    }
  }

  private commitReservation(
    reservation: SlotReservation,
    pool: pg.Pool,
    leaseCount: number
  ): ManagedPgPool {
    const managedPool = new ManagedPgPool(pool, reservation.key);
    managedPool.leaseCount = leaseCount;
    this.touch(managedPool);
    this.records.set(reservation.key, managedPool);
    this.reservations = Math.max(0, this.reservations - 1);
    this.reservedKeys.delete(reservation.key);
    this.counters.poolsCreated++;

    for (const victim of reservation.victims) {
      this.counters.capacityEvictions++;
      this.disposeRemovedRecord(victim);
    }
    return managedPool;
  }

  private createWithReservation(
    key: PgPoolKey,
    factory: PoolFactory,
    leaseCount: number
  ): ManagedPgPool {
    const reservation = this.reserveSlot(key);
    let pool: pg.Pool;
    try {
      pool = factory();
    } catch (error) {
      this.rollbackReservation(reservation);
      throw error;
    }
    return this.commitReservation(reservation, pool, leaseCount);
  }

  private makeLease(managedPool: ManagedPgPool): PgPoolLease {
    let released = false;
    return {
      pool: managedPool.pool,
      identity: managedPool.key,
      release: () => {
        if (released) return;
        released = true;
        this.counters.leasesReleased++;
        managedPool.leaseCount = Math.max(0, managedPool.leaseCount - 1);

        // close() may already have detached this record.
        if (this.records.get(managedPool.key) !== managedPool) return;
        if (managedPool.leaseCount > 0) return;
        if (managedPool.isExpired(Date.now())) {
          this.removeRecord(managedPool, 'ttl');
          return;
        }
        this.enforceCapacity();
      },
    };
  }

  private enforceCapacity(): void {
    while (this.records.size > this.config.max) {
      const victim = this.idleRecordsByAge()[0];
      if (!victim) return;
      this.removeRecord(victim, 'capacity');
    }
  }

  private countLeasedPools(): number {
    let leased = 0;
    for (const managedPool of this.records.values()) {
      if (managedPool.leaseCount > 0) leased++;
    }
    return leased;
  }

  private removeRecord(
    managedPool: ManagedPgPool,
    reason: PgPoolDisposalReason
  ): void {
    if (this.records.get(managedPool.key) !== managedPool) return;
    this.records.delete(managedPool.key);
    if (reason === 'capacity') this.counters.capacityEvictions++;
    if (reason === 'ttl') this.counters.ttlExpirations++;
    this.disposeRemovedRecord(managedPool);
  }

  private disposeRemovedRecord(managedPool: ManagedPgPool): void {
    const cleanupKeys = [
      managedPool.key,
      ...this.unregisterAliases(managedPool.key),
    ];
    for (const cleanupKey of cleanupKeys) this.notifyCleanup(cleanupKey);

    // Alternate drivers may intentionally return one physical pool for multiple
    // exact identities. Never end it while another retained identity owns it.
    if (
      [...this.records.values()].some(
        (entry) => entry.pool === managedPool.pool
      )
    ) {
      return;
    }
    if (managedPool.isDisposed) return;

    this.counters.disposalsStarted++;
    let task: Promise<void>;
    task = managedPool
      .dispose()
      .then(() => {
        this.counters.disposalsCompleted++;
      })
      .catch((error) => {
        this.counters.disposalFailures++;
        log.error(
          `Error ending pg.Pool ${managedPool.key}: ${(error as Error).message}`
        );
      })
      .finally(() => this.cleanupTasks.delete(task));
    this.cleanupTasks.add(task);
  }

  private unregisterAliases(key: PgPoolKey): string[] {
    const aliases = [...(this.keyAliases.get(key) ?? [])];
    this.keyAliases.delete(key);
    for (const alias of aliases) {
      const keys = this.aliasKeys.get(alias);
      keys?.delete(key);
      if (keys?.size === 0) this.aliasKeys.delete(alias);
    }
    return aliases;
  }

  private notifyCleanup(pgPoolKey: string): void {
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback(pgPoolKey);
      } catch (err) {
        log.error(`Error in cleanup callback for pool ${pgPoolKey}: ${(err as Error).message}`);
      }
    });
  }
}

// Process-wide registry. Its large capacity is only a key limit; pools and
// PostgreSQL connections remain lazily allocated on first use.
export const pgCache = new PgPoolCacheManager();

export const getPgCacheStats = (): PgPoolCacheStats => pgCache.getStats();

// --- Graceful Shutdown ---
const closePromise: { promise: Promise<void> | null } = { promise: null };

export const close = async (verbose = false): Promise<void> => {
  if (closePromise.promise) return closePromise.promise;

  closePromise.promise = (async () => {
    try {
      if (verbose) log.info('Closing pg cache...');
      await pgCache.close();
      if (verbose) log.success('PG cache disposed.');
    } finally {
      closePromise.promise = null;
    }
  })();

  return closePromise.promise;
};

export const teardownPgPools = async (verbose = false): Promise<void> => {
  return close(verbose);
};
