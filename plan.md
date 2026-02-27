# pgpm --graphql export: Implementation Plan (Round 2)

## Benchmark Metrics
- Start time: 2026-02-27T06:04:00Z
- End time: 2026-02-27T06:22:00Z
- Files read: 25

  1. `/tmp/benchmark2/control/constructive/pgpm/cli/src/commands.ts`
  2. `/tmp/benchmark2/control/constructive/pgpm/core/src/export/export-migrations.ts`
  3. `/tmp/benchmark2/control/constructive/__fixtures__/output/schemas/db_migrate.ts`
  4. `/tmp/benchmark2/control/constructive/pgpm/cli/src/commands/export.ts`
  5. `/tmp/benchmark2/control/constructive/sdk/constructive-sdk/src/index.ts`
  6. `/tmp/benchmark2/control/constructive/sdk/constructive-sdk/src/admin/index.ts`
  7. `/tmp/benchmark2/control/constructive/sdk/constructive-sdk/src/admin/orm/client.ts`
  8. `/tmp/benchmark2/control/constructive/sdk/constructive-sdk/src/admin/orm/query/index.ts`
  9. `/tmp/benchmark2/control/constructive/sdk/constructive-sdk/src/admin/orm/query-builder.ts`
  10. `/tmp/benchmark2/control/constructive/sdk/constructive-sdk/src/admin/orm/models/index.ts`
  11. `/tmp/benchmark2/control/constructive/sdk/constructive-sdk/src/admin/orm/models/orgMember.ts`
  12. `/tmp/benchmark2/control/constructive/sdk/constructive-sdk/README.md`
  13. `/tmp/benchmark2/control/constructive/sdk/constructive-sdk/schemas/admin.graphql` (grep)
  14. `/tmp/benchmark2/control/constructive/graphile/graphile-settings/src/presets/constructive-preset.ts`
  15. `/tmp/benchmark2/control/constructive/graphql/server/src/middleware/graphile.ts`
  16. `/tmp/benchmark2/control/constructive/graphql/server/src/middleware/api.ts`
  17. `/tmp/benchmark2/control/constructive/graphql/query/src/executor.ts`
  18. `/tmp/benchmark2/control/constructive/graphql/query/package.json`
  19. `/tmp/benchmark2/control/constructive/graphql/codegen/src/cli/index.ts`
  20. `/tmp/benchmark2/control/constructive/graphql/codegen/src/core/codegen/cli/index.ts`
  21. `/tmp/benchmark2/control/constructive/packages/cli/src/commands.ts`
  22. `/tmp/benchmark2/control/constructive/pgpm/core/package.json`
  23. `/tmp/benchmark2/control/constructive/pgpm/cli/package.json`
  24. `/tmp/benchmark2/control/constructive/pgpm/core/src/export/export-meta.ts`
  25. `/tmp/benchmark2/control/constructive/pgpm/core/__tests__/export/export-flow.test.ts`

---

## Executive Summary

The `pgpm export` command currently fetches migration history by running raw SQL directly
against a Postgres pool (`db_migrate.sql_actions WHERE database_id = $1`). The `--graphql`
flag replaces that single SQL query with a PostGraphile-backed GraphQL query. No other export
logic changes — the same module scaffolding, file writing, and meta export still happen.

The implementation requires:
1. A new helper module that uses `QueryExecutor` (from `@constructive-io/graphql-query`) to
   stand up an in-process PostGraphile instance exposing the `db_migrate` schema, then fetches
   `sqlActions` records via a generated GraphQL query string.
2. A thin option flag threaded from the CLI down to the core.
3. A new `@constructive-io/graphql-query` dependency added to `@pgpmjs/core`.

No SDK codegen is required because this is a local in-process query (not an HTTP client call).
No changes to the server-side GraphQL API, schema files, or codegen output are needed.

---

## Current Implementation

### CLI entry point

**File:** `pgpm/cli/src/commands/export.ts`  
**Function:** default export (anonymous async arrow function)

Flow:
1. Collects `database`, `database_id`, `author`, `extensionName`, `schema_names` via prompts.
2. Calls `exportMigrations(...)` from `@pgpmjs/core`.

### Core function

**File:** `pgpm/core/src/export/export-migrations.ts`  
**Public function:** `exportMigrations(options: ExportOptions): Promise<void>`  
**Private function:** `exportMigrationsToDisk(options: ExportMigrationsToDiskOptions): Promise<void>`

`exportMigrations` loops over `database_ids` and calls `exportMigrationsToDisk` for each.

### The SQL query being replaced

**File:** `pgpm/core/src/export/export-migrations.ts`  
**Lines 254–260:**

```typescript
// Filter sql_actions by database_id to avoid cross-database pollution
const results = await pgPool.query(
  `select * from db_migrate.sql_actions where database_id = $1 order by id`,
  [databaseId]
);
```

The result (`results.rows`) is an array of rows matching the `sql_actions` shape, which is then
passed to `writePgpmPlan()` and `writePgpmFiles()` as `PgpmRow[]`.

---

## Shape of `sql_actions` Data

From `__fixtures__/output/schemas/db_migrate.ts`:

| Column       | Type            | Notes                  |
|--------------|-----------------|------------------------|
| `id`         | `number`        | serial PK (int4)       |
| `name`       | `string \| null`| migration name         |
| `database_id`| `UUID \| null`  | FK to metaschema DB    |
| `deploy`     | `string \| null`| deploy path            |
| `deps`       | `any \| null`   | jsonb: dependency list |
| `payload`    | `any \| null`   | jsonb                  |
| `content`    | `string \| null`| deploy SQL text        |
| `revert`     | `string \| null`| revert SQL text        |
| `verify`     | `string \| null`| verify SQL text        |
| `created_at` | `Timestamp \| null` | timestamptz        |

The `PgpmRow` type consumed by `writePgpmPlan`/`writePgpmFiles` uses the subset:
`{ deploy, deps, content, revert?, verify? }`.

---

## GraphQL API Surface

### Current state

The `db_migrate` schema is **not currently exposed** in any GraphQL API. The four existing SDK
schemas (`admin`, `auth`, `objects`, `public`) do not include `db_migrate`.

### How PostGraphile would expose it

PostGraphile with `ConstructivePreset` (which includes `InflektPreset`) applied to the
`db_migrate` schema would expose:

| Table                    | GraphQL query field | Connection type        |
|--------------------------|---------------------|------------------------|
| `db_migrate.sql_actions` | `sqlActions`        | `SqlActionConnection`  |

The camelCase inflection drops the schema prefix and pluralises: `sql_actions` → `sqlActions`.

The query that needs to run:

```graphql
query FetchSqlActions($databaseId: UUID!, $orderBy: [SqlActionOrderBy!]) {
  sqlActions(
    condition: { databaseId: $databaseId }
    orderBy: $orderBy
  ) {
    nodes {
      id
      name
      databaseId
      deploy
      deps
      payload
      content
      revert
      verify
      createdAt
    }
  }
}
```

(PostGraphile generates `condition:` for equality filters, `orderBy:` with `ID_ASC` by default.)

### Execution approach

Use `QueryExecutor` from `@constructive-io/graphql-query` for **in-process** PostGraphile
execution. This avoids needing a running HTTP server:

```typescript
import { QueryExecutor } from '@constructive-io/graphql-query';
import { buildConnectionString } from 'pg-cache';

const executor = new QueryExecutor({
  connectionString: buildConnectionString({ ...options.pg, database }),
  schemas: ['db_migrate'],
});
await executor.initialize();

const result = await executor.execute<{ sqlActions: { nodes: SqlActionRow[] } }>(
  parse(FETCH_SQL_ACTIONS_QUERY),
  { databaseId }
);
```

No auth headers or JWT are needed — the query runs with the Postgres role implied by the
connection string, which already has access to `db_migrate.sql_actions` (same credentials
as the current SQL pool).

---

## New Files

### 1. `pgpm/core/src/export/fetch-sql-actions-graphql.ts`

Contains:
- The `FETCH_SQL_ACTIONS_GQL` constant (the query string shown above)
- The `fetchSqlActionsViaGraphQL(opts)` async function that:
  1. Constructs a `QueryExecutor` with `schemas: ['db_migrate']` and the DB connection string
  2. Calls `executor.execute()` with the query and `databaseId` variable
  3. Maps `result.data.sqlActions.nodes` → `PgpmRow[]`
  4. Throws if `result.errors` is non-empty
  5. Calls `executor.release()` (or let GC / LRU cache handle it)

Signature:

```typescript
export async function fetchSqlActionsViaGraphQL(opts: {
  connectionString: string;
  databaseId: string;
}): Promise<PgpmRow[]>
```

---

## Modified Files (with specific changes)

### 1. `pgpm/core/package.json`

Add `@constructive-io/graphql-query` to `dependencies`:

```json
"dependencies": {
  "@constructive-io/graphql-query": "workspace:^",
  ...existing deps...
}
```

### 2. `pgpm/core/src/export/export-migrations.ts`

**Change A — extend `ExportMigrationsToDiskOptions`:**

```typescript
interface ExportMigrationsToDiskOptions {
  // ...existing fields...
  /** Use GraphQL API instead of direct SQL to fetch sql_actions */
  graphql?: boolean;
}
```

**Change B — extend `ExportOptions`:**

```typescript
interface ExportOptions {
  // ...existing fields...
  /** Use GraphQL API instead of direct SQL to fetch sql_actions */
  graphql?: boolean;
}
```

**Change C — branch in `exportMigrationsToDisk` (lines ~254–260):**

Replace the single SQL query block:

```typescript
// BEFORE:
const results = await pgPool.query(
  `select * from db_migrate.sql_actions where database_id = $1 order by id`,
  [databaseId]
);
```

With a conditional:

```typescript
// AFTER:
let sqlActionRows: any[];
if (graphql) {
  const connectionString = buildConnectionString({ ...options.pg, database });
  sqlActionRows = await fetchSqlActionsViaGraphQL({ connectionString, databaseId });
} else {
  const results = await pgPool.query(
    `select * from db_migrate.sql_actions where database_id = $1 order by id`,
    [databaseId]
  );
  sqlActionRows = results.rows;
}
// Use sqlActionRows in place of results.rows for the remainder of the function.
```

**Change D — thread `graphql` through `exportMigrations`:**

```typescript
export const exportMigrations = async ({
  ...
  graphql,
}: ExportOptions): Promise<void> => {
  for (let v = 0; v < dbInfo.database_ids.length; v++) {
    await exportMigrationsToDisk({
      ...
      graphql,
    });
  }
};
```

**Change E — add import at top of file:**

```typescript
import { buildConnectionString } from 'pg-cache';
import { fetchSqlActionsViaGraphQL } from './fetch-sql-actions-graphql';
```

(`buildConnectionString` may already be importable from `pg-cache`; verify.)

### 3. `pgpm/cli/src/commands/export.ts`

**Change A — add `--graphql` to usage text:**

```
Options:
  ...existing...
  --graphql               Use GraphQL API instead of direct SQL connection
```

**Change B — pass `graphql` down:**

```typescript
// Extract graphql flag (argv.graphql is boolean)
const useGraphql = !!(argv.graphql);

await exportMigrations({
  project,
  options,
  dbInfo,
  author,
  schema_names,
  outdir,
  extensionName,
  metaExtensionName,
  prompter,
  graphql: useGraphql,   // ← new
});
```

No additional prompting is needed — it's a plain flag, not an interactive question.

---

## Implementation Sequence

1. **Add dependency** — in `pgpm/core/package.json`, add
   `"@constructive-io/graphql-query": "workspace:^"`.
   Run `pnpm install` from the repo root.

2. **Create `fetch-sql-actions-graphql.ts`** — implement the GraphQL query constant and
   `fetchSqlActionsViaGraphQL()` function. Map camelCase GraphQL response fields back to
   snake_case `PgpmRow` fields (`databaseId` → `database_id`, `createdAt` → `created_at`, etc.).

3. **Extend `ExportMigrationsToDiskOptions` and `ExportOptions`** — add optional `graphql?: boolean`.

4. **Branch in `exportMigrationsToDisk`** — replace the `pgPool.query(...)` block with the
   conditional that calls `fetchSqlActionsViaGraphQL` when `graphql === true`.

5. **Thread option through `exportMigrations`** — pass `graphql` to each
   `exportMigrationsToDisk` call.

6. **Update CLI command** — add flag to usage text; pass `argv.graphql` to `exportMigrations`.

7. **Test** — run existing export tests; add a unit test for `fetchSqlActionsViaGraphQL`
   (can mock `QueryExecutor`) and an integration test that exercises `pgpm export --graphql`.

8. **Build** — `pnpm build` inside `pgpm/core` and `pgpm/cli` to verify TypeScript compilation.

---

## Open Questions / Risks

1. **`buildConnectionString` availability in `pg-cache`** — the function is imported in
   `graphile-settings` but may not be re-exported from `pg-cache`. Check and import from
   the correct package (`pg-env` / `pg-cache`).

2. **PostGraphile field naming under `InflektPreset`** — the actual query field name for
   `sql_actions` may differ from `sqlActions` if InflektPreset applies custom rules. Verify
   by running the executor against a test DB with `getSchema()` and inspecting field names
   before writing the query string.

3. **`condition:` vs `filter:` for filtering** — PostGraphile exposes both `condition:` (exact
   equality) and `filter:` (via connection-filter plugin). Since `EnableAllFilterColumnsPreset`
   is active, both should be available. `condition: { databaseId: $databaseId }` is simpler and
   preferred.

4. **Schema name `db_migrate` vs `db_migrate` exposure** — PostGraphile may prefix type names
   with the schema if multiple schemas are exposed simultaneously. Since we pass only
   `schemas: ['db_migrate']`, there's no ambiguity.

5. **`pgPool.end()` lifecycle** — `exportMigrationsToDisk` calls `pgPool.end()` at the bottom.
   When using the GraphQL path, the `QueryExecutor` internally creates its own pool (via
   `makePgService`). Ensure the executor's pool is released after use (call
   `QueryExecutor.clearCache()` or rely on LRU eviction).

6. **`QueryExecutor` startup cost** — PostGraphile schema introspection takes ~1–3 seconds on
   first call. This is acceptable for a CLI command but should be noted.

7. **`--graphql` with remote HTTP endpoint** — the task specifies using the "Constructive SDK
   GraphQL API". If the intent is to use an *external* HTTP API (not in-process), then the
   approach changes: use `FetchAdapter` + `OrmClient` pointing to a remote endpoint (configured
   via environment variable like `CONSTRUCTIVE_GRAPHQL_ENDPOINT`). This would require auth
   headers (JWT). The in-process approach above is safer for parity with existing SQL behavior
   (same DB credentials, no auth layer needed). The flag could accept an optional URL:
   `--graphql [endpoint]` to support both modes.
