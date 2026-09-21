import { errors } from '@constructive-io/errors';

import type { GraphileCacheEntry } from './graphile-cache';

/** Metadata used to fence preparation before an exact cache key is available. */
export interface GraphileBuildScopeMetadata {
  cacheKey?: string;
  serviceKey: string;
  poolKey: string;
  databaseId?: string | null;
}

/** Identity for one exact build flight. */
export interface GraphileBuildFlightMetadata extends GraphileBuildScopeMetadata {
  cacheKey: string;
}

export interface GraphileBuildFlightScope {
  /** Throw the canonical invalidated/closed error after this scope is fenced. */
  assertCurrent(): void;
  /** Stop tracking this preparation scope. Safe to call more than once. */
  release(): void;
}

export interface GraphileBuildFlightsOptions {
  /** Synchronous unique-work admission, before allocating a pending flight. */
  assertCanBuild?(): void;
  /** Read the existing resident cache; this registry does not own cache entries. */
  get(key: string): GraphileCacheEntry | undefined;
  /** Build and publish through the existing admitted-build owner. */
  build(
    metadata: GraphileBuildFlightMetadata,
    create: () => Promise<GraphileCacheEntry>,
    assertCurrent: () => void
  ): Promise<GraphileCacheEntry>;
}

interface ScopeRecord {
  metadata: Readonly<GraphileBuildScopeMetadata>;
  current: boolean;
  released: boolean;
  invalidationError?: Error;
  flight?: FlightRecord;
}

interface FlightRecord {
  metadata: Readonly<GraphileBuildFlightMetadata>;
  scope: ScopeRecord;
  promise: Promise<GraphileCacheEntry>;
  resolve(entry: GraphileCacheEntry): void;
  reject(error: unknown): void;
  callerSettled: boolean;
  task: Promise<void>;
}

const invalidatedError = (): Error => errors.SCHEMA_BUILD_INVALIDATED({});
const closedError = (): Error => errors.SCHEMA_BUILDS_CLOSED({});

const copyMetadata = <T extends GraphileBuildScopeMetadata>(
  metadata: T
): Readonly<T> => Object.freeze({ ...metadata });

/**
 * Coalesces exact-key builds while leaving cache ownership and entry disposal
 * with the injected Graphile cache and admitted-build owner.
 */
export class GraphileBuildFlights {
  private readonly scopes = new Set<ScopeRecord>();
  private readonly pending = new Map<string, FlightRecord>();
  private readonly tasks = new Set<Promise<void>>();
  private closed = false;

  constructor(private readonly options: GraphileBuildFlightsOptions) {}

  /** Number of exact-key flights still accepting callers. */
  get pendingCount(): number {
    return this.pending.size;
  }

  /** Snapshot of the exact keys still accepting callers. */
  get pendingKeys(): readonly string[] {
    return [...this.pending.keys()];
  }

  /** Number of underlying builds that have not reached their cleanup terminal state. */
  get activeTaskCount(): number {
    return this.tasks.size;
  }

  /** Number of tracked preparation and build scopes. */
  get activeScopeCount(): number {
    return this.scopes.size;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  /**
   * Synchronously register work that can be invalidated before its exact cache
   * key is known. The caller must release the returned scope in a finally block.
   */
  capture(metadata: GraphileBuildScopeMetadata): GraphileBuildFlightScope {
    if (this.closed) throw closedError();
    return this.createScope(metadata);
  }

  /**
   * Return a resident entry, the exact shared in-flight promise, or start one
   * new build. Registration completes synchronously before the build hook runs.
   */
  getOrCreate(
    metadata: GraphileBuildFlightMetadata,
    create: () => Promise<GraphileCacheEntry>,
    preparationScope?: GraphileBuildFlightScope
  ): Promise<GraphileCacheEntry> {
    if (this.closed) return Promise.reject(closedError());

    if (preparationScope) {
      try {
        preparationScope.assertCurrent();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    let resident: GraphileCacheEntry | undefined;
    try {
      resident = this.options.get(metadata.cacheKey);
    } catch (error) {
      return Promise.reject(error);
    }
    if (resident) return Promise.resolve(resident);

    const existing = this.pending.get(metadata.cacheKey);
    if (existing) return existing.promise;
    try { this.options.assertCanBuild?.(); }
    catch (error) { return Promise.reject(error); }

    const frozenMetadata = copyMetadata(metadata);
    let resolve!: (entry: GraphileCacheEntry) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<GraphileCacheEntry>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    const scope = this.createScope(frozenMetadata);
    const flight: FlightRecord = {
      metadata: frozenMetadata,
      scope: scope.record,
      promise,
      resolve,
      reject,
      callerSettled: false,
      task: Promise.resolve()
    };
    scope.record.flight = flight;

    // Register both the flight and its owned scope before invoking the build
    // hook or the user factory, even if a caller immediately invalidates it.
    this.pending.set(metadata.cacheKey, flight);
    let building: Promise<GraphileCacheEntry>;
    try {
      // The shared owner synchronously reserves its bounded coordinator slot;
      // actual work still starts asynchronously under that coordinator.
      building = this.options.build(frozenMetadata, create, scope.assertCurrent);
    } catch (error) {
      if (this.pending.get(metadata.cacheKey) === flight) this.pending.delete(metadata.cacheKey);
      scope.release();
      flight.callerSettled = true;
      flight.reject(error);
      return promise;
    }
    const task = Promise.resolve(building)
      .then(
        (entry) => {
          if (!flight.callerSettled) {
            flight.callerSettled = true;
            flight.resolve(entry);
          }
        },
        (error: unknown) => {
          // The rejection is explicitly mapped to the caller. If invalidation
          // already settled that caller, this handler still observes the late
          // build/cleanup failure and prevents an unhandled task rejection.
          if (!flight.callerSettled) {
            flight.callerSettled = true;
            flight.reject(error);
          }
        }
      )
      .then(() => {
        if (this.pending.get(metadata.cacheKey) === flight) {
          this.pending.delete(metadata.cacheKey);
        }
        scope.release();
        this.tasks.delete(task);
      });
    flight.task = task;
    this.tasks.add(task);
    return promise;
  }

  /** Fence active scopes synchronously before the caller deletes cache entries. */
  invalidate(
    matches: (metadata: Readonly<GraphileBuildScopeMetadata>) => boolean
  ): number {
    return this.fence(matches, invalidatedError());
  }

  invalidateAll(): number {
    return this.invalidate(() => true);
  }

  /** Reject new work and promptly reject every active caller. */
  close(): void {
    this.closed = true;
    this.fence(() => true, closedError());
  }

  /** Wait for underlying build and cleanup tasks, including invalidated ones. */
  async drain(): Promise<void> {
    await Promise.all([...this.tasks]);
  }

  /** Reopen only after all active tasks and preparation scopes have drained. */
  reopen(): boolean {
    if (!this.closed) return true;
    if (this.tasks.size > 0 || this.scopes.size > 0) return false;
    this.closed = false;
    return true;
  }

  private createScope(
    metadata: GraphileBuildScopeMetadata
  ): GraphileBuildFlightScope & { record: ScopeRecord } {
    const record: ScopeRecord = {
      metadata: copyMetadata(metadata),
      current: true,
      released: false
    };
    this.scopes.add(record);
    return {
      record,
      assertCurrent: () => {
        if (!record.current || record.released) {
          throw record.invalidationError ?? invalidatedError();
        }
      },
      release: () => {
        if (record.released) return;
        record.released = true;
        record.current = false;
        this.scopes.delete(record);
      }
    };
  }

  private fence(
    matches: (metadata: Readonly<GraphileBuildScopeMetadata>) => boolean,
    error: Error
  ): number {
    let fenced = 0;
    for (const scope of this.scopes) {
      if (!scope.current || !matches(scope.metadata)) continue;
      scope.current = false;
      scope.invalidationError = error;
      fenced++;

      const flight = scope.flight;
      if (flight && !flight.callerSettled) {
        flight.callerSettled = true;
        flight.reject(error);
        if (this.pending.get(flight.metadata.cacheKey) === flight) {
          this.pending.delete(flight.metadata.cacheKey);
        }
      }
    }
    return fenced;
  }
}
