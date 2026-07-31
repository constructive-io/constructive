# Package separation & restructuring

How pgpm derives modular packages from one canonical substrate: statement
facts and a typed dependency graph. Consult this when asked to split a
database into multiple pgpm packages, cherry-pick objects into a package,
restructure change granularity, or understand how change paths and
`requires` are derived.

> **Naming note:** this is *not* the `pgpm package` build command. `pgpm
> package` compiles one module into its distributable artifacts (see
> `references/publishing.md` to build+publish, `references/package-check.md`
> to verify those artifacts). This file is about *separating* one deploy
> surface into several packages.

Everything here lives in `@pgpmjs/transform` (`pgpm/transform`), with paths
rendered by `@pgpmjs/naming-spec` (`pgpm/naming-spec`). The underlying facts,
graph, and identity primitives come from `@pgsql/transform` (npm, from the
pgsql-parser repo). Tracking issue: constructive-planning#1329.

## The substrate: facts, graph, identity

One extractor and one edge taxonomy feed every projection:

```ts
import { classifyStatements, buildStatementGraph, identityOf } from '@pgsql/transform';

const facts = classifyStatements(sql);      // per-statement: kind, creates, references,
                                            // bodyReferences, fkTargets, roles, dynamicSql
const graph = buildStatementGraph(facts);   // typed edges (hard | fk | late), producer
                                            // index, SCC components, stable topo order
const identity = identityOf(facts[i]);      // (kind, schema, name, table?) or null
```

- `hard` — must exist at creation time; `fk` — foreign-key target; `late` —
  body reference resolved at run time (does not constrain deploy order).
- `identityOf` returns `null` for statements that create nothing (grants,
  comments) — they ride with the object they attach to.
- `@pgpmjs/slice` consumes this same substrate (its `extractSqlFacts` and
  object graph are thin adapters over it).

## Derived paths (naming spec)

Paths are projections of identity, never authored and never identity:

```ts
import { pathFor } from '@pgpmjs/naming-spec';

pathFor({ kind: 'function', schema: 'app', name: 'user_count' });
// 'schemas/app/procedures/user_count/procedure'   (directory style, default)
// flat style drops trailing kind tokens: 'schemas/app/procedures/user_count'
```

Re-alterations of the same object get `<parent>/alterations/alt0000000042`
via `alterationPathFor` (mirrors `db_deps.next_alteration` in
constructive-db).

## Granularity: restructure change shape

`restructureChanges(changes, { granularity })` flattens a module's deploy
scripts, restructures the SQL, and re-slices into one change per object with
dependencies recomputed from the statement graph:

- `atomic` — bare CREATE TABLE plus one ALTER per column/constraint (the
  machine-emitted shape).
- `object` — each table fully baked; cross-object statements (FKs, indexes,
  triggers, policies) stay separate.
- `consolidated` — additionally inlines FKs proven safe by the graph.

Wired into the CLI: `pgpm export --granularity consolidated` (see
`pgpm/export/src/restructure.ts`). Requires `loadModule()` from
`plpgsql-parser` before use.

## Package separation: partitionUnits

`partitionUnits(sqlOrChanges, config)` projects one deploy surface into a
set of packages. Membership is a declarative config; SQL is never
re-authored:

```ts
import { partitionUnits } from '@pgpmjs/transform';

const result = partitionUnits(sql, {
  rules: [
    // a whole schema (and everything in it)
    { package: 'pkg-billing', select: [{ schema: 'billing' }], closure: true },
    // one specific table
    { package: 'pkg-users', select: [{ kind: 'table', schema: 'app', name: 'users' }] },
    // specific procedures by name
    { package: 'pkg-fns', select: [{ kind: 'function', schema: 'app', name: ['user_count', 'signup'] }] },
    // security surface: all policies plus split-out grants
    { package: 'pkg-security', select: [{ kind: 'policy' }, { statementKind: 'grant' }] },
    // exact cherry-pick by derived path
    { package: 'pkg-x', select: [{ path: 'schemas/app/tables/users/table' }] }
  ],
  defaultPackage: 'pkg-app',
  splitRiders: ['grant']
});
// → { packages, assignments, closureIncluded, warnings }
```

Selector semantics:

- Fields AND within a selector; arrays OR within a field; selectors OR
  within a rule. Rules are tried in order; first match wins; unmatched units
  land in `defaultPackage`.
- Selectable kinds: `schema`, `table`, `view`, `sequence`, `type`,
  `function`, `index`, `trigger`, `policy`, `constraint`, `seed_dml` —
  anything `identityOf` can name. Table-scoped kinds also match on `table`.
- `path` is the canonical single-object cherry-pick (paths are unique).

Behavior:

- **Riders** (grants, comments) ride with the object they attach to by
  default. `splitRiders: ['grant']` peels each grant into its own selectable
  unit named `<hostPath>/grants/<role>`, with an explicit dependency on its
  host — so the security surface can ship as its own package.
- **`closure: true`** drags the rule's transitive dependency closure
  (hard + fk edges) out of the default package, but never steals units
  another rule explicitly claimed — those become cross-package deps.
- **Requires are derived**: same-package deps render as `requires: <path>`,
  cross-package as `requires: <pkg>:<path>`; each `PartitionedPackage` also
  reports package-level `requires`. Objects require their schema's change;
  table-scoped objects require their table's change.
- **Cross-package cycles are a hard error** (`PartitionCycleError` lists the
  package cycle and one offending edge per hop). Re-draw the boundaries or
  merge the packages.
- Units executing dynamic SQL produce warnings — their edges are incomplete,
  so the graph alone cannot prove the assignment safe.

The emit shape (`PartitionedPackage { name, changes, requires }`) is
structurally typed on the change seam — no `@pgpmjs/bundle` or
`@pgpmjs/core` dependency; callers materialize packages (write `pgpm.plan` +
deploy trees, feed a bundle, ...).

## Related

- `references/pgpm-export.md` — exporting a live database to pgpm packages
- `pgpm-migration-bundle` skill — the portable bundle artifact; bundle
  transpile/split operate on the same module seams
- `@pgpmjs/slice` (`pgpm/slice`) — subsystem contract/cascade analysis over
  the same graph substrate
