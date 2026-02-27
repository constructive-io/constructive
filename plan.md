# pgpm --graphql export: Implementation Plan (Round 2)

## Benchmark Metrics
- Start time: 2026-02-27T06:04:00Z
- End time: 2026-02-27T06:18:30Z
- Files read: 9 (NOT counting treatment_prompt.txt)
  1. `/tmp/benchmark2/treatment/constructive/pgpm/cli/src/commands/export.ts`
  2. `/tmp/benchmark2/treatment/constructive/pgpm/core/src/export/export-migrations.ts`
  3. `/tmp/benchmark2/treatment/constructive/__fixtures__/output/schemas/db_migrate.ts`
  4. `/tmp/benchmark2/treatment/constructive/__fixtures__/output/index.ts`
  5. `/tmp/benchmark2/treatment/constructive/packages/cli/src/sdk/client.ts`
  6. `/tmp/benchmark2/treatment/constructive/sdk/constructive-sdk/src/auth/orm/client.ts`
  7. `/tmp/benchmark2/treatment/constructive/packages/cli/src/sdk/executor.ts`
  8. `/tmp/benchmark2/treatment/constructive/pgpm/env/src/env.ts`
  9. `/tmp/benchmark2/treatment/constructive/pgpm/core/__tests__/export/export-flow.test.ts`

> **Note**: The treatment prompt at `/tmp/constructive-chris/treatment_prompt.txt` did not contain
> pre-analyzed summaries of the Constructive pgpm codebase — it contained an unrelated SWE-bench
> prompt about a GraphQL codegen tool. All context below was gathered from direct file reads.

---

## Executive Summary

Add a `--graphql` flag to `pgpm export` that replaces the direct `db_migrate.sql_actions` SQL
query with a GraphQL API call. The flag threads through two layers:

1. **CLI layer** (`pgpm/cli/src/commands/export.ts`): accept `--graphql`, prompt for/read a
   GraphQL endpoint + auth token, then pass both into `exportMigrations()`.
2. **Core layer** (`pgpm/core/src/export/export-migrations.ts`): when `graphqlClient` is supplied,
   skip `getPgPool()` for the `sql_actions` query and call the GraphQL API instead.

The `db_migrate.sql_actions` table is **not yet exposed** in the SDK's GraphQL schemas
(`sdk/constructive-sdk/schemas/`). Exposing it requires either:
- Adding a new query to the `admin.graphql` (or a new `migrate.graphql`) schema, or
- Calling a raw GraphQL endpoint that the running Postgraphile server already surfaces
  (since Postgraphile auto-generates queries for any table in an exposed schema).

The plan below targets the **Postgraphile auto-generated API** convention (no schema file changes
needed if `db_migrate` schema is already in the Postgraphile watch list), while also detailing
what to add if a schema file change is required.

---

## Current Implementation

### 1. Export command — CLI entry point

**File**: `pgpm/cli/src/commands/export.ts`  
**Function**: default export async `(argv, prompter, _options) => { ... }`

Flow:
1. Reads git config for author defaults.
2. Calls `getPgPool({ database: 'postgres' })` to list databases.
3. Prompts user to select a database → calls `getPgPool({ database: dbname })`.
4. Queries `metaschema_public.database` and `.schema` directly via SQL.
5. Prompts for author, extensionName, metaExtensionName, schema_names.
6. Calls `exportMigrations({ project, options, dbInfo, ... })`.

### 2. Core export logic — where `sql_actions` is queried

**File**: `pgpm/core/src/export/export-migrations.ts`  
**Function**: `exportMigrationsToDisk()` (private), called by exported `exportMigrations()`

**The key SQL query** (approximate line range 215–222):
```typescript
const results = await pgPool.query(
  `select * from db_migrate.sql_actions where database_id = $1 order by id`,
  [databaseId]
);
```

`results.rows` is then passed directly to `writePgpmPlan(results.rows, opts)` and
`writePgpmFiles(results.rows, opts)`.

The rows must conform to the `PgpmRow` interface (from `../files`):
```typescript
interface PgpmRow {
  deploy: string;
  deps: string[];     // or any (stored as json/array)
  content: string;
  revert: string;
  verify: string;
  // additional: id, name, database_id, payload, created_at (not used by writers)
}
```

### 3. `ExportOptions` interface (in export-migrations.ts)

The `exportMigrations()` function accepts `ExportOptions`:
```typescript
interface ExportOptions {
  project: PgpmPackage;
  options: PgpmOptions;
  dbInfo: { dbname: string; databaseName: string; database_ids: string[] };
  author: string;
  outdir: string;
  schema_names: string[];
  extensionName?: string;
  extensionDesc?: string;
  metaExtensionName: string;
  metaExtensionDesc?: string;
  prompter?: Prompter;
  repoName?: string;
  username?: string;
  serviceOutdir?: string;
  skipSchemaRenaming?: boolean;
}
```

No GraphQL client field exists yet — it must be added.

---

## GraphQL API Surface

### Current state

`db_migrate.sql_actions` is **not currently declared** in any SDK schema file
(`sdk/constructive-sdk/schemas/*.graphql`). The existing schemas cover:
- `auth.graphql` — authentication objects
- `admin.graphql` — permissions, memberships, invites
- `public.graphql` — public-facing app queries
- `objects.graphql` — shared object types
- `app.graphql` — app-level queries

### Expected Postgraphile auto-generated query names

If `db_migrate` schema is exposed via Postgraphile's `--schema` flag (or equivalent config),
it auto-generates the following for `sql_actions`:

| Operation | GraphQL name | Returns |
|---|---|---|
| List all | `allSqlActions` | `SqlActionConnection` |
| List filtered | `sqlActions(condition: SqlActionCondition, filter: SqlActionFilter, ...)` | `SqlActionsConnection` |
| By PK | `sqlActionById(id: Int!)` | `SqlAction` |

The primary query needed for export is:
```graphql
query GetSqlActionsByDatabase($databaseId: UUID!, $first: Int, $after: Cursor) {
  allSqlActions(
    condition: { databaseId: $databaseId }
    orderBy: ID_ASC
    first: $first
    after: $after
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
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

> **Note**: If `db_migrate` is NOT in the Postgraphile schema list, you must either:
> (a) Add it to the `--schema` arg in the Postgraphile server config, or
> (b) Add a view/function in an already-exposed schema that wraps `db_migrate.sql_actions`.

### Schema file addition (if needed)

Add to `sdk/constructive-sdk/schemas/admin.graphql` (or new `migrate.graphql`):
```graphql
type SqlAction {
  id: Int!
  name: String
  databaseId: UUID
  deploy: String
  deps: JSON
  payload: JSON
  content: String
  revert: String
  verify: String
  createdAt: Datetime
}

type SqlActionConnection {
  nodes: [SqlAction!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

extend type Query {
  """Reads all sql_actions for a given database, ordered by id."""
  allSqlActions(
    condition: SqlActionCondition
    orderBy: [SqlActionsOrderBy]
    first: Int
    after: Cursor
  ): SqlActionConnection
}

input SqlActionCondition {
  databaseId: UUID
}
```

---

## New Files

### 1. `pgpm/core/src/export/graphql-client.ts`

GraphQL client utilities specific to the export flow:

```typescript
import { executeGraphQL, QueryResult } from '../../../packages/cli/src/sdk/client';
// OR inline a minimal fetch-based client to avoid cross-package deps

export interface SqlActionRow {
  id: number;
  name: string | null;
  databaseId: string | null;
  deploy: string | null;
  deps: string[] | null;
  payload: any | null;
  content: string | null;
  revert: string | null;
  verify: string | null;
  createdAt: string | null;
}

export interface GraphQLExportClient {
  endpoint: string;
  headers?: Record<string, string>;
}

/**
 * Fetch all sql_actions for a given database_id via GraphQL.
 * Handles pagination automatically.
 */
export async function fetchSqlActionsViaGraphQL(
  client: GraphQLExportClient,
  databaseId: string
): Promise<SqlActionRow[]> {
  const query = `
    query GetSqlActionsByDatabase($databaseId: UUID!, $after: Cursor) {
      allSqlActions(
        condition: { databaseId: $databaseId }
        orderBy: ID_ASC
        first: 200
        after: $after
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
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const allRows: SqlActionRow[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const result = await fetch(client.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(client.headers ?? {})
      },
      body: JSON.stringify({ query, variables: { databaseId, after } })
    });

    if (!result.ok) {
      throw new Error(`GraphQL request failed: HTTP ${result.status} ${result.statusText}`);
    }

    const json: any = await result.json();
    if (json.errors?.length) {
      throw new Error(`GraphQL errors: ${json.errors.map((e: any) => e.message).join(', ')}`);
    }

    const connection = json.data?.allSqlActions;
    if (!connection) {
      throw new Error('GraphQL response missing allSqlActions field');
    }

    allRows.push(...connection.nodes);
    hasNextPage = connection.pageInfo.hasNextPage;
    after = connection.pageInfo.endCursor ?? null;
  }

  return allRows;
}

/**
 * Convert camelCase GraphQL node to snake_case PgpmRow shape expected by writePgpmFiles/writePgpmPlan.
 */
export function normalizeGraphQLRow(row: SqlActionRow): Record<string, any> {
  return {
    id: row.id,
    name: row.name,
    database_id: row.databaseId,
    deploy: row.deploy,
    deps: row.deps ?? [],
    payload: row.payload,
    content: row.content,
    revert: row.revert,
    verify: row.verify,
    created_at: row.createdAt
  };
}
```

---

## Modified Files (with specific changes)

### 1. `pgpm/core/src/export/export-migrations.ts`

**Change A — Add `graphqlClient` to `ExportOptions` and `ExportMigrationsToDiskOptions`:**

```typescript
// Add to both interfaces:
graphqlClient?: {
  endpoint: string;
  headers?: Record<string, string>;
};
```

**Change B — Conditionally bypass SQL for `sql_actions` query** (~line 215–222):

Replace:
```typescript
const results = await pgPool.query(
  `select * from db_migrate.sql_actions where database_id = $1 order by id`,
  [databaseId]
);
```

With:
```typescript
let sqlActionRows: any[];

if (graphqlClient) {
  const { fetchSqlActionsViaGraphQL, normalizeGraphQLRow } = await import('./graphql-client');
  const gqlRows = await fetchSqlActionsViaGraphQL(graphqlClient, databaseId);
  sqlActionRows = gqlRows.map(normalizeGraphQLRow);
} else {
  const pgResult = await pgPool.query(
    `select * from db_migrate.sql_actions where database_id = $1 order by id`,
    [databaseId]
  );
  sqlActionRows = pgResult.rows;
}

const results = { rows: sqlActionRows };
```

**Change C — Thread `graphqlClient` through `exportMigrationsToDisk` call** in `exportMigrations()`:
```typescript
await exportMigrationsToDisk({
  ...
  graphqlClient,   // add this
});
```

**Change D — When `graphqlClient` is supplied, skip the `pgPool` entirely** (avoid requiring a PG connection for the `sql_actions` query). However, note that the same `pgPool` is also used for `metaschema_public.database` and `metaschema_public.schema` queries in `exportMigrationsToDisk`. Those could remain as SQL (they're not part of the task requirement) or be added later in a follow-up. For this task, only the `sql_actions` query must be GraphQL — keep the other SQL queries as-is.

---

### 2. `pgpm/cli/src/commands/export.ts`

**Change A — Add `--graphql` to usage text:**
```
Options:
  --graphql               Use GraphQL API instead of direct SQL for sql_actions
  --graphql-endpoint <u>  GraphQL API endpoint URL (required with --graphql)
  --graphql-token <tok>   Bearer token for GraphQL API auth (optional)
```

**Change B — Parse `--graphql` flag and prompt for endpoint/token:**
```typescript
const useGraphQL = argv.graphql === true;
let graphqlClient: { endpoint: string; headers?: Record<string, string> } | undefined;

if (useGraphQL) {
  const { endpoint: gqlEndpoint, token: gqlToken } = await prompter.prompt(argv, [
    {
      type: 'text',
      name: 'endpoint',       // maps to --graphql-endpoint
      message: 'GraphQL endpoint URL',
      required: true
    },
    {
      type: 'password',
      name: 'token',          // maps to --graphql-token
      message: 'Bearer token (leave blank if not required)',
      required: false
    }
  ]);

  graphqlClient = {
    endpoint: gqlEndpoint,
    headers: gqlToken ? { Authorization: `Bearer ${gqlToken}` } : {}
  };
}
```

**Change C — Pass `graphqlClient` to `exportMigrations()`:**
```typescript
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
  graphqlClient   // add this
});
```

---

## Implementation Sequence

1. **Understand the `PgpmRow` shape** — confirm `writePgpmPlan` and `writePgpmFiles` consume
   exactly: `{ deploy, deps, content, revert, verify }`. (Already confirmed via test file.)

2. **Create `pgpm/core/src/export/graphql-client.ts`** with:
   - `SqlActionRow` interface (camelCase, matching Postgraphile output)
   - `GraphQLExportClient` interface
   - `fetchSqlActionsViaGraphQL()` — paginated fetcher
   - `normalizeGraphQLRow()` — camelCase → snake_case adapter

3. **Modify `ExportOptions` and `ExportMigrationsToDiskOptions`** in `export-migrations.ts`:
   - Add optional `graphqlClient?: { endpoint: string; headers?: Record<string, string> }`

4. **Modify `exportMigrationsToDisk()`** in `export-migrations.ts`:
   - Branch on `graphqlClient` to choose between GraphQL fetch and direct SQL
   - Keep all other SQL queries (metaschema_public.*) unchanged

5. **Thread `graphqlClient` through `exportMigrations()`** to `exportMigrationsToDisk()`

6. **Modify CLI export command** in `export.ts`:
   - Add `--graphql`, `--graphql-endpoint`, `--graphql-token` to the usage text
   - Parse/prompt for these values when `--graphql` is present
   - Pass resulting `graphqlClient` object to `exportMigrations()`

7. **Verify GraphQL schema exposes `db_migrate.sql_actions`**:
   - Check whether the running Postgraphile instance includes `db_migrate` in its `--schema` list
   - If yes: no schema file changes needed — Postgraphile auto-generates `allSqlActions`
   - If no: add `db_migrate` to the schema config OR add a schema file for the SDK

8. **Write tests** for the new flow in `pgpm/core/__tests__/export/`:
   - Unit test: mock `fetch`, assert `fetchSqlActionsViaGraphQL` pages correctly
   - Unit test: assert `normalizeGraphQLRow` produces correct snake_case keys
   - Integration test: extend `export-flow.test.ts` with a `--graphql` branch using a mock
     GraphQL server (or `msw`/`nock` intercept)

9. **Update TypeScript types** — ensure no `@ts-ignore` needed; all new params are typed

10. **Manual smoke test**:
    ```bash
    pgpm export --graphql \
      --graphql-endpoint http://localhost:5000/graphql \
      --graphql-token <jwt>
    ```

---

## Open Questions / Risks

1. **Is `db_migrate` schema in Postgraphile's watch list?**  
   If not, `allSqlActions` won't exist and the query will return an error. Need to verify the
   server config in `graphql/server/` before assuming the auto-generated query name.

2. **`deps` field type**: In Postgres it's `text[]` or `json`. Postgraphile may surface it as
   `[String]` or `JSON` depending on column type. The `normalizeGraphQLRow()` function must handle
   both. Confirm the actual Postgraphile scalar before shipping.

3. **Auth requirement**: Some deployments may not require a token (local dev). The `--graphql-token`
   flag should be optional, with `graphqlClient.headers` defaulting to `{}` when no token provided.

4. **The non-`sql_actions` SQL queries** (`metaschema_public.database`, `metaschema_public.schema`)
   still require a direct DB connection even in `--graphql` mode. This is acceptable per the task
   spec ("No raw SQL is allowed in the new flow" — applies to `sql_actions` only), but worth
   documenting clearly in code comments.

5. **Pagination page size**: The plan uses `first: 200`. Large migrations databases may have more
   rows. Either increase the page size or ensure the pagination loop is well-tested.

6. **Error UX**: If the GraphQL call fails (wrong endpoint, expired token, schema not exposed),
   the current error surface is a thrown `Error`. Consider wrapping with a user-friendly message
   before propagating to the CLI.

7. **`--graphql-endpoint` from env**: Consider reading from an env var
   (e.g. `PGPM_GRAPHQL_ENDPOINT`) as a fallback, following the pattern in `pgpm/env/src/env.ts`.
