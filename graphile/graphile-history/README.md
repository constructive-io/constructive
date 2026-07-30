# graphile-history

PostGraphile v5 plugin for per-row **version history**, **point-in-time reads**, and **restore mutations**.

It discovers tables tagged with the `@history` smart tag — the companion
`<table>_history` tables produced by the constructive-db `DataHistory` module —
and augments the GraphQL schema with:

- a `history` field on each source row type: the row's full version stream,
  newest first (`recorded_at DESC`);
- a `versionAt(at: Datetime!)` field: the version that was current at a given
  instant;
- a `restore<Table>Version(input: { <pk>, recordedAt, reinsert })` root
  mutation that rewrites the live row from a historical version (optionally
  re-inserting a deleted row).

All reads and writes flow through the request's `withPgClient` + `pgSettings`,
so row-level security and mutation policies are enforced exactly as for any
other operation. Because a restore writes through the source table, the source
`DataHistory` trigger records the restore itself as a new version.

## Usage

```typescript
import { HistoryPreset } from 'graphile-history';

const preset = {
  extends: [
    HistoryPreset(),
  ],
};
```

### Options

| Option | Default | Description |
| --- | --- | --- |
| `historySuffix` | `'_history'` | Suffix used to derive the history table name when the `@history` tag has no explicit name. |
| `recordedAtColumn` | `'recorded_at'` | Version timestamp column on the history table. |
| `operationColumn` | `'history_op'` | Operation marker column (INSERT/UPDATE/DELETE). |
| `immutableColumns` | `['created_at', 'updated_at']` | Source columns never written by a restore (primary keys are always excluded). |

## Example

```graphql
query {
  postByRowId(rowId: 1) {
    title
    history { title historyOp recordedAt }
    versionAt(at: "2024-02-15T00:00:00Z") { title }
  }
}

mutation {
  restorePostVersion(input: { id: 1, recordedAt: "2024-02-15T00:00:00Z" }) {
    version { title }
    restored { title body }
  }
}
```
