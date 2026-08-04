/**
 * The gate between PostgreSQL's NOTIFY stream and a GraphQL subscription.
 *
 * Everything that can decide "this event should not reach the client" lives
 * here, upstream of grafast, because grafast's `listen` maps each event to a
 * step and offers no way to suppress one. Deciding downstream forced the
 * plugin to represent "dropped" as a null payload, which the field resolvers
 * then had to coalesce (`p?.event ?? 'UNKNOWN'`) — so a filtered event still
 * reached the client, carrying an invented event name. Filtering here means
 * the stream only ever yields events that should exist, and every resolver
 * downstream is total.
 *
 * The gate also owns parsing and the overflow throttle, so a payload the
 * trigger and the plugin disagree about fails loudly instead of arriving as
 * an `UNKNOWN`-shaped record.
 */

import type { GrafastSubscriber } from 'grafast';

/** Operations `emit_change` is allowed to report. */
const KNOWN_OPERATIONS = new Set(['INSERT', 'UPDATE', 'DELETE']);

export interface ParsedPayload {
  event: string;
  /**
   * Row ids being reported. Already narrowed to the subscription's `ids` when
   * it supplied any, so no consumer needs to re-intersect. Empty for
   * INVALIDATE.
   */
  rowIds: string[];
  overflow: boolean;
}

export class MalformedNotifyPayloadError extends Error {
  constructor(raw: string, reason: string) {
    super(
      `Malformed realtime NOTIFY payload ${JSON.stringify(raw)}: ${reason}. ` +
        'Expected "INVALIDATE" or "<INSERT|UPDATE|DELETE>:<uuid>[,<uuid>...]" ' +
        'as emitted by the emit_change trigger.'
    );
    this.name = 'MalformedNotifyPayloadError';
  }
}

/**
 * Parse the NOTIFY payload from `emit_change`.
 * Format: `"TG_OP:id1,id2,..."` or `"INVALIDATE"`.
 *
 * Throws on anything else: a payload this cannot read means the trigger and
 * this plugin have diverged, and inventing an event name for it hides a
 * deployment fault behind data the client will act on.
 */
export function parseNotifyPayload(raw: string): ParsedPayload {
  if (raw === 'INVALIDATE') {
    return { event: 'INVALIDATE', rowIds: [], overflow: true };
  }

  const colonIdx = raw.indexOf(':');
  if (colonIdx === -1) {
    throw new MalformedNotifyPayloadError(raw, 'no ":" separating the operation from the row ids');
  }

  const event = raw.substring(0, colonIdx);
  if (!KNOWN_OPERATIONS.has(event)) {
    throw new MalformedNotifyPayloadError(raw, `unknown operation ${JSON.stringify(event)}`);
  }

  const idsPart = raw.substring(colonIdx + 1);
  const rowIds = idsPart.length > 0 ? idsPart.split(',') : [];
  if (rowIds.length === 0) {
    throw new MalformedNotifyPayloadError(raw, `${event} carries no row ids`);
  }

  return { event, rowIds, overflow: false };
}

/**
 * Per-subscription event rate tracker. Counts events in a sliding 1-second
 * window.
 */
export class EventThrottle {
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

export interface EventGateOptions {
  /** Sparse-set subscription: deliver only events touching these row ids. */
  ids?: readonly string[] | null;
  /** Events per second before the gate collapses the stream to one INVALIDATE. */
  threshold: number;
}

/**
 * Apply the gate to one raw NOTIFY payload.
 *
 * Returns the payload to deliver, or `null` meaning *do not emit* — a decision
 * only this layer is allowed to make, because only this layer can act on it.
 */
function gate(raw: string, ids: readonly string[] | null, throttle: EventThrottle): ParsedPayload | null {
  const parsed = parseNotifyPayload(raw);

  // An INVALIDATE is the overflow signal itself; throttling it would drop the
  // one event telling the client to refetch.
  if (parsed.overflow) return parsed;

  const action = throttle.check();
  if (action === 'drop') return null;
  if (action === 'overflow') {
    return { event: 'INVALIDATE', rowIds: [], overflow: true };
  }

  if (!ids || ids.length === 0) return parsed;

  const matched = parsed.rowIds.filter(rowId => ids.includes(rowId));
  if (matched.length === 0) return null;

  return { ...parsed, rowIds: matched };
}

/**
 * Wrap a `GrafastSubscriber` so its stream yields parsed, gated payloads.
 *
 * Built per subscription (the throttle and `ids` are per-subscriber state), so
 * one noisy client can no longer throttle every other subscriber to the same
 * table — which a single build-time throttle instance did.
 */
export function createGatedSubscriber(
  inner: GrafastSubscriber<Record<string, string>>,
  { ids, threshold }: EventGateOptions
): GrafastSubscriber<Record<string, ParsedPayload>> {
  const subscribedIds = ids && ids.length > 0 ? ids : null;
  const throttle = new EventThrottle(threshold);

  return {
    async *subscribe(topic: string) {
      const source = await inner.subscribe(topic);
      for await (const raw of source) {
        const payload = gate(String(raw), subscribedIds, throttle);
        if (payload !== null) yield payload;
      }
    }
    // Deliberately no release(): `inner` is the shared pgSubscriber from the
    // request context and is not ours to tear down. Ending iteration returns
    // the underlying iterator, which is the whole of our cleanup.
  };
}
