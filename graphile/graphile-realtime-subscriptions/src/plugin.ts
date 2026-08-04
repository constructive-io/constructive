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
 *   - INSERT/UPDATE notifications are filtered at the AsyncIterable boundary by
 *     a parameterized visibility query under the request role and pgSettings.
 *     Grafast never observes an event unless at least one changed row is visible.
 *   - Row data is fetched via resource.get() under the same request RLS context.
 *   - Collection subscriptions never expose row IDs because merely observing
 *     identifiers from rows hidden by RLS is a metadata leak.
 *   - Sparse INSERT/UPDATE subscriptions expose a requested row ID only after
 *     resource.get() confirms that the row remains visible under request RLS.
 *   - DELETE and database-originated INVALIDATE events are suppressed because
 *     neither carries a sound post-change audience proof. Plugin throttling may
 *     emit INVALIDATE only after an authorized INSERT/UPDATE event.
 *   - When ids are provided, only events for those specific rows are delivered,
 *     preventing cross-tenant event leaks.
 */

import { Logger } from '@pgpmjs/logger';
import { QuoteUtils } from '@pgsql/quotes';
import type { Step } from 'grafast';
import { constant, context as grafastContext, get, lambda, listen } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import { extendSchema } from 'graphile-utils';

import type {
  RealtimeSubscriptionsPluginOptions,
  RealtimeTopicDescriptor,
} from './types';

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

interface RealtimeEvent {
  parsed: ParsedPayload;
  subscribedIds: string[] | null | undefined;
}

interface PgExecutorContextLike {
  pgSettings: Record<string, string | undefined> | null;
  withPgClient<T>(
    pgSettings: Record<string, string | undefined> | null,
    callback: (client: {
      query<TData>(query: {
        text: string;
        values?: unknown[];
      }): Promise<{ rows: readonly TData[] }>;
    }) => Promise<T> | T,
  ): Promise<T>;
}

interface RealtimeSubscriberLike {
  subscribe(topic: string | number):
    | AsyncIterableIterator<any>
    | Promise<AsyncIterableIterator<any>>;
}

/**
 * Select the row that may be fetched under the request's RLS context.
 *
 * Collection subscriptions may fetch INSERT/UPDATE rows, but their public
 * rowId field remains hidden. Sparse subscriptions only consider IDs the
 * caller supplied. DELETE cannot be authorized after the row is gone.
 */
function selectCandidateRowId(
  parsed: ParsedPayload | null,
  subscribedIds: string[] | null | undefined,
  allowCollection: boolean,
): string | null {
  if (
    !parsed
    || parsed.overflow
    || (parsed.event !== 'INSERT' && parsed.event !== 'UPDATE')
    || parsed.rowIds.length === 0
  ) {
    return null;
  }

  if (subscribedIds && subscribedIds.length > 0) {
    return parsed.rowIds.find((rowId) => subscribedIds.includes(rowId)) ?? null;
  }

  return allowCollection ? parsed.rowIds[0] : null;
}

function selectCandidateRowIds(
  parsed: ParsedPayload,
  subscribedIds: string[] | null | undefined,
): string[] {
  if (
    parsed.overflow
    || (parsed.event !== 'INSERT' && parsed.event !== 'UPDATE')
  ) {
    return [];
  }

  const candidates = subscribedIds && subscribedIds.length > 0
    ? parsed.rowIds.filter((rowId) => subscribedIds.includes(rowId))
    : parsed.rowIds;

  return [...new Set(candidates)];
}

/**
 * Filter the notification stream before Grafast observes a subscription event.
 * Returning a nullable payload from an item plan would still emit an observable
 * GraphQL result, so authorization has to happen at the AsyncIterable boundary.
 */
async function* authorizeNotificationStream(
  sourceOrPromise:
    | AsyncIterableIterator<unknown>
    | Promise<AsyncIterableIterator<unknown>>,
  executorContext: PgExecutorContextLike,
  subscribedIds: string[] | null | undefined,
  visibilitySql: string,
  overflowThreshold: number,
): AsyncGenerator<RealtimeEvent> {
  const source = await sourceOrPromise;
  const throttle = new EventThrottle(overflowThreshold);

  for await (const raw of source) {
    const parsed = parseNotifyPayload(String(raw));
    const candidateRowIds = selectCandidateRowIds(parsed, subscribedIds);

    // DELETE cannot be reauthorized after the row is gone. Database-originated
    // INVALIDATE and malformed/unknown events carry no audience proof either.
    if (candidateRowIds.length === 0) continue;

    let visibleRowIds: Set<string>;
    try {
      visibleRowIds = await executorContext.withPgClient(
        executorContext.pgSettings,
        async (client) => {
          const result = await client.query<{ id: string }>({
            text: visibilitySql,
            values: [candidateRowIds],
          });
          return new Set(result.rows.map((row) => String(row.id)));
        },
      );
    } catch {
      // Authorization errors must never turn into an event-existence oracle.
      log.warn('Suppressing realtime event because RLS reauthorization failed');
      continue;
    }

    const authorizedRowIds = candidateRowIds.filter((rowId) => visibleRowIds.has(rowId));
    if (authorizedRowIds.length === 0) continue;

    // Count only authorized events. Hidden-tenant traffic must not influence a
    // subscriber's throttle state because that would be an observable side channel.
    const action = throttle.check();
    if (action === 'drop') continue;

    const authorizedPayload = action === 'overflow'
      ? { event: 'INVALIDATE', rowIds: [], overflow: true }
      : { ...parsed, rowIds: authorizedRowIds };

    yield {
      parsed: authorizedPayload,
      subscribedIds,
    };
  }
}

function createRlsAuthorizedSubscriber(
  subscriber: RealtimeSubscriberLike,
  executorContext: PgExecutorContextLike,
  subscribedIds: string[] | null | undefined,
  visibilitySql: string,
  overflowThreshold: number,
): RealtimeSubscriberLike {
  return {
    subscribe(topic: string | number) {
      return authorizeNotificationStream(
        subscriber.subscribe(topic),
        executorContext,
        subscribedIds,
        visibilitySql,
        overflowThreshold,
      );
    },
  };
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
      `  """The authorized operation: INSERT, UPDATE, or plugin-generated INVALIDATE."""\n` +
      `  event: String!\n` +
      `  """The current state of the row (null for INVALIDATE or an RLS visibility race)."""\n` +
      `  ${rowFieldName}: ${typeName}\n` +
      `  """The requested row ID for a sparse INSERT/UPDATE subscription after RLS authorization. Null for collection, INVALIDATE, or denied rows."""\n` +
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

  for (const {
    resource,
    fieldName,
    payloadTypeName,
    rowFieldName,
    notifyChannel,
    pgSchema,
    pgTable,
  } of tables) {
    const qualifiedTable = QuoteUtils.quoteQualifiedIdentifier(pgSchema, pgTable);
    const idColumn = QuoteUtils.quoteIdentifier('id');
    const visibilitySql =
      `select ${idColumn}::text as id from ${qualifiedTable} `
      // Notification payloads are text, and @realtime tables may use UUID,
      // integer, bigint, or text primary keys. Comparing their canonical text
      // form keeps the query parameterized and avoids a UUID-only cast that
      // silently suppresses otherwise authorized events.
      + `where ${idColumn}::text = any($1::text[])`;

    subscriptionPlans[fieldName] = {
      subscribePlan(_$root: any, args: any) {
        const $pgSubscriber = (grafastContext() as any).get('pgSubscriber');
        const $executorContext = resource.executor.context();
        const $topic = constant(notifyChannel);
        const $ids = args.getRaw('ids');
        const $authorizedSubscriber = lambda(
          [$pgSubscriber, $executorContext, $ids],
          (values: unknown) => {
            const [subscriber, executorContext, subscribedIds] = values as readonly [
              RealtimeSubscriberLike,
              PgExecutorContextLike,
              string[] | null | undefined,
            ];
            return createRlsAuthorizedSubscriber(
              subscriber,
              executorContext,
              subscribedIds,
              visibilitySql,
              overflowThreshold,
            );
          },
        );

        return listen($authorizedSubscriber, $topic);
      },
      plan($event: any) {
        return $event;
      },
    };

    allPlans[payloadTypeName] = {
      event($parent: Step<RealtimeEvent>) {
        const $parsed = get($parent, 'parsed');
        return lambda($parsed, (p: unknown) => (p as ParsedPayload | null)?.event ?? 'UNKNOWN');
      },
      rowId($parent: Step<RealtimeEvent>) {
        const $parsed = get($parent, 'parsed');
        const $subscribedIds = get($parent, 'subscribedIds');
        const $candidateRowId = lambda(
          [$parsed, $subscribedIds],
          (pair: unknown) => {
            const [parsed, subscribedIds] = pair as readonly [
              ParsedPayload | null,
              string[] | null | undefined,
            ];
            // Collection mode deliberately cannot surface a row identifier.
            return selectCandidateRowId(parsed, subscribedIds, false);
          },
        );
        const $authorizedRow = resource.get({ id: $candidateRowId });
        // Selecting through the PgSelectSingleStep makes the ID null whenever
        // request RLS hides the row; the raw notification ID is never returned.
        return $authorizedRow.get('id');
      },
      overflow($parent: Step<RealtimeEvent>) {
        const $parsed = get($parent, 'parsed');
        return lambda($parsed, (p: unknown) => (p as ParsedPayload | null)?.overflow ?? false);
      },
      [rowFieldName]($parent: Step<RealtimeEvent>) {
        const $parsed = get($parent, 'parsed');
        const $subscribedIds = get($parent, 'subscribedIds');

        const $rowId = lambda(
          [$parsed, $subscribedIds],
          (tuple: unknown) => {
            const [parsed, subscribedIds] = tuple as readonly [
              ParsedPayload | null,
              string[] | null | undefined,
            ];
            return selectCandidateRowId(parsed, subscribedIds, true);
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
      const discoveredTopics: readonly RealtimeTopicDescriptor[] = Object.freeze(
        tables
          .map(({ notifyChannel, pgSchema, pgTable }) => Object.freeze({
            topic: notifyChannel,
            schema: pgSchema,
            table: pgTable,
          }))
          .sort((left, right) => left.topic.localeCompare(right.topic)),
      );
      options.onTopicsDiscovered?.(discoveredTopics);

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
export type { ChangeLogEntry, CursorTrackerOptions, Queryable, RealtimeManagerOptions } from './types';

// Exported for testing
export {
  DEFAULT_OVERFLOW_THRESHOLD,
  EventThrottle,
  parseNotifyPayload,
  selectCandidateRowId,
};
