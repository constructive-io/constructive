# pgpm Export

Export a provisioned Constructive DB back to pgpm packages — two outputs:

| Package | Contains |
|---|---|
| Extension (`extensionName`) | Raw SQL migrations — tables, RLS, functions, indexes |
| Service (`metaExtensionName`) | Metaschema records — database/table/field/policy rows as INSERTs |

## CLI Usage (Partial Automation)

```bash
cd path/to/your-app  # your project workspace
eval "$(pgpm env)"

pgpm export \
  --author "name <email>" \
  --extensionName myapp \
  --metaExtensionName myapp-svc
```

Three prompts still require TTY: select database, select database_id, select schemas.

## Programmatic API

Key steps:
1. Look up `database_id` from `metaschema_public.database`
2. Look up `schema_names` from `metaschema_public.schema`
3. Call `exportMigrations()` from `@pgpmjs/core`

```typescript
await exportMigrations({
  project, options,
  dbInfo: { dbname: HOST_DB, databaseName: DB_NAME, database_ids: [databaseId] },
  author: AUTHOR, schema_names,
  extensionName: EXT_NAME, metaExtensionName: SVC_NAME,
  outdir: resolve(WORKSPACE, 'packages'),
});
```

## How It Works

1. Queries `db_migrate.sql_actions` for raw migration history
2. Applies schema name replacer (internal names → portable `extensionName` prefix)
3. Writes extension package with `pgpm.plan`, `deploy/`, `revert/`, `verify/`
4. Reads metaschema records via `export-meta`
5. Writes service package

## Re-Running

- Interactive: prompts to confirm overwrite
- Programmatic: silently overwrites SQL files, preserves `pgpm.json`/`package.json`

## Generic Table-Data Export (`@pgpmjs/export` export-data)

Shared deterministic data-dump layer for shipping row data inside a pgpm change
(replayed under `session_replication_role = replica`). Use this instead of
hand-rolling INSERT dumps or copying the meta-export internals:

```typescript
import {
  exportTablesData,
  buildDataDeployScript,
  buildDataRevertScript,
  buildDataVerifyScript
} from '@pgpmjs/export';

const exports = await exportTablesData(pool, [
  // FK-dependency order (parents first)
  { schema: 'app_routing_public', table: 'apis' },
  { schema: 'app_routing_public', table: 'api_schemas',
    filter: { column: 'api_id', value: apiId } }
], { excludeColumns: ['dbname'], conflictDoNothing: true });

const deploySql = buildDataDeployScript(exports);  // replica-wrapped INSERTs
const revertSql = buildDataRevertScript(exports);  // DELETE ... WHERE id IN (...), reverse order
const verifySql = buildDataVerifyScript(exports);  // divide-by-zero row checks
```

Key behaviors:

- **Deterministic**: one INSERT per table, rows ordered by `id::text` (or all
  columns when there is no `id`); re-export yields byte-identical SQL.
- **Volatile-default exclusion**: `getDataExportColumns` introspects pg_catalog
  and detects defaults depending on non-immutable functions via the compiled
  default expression (`pg_attrdef.adbin` → `pg_proc.provolatile`) — no regex on
  default text. `isVolatileTimestampColumn` drops wall-clock timestamp columns
  (`now()`, `CURRENT_TIMESTAMP`, `clock_timestamp()`, `now() + interval`) so
  DDL defaults re-supply them at deploy time; constant defaults survive.
- All SQL is emitted through `@constructive-io/query-builder` (AST + deparser),
  never string concatenation.

## Related

- `constructive-sdk` skill — provision before exporting
- `query-builder` skill — the AST-backed SQL generation used by export-data
