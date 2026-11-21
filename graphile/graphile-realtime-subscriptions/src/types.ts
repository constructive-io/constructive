/**
 * Configuration options for the Realtime Subscriptions Plugin.
 */
export interface RealtimeSubscriptionsPluginOptions {
  /**
   * Maximum number of authorized row events per subscription per second.
   * When exceeded, sends one overflow frame without a row or row ID,
   * preserving the triggering operation and signaling the client to refetch.
   *
   * Default: 50
   */
  overflowThreshold?: number;
}

/**
 * A minimal query-capable interface — satisfied by pg.Pool, pg.Client,
 * pg.PoolClient, or any object with a compatible `query` method.
 *
 * CursorTracker and RealtimeManager use only one-shot queries, so
 * `pool.query()` (which internally borrows a client, runs the query,
 * and releases the client) is all that's needed — no callback wrapper.
 */
export interface Queryable {
  query<R = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: R[] }>;
}

/**
 * A single entry from drain_changes(), representing a change_log row
 * matched against subscriber tables.
 */
export interface ChangeLogEntry {
  id: string;
  occurred_at: string;
  source_schema: string;
  source_table: string;
  operation: string;
  payload_after: Record<string, unknown> | null;
  payload_before: Record<string, unknown> | null;
  payload_diff: Record<string, unknown> | null;
  subscriber_ids: string[];
}

/**
 * Configuration for the CursorTracker background poller.
 */
export interface CursorTrackerOptions {
  /**
   * Unique identifier for this listener node.
   * Should be stable across restarts if you want cursor continuity.
   * If not provided, a random ID is generated (ephemeral mode).
   */
  nodeId?: string;

  /**
   * The private realtime schema name where drain_changes(),
   * touch_listener(), and cleanup_ephemeral() live.
   *
   * Default: 'realtime_private'
   */
  schema?: string;

  /**
   * How often to poll drain_changes() for new events (milliseconds).
   *
   * Default: 5000 (5 seconds)
   */
  pollIntervalMs?: number;

  /**
   * How often to send a heartbeat via touch_listener() (milliseconds).
   *
   * Default: 30000 (30 seconds)
   */
  heartbeatIntervalMs?: number;

  /**
   * Maximum number of change_log rows to fetch per drain_changes() call.
   *
   * Default: 500
   */
  batchLimit?: number;

  /**
   * A query-capable object (typically a pg.Pool from pg-cache) used to
   * run drain_changes(), touch_listener(), and cleanup_ephemeral() queries.
   * pool.query() internally borrows a connection and releases it after
   * each call — no manual connection management needed.
   */
  pool: Queryable;

  /**
   * Called when drain_changes() returns new change_log entries.
   * The entries include subscriber_ids for fan-out routing.
   */
  onChanges?: (entries: ChangeLogEntry[]) => void;

  /**
   * Called when an error occurs during polling, heartbeat, or cleanup.
   * If not provided, errors are logged to the console.
   */
  onError?: (error: Error) => void;
}

/**
 * Configuration for the RealtimeManager, which bridges CursorTracker
 * events into PostGraphile's PgSubscriber for at-least-once delivery.
 */
export interface RealtimeManagerOptions {
  /**
   * The PgSubscriber instance from PostGraphile's context.
   * RealtimeManager emits cursor-tracked events on its internal EventEmitter
   * so they flow through existing subscription plans.
   */
  pgSubscriber: unknown;

  /**
   * A query-capable object (typically a pg.Pool from pg-cache) used by
   * the underlying CursorTracker for drain_changes() polling.
   */
  pool: Queryable;

  /**
   * Unique identifier for this listener node.
   * Should be stable across restarts if you want cursor continuity.
   * If not provided, a random ID is generated (ephemeral mode).
   */
  nodeId?: string;

  /**
   * The private realtime schema name where drain_changes(),
   * touch_listener(), and cleanup_ephemeral() live.
   *
   * Default: 'realtime_private'
   */
  schema?: string;

  /**
   * How often to poll drain_changes() for new events (milliseconds).
   *
   * Default: 5000 (5 seconds)
   */
  pollIntervalMs?: number;

  /**
   * How often to send a heartbeat via touch_listener() (milliseconds).
   *
   * Default: 30000 (30 seconds)
   */
  heartbeatIntervalMs?: number;

  /**
   * Maximum number of change_log rows to fetch per drain_changes() call.
   *
   * Default: 500
   */
  batchLimit?: number;

  /**
   * Called when an error occurs during polling, heartbeat, or cleanup.
   * If not provided, errors are logged via @pgpmjs/logger.
   */
  onError?: (error: Error) => void;
}
