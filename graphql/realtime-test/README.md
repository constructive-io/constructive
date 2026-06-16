# @constructive-io/graphql-realtime-test

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

Constructive-level wrapper around `graphile-realtime-test` that pre-loads the
full `ConstructivePreset` (auth, RLS, storage, search, realtime subscriptions,
etc.) into the GraphQL schema used for subscription testing.

This mirrors the relationship between `graphile-test` and
`@constructive-io/graphql-test`: a thin layer that swaps `MinimalPreset` for
`ConstructivePreset` so tests run against the real Constructive plugin stack.

## Usage

```typescript
import { getConnections } from '@constructive-io/graphql-realtime-test';

const conn = await getConnections({
  schemas: ['app_public'],
  seed: 'path/to/seed.sql',
  realtimeTables: ['items'],
  buildPgSettings: (params) => ({
    role: 'authenticated',
    'jwt.claims.user_id': params.user_id,
  }),
});

// conn.ws.createClient(), conn.notifyChange(), etc.
await conn.teardown();
```
