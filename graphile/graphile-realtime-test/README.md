# graphile-realtime-test

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
  <a href="https://www.npmjs.com/package/graphile-realtime-test">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-realtime-test%2Fpackage.json"/>
  </a>
</p>

Subscription testing utilities for `graphile-realtime-subscriptions`.

Provides smart tag injection, `grafast.subscribe()` helpers, and `pg_notify` simulation for integration testing realtime GraphQL subscriptions against a real PostgreSQL database.

## Usage

```typescript
import { createRealtimeTestContext, waitForEvent } from 'graphile-realtime-test';
import { seed } from 'pgsql-test';

const ctx = await createRealtimeTestContext(
  {
    schemas: ['my_schema'],
    realtimeTables: ['items'],
    useRoot: true,
    authRole: 'postgres',
  },
  [seed.sqlfile(['./seed.sql'])]
);

// Start a subscription
const iterator = await ctx.subscribe(`
  subscription {
    onItemChanged {
      event
      rowId
      overflow
    }
  }
`);

// Fire a NOTIFY
await ctx.notifyChange('items', 'INSERT', ['some-uuid']);

// Assert the event
const event = await waitForEvent(iterator);
expect(event.data.onItemChanged.event).toBe('INSERT');

// Clean up
await iterator.return?.();
await ctx.teardown();
```

## API

### `createRealtimeTestContext(input, seedAdapters?)`

Creates a fully wired test context with schema, subscriptions, and NOTIFY helpers.

### `makeRealtimeSmartTagsPlugin(tagsByTable)`

Creates a Graphile plugin that injects smart tags on table codecs during schema build.

### `subscribe(opts)`

Calls `grafast.subscribe()` and returns the raw async iterator.

### `waitForEvent(iterator, timeoutMs?)`

Waits for the next event from a subscription iterator with a timeout.

### `collectEvents(iterator, count, timeoutMs?)`

Collects multiple events from a subscription iterator.

### `notify(client, schema, table, payload)`

Fires a raw `pg_notify` on a realtime channel.

### `notifyChange(client, schema, table, operation, rowIds)`

Fires a DML NOTIFY with the standard payload format.

### `notifyInvalidate(client, schema, table)`

Fires an INVALIDATE (overflow) NOTIFY.

### `buildPayload(operation, rowIds)`

Builds a standard DML payload string.

### `buildInvalidatePayload()`

Returns the `"INVALIDATE"` payload string.
