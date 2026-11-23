# graphile-realtime-subscriptions

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

Realtime subscription plugin for PostGraphile v5 — per-table GraphQL subscriptions via LISTEN/NOTIFY.

## Overview

Discovers tables tagged with `@realtime` and generates per-table GraphQL subscription fields (`onXxxChanged`) that use PostgreSQL LISTEN/NOTIFY for real-time event delivery with automatic RLS enforcement.

## Usage

```typescript
import { RealtimeSubscriptionsPreset } from 'graphile-realtime-subscriptions';

const preset = {
  extends: [
    RealtimeSubscriptionsPreset(),
  ],
};
```

## How It Works

1. A row is inserted/updated/deleted on a `@realtime`-tagged table
2. The `emit_change` trigger notifies `realtime:` plus the lowercase MD5 of `<UTF-8 schema byte length>:<schema><table>` (41 bytes total). The length prefix keeps dotted identifiers unambiguous. Trigger generation, subscription plans and durable dispatch use this same encoding; deploy both server and database changes together.
3. PostGraphile's `pgSubscriber` receives the NOTIFY
4. The subscription re-queries the source table with RLS enforced
5. The client receives `{ event, row }` where `row` reflects the current state

### Authorization

INSERT and UPDATE emit no frame when the RLS-scoped row lookup is null, including metadata-only selections. An `ids` filter never grants access.

Multi-row notifications are split into individual row events before authorization, so an invisible row cannot suppress visible rows later in the batch.

The throttle counts only individually authorized, matching rows, not NOTIFY batches. Invisible rows and IDs excluded by the subscription consume no budget. When the visible-row limit is exceeded, one overflow frame is emitted per rate window, with no row or row ID. Its event is the operation of the visible row that caused overflow.

DELETE is delivered only for IDs previously seen as visible by that same subscription. An invisible UPDATE clears that history. History retains at most 10,000 recently visible IDs; eviction conservatively suppresses subsequent DELETE events for forgotten IDs.

Triggers send byte-bounded ID chunks instead of unscoped INVALIDATE markers. Ephemeral small-row JSON notifications are reduced to IDs and reauthorized in the same way; their embedded row data is never trusted for delivery. Producer and server changes require coordinated deployment; legacy INVALIDATE payloads are rejected as malformed.

## Subscription Modes

### Phase 3a (current)

- **Single record**: `onXxxChanged(id: UUID!)` — subscribe to changes on one row
- **Full collection**: `onXxxChanged` (no args) — subscribe to any change on the table
