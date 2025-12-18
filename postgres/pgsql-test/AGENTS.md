# pgsql-test Package - Agent Guide

The `pgsql-test` package provides fast, isolated PostgreSQL databases for integration testing.

It’s used throughout the Constructive/PGPM monorepo for:

- module/migration tests (PGPM)
- PostGraphile/GraphQL integration tests (Constructive GraphQL packages)
- S3/MinIO upload tests that need database + API wiring

## Main API

- `getConnections(connectionOptions?, seedAdapters?)` – creates an isolated test database and returns clients plus a `teardown()` function
- `seed.*` – helpers for seeding (`sqlfile`, `fn`, `csv`, and PGPM/Sqitch-style module seeding)

Typical Jest pattern:

```ts
import { getConnections } from 'pgsql-test';

let db, teardown;

beforeAll(async () => {
  ({ db, teardown } = await getConnections());
});

afterAll(() => teardown());
beforeEach(() => db.beforeEach());
afterEach(() => db.afterEach());
```

## Seeding Notes

- For raw SQL seeding, use `seed.sqlfile([...paths])`.
- For module-based seeding (deploying a module/workspace into the test DB), use the PGPM seed adapter (e.g. `seed.pgpm(cwd)`).

## Where To Look

- `postgres/pgsql-test/src/connect.ts` – connection/bootstrap logic
- `postgres/pgsql-test/src/test-client.ts` – `PgTestClient` helpers (`beforeEach`, `afterEach`, `setContext`, etc.)
- `postgres/pgsql-test/src/seed/*` – seed adapters
- `postgres/pgsql-test/__tests__/*` – usage examples
