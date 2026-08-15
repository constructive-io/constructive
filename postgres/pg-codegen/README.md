# pg-codegen

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/pg-codegen"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=postgres%2Fpg-codegen%2Fpackage.json"/></a>
</p>

Type-safe TypeScript from a live PostgreSQL schema: application and row types, runtime decoders, serializers, column metadata and enum unions — one tree-shakable module per table.

> A database row arrives as `unknown`. `pg-codegen` is what turns it into a value TypeScript can trust, without a hand-written `as string` in sight.

## ✨ What it generates

For every table, view, materialized view and partitioned table in the schemas you name, one module:

| Export | What it is |
|---|---|
| `AgentRuns` | application shape, camelCase |
| `AgentRunsRow` | database row shape, snake_case |
| `AGENT_RUNS_TABLE` | `schema`, `name`, `qualifiedName`, `columns`, `primaryKey`, `columnByField` |
| `AGENT_RUNS_FIELDS` | one decoder per column, for projections |
| `decodeAgentRuns` | decode an untrusted camelCase envelope (a wire payload, a parsed body) |
| `decodeAgentRunsRow` | decode an untrusted database row |
| `agentRunsFromRow` | row → application shape |
| `decodeAgentRunsFromRow` | both, composed |
| `serializeAgentRuns` | `Partial<AgentRuns>` → `Partial<AgentRunsRow>` for INSERT/UPDATE |

Plus an `enums.ts` per schema: a literal union, a `readonly` value list and `as*`/`require*` checkers for every PostgreSQL enum a column references.

Every decoder is backed by [`@constructive-io/coerce`](../../packages/coerce): a NOT NULL column throws `CoerceError` naming the offending column, a nullable column answers `null`, and the text forms `pg` returns for `int8`/`numeric` are parsed rather than passed through as strings. Nothing is silently coerced across types, so a malformed row cannot become a default value.

## 🛠️ Install

```bash
npm install pg-codegen
```

## 🚀 Usage

```bash
pg-codegen --schema app_public --out src/generated
pg-codegen --schema app_public,app_jobs --out src/generated
pg-codegen --schema app_public --out src/generated --check
```

`--check` re-introspects and compares against the committed output, exiting non-zero on drift — run it in CI so generated types cannot go stale against a migration.

Connection settings come from the standard PG environment (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`) via `pg-env`.

Programmatically — for a schema whose physical name is per-tenant, say, where you want to rewrite it to a stable alias before emitting:

```ts
import { Client } from 'pg';
import { introspect } from 'introspectron';
import { buildIr, emitFileTree, writeFileTree, checkFileTree } from 'pg-codegen';

const introspection = await introspect(client, { schemas: [physicalSchema] });
const ir = buildIr(introspection, { schemas: [physicalSchema] });
for (const schema of ir.schemas) {
  schema.name = 'agent';
  for (const table of schema.tables) table.schema = 'agent';
}
await writeFileTree(outDir, emitFileTree(ir));
```

## 📟 Example output

```ts
// generated/codegen_test/agent-runs.ts
export interface AgentRuns {
  id: string;
  threadId: string;
  status: RunStatus;
  tags: string[];
  retrySeconds: number[] | null;
  lastEventSeq: number;
  finishedAt: string | null;
}

export const decodeAgentRunsFromRow = (value: unknown, label = 'codegen_test.agent_runs'): AgentRuns =>
  agentRunsFromRow(decodeAgentRunsRow(value, label));
```

Consume per table, so a bundle carries only the tables it touches:

```ts
import { decodeAgentRunsFromRow } from '@my/db-types/codegen_test/agent-runs';

const { rows } = await db.query('SELECT * FROM agent_runs WHERE id = $1', [id]);
const run = decodeAgentRunsFromRow(rows[0]); // AgentRuns, or CoerceError naming the column
```

### Projections

A joined or partial SELECT is not a whole row, so a record decoder would reject it. Decode it column by column instead — `FIELDS` takes an overridable label so the error names the alias the query actually used:

```ts
import { AGENT_RUNS_FIELDS } from '@my/db-types/codegen_test/agent-runs';
import { THREADS_FIELDS } from '@my/db-types/codegen_test/threads';

const { rows } = await db.query(`
  SELECT r.id, r.status, t.title AS thread_title
  FROM agent_runs r JOIN threads t ON t.id = r.thread_id
`);

const summaries = rows.map(row => ({
  id: AGENT_RUNS_FIELDS.id(row.id),
  status: AGENT_RUNS_FIELDS.status(row.status),
  threadTitle: THREADS_FIELDS.title(row.thread_title, 'run_summary.thread_title')
}));
```

## 🧱 How it works

```
PostgreSQL → introspectron → IR (ir.ts) → emitters (emit/*) → file tree
```

`buildIr` normalizes an introspection result into the shape every emitter consumes: columns with a resolved scalar, nullability, defaults, primary keys, and the enums they reference. Domains are unwrapped to their base type, arrays carry their element scalar, and a type with no mapping degrades to `unknown` rather than to `any` — the generator never claims to know a shape it does not.

Emission is Babel AST rather than string templates, so output is stable enough to snapshot and to diff in `--check`.
