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

## Jobs E2E Test

Before running the e2e test, make sure you have:

- A local PostgreSQL instance running in Docker, with a user that can create databases/roles and install extensions.
  - Start it from the repo root with: `docker compose up -d postgres`
  - Configure via `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` if needed (defaults in `docker-compose.yml` are `postgres/password@localhost:5432`).
- Extensions available: `citext`, `uuid-ossp`, `unaccent`, `pgcrypto`, `hstore`.
- Ports free: `3000` (GraphQL), `12345` (jobs callback), `8081` (simple-email), `8082` (send-email-link).

If you want the full jobs stack in Docker (GraphQL + functions + job service), use:

```bash
docker compose -f docker-compose.jobs.yml up -d --build
```

That stack depends on the same `postgres` container above; the e2e test itself runs everything in-process and only needs the Postgres container.

Run the test from the repo root:

```bash
pnpm install
pnpm --filter @constructive-io/server test -- jobs.e2e.test.ts
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
