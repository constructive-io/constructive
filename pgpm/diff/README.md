# @pgpmjs/diff

`pgpm diff` engine: identity-keyed semantic schema diff between any two SQL sources — pgpm modules, SQL dumps, or live databases (dumped via `pg_dump` by the CLI).

Every side normalizes to the same `DiffInputChange[]` seam consumed by the semantic diff driver in `@pgpmjs/transform`, so the comparison is source- and dial-invariant. `deltaChangesToRows` lifts the resulting deltas back onto deployable `PgpmRow`s.

Used by the `pgpm diff` CLI command (`pgpm/cli`). Sibling front doors: `@pgpmjs/export` (live database), `@pgpmjs/import` (dumps).
