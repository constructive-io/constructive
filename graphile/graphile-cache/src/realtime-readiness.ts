import { randomUUID } from 'node:crypto';

import { Logger } from '@pgpmjs/logger';
import type { RealtimePublisher } from 'graphile-realtime-subscriptions';

const log = new Logger('graphile-cache:realtime');

export const DEFAULT_GRAPHILE_REALTIME_SCHEMA = 'realtime_public';
export const GRAPHILE_REALTIME_UNAVAILABLE_CODE = 'GRAPHILE_REALTIME_UNAVAILABLE';

// One module instance represents one Node.js process/worker runtime. A random
// component prevents two replicas serving the same exact build contract from
// sharing a database cursor identity and cleaning up each other's state.
const GRAPHILE_REALTIME_PROCESS_ID = `${process.pid}-${randomUUID()}`;

export const createGraphileRealtimeNodeId = (
  cacheKey: string,
  replicaIdentity = GRAPHILE_REALTIME_PROCESS_ID
): string => `graphile-cache:${replicaIdentity}:${cacheKey}`;

export type GraphileRealtimeHealth =
  | { readonly status: 'healthy' }
  | {
    readonly status: 'failed';
    readonly failureCode: string | null;
    readonly failedAt: number;
  };

export const createGraphileRealtimeHealth = (): GraphileRealtimeHealth => ({
  status: 'healthy'
});

const errorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code.length > 0 ? code : null;
};

/** Return the first fatal delivery state; a failed generation stays failed. */
export const withGraphileRealtimeFailure = (
  health: GraphileRealtimeHealth,
  error: unknown,
  failedAt = Date.now()
): GraphileRealtimeHealth => health.status === 'failed'
  ? health
  : {
    status: 'failed',
    failureCode: errorCode(error),
    failedAt
  };

export class GraphileRealtimeStartupError extends Error {
  readonly code = 'GRAPHILE_REALTIME_STARTUP_FAILED';

  constructor(cacheKey: string, readonly cause?: unknown) {
    super(`PostGraphile[${cacheKey}] realtime was configured but could not start`);
    this.name = 'GraphileRealtimeStartupError';
  }
}

export interface GraphileRealtimeManager {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface GraphileRealtimeManagerConstructor {
  new(options: {
    pgSubscriber?: any;
    publisher?: RealtimePublisher;
    pool: any;
    nodeId: string;
    schema: string;
    allowedSourceSchemas: readonly string[];
    pollIntervalMs?: number;
    heartbeatIntervalMs?: number;
    onFatalError?: (error: Error) => void;
  }): GraphileRealtimeManager;
}

export interface StartConfiguredRealtimeOptions {
  cacheKey: string;
  resolvedPreset: unknown;
  /**
   * Physical schema containing the cursor functions for this exact runtime
   * identity. Omit to preserve the historical `realtime_public` behavior.
   */
  realtimeSchema?: string;
  /** Exact physical schemas exposed by this Graphile instance. */
  allowedSourceSchemas: readonly string[];
  /** Explicit generation-local publisher used by shared-exact mode. */
  publisher?: RealtimePublisher;
  /** Cursor recovery polling interval. */
  pollIntervalMs?: number;
  /** Cursor listener heartbeat interval. */
  heartbeatIntervalMs?: number;
  /** Synchronous fatal-delivery callback used to remove the owner from service. */
  onFatalError?: (error: Error) => void;
  releasePostGraphile(): PromiseLike<void> | void;
  loadManager?: () => Promise<GraphileRealtimeManagerConstructor>;
  /** @internal Deterministic injection for replica-identity tests. */
  replicaIdentity?: string;
}

const defaultLoadManager = async (): Promise<GraphileRealtimeManagerConstructor> => {
  const { RealtimeManager } = await import('graphile-realtime-subscriptions');
  return RealtimeManager;
};

/**
 * Realtime is part of readiness when configured. Any missing dependency or
 * startup failure releases the PostGraphile generation before rejecting.
 */
export const startConfiguredRealtime = async (
  options: StartConfiguredRealtimeOptions
): Promise<GraphileRealtimeManager> => {
  const {
    cacheKey,
    resolvedPreset,
    realtimeSchema = DEFAULT_GRAPHILE_REALTIME_SCHEMA,
    allowedSourceSchemas,
    publisher,
    pollIntervalMs,
    heartbeatIntervalMs,
    onFatalError,
    releasePostGraphile,
    loadManager = defaultLoadManager,
    replicaIdentity
  } = options;
  let manager: GraphileRealtimeManager | undefined;
  try {
    const pgService = (resolvedPreset as any)?.pgServices?.[0];
    const pgSubscriber = pgService?.pgSubscriber ?? null;
    const pool = pgService?.adaptorSettings?.pool ?? null;
    if (!publisher && !pgSubscriber) {
      throw new Error(`PostGraphile[${cacheKey}] resolved without a pgSubscriber`);
    }
    if (!pool) {
      throw new Error(`PostGraphile[${cacheKey}] resolved without a runtime pool`);
    }
    const exactSourceSchemas = [...new Set(allowedSourceSchemas ?? [])];
    if (
      exactSourceSchemas.length === 0
      || exactSourceSchemas.some(
        (schema) => typeof schema !== 'string' || schema.length === 0
      )
    ) {
      throw new Error(
        `PostGraphile[${cacheKey}] realtime requires at least one allowed source schema`
      );
    }

    const RealtimeManager = await loadManager();
    manager = new RealtimeManager({
      ...(publisher ? { publisher } : { pgSubscriber }),
      pool,
      nodeId: createGraphileRealtimeNodeId(cacheKey, replicaIdentity),
      schema: realtimeSchema,
      allowedSourceSchemas: exactSourceSchemas,
      ...(pollIntervalMs === undefined ? {} : { pollIntervalMs }),
      ...(heartbeatIntervalMs === undefined ? {} : { heartbeatIntervalMs }),
      ...(onFatalError ? { onFatalError } : {})
    });
    await manager.start();
    return manager;
  } catch (error) {
    if (manager) {
      try {
        await manager.stop();
      } catch (stopError) {
        log.error(
          `Failed to stop partially started RealtimeManager for PostGraphile[${cacheKey}]:`,
          stopError
        );
      }
    }
    try {
      await releasePostGraphile();
    } catch (releaseError) {
      log.error(
        `Failed to release PostGraphile[${cacheKey}] after realtime startup failure:`,
        releaseError
      );
    }
    throw new GraphileRealtimeStartupError(cacheKey, error);
  }
};
