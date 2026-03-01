# @constructive-io/node

Drop-in replacement for `@constructive-io/sdk` for Node.js applications.

## Why?

The base `@constructive-io/sdk` uses the Fetch API, which works great in browsers but has two limitations in Node.js:

1. **DNS resolution**: Node.js cannot resolve `*.localhost` subdomains (e.g., `auth.localhost`), returning `ENOTFOUND`. Browsers handle this automatically.
2. **Host header**: The Fetch API treats `Host` as a forbidden header and silently drops it. The Constructive GraphQL server uses Host-header subdomain routing, so this header must be preserved.

`@constructive-io/node` includes `NodeHttpAdapter`, which uses `node:http`/`node:https` directly to bypass both issues.

## Installation

```bash
npm install @constructive-io/node
# or
pnpm add @constructive-io/node
```

## Usage

Everything from `@constructive-io/sdk` is re-exported, so this is a drop-in replacement. Just change your import:

```ts
// Before (browser/universal):
import { admin, auth, public_ } from '@constructive-io/sdk';

// After (Node.js):
import { admin, auth, public_, NodeHttpAdapter } from '@constructive-io/node';
```

### Using NodeHttpAdapter with the ORM client

```ts
import { admin, NodeHttpAdapter } from '@constructive-io/node';

const adapter = new NodeHttpAdapter('http://auth.localhost:3000/graphql', {
  Authorization: 'Bearer token',
});

const db = admin.orm.createClient({ adapter });

const results = await db.appPermission.findMany({
  select: { id: true, name: true },
}).execute();
```

### Per-request options

`NodeHttpAdapter.execute()` supports per-request headers and cancellation:

```ts
const adapter = new NodeHttpAdapter('http://localhost:3000/graphql');

// Per-request headers
await adapter.execute(query, variables, {
  headers: { 'X-Request-Id': '123' },
});

// Request cancellation
const controller = new AbortController();
await adapter.execute(query, variables, {
  signal: controller.signal,
});
```
