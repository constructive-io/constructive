# pgpm projections

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
</p>

One PostgreSQL schema, **projected into every shape** — and every shape means
the same thing.

pgpm normalizes any schema (a `.sql` file, a `pg_dump`, a live database, or a
pgpm module) to an **identity-keyed object set**: the objects and their shapes,
with authoring granularity, naming, partitioning, statement order, and
whitespace all stripped out. Everything downstream is a **projection** of that
one canonical model:

| Axis | Projections | What changes | What stays the same |
| --- | --- | --- | --- |
| **granularity** | `atomic` · `object` · `consolidated` | the SQL statement shape (one `ALTER` per column vs one statement per object vs the whole thing) | the schema |
| **change granularity** | `alteration` · `object` · `single` | the plan-entry shape (one change per column/constraint vs one per object vs one big change, each with its own deploy/revert/verify) | the schema |
| **partition** | one module vs many | which objects live in which package | the combined schema |
| **diff** | `v1 → v2` migration | — | derived, never hand-written |
| **output** | pgpm module · linear `.sql` · bundle | the artifact format | the migration |

The point: a projection changes the **representation**, never the **meaning**.

## The source

[`schema/schema.sql`](./schema/schema.sql) is a small two-schema blog platform
(`blog_app` + `blog_sec`) — ordinary PostgreSQL DDL, nothing pgpm-specific.
[`schema/schema-v2.sql`](./schema/schema-v2.sql) is the next version of it.

## Run it yourself (CLI)

```sh
# 1. pgpm-itize the schema into a module (object granularity by default)
pgpm import schema/schema.sql --pkg blog --out ./out

# 2. Re-dial the SAME module to other granularities (siblings blog-<gran>)
cd out/blog
pgpm transform --granularity atomic
pgpm transform --granularity consolidated

# 2b. The fourth dial: one change PER ALTERATION — every column and constraint
#     becomes its own plan entry with its own deploy/revert/verify + requires —
#     or ONE BIG CHANGE for the whole module
pgpm transform --granularity atomic --change-granularity alteration --out ../alteration
pgpm transform --granularity consolidated --change-granularity single --out ../single

# 3. Partition the source into app + security modules
cd ../..
pgpm import schema/schema.sql --pkg blog-part --partition schema/partition.json --out ./out

# 4. Derive the v1 -> v2 migration, and project it two ways at once
pgpm import schema/schema-v2.sql --pkg blog-v2 --out ./out
pgpm diff ./out/blog ./out/blog-v2 \
  --emit-migration ./out --pkg blog-migration \
  --emit-sql ./out/migration.sql

# 5. Prove a projection is lossless against a real catalog (needs Postgres)
cd out/blog
pgpm transform --granularity atomic --check   # deploys both, diffs the catalogs
```

## What the test proves

```sh
cd examples/pgpm-projections
pnpm test   # jest, no Postgres service required
```

The suite ([`__tests__/projections.e2e.test.ts`](./__tests__/projections.e2e.test.ts))
runs the real CLI and then compares the emitted artifacts **semantically** — no
database needed, because equivalence is checked at the identity-keyed model:

- **granularity-invariant** — `atomic`, `object`, and `consolidated` all
  normalize to the same schema (empty diff), including standalone
  `ADD CONSTRAINT` placement.
- **change-granularity-invariant** — one change per alteration (per column /
  per constraint plan entries) and one big change for the whole module both
  still normalize to the same schema (empty diff).
- **partition-invariant** — the `blog-core` + `blog-security` modules recombine
  to the same schema as the single module (empty diff).
- **diff is exact** — `schema.sql → schema-v2.sql` derives precisely the real
  changes (two new tables, a new policy, a changed `posts` table, a changed
  function body) and nothing is guessed.
- **output is composable** — one `pgpm diff` run emits a pgpm module *and* a
  linear `.sql` file, in dependency order, with no `CREATE OR REPLACE`.

### Catalog-level equivalence

Every granularity — including `atomic` — deploys to the **identical Postgres
catalog**; that is the guarantee `--check` / `--verify` enforce, and it is
covered against live Postgres by the engine's own suites
(`pgpm/cli` `transform-e2e` "dial parity" and `diff-e2e`). This example is
deliberately database-free and asserts the model-level invariants above.

It's a normal workspace package, so `pnpm install` at the repo root wires it up.
