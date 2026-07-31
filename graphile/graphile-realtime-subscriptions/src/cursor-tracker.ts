/**
 * CursorTracker — manages the listener_node lifecycle and periodic
 * drain_changes() polling for at-least-once event delivery.
 *
 * Lifecycle:
 *   1. start() → calls touch_listener() to register/heartbeat the node
 *   2. Periodically polls drain_changes() for new change_log entries
 *   3. Periodically heartbeats via touch_listener()
 *   4. stop() → calls cleanup_ephemeral() to remove ephemeral subscriptions
 *              and delete the listener_node row
 *
 * The caller provides a Queryable (typically a pg.Pool from pg-cache)
 * and this class calls pool.query() directly for each operation.
 */

import { Logger } from '@pgpmjs/logger';
import { QuoteUtils } from '@pgsql/quotes';
import { randomUUID } from 'crypto';

import type {
  ChangeLogEntry,
  CursorTrackerOptions,
  Queryable,
} from './types';

const log = new Logger('cursor-tracker');

const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30000;
const DEFAULT_BATCH_LIMIT = 500;
const DEFAULT_SCHEMA = 'realtime_public';

export class CursorTracker {
  readonly nodeId: string;

  private readonly schema: string;
  private readonly pollIntervalMs: number;
  private readonly heartbeatIntervalMs: number;
  private readonly batchLimit: number;
  private readonly pool: Queryable;
  private readonly onChanges: (entries: ChangeLogEntry[]) => void;
  private readonly onError: (error: Error) => void;

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private draining = false;

  constructor(options: CursorTrackerOptions) {
    this.nodeId = options.nodeId ?? randomUUID();
    this.schema = options.schema ?? DEFAULT_SCHEMA;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
    this.batchLimit = options.batchLimit ?? DEFAULT_BATCH_LIMIT;
    this.pool = options.pool;
    this.onChanges = options.onChanges ?? (() => {});
    this.onError = options.onError ?? ((err) => {
      log.error(`CursorTracker error: ${err.message}`);
    });
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    log.info(`Starting cursor tracker: node=${this.nodeId}, schema=${this.schema}`);

    await this.touchListener();

    // Initial drain immediately after registration
    await this.drain();

    this.pollTimer = setInterval(() => {
      void this.drain();
    }, this.pollIntervalMs);

    this.heartbeatTimer = setInterval(() => {
      void this.touchListener();
    }, this.heartbeatIntervalMs);
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    log.info(`Stopping cursor tracker: node=${this.nodeId}`);

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    await this.cleanupEphemeral();
  }

  async drain(): Promise<ChangeLogEntry[]> {
    if (this.draining) return [];
    this.draining = true;

    try {
      const sql = `SELECT * FROM ${this.quoteIdent(this.schema)}.drain_changes($1, $2)`;
      const result = await this.pool.query<{ drain_changes: ChangeLogEntry }>(
        sql,
        [this.nodeId, this.batchLimit],
      );
      const entries = result.rows.map((row) => row.drain_changes);

      if (entries.length > 0) {
        log.info(`Drained ${entries.length} change(s) for node=${this.nodeId}`);
        this.onChanges(entries);
      }

      return entries;
    } catch (err) {
      this.onError(err instanceof Error ? err : new Error(String(err)));
      return [];
    } finally {
      this.draining = false;
    }
  }

  async touchListener(): Promise<void> {
    try {
      const sql = `SELECT ${this.quoteIdent(this.schema)}.touch_listener($1)`;
      await this.pool.query(sql, [this.nodeId]);
    } catch (err) {
      this.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async cleanupEphemeral(): Promise<void> {
    try {
      const sql = `SELECT ${this.quoteIdent(this.schema)}.cleanup_ephemeral($1)`;
      await this.pool.query(sql, [this.nodeId]);
      log.info(`Cleaned up ephemeral subscriptions for node=${this.nodeId}`);
    } catch (err) {
      this.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  get isRunning(): boolean {
    return this.running;
  }

  private quoteIdent(identifier: string): string {
    return QuoteUtils.quoteIdentifier(identifier);
  }
}

export {
  DEFAULT_BATCH_LIMIT,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_SCHEMA,
};
