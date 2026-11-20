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
 *   4. The gate (see event-gate.ts) parses, throttles and filters it — a
 *      payload this subscription should not see never becomes an event
 *   5. The plugin fetches the changed row(s)
 *   6. The client receives { event, row, rowId, overflow }
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
 *   - Plugin-side: per-subscription throttle (default 50 events/second/table)
 *     drops individual events and sends a single INVALIDATE when exceeded
 *
 * Security / RLS enforcement:
 *   - Row data is always fetched via resource.get() which runs through the
 *     authenticated user's connection with their JWT role and pgSettings applied.
 *   - Invisible INSERT/UPDATE events are inhibited and removed from the stream.
 *   - DELETE is delivered only for IDs this subscription previously saw as visible.
 *   - Unscoped INVALIDATE signals are suppressed because they cannot be authorized.
 */

import { Logger } from '@pgpmjs/logger';
import { constant, context as grafastContext, inhibitIf, lambda, listen, object, sideEffect } from 'grafast';
import type { GraphQLSchema } from 'graphql';
import type { GraphileConfig } from 'graphile-config';
import { extendSchema } from 'graphile-utils';

import type { ParsedPayload } from './event-gate';
import { createGatedSubscriber } from './event-gate';
import { filterInaccessibleEvents, realtimeResponseNames } from './subscription-filter';
import type { RealtimeSubscriptionsPluginOptions } from './types';
import { SubscriptionVisibility } from './visibility';

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
      `  """The ID of a change visible to this subscription."""\n` +
      `  rowId: UUID\n` +
      `  """True when too many changes occurred and the client should refetch."""\n` +
      `  overflow: Boolean!\n` +
      `}`
    )
    .join('\n\n');

  return `extend type Subscription {\n${subscriptionFields}\n}\n\n${payloadTypes}`;
}

/**
 * The gate never emits a null payload, so one here means the plan graph was
 * rewired wrongly — fail rather than invent an event for the client.
 */
function requirePayload(payload: unknown): ParsedPayload {
  if (payload === null || payload === undefined) {
    throw new Error(
      'Realtime subscription payload is missing: the gated subscriber only ever ' +
        'yields parsed payloads, so this event bypassed createGatedSubscriber.',
    );
  }
  return payload as ParsedPayload;
}

/**
 * The row this event reports. `rowIds` is already narrowed to the
 * subscription's `ids`, so the first entry is the one to surface; INVALIDATE
 * carries none, which is a genuine absence rather than a suppressed error.
 */
function reportedRowId(payload: ParsedPayload): string | null {
  if (payload.overflow) return null;
  return payload.rowIds[0] ?? null;
}

function buildPlans(
  tables: RealtimeTableInfo[],
  overflowThreshold: number,
): Record<string, any> {
  const subscriptionPlans: Record<string, any> = {};
  const allPlans: Record<string, any> = {};

  for (const { resource, fieldName, payloadTypeName, rowFieldName, notifyChannel } of tables) {
    subscriptionPlans[fieldName] = {
      subscribePlan(_$root: any, args: any) {
        const $pgSubscriber = (grafastContext() as any).get('pgSubscriber');
        const $topic = constant(notifyChannel);
        const $ids = args.getRaw('ids');
        const $visibility = lambda([$pgSubscriber, $ids], () => new SubscriptionVisibility());

        const $subscriber = lambda([$pgSubscriber, $ids], (pair: unknown) => {
          const [pgSubscriber, ids] = pair as readonly [any, string[] | null | undefined];
          return createGatedSubscriber(pgSubscriber, { ids, threshold: overflowThreshold });
        });

        return listen($subscriber, $topic, ($payload: any) => object({ parsed: $payload, visibility: $visibility }));
      },
      plan($event: any) {
        const $parsed = $event.get('parsed');
        const $rowId = lambda($parsed, (p: unknown) => reportedRowId(requirePayload(p)));
        const $row = resource.get({ id: $rowId });
        const $hidden = sideEffect([$parsed, $row, $event.get('visibility')], ([payload, row, visibility]: any) =>
          !visibility.allow(requirePayload(payload), row != null));
        return object({ parsed: inhibitIf($parsed, $hidden), row: $row });
      },
    };

    allPlans[payloadTypeName] = {
      event($parent: any) {
        return lambda($parent.get('parsed'), (p: unknown) => requirePayload(p).event);
      },
      rowId($parent: any) {
        return lambda($parent.get('parsed'), (p: unknown) => reportedRowId(requirePayload(p)));
      },
      overflow($parent: any) {
        return lambda($parent.get('parsed'), (p: unknown) => requirePayload(p).overflow);
      },
      [rowFieldName]($parent: any) {
        return $parent.get('row');
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
  const fieldsBySchema = new WeakMap<GraphQLSchema, ReadonlySet<string>>();

  const plugin = extendSchema(
    (build) => {
      const tables = discoverRealtimeTables(build);

      if (tables.length === 0) {
        log.info('No tables with @realtime tag found — skipping subscription generation');
        return { typeDefs: [], plans: {} };
      }

      log.info(`Generating subscription fields for ${tables.length} realtime table(s)`);
      log.info(`Overflow threshold: ${overflowThreshold} events/second/table`);

      const typeDefs = buildTypeDefs(tables);
      const plans = buildPlans(tables, overflowThreshold);

      return { typeDefs, plans };
    },
    'RealtimeSubscriptionsPlugin',
  );
  plugin.schema!.hooks!.finalize = (schema, build) => {
    fieldsBySchema.set(schema, new Set(discoverRealtimeTables(build).map(table => table.fieldName)));
    return schema;
  };
  plugin.grafast = {
    middleware: {
      async subscribe(next, { args }) {
        const result = await next();
        const fields = fieldsBySchema.get(args.schema);
        if (!fields) throw new Error('Realtime authorization metadata is missing for this schema.');
        if (!fields.size || !(Symbol.asyncIterator in result)) return result;
        const names = realtimeResponseNames(args.document, args.operationName, fields);
        return names.length ? filterInaccessibleEvents(result, names) : result;
      }
    }
  };
  return plugin;
}

export { createRealtimeSubscriptionsPlugin as RealtimeSubscriptionsPlugin };

// Re-export CursorTracker and RealtimeManager for convenience
export { CursorTracker } from './cursor-tracker';
export type { ParsedPayload } from './event-gate';
export {
  createGatedSubscriber,
  EventThrottle,
  MalformedNotifyPayloadError,
  parseNotifyPayload,
} from './event-gate';
export { RealtimeManager } from './realtime-manager';
export type { ChangeLogEntry, CursorTrackerOptions, Queryable, RealtimeManagerOptions } from './types';
export { DEFAULT_OVERFLOW_THRESHOLD };
