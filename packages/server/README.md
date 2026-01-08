# @constructive-io/server

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
</p>

**Constructive Combined Server** starts GraphQL, jobs runtime, and Knative-style functions from a single entrypoint.

## Quick Start

### Use as SDK

```ts
import { CombinedServer } from '@constructive-io/server';

const server = new CombinedServer({
  graphql: { enabled: true },
  functions: {
    enabled: true,
    services: [
      { name: 'simple-email', port: 8081 },
      { name: 'send-email-link', port: 8082 }
    ]
  },
  jobs: { enabled: true }
});

await server.start();
// await server.stop();
```

### Local Development (this repo)

```bash
pnpm install
cd packages/server
pnpm dev
```

## Environment Configuration

The `src/run.ts` entrypoint reads a small set of env flags for quick local orchestration:

| Env var | Purpose | Default |
| --- | --- | --- |
| `CONSTRUCTIVE_GRAPHQL_ENABLED` | Start the GraphQL server | `true` |
| `CONSTRUCTIVE_JOBS_ENABLED` | Start the jobs runtime | `false` |
| `CONSTRUCTIVE_FUNCTIONS` | Comma-separated function list or `all` | empty |
| `CONSTRUCTIVE_FUNCTION_PORTS` | Port map (`name=port,name=port`) | none |

Examples:

```bash
# Start GraphQL only
CONSTRUCTIVE_GRAPHQL_ENABLED=true pnpm dev

# Start only the simple-email function
CONSTRUCTIVE_GRAPHQL_ENABLED=false \
CONSTRUCTIVE_FUNCTIONS=simple-email \
CONSTRUCTIVE_FUNCTION_PORTS=simple-email=8081 \
pnpm dev

# Start all functions + jobs
CONSTRUCTIVE_FUNCTIONS=all \
CONSTRUCTIVE_JOBS_ENABLED=true \
CONSTRUCTIVE_FUNCTION_PORTS=simple-email=8081,send-email-link=8082 \
pnpm dev
```

## Default Function Ports

- `simple-email`: `8081`
- `send-email-link`: `8082`
