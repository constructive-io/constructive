---
name: pgpm-projections
description: The pgpm projections pipeline — normalize any PostgreSQL schema source (module, .sql file, dump, live database) to an identity-keyed semantic model and project it into any representation. Use when asked to "import a schema", "introspect a database", "generate a migration", "diff two schemas", "change migration granularity", "split changes per column", "convert to one big migration", "restructure a pgpm module", "emit linear SQL", "partition a module", "verify a migration against a database", or when working with pgpm import/transform/diff, --granularity, --change-granularity, --partition, --emit-migration, --emit-sql, or --emit-bundle.
compatibility: pgpm CLI, PostgreSQL 14+, Node.js 22+
metadata:
  author: constructive-io
  version: "1.0.0"
---

# pgpm projections

One canonical semantic model, many representations. pgpm normalizes any schema
source to an **identity-keyed object set** (objects keyed by kind/schema/name,
ASTs canonicalized — whitespace, statement order, constraint placement, and
authoring granularity all wash out). Everything downstream is a **projection**:
it changes the representation, never the meaning.

```
source (module dir | .sql file | dump | live DB)
  → parse/classify → identity-keyed semantic model
  → projections (granularity, change granularity, naming, partition)
  → outputs (pgpm module | pgpm changes | linear .sql | bundle)
  → deploy / verify / revert
```

## The dials

| Dial | Values | What it shapes |
| --- | --- | --- |
| `--granularity` | `atomic` \| `object` \| `consolidated` | SQL statement shape *within* a change: one `ALTER` per column/constraint vs one statement per object vs maximally combined |
| `--change-granularity` | `alteration` \| `object` (default) \| `single` | plan-entry distribution *across* changes: one change per column/constraint vs one per object vs one big change |
| `--naming` | `directory` (default) \| `flat` | change path style |
| `--partition <file>` | JSON rules | which objects land in which package (cross-package requires derived) |

The two granularity axes are orthogonal: `--granularity` controls statement
shape, `--change-granularity` controls how statements are distributed across
plan entries. Every combination is semantically invariant — same identity-keyed
model, same deployed catalog.

With `--change-granularity alteration`, every `ADD COLUMN` / `ADD CONSTRAINT`
becomes its own change with its own deploy/revert/verify and graph-derived
requires (paths like `schemas/app/tables/users/columns/email/column`,
`.../constraints/users_pkey/constraint`); unnamed constraints are auto-named
with their Postgres default (`{table}_pkey`, `{table}_{cols}_key`,
`{table}_{cols}_fkey`, `{table}_{col}_check`) so each is independently
revertible. With `single`, the whole module becomes one plan entry
(`module/init` by default).

## Commands

```bash
# schema.sql (or a pg_dump) -> pgpm module
pgpm import schema.sql --pkg myapp --out ./out \
  --granularity object --change-granularity object

# re-dial an existing module (writes sibling <name>-<granularity>)
cd out/myapp
pgpm transform --granularity atomic --change-granularity alteration --out ../alt
pgpm transform --granularity consolidated --change-granularity single --out ../one

# prove a transform is lossless against a real catalog (scratch DBs)
pgpm transform --granularity atomic --check

# semantic diff + migration generation; sides can be a module dir, a .sql
# file, or a live database (db:<name> or a postgres:// DSN — dumped, never
# held open)
pgpm diff <A> <B> --emit-migration ./out --pkg my-migration \
  --granularity atomic --change-granularity alteration \
  --emit-sql ./out/migration.sql --emit-bundle ./out/migration.tar.gz

# append the delta into an existing module's plan instead of a new package
pgpm diff <A> <B> --append-module ./existing-module

# oracle: deploy A + emitted migration into a scratch DB, assert catalog
# equivalence with B deployed fresh
pgpm diff <A> <B> --verify
```

## Library seams (for programmatic use)

- `@pgpmjs/transform` — the engine: `restructureChanges({ granularity, changeGranularity, singleChangeName })`,
  `restructureExportRows`, `diffChangeSets`, `subObjectIdentityOf` (recovers
  column/constraint identity from the raw parse node), `nameUnnamedConstraints`,
  `defaultConstraintName`, `snapshotCatalog`/`diffCatalogSnapshots`.
- `@pgpmjs/naming-spec` — pure identity → path projection (`pathFor`), including
  `column` and `constraint` kinds.
- `@pgpmjs/import` / `@pgpmjs/diff` — source loading (`importDumpRows`,
  `loadDiffSideFromDisk`).
- Output projections (module / linear SQL / bundle) live in the pgpm CLI
  (`pgpm/cli/src/utils/module-projections.ts`) because they depend on
  `@pgpmjs/core`.

## Invariants to preserve (and test against)

- Any dial combination normalizes back to the identical identity-keyed model
  (`diffChangeSets(a, b).identical === true`).
- Any dial combination deploys to the identical Postgres catalog.
- Generated migrations never use `CREATE OR REPLACE`; changed functions emit
  `DROP` + `CREATE`.
- Every emitted change has deploy, revert, and verify; non-derivable reverts
  get a `-- revert not derivable` comment plus a warning, never silence.

Reference example with executable proofs: `examples/pgpm-projections`
(README + database-free jest suite that runs the real CLI). Live-Postgres
coverage: `pgpm/cli/__tests__/transform-e2e.test.ts` and `diff-e2e.test.ts`.
