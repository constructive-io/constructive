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
2. The `emit_change` trigger fires `pg_notify('realtime:{schema}.{table}', TG_OP)`
3. PostGraphile's `pgSubscriber` receives the NOTIFY
4. The subscription re-queries the source table with RLS enforced
5. The client receives `{ event, row }` where `row` reflects the current state

## Subscription Modes

### Phase 3a (current)

- **Single record**: `onXxxChanged(id: UUID!)` — subscribe to changes on one row
- **Full collection**: `onXxxChanged` (no args) — subscribe to any change on the table
