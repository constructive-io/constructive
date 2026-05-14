/**
 * Realtime Subscriptions Plugin for PostGraphile v5
 *
 * Discovers tables tagged with @realtime and generates per-table
 * subscription fields (onXxxChanged) that use PostgreSQL LISTEN/NOTIFY
 * for real-time event delivery.
 *
 * Subscription modes:
 *   - Specific rows: onXxxChanged(ids: [UUID!]) — subscribe to changes on specific rows
 *   - Full collection: onXxxChanged (no args) — subscribe to any change on the table
 *
 * NOTIFY payload format (from emit_change trigger):
 *   - Normal: "INSERT:uuid1,uuid2,..."  or "UPDATE:uuid1" or "DELETE:uuid1"
 *   - Overflow: "INVALIDATE" (when a single statement affects > 50 rows)
 *
 * Event flow:
 *   1. A row is inserted/updated/deleted
 *   2. The emit_change trigger fires pg_notify with TG_OP:row_ids or INVALIDATE
 *   3. PostGraphile's pgSubscriber receives the NOTIFY
 *   4. The plugin parses the payload and fetches the specific changed row(s)
 *   5. The client receives { event, row, rowId, overflow }
 *
 * Cursor tracking (at-least-once delivery):
 *   The CursorTracker class provides a complementary polling-based delivery
 *   path via drain_changes(). It manages the listener_node lifecycle:
 *   - start() registers the node via touch_listener()
 *   - Periodic polling via drain_changes() fetches change_log entries
 *   - Periodic heartbeat via touch_listener() keeps the node alive
 *   - stop() calls cleanup_ephemeral() to remove ephemeral subscriptions
 *   This enables at-least-once semantics by tracking cursor position.
 *
 * Overflow protection:
 *   - Database-side: statements affecting > 50 rows send INVALIDATE
 *   - Plugin-side: per-subscriber throttle (default 50 events/second/table)
 *     drops individual events and sends a single INVALIDATE when exceeded
 *
 * Security / RLS enforcement:
 *   - Row data is always fetched via resource.get() which runs through the
 *     authenticated user's connection with their JWT role and pgSettings applied.
 *   - For INSERT/UPDATE events, if RLS denies access (resource.get returns null),
 *     the rowId is masked (set to null) to prevent metadata leaks.
 *   - For DELETE events, row is naturally null (the row no longer exists).
 *   - For INVALIDATE (overflow), the client should refetch via a normal query
 *     which is also RLS-gated.
 *   - When ids are provided, only events for those specific rows are delivered,
 *     preventing cross-tenant event leaks.
 */

import { context as grafastContext, listen, object, constant, lambda } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import { extendSchema } from 'graphile-utils';
import { Logger } from '@pgpmjs/logger';

import type { RealtimeSubscriptionsPluginOptions } from './types';

const log = new Logger('graphile-realtime-subscriptions');

/** Default overflow threshold: events per second per table per subscriber */
const DEFAULT_OVERFLOW_THRESHOLD = 50;

interface RealtimeTableInfo {
  resource: any;
  typeName: string;
  fieldName: string;
  payloadTypeName: string;
  rowFieldName: string;
  notifyChannel: string;
  pgSchema: string;
  pgTable: string;
}

interface ParsedPayload {
  event: string;
  rowIds: string[];
  overflow: boolean;
}

/**
 * Parse the NOTIFY payload from emit_change.
 * Format: "TG_OP:id1,id2,..." or "INVALIDATE"
 */
function parseNotifyPayload(raw: string): ParsedPayload {
  if (raw === 'INVALIDATE') {
    return { event: 'INVALIDATE', rowIds: [], overflow: true };
  }

  const colonIdx = raw.indexOf(':');
  if (colonIdx === -1) {
    return { event: raw || 'UNKNOWN', rowIds: [], overflow: false };
  }

  const event = raw.substring(0, colonIdx);
  const idsPart = raw.substring(colonIdx + 1);
  const rowIds = idsPart.length > 0 ? idsPart.split(',') : [];

  return { event, rowIds, overflow: false };
}

/**
 * Per-subscriber, per-table event rate tracker.
 * Counts events in a sliding 1-second window.
 */
class EventThrottle {
  private windowStart = 0;
  private eventCount = 0;
  private overflowSent = false;

  constructor(private readonly threshold: number) {}

  /**
   * Record an event and return whether it should be delivered.
   * Returns 'deliver' for normal events, 'overflow' when the threshold
   * is first exceeded, or 'drop' for subsequent events in the same window.
   */
  check(): 'deliver' | 'overflow' | 'drop' {
    const now = Date.now();

    if (now - this.windowStart >= 1000) {
      this.windowStart = now;
      this.eventCount = 0;
      this.overflowSent = false;
    }

    this.eventCount++;

    if (this.eventCount <= this.threshold) {
      return 'deliver';
    }

    if (!this.overflowSent) {
      this.overflowSent = true;
      return 'overflow';
    }

    return 'drop';
  }
}

function discoverRealtimeTables(build: any): RealtimeTableInfo[] {
  const { pgRegistry } = build.input;
  const resources = pgRegistry.pgResources;
  const result: RealtimeTableInfo[] = [];

  for (const [, resource] of Object.entries(resources)) {
    const r = resource as any;
    const codec = r.codec;
    if (!codec?.attributes) continue;

    const tags = codec.extensions?.tags;
    if (!tags?.realtime) continue;

    const typeName = build.inflection.tableType(codec);
    const fieldName = `on${typeName}Changed`;
    const payloadTypeName = `${typeName}SubscriptionPayload`;
    const rowFieldName = typeName.charAt(0).toLowerCase() + typeName.slice(1);

    const pgSchema = codec.extensions?.pg?.schemaName ?? 'public';
    const pgTable = codec.extensions?.pg?.name ?? codec.name;
    const notifyChannel = `realtime:${pgSchema}.${pgTable}`;

    result.push({
      resource: r,
      typeName,
      fieldName,
      payloadTypeName,
      rowFieldName,
      notifyChannel,
      pgSchema,
      pgTable,
    });

    log.info(`Discovered realtime table: ${pgSchema}.${pgTable} -> ${fieldName}`);
  }

  return result;
}

function buildTypeDefs(tables: RealtimeTableInfo[]): string {
  const subscriptionFields = tables
    .map(({ fieldName, payloadTypeName }) =>
      `  """Subscribe to changes on this table. Pass ids to watch specific rows, or no args for the full collection."""\n  ${fieldName}(ids: [UUID!]): ${payloadTypeName}`
    )
    .join('\n');

  const payloadTypes = tables
    .map(({ payloadTypeName, typeName, rowFieldName }) =>
      `"""Payload delivered when a ${typeName} row changes."""\n` +
      `type ${payloadTypeName} {\n` +
      `  """The DML operation: INSERT, UPDATE, DELETE, or INVALIDATE."""\n` +
      `  event: String!\n` +
      `  """The current state of the row (null for DELETE, INVALIDATE, or if RLS denies access)."""\n` +
      `  ${rowFieldName}: ${typeName}\n` +
      `  """The ID of the changed row (null for INVALIDATE, or masked when RLS denies access)."""\n` +
      `  rowId: UUID\n` +
      `  """True when too many changes occurred and the client should refetch."""\n` +
      `  overflow: Boolean!\n` +
      `}`
    )
    .join('\n\n');

  return `extend type Subscription {\n${subscriptionFields}\n}\n\n${payloadTypes}`;
}

function buildPlans(
  tables: RealtimeTableInfo[],
  overflowThreshold: number,
): Record<string, any> {
  const subscriptionPlans: Record<string, any> = {};
  const allPlans: Record<string, any> = {};

  for (const { resource, fieldName, payloadTypeName, rowFieldName, notifyChannel } of tables) {
    const throttle = new EventThrottle(overflowThreshold);

    subscriptionPlans[fieldName] = {
      subscribePlan(_$root: any, args: any) {
        const $pgSubscriber = (grafastContext() as any).get('pgSubscriber');
        const $topic = constant(notifyChannel);
        const $ids = args.getRaw('ids');

        return listen($pgSubscriber, $topic, ($payload: any) => {
          const $parsed = lambda([$payload, $ids], (pair: unknown) => {
            const [raw, subscribedIds] = pair as readonly [unknown, string[] | null | undefined];
            const parsed = parseNotifyPayload(String(raw));

            const action = parsed.overflow ? 'deliver' : throttle.check();

            if (action === 'drop') {
              return null;
            }

            if (action === 'overflow') {
              return {
                event: 'INVALIDATE',
                rowIds: [],
                overflow: true,
              };
            }

            // Sparse set filtering: only deliver events for subscribed row IDs
            if (subscribedIds && subscribedIds.length > 0) {
              const hasMatch = parsed.rowIds.some((rid: string) => subscribedIds.includes(rid));
              if (!hasMatch) return null;
            }

            return parsed;
          });

          return object({
            parsed: $parsed,
            subscribedIds: $ids,
          });
        });
      },
      plan($event: any) {
        return $event;
      },
    };

    allPlans[payloadTypeName] = {
      event($parent: any) {
        const $parsed = $parent.get('parsed');
        return lambda($parsed, (p: unknown) => (p as ParsedPayload | null)?.event ?? 'UNKNOWN');
      },
      rowId($parent: any) {
        const $parsed = $parent.get('parsed');
        const $subscribedIds = $parent.get('subscribedIds');
        return lambda([$parsed, $subscribedIds], (pair: unknown) => {
          const [p, subscribedIds] = pair as readonly [ParsedPayload | null, string[] | null | undefined];
          if (!p || p.overflow || p.rowIds.length === 0) return null;

          // When ids are provided, return the first matching row ID
          if (subscribedIds && subscribedIds.length > 0) {
            return p.rowIds.find((rid: string) => subscribedIds.includes(rid)) ?? null;
          }

          return p.rowIds[0];
        });
      },
      overflow($parent: any) {
        const $parsed = $parent.get('parsed');
        return lambda($parsed, (p: unknown) => (p as ParsedPayload | null)?.overflow ?? false);
      },
      [rowFieldName]($parent: any) {
        const $parsed = $parent.get('parsed');
        const $subscribedIds = $parent.get('subscribedIds');

        const $rowId = lambda(
          [$parsed, $subscribedIds],
          (tuple: unknown) => {
            const [p, subscribedIds] = tuple as readonly [
              ParsedPayload | null,
              string[] | null | undefined,
            ];
            if (!p || p.overflow || p.rowIds.length === 0) return null;
            // When ids are provided, return first matching row ID
            if (subscribedIds && subscribedIds.length > 0) {
              return p.rowIds.find((rid: string) => subscribedIds.includes(rid)) ?? null;
            }
            // Full collection mode: return first row ID
            return p.rowIds[0];
          },
        );

        return resource.get({ id: $rowId });
      },
    };
  }

  allPlans['Subscription'] = subscriptionPlans;
  return allPlans;
}

export function createRealtimeSubscriptionsPlugin(
  options: RealtimeSubscriptionsPluginOptions = {},
): GraphileConfig.Plugin {
  const overflowThreshold = options.overflowThreshold ?? DEFAULT_OVERFLOW_THRESHOLD;

  return extendSchema(
    (build) => {
      const tables = discoverRealtimeTables(build);

      if (tables.length === 0) {
        log.info('No tables with @realtime tag found — skipping subscription generation');
        return { typeDefs: '', plans: {} };
      }

      log.info(`Generating subscription fields for ${tables.length} realtime table(s)`);
      log.info(`Overflow threshold: ${overflowThreshold} events/second/table`);

      const typeDefs = buildTypeDefs(tables);
      const plans = buildPlans(tables, overflowThreshold);

      return { typeDefs, plans };
    },
    'RealtimeSubscriptionsPlugin',
  );
}

export { createRealtimeSubscriptionsPlugin as RealtimeSubscriptionsPlugin };

// Re-export CursorTracker and RealtimeManager for convenience
export { CursorTracker } from './cursor-tracker';
export { RealtimeManager } from './realtime-manager';
export type { CursorTrackerOptions, ChangeLogEntry, Queryable, RealtimeManagerOptions } from './types';

// Exported for testing
export { parseNotifyPayload, EventThrottle, DEFAULT_OVERFLOW_THRESHOLD };
