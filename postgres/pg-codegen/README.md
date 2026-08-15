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

A Prisma-like, fully typed database client generated from your live PostgreSQL schema — plus the types, decoders and serializers it is built on.

> No hand-written row mappers, no `row.created_at as string`, no column lists at the call site. Point it at a database and query.

## 🚀 Quick start

```bash
npm install pg-codegen
pg-codegen --schema app_public --out src/generated
```

```ts
import { Pool } from 'pg';
import { createAppPublicDb } from './generated/app_public/db';

const db = createAppPublicDb(new Pool());

// full row, decoded and camelCase — no select needed
const user = await db.users.findFirst({ where: { email: 'nadia@example.com' } });

// narrow it inline; the result type follows
const names = await db.users.findMany({
  where: { isActive: true, createdAt: { greaterThan: since } },
  select: { id: true, username: true },
  orderBy: { createdAt: 'DESC' },
  limit: 20
});

const created = await db.users.create({ data: { username: 'nadia', email: 'nadia@example.com' } });
await db.users.updateOrThrow({ where: { id: created.id }, data: { isActive: false } });
```

Connection settings come from the standard PG environment (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`) via `pg-env`.

## 🧭 The client

One `create<Schema>Db(db, options?)` factory per schema, one client per table:

| Method | Returns |
|---|---|
| `findMany(args?)` | `SelectResult[]` |
| `findFirst(args?)` | `SelectResult \| null` |
| `findFirstOrThrow(args?)` | `SelectResult`, else `RowNotFoundError` |
| `count(where?)` | `number` |
| `create({ data, select? })` | the inserted row |
| `update({ where, data, select? })` | the updated rows |
| `updateOrThrow({ where, data, select? })` | one updated row, else `RowNotFoundError` |
| `delete({ where, select? })` | the deleted rows |
| `$with(db)` | the same clients bound to another connection |

`where` / `select` / `orderBy` are keyed by camelCase field names and mapped to physical columns for you. `where` speaks the same query-spec grammar as the GraphQL side — `equalTo`, `notEqualTo`, `in`, `notIn`, `lessThan`, `greaterThanOrEqualTo`, `like`, `likeInsensitive`, `startsWith`, `includes`, `isNull`, … — and a bare value means `equalTo` (`null` means `isNull`):

```ts
await db.posts.findMany({ where: { authorId, status: { in: ['draft', 'review'] }, publishedAt: null } });
await db.posts.findMany({ where: { or: [{ authorId }, { editorId: authorId }], not: { status: 'archived' } } });
```

`and` / `or` / `not` nest the same shape.

`update` and `delete` **require** a `where`: an empty filter throws rather than rewriting the table. Reads accept one and read the table unfiltered.

Writes are encoded from the generated column metadata (json/jsonb columns stringified, `Date` → ISO), and every returned row comes back through the generated per-column decoders, so a value that does not match its column's type raises `CoerceError` instead of flowing on as a lie.

A write value may also be an expression, so a write that reads the column it sets stays one statement instead of a read followed by a write:

```ts
import { add, col } from '@constructive-io/query-builder';

await db.resources.update({
  where: { id },
  data: { status: 'failed', lastError: message, errorCount: add(col('error_count'), 1) }
});
// UPDATE … SET status = $1, last_error = $2, error_count = error_count + 1 WHERE id = $3
```

An expression is deparsed in place — never bound as a value, never serialized as one.

### Selections type the result

`select` is the only projection, stated either way round, and the return type follows it with nothing to annotate:

```ts
await db.emailIdentities.findFirst({ where: { id } });
// EmailIdentities | null — every column

await db.emailIdentities.findFirst({ select: { id: true, slug: true } });
// Pick<EmailIdentities, 'id' | 'slug'> | null

await db.emailIdentities.findFirst({ select: { databaseId: false } });
// Omit<EmailIdentities, 'databaseId'> | null
```

Excluding is what a caller reaches for when a field must not be carried — a secret's id, row bookkeeping — or when this binding's table genuinely lacks it: an excluded field is absent from the type, so reading it does not compile. Naming any field `true` is a projection and wins outright; the excluded ones are simply not in it.

### Naming a filter or a write input

The client's own vocabulary is exported from the package root, keyed by a generated record, so a function that takes a filter or the values of a write says so without restating the fields:

```ts
import type { Data, Where } from './generated';
import type { EmailIdentities } from './generated/routing_public';

const active = (extra: Where<EmailIdentities>) => ({ isActive: true, ...extra });
type IdentityInput = Data<EmailIdentities>;   // every field optional, camelCase
```

`Where`, `Data`, `SelectShape`, `OrderBy` and `Queryable` all come from there.

### Transactions

`$with` rebinds every table client to another connection, so a transaction is the same code against a different handle:

```ts
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const tx = db.$with(client);
  const run = await tx.agentRuns.create({ data: { threadId, status: 'running' } });
  await tx.agentEvents.create({ data: { runId: run.id, seq: 1 } });
  await client.query('COMMIT');
} finally {
  client.release();
}
```

### Tables provisioned under a different name

The schema and physical table names are runtime arguments, so one generated client serves a per-tenant or per-scope deployment of the same tables:

```ts
const routing = createRoutingPublicDb(pool, {
  schema: tenant.schema,
  tables: { emailIdentities: 'platform_email_identities' }
});
```

## ✨ What it generates

For every table, view, materialized view and partitioned table in the schemas you name, one module:

| Export | What it is |
|---|---|
| `AgentRuns` | application shape, camelCase |
| `AgentRunsRow` | database row shape, snake_case |
| `agentRunsTable` | `schema`, `name`, `qualifiedName`, `columns`, `primaryKey`, `columnByField` |
| `agentRunsFields` | one decoder per column, for projections |
| `decodeAgentRuns` | decode an untrusted camelCase envelope (a wire payload, a parsed body) |
| `decodeAgentRunsRow` | decode an untrusted database row |
| `agentRunsFromRow` | row → application shape |
| `decodeAgentRunsFromRow` | both, composed |
| `serializeAgentRuns` | `Partial<AgentRuns>` → `Partial<AgentRunsRow>` for INSERT/UPDATE |

Plus, per schema, a `db.ts` (the client above), an `enums.ts` — a literal union, a `readonly` value list and `as*`/`require*` checkers for every PostgreSQL enum a column references — and barrels; and one shared `client.ts` runtime at the root.

Every decoder is backed by [`@constructive-io/coerce`](../../packages/coerce): a NOT NULL column throws `CoerceError` naming the offending column, a nullable column answers `null`, and the text form `pg` returns for `numeric` is parsed to a number. Nothing is silently coerced across types, so a malformed row cannot become a default value.

An `int8` column is a **`string`** — the canonical digits of the value, which is how `pg` returns the type, how `graphql/codegen` spells its `BigInt` scalar, and the only representation that keeps an id past 2^53 (a `number` would round `9007199254740993` to its neighbour). Its decoder accepts any of the three shapes a 64-bit value arrives in — `bigint`, integer `number`, digit string — and answers the canonical digits, so `'007'` and `7` both decode to `'7'`; a write states the string and PostgreSQL reads it as `int8`.

## 🔧 Below the client

The client covers single-table reads and writes. For a join, a function call, or SQL the builder does not model, keep the query and decode its columns — `agentRunsFields` takes an overridable label so the error names the alias the query actually used:

```ts
import { agentRunsFields } from '@my/db-types/codegen_test/agent-runs';
import { threadsFields } from '@my/db-types/codegen_test/threads';

const { rows } = await db.query(`
  SELECT r.id, r.status, t.title AS thread_title
  FROM agent_runs r JOIN threads t ON t.id = r.thread_id
`);

const summaries = rows.map(row => ({
  id: agentRunsFields.id(row.id),
  status: agentRunsFields.status(row.status),
  threadTitle: threadsFields.title(row.thread_title, 'run_summary.thread_title')
}));
```

A whole row from a `SELECT *`-shaped query decodes in one call, and each table is its own module so a bundle carries only what it touches:

```ts
import { decodeAgentRunsFromRow } from '@my/db-types/codegen_test/agent-runs';

const run = decodeAgentRunsFromRow(rows[0]); // AgentRuns, or CoerceError naming the column
```

## 📟 CLI

```bash
pg-codegen --schema app_public --out src/generated
pg-codegen --schema app_public,app_jobs --out src/generated
pg-codegen --schema app_public --out src/generated --check
```

`--check` re-introspects and compares against the committed output, exiting non-zero on drift — run it in CI so generated types cannot go stale against a migration.

## 🧩 Programmatic use

For a schema whose physical name is per-tenant, say, where you want to rewrite it to a stable alias before emitting:

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

## 🧱 How it works

```
PostgreSQL → introspectron → IR (ir.ts) → emitters (emit/*) → file tree
```

`buildIr` normalizes an introspection result into the shape every emitter consumes: columns with a resolved scalar, nullability, defaults, primary keys, and the enums they reference. Domains are unwrapped to their base type, arrays carry their element scalar, and a type with no mapping degrades to `unknown` rather than to `any` — the generator never claims to know a shape it does not.

Emission is Babel AST rather than string templates, so output is stable enough to snapshot and to diff in `--check`. The client runtime is the one exception: `emit/templates/client.ts` is real, typechecked, tested source that is copied into the output, so the runtime every generated client shares is not assembled from AST.
