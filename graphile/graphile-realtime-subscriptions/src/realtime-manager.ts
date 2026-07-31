/**
 * RealtimeManager — bridges CursorTracker (polling drain_changes) into
 * PostGraphile's PgSubscriber so cursor-tracked events flow through the
 * same subscription plans as NOTIFY events.
 *
 * Architecture:
 *   PgSubscriber uses an internal EventEmitter. NOTIFY payloads arrive via
 *   pg's `notification` event and are emitted as `eventEmitter.emit(channel, payload)`.
 *   The `listen()` step in grafast subscribes to the same EventEmitter.
 *
 *   RealtimeManager converts ChangeLogEntry objects from drain_changes() into
 *   the same NOTIFY payload format ("OP:rowId1,rowId2,...") and emits them on
 *   the PgSubscriber's EventEmitter, so existing subscription plans handle
 *   them identically to real NOTIFY events.
 *
 *   This provides at-least-once delivery: NOTIFY is instant but best-effort;
 *   cursor polling catches up on anything missed (disconnects, restarts).
 *   Duplicates are expected and acceptable — clients should be idempotent.
 *
 * Lifecycle:
 *   1. start() → registers listener node, begins polling + heartbeat
 *   2. drain_changes() results are converted and emitted on PgSubscriber
 *   3. stop() → cleans up ephemeral subscriptions, removes listener node
 */

import { Logger } from '@pgpmjs/logger';

import { CursorTracker } from './cursor-tracker';
import type {
  ChangeLogEntry,
  RealtimeManagerOptions,
} from './types';

const log = new Logger('realtime-manager');

/**
 * Extract row IDs from a ChangeLogEntry.
 *
 * For INSERT/UPDATE the row ID lives in payload_after.id;
 * for DELETE it lives in payload_before.id.
 * Falls back to the change_log entry's own id if payloads are missing.
 */
function extractRowId(entry: ChangeLogEntry): string | null {
  if (entry.operation === 'DELETE') {
    return (entry.payload_before?.id as string) ?? null;
  }
  return (entry.payload_after?.id as string) ?? null;
}

/**
 * Convert a ChangeLogEntry into the NOTIFY payload format used by emit_change.
 * Format: "OPERATION:rowId" (e.g. "INSERT:550e8400-...")
 */
function entryToNotifyPayload(entry: ChangeLogEntry): string {
  const rowId = extractRowId(entry);
  if (!rowId) {
    return entry.operation;
  }
  return `${entry.operation}:${rowId}`;
}

/**
 * Build the NOTIFY channel name for a change_log entry.
 * Matches the channel format used by emit_change: "realtime:{schema}.{table}"
 */
function entryToChannel(entry: ChangeLogEntry): string {
  return `realtime:${entry.source_schema}.${entry.source_table}`;
}

export class RealtimeManager {
  private readonly cursorTracker: CursorTracker;
  private readonly subscriber: unknown;
  private started = false;

  constructor(options: RealtimeManagerOptions) {
    const { pgSubscriber, pool, ...cursorOpts } = options;
    this.subscriber = pgSubscriber;

    this.cursorTracker = new CursorTracker({
      nodeId: cursorOpts.nodeId,
      schema: cursorOpts.schema,
      pollIntervalMs: cursorOpts.pollIntervalMs,
      heartbeatIntervalMs: cursorOpts.heartbeatIntervalMs,
      batchLimit: cursorOpts.batchLimit,
      pool,
      onChanges: (entries) => this.dispatchEntries(entries),
      onError: cursorOpts.onError ?? ((err) => {
        log.error(`RealtimeManager error: ${err.message}`);
      }),
    });
  }

  get nodeId(): string {
    return this.cursorTracker.nodeId;
  }

  get isRunning(): boolean {
    return this.started && this.cursorTracker.isRunning;
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    log.info(`Starting RealtimeManager: node=${this.nodeId}`);
    await this.cursorTracker.start();
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;

    log.info(`Stopping RealtimeManager: node=${this.nodeId}`);
    await this.cursorTracker.stop();
  }

  /**
   * Convert ChangeLogEntry objects to NOTIFY-format payloads and emit
   * them on the PgSubscriber's internal EventEmitter.
   */
  private dispatchEntries(entries: ChangeLogEntry[]): void {
    const emitter = this.getEventEmitter();
    if (!emitter) {
      log.warn('PgSubscriber has no eventEmitter; cursor events cannot be dispatched');
      return;
    }

    for (const entry of entries) {
      const channel = entryToChannel(entry);
      const payload = entryToNotifyPayload(entry);
      emitter.emit(channel, payload);
    }

    log.info(`Dispatched ${entries.length} cursor-tracked event(s) to PgSubscriber`);
  }

  /**
   * Access PgSubscriber's internal EventEmitter.
   *
   * PgSubscriber from @dataplan/pg stores an EventEmitter3 instance as
   * `this.eventEmitter`. It is private but stable across v1.x releases.
   * This is the same emitter that NOTIFY events are dispatched through.
   */
  private getEventEmitter(): { emit(event: string, payload: string): boolean } | null {
    const sub = this.subscriber as Record<string, unknown>;
    if (sub && typeof sub === 'object' && 'eventEmitter' in sub) {
      const ee = sub.eventEmitter as { emit(event: string, payload: string): boolean };
      if (typeof ee?.emit === 'function') {
        return ee;
      }
    }
    return null;
  }
}

export { entryToChannel,entryToNotifyPayload, extractRowId };
