# graphile-realtime-codegen-e2e

E2E validation that the generated ORM client (from `@constructive-io/graphql-codegen`)
works end-to-end with a real PostGraphile server, a real `graphql-ws` WebSocket
transport, and real PostgreSQL `LISTEN/NOTIFY`.

## What this tests

The test suite in `__tests__/realtime-orm-client.integration.test.ts`:

1. Boots a real PostgreSQL test database via `pgsql-test` and seeds it with `sql/contact-seed.sql`.
2. Builds a PostGraphile GraphQL schema with `RealtimeSubscriptionsPlugin` using `graphile-realtime-test`.
3. Starts a standalone `ws` + `graphql-ws` WebSocket server on a random port.
4. Calls `generateOrm()` to produce typed ORM client TypeScript source files for the `contact` table.
5. Compiles the generated files into a tmpdir with `tsc`.
6. Creates a generated `OrmClient` wired to the test WS server, calls `client.contact.subscribe()`, fires `pg_notify()` via `ctx.notifyChange()`, and asserts that events arrive correctly.

## Test cases

| # | Name | What it proves |
|---|------|---------------|
| 1 | UPDATE event end-to-end | Generated `subscribe()` receives `operation: 'UPDATE'` when `ctx.notifyChange()` fires |
| 2 | INVALIDATE event (overflow) | `notifyInvalidate()` produces `operation: 'INVALIDATE'` with `overflow: true` |
| 3 | No events after unsubscribe | The returned `Unsubscribe` function truly cancels delivery |

## How to run locally

You need a running PostgreSQL 17+ instance accessible on `localhost:5432`.

```bash
# Option A: use the pgpm Docker helper (recommended)
pgpm docker start --image pyramation/postgres:17 --recreate
eval "$(pgpm env)"

# Option B: set env vars directly
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=password

# Run the tests
cd graphile/graphile-realtime-codegen-e2e
pnpm test
```

These tests are intentionally **not run in CI** — they require a live Docker PostgreSQL instance. Add a CI step only after wiring up the Docker service in the CI pipeline.

## Known limitations

**No `emit_change` trigger.** The `emit_change` PL/pgSQL trigger that converts DML operations into `pg_notify()` calls lives in `constructive-db`, not in this monorepo. Events are simulated via `ctx.notifyChange()`, which fires `pg_notify()` directly on the root pg client (outside any transaction). A fully DB-trigger-driven test would require either checking out the constructive-db submodule or hand-writing the trigger SQL — out of scope for this minimal e2e harness.

**Standalone WS server, not grafserv.** The test WS server is created by `graphile-realtime-test`'s `getConnections()`. It is a minimal `ws` + `graphql-ws` server. The production `grafserv` HTTP server does not accept WS upgrades in this branch without additional configuration.

## Why pgpm workspaces was not used

`pgpm workspaces` is a SQL migration management tool (manages Sqitch-compatible PostgreSQL migrations). It is not the right abstraction for a runtime test harness — this package is a Jest test suite, not a SQL migration. pnpm workspaces (`pnpm-workspace.yaml`) is used instead (the standard mechanism for monorepo packages in this repo).

## Suggested follow-ups (out of scope for this branch)

- Install the `emit_change` trigger SQL from `constructive-db` so tests exercise the real DML trigger path.
- Add filter args tests: watch a specific `ids` set and assert that unwatched rows produce `UNKNOWN` events (see `realtime-websocket.integration.test.ts` for the pattern).
- Add a multi-subscriber concurrency test: two ORM clients subscribed simultaneously.
- Wire CI: add a `postgres:17` Docker service to the GitHub Actions workflow and include this package in the test matrix.
