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

# declared renames (never inferred), USING casts, and the explicit opt-ins the
# diff needs before it will emit data loss or steps it cannot invert
pgpm diff <A> <B> --emit-migration ./out \
  --rename app.users.nm=app.users.name --rename app.old=app.new \
  --using app.users.code="nullif(code,'')::int" \
  --allow-data-loss --allow-incomplete

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
- A diff orders everything undeployed — drops, table alterations, replacements
  and creates — by one dependency graph; phase and `to`-side source order only
  break ties, and each change's `requires` are its real graph edges. An
  unorderable cycle throws; nothing falls back to plan or file order.
- A changed function keeps `CREATE OR REPLACE` only when its name, parameters
  and return type are unchanged (Postgres then preserves dependents: views,
  triggers, defaults). Any signature change, and every other replaced object,
  emits `DROP` + `CREATE`; unchanged views/policies/triggers that a dropped or
  retyped column or a replaced object would invalidate are dropped before it
  and recreated after. Hand-written changes still never use `CREATE OR
  REPLACE` (see `sql-create-or-replace-syntax`); this is the one place it is
  emitted, and only because a same-signature replacement is the deterministic
  way to keep dependents intact.
- Every emitted change has deploy, revert, and verify. Steps pgpm cannot
  derive (a DROP it does not know, an inverse that does not exist such as
  `ALTER TYPE .. ADD VALUE`, an enum value added and used by another step of
  the same migration — Postgres cannot use it before the adding transaction
  commits, so deploy with `--no-tx` or split the migration — a composite
  attribute inserted mid-list, which `ADD ATTRIBUTE` can only append) are a
  hard error naming the object; only `--allow-incomplete` emits them, with a
  `-- pgpm:` marker and a warning.
- Steps that can lose data (DROP TABLE/COLUMN/SCHEMA/SEQUENCE, any column type
  change, a type/domain/sequence that must be dropped and recreated) are a
  hard error listing each step; only `--allow-data-loss` emits them. Renames
  are never inferred from a drop/add pair: `--rename schema.table[.column]=…`
  emits `ALTER .. RENAME` with its inverse (and rebuilds dependents that name
  the column around it); an undeclared rename is a refused column drop. A
  table rename also renames the constraints (and their indexes) Postgres named
  after the old table (`old_pkey` → `new_pkey`), rewrites qualified references
  in views, policies, comments, grants and `regclass` literals, and keeps a
  changed function body (text Postgres does not rewrite) restorable by folding
  its inverse into the rename's. A column of a table renamed in the same diff
  is declared with either name: `--rename app.old=app.new --rename
  app.old.col=app.new.name`. `--rename` never moves a column to another table
  or schema.
- Column attribute changes emit exact ALTERs with exact inverses: `SET/DROP
  DEFAULT`, `SET/DROP NOT NULL`, `ADD/DROP IDENTITY`, `ALTER COLUMN TYPE ..
  USING col::type` (or the `--using` expression; the inverse always casts back
  with `col::oldtype`; a `--using` value must be one expression, no top-level
  comma), generated-expression changes as DROP + ADD COLUMN
  (derived data). Column-level `DEFERRABLE` / `INITIALLY DEFERRED` fold into
  their constraint.
- Objects with dependents alter in place instead of DROP + CREATE: enum values
  append (`ALTER TYPE .. ADD VALUE`, `BEFORE`/`AFTER` only a value that already
  exists), domains (`ALTER DOMAIN` constraints / default / NOT NULL), sequences
  (`ALTER SEQUENCE`, including the `START` Postgres derives from a dropped
  `MINVALUE`/`MAXVALUE`), composite types (`ADD / DROP / ALTER ATTRIBUTE`). A function whose signature uses a dropped or
  altered type is dropped and recreated around it (its body is validated
  against the type's current shape in both directions).
- COMMENT ON, GRANT/REVOKE, OWNER TO and ALTER DEFAULT PRIVILEGES are keyed
  state on their object: the diff emits the exact `COMMENT` / `GRANT` /
  `REVOKE` / `ALTER DEFAULT PRIVILEGES` with the previous state as inverse,
  never a rebuild of the object. An explicit `REVOKE .. FROM PUBLIC` is state
  too: dropping it re-grants only what PUBLIC holds by default (EXECUTE on
  functions, USAGE on types), never `GRANT ALL`.
- A module compares equal to the live database it deployed: type spellings
  (`integer`/`int4`, `timestamp with time zone`/`timestamptz`, …), catalog
  default casts (`'a'::app.status`, `nextval('s'::regclass)`, `'x'::text`),
  restated sequence defaults, `WITH NO DATA`, `FOR ROLE <current>` and
  pg_dump's split `ALTER COLUMN SET DEFAULT / SET NOT NULL / ADD IDENTITY`
  commands are all representation, not semantics. Known remaining
  asymmetries: `serial` (the module has no sequence object), `SELECT *`
  (the catalog stores the expanded list).
- `CREATE MATERIALIZED VIEW` is identified (`schemas/<s>/views/<v>/view`);
  `ALTER TABLE .. ADD CONSTRAINT .. NOT VALID` is never folded into `CREATE
  TABLE` (the catalog would validate it); statements with no identity of their
  own (`misc/statements` on import) deploy last and require every other change.
- `pgpm/cli/__tests__/diff-generated-roundtrip.test.ts` is the seeded
  generator: fixed seeds produce v1/v2 pairs over tables, columns, defaults,
  constraints, FKs, indexes, views, functions, triggers, policies, grants,
  enums, sequences and comments; each must migrate v1 (with rows) to the
  catalog of a fresh v2, verify, and revert to v1 across the dials and emit
  modes. Add a seed or a mutation kind there before fixing a new class of bug.

Reference example with executable proofs: `examples/pgpm-projections`
(README + database-free jest suite that runs the real CLI). Live-Postgres
coverage: `pgpm/cli/__tests__/transform-e2e.test.ts`, `diff-e2e.test.ts`,
`diff-hardening-e2e.test.ts` and `diff-generated-roundtrip.test.ts`.
